"""Step 5: canonical model, reconciliation, authorship verification, evidence.

Reconciliation order (cautious):
  1. exact DOI                       -> same work
  2. exact normalized title          -> same work
  3. author + year + venue           -> same work only if 1/2 also agree
  4. fuzzy / prefix title            -> DUPLICATE CANDIDATE (never auto-merged)
  5. ambiguous                       -> manual review list
Different DOIs for the same title (preprint vs journal) are kept as separate
records linked by a `version_of` relationship.

Outputs (all under data-staging/, gitignored):
  normalized/publications.json, normalized/other-works.json,
  normalized/relationships.json, normalized/reconciliation.json,
  evidence/field-evidence.jsonl, normalized/id-registry.json
"""
import difflib
import glob
import hashlib
import html
import json
import re

from common import RAW, STAGING, norm_doi, norm_title, now_iso, read_json, slug, write_json

TODAY = now_iso()
RESEARCHER_ID = "res-0001"
ORCID_ID = "0000-0002-6141-5387"
OA_AUTHOR = "A5102868128"
S2_OK, S2_REJECTED = "2142163895", "145792199"

# ------------------------------------------------------------------ helpers
LOG = {}
for line in (STAGING / "evidence/retrieval-log.jsonl").read_text(encoding="utf-8").splitlines():
    e = json.loads(line)
    if e.get("status") == 200:
        LOG[e["dest"]] = e


def prov(dest_rel):
    e = LOG.get(dest_rel, {})
    return {"source_url": e.get("url"), "retrieved_at": e.get("retrieved_at"), "method": e.get("method"), "source_id": e.get("source_id")}


def strip_tags(s):
    if not s:
        return s
    s = re.sub(r"</?jats:[^>]+>|<[^>]+>", " ", s)
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def fix_name(given, family):
    """Repair obvious given/family split errors in publisher deposits.
    Only moves tokens between the two parts; never adds or drops a token."""
    g, f, note = (given or "").strip(), (family or "").strip(), None
    m = re.match(r"^([A-Z])\.\s+(.+)$", f)
    if m:
        g, f, note = f"{g} {m.group(1)}.".strip(), m.group(2), "initial moved from family to given name"
    toks = f.split()
    if len(toks) > 1 and toks[0][:1].islower():
        g, f, note = f"{g} {toks[0][:1].upper() + toks[0][1:]}".strip(), " ".join(toks[1:]), "lower-case leading token moved from family to given name"
    return g, f, note


def surname_key(name):
    return re.sub(r"[^a-z]", "", (name or "").split()[-1].lower()) if name else ""


def lang_of(s):
    if not s:
        return None
    return "ar" if re.search(r"[؀-ۿ]", s) else "en"


def is_researcher(name):
    return bool(re.search(r"\b(ibrahim|i\.?)\s*(m(ohamed|\.)?\s*)?taha\b", name or "", re.I))


def date_parts(m, key):
    dp = (m.get(key) or {}).get("date-parts") or [[None]]
    return [x for x in dp[0] if x is not None] or None


def iso(dp):
    if not dp:
        return None
    return "-".join(f"{x:02d}" if i else str(x) for i, x in enumerate(dp))


def reconstruct_abstract(inv):
    if not inv:
        return None
    pos = {}
    for word, idxs in inv.items():
        for i in idxs:
            pos[i] = word
    return " ".join(pos[i] for i in sorted(pos))


registry_path = STAGING / "normalized/id-registry.json"
registry = read_json(registry_path) if registry_path.exists() else {}


def stable_id(prefix, key):
    k = f"{prefix}:{key}"
    if k not in registry:
        n = 1 + sum(1 for v in registry.values() if v.startswith(prefix + "-"))
        registry[k] = f"{prefix}-{n:04d}"
    return registry[k]


evidence = []


def ev(entity, field, value, src_dest=None, status="verified", confidence="high", **extra):
    rec = {"entity_id": entity, "field": field, "value": value}
    if src_dest:
        p = prov(src_dest)
        rec.update({"source_id": p["source_id"], "source_url": p["source_url"], "retrieved_at": p["retrieved_at"], "method": p["method"]})
    rec.update(extra)
    rec.update({"verification_status": status, "confidence": confidence})
    evidence.append(rec)


# ------------------------------------------------------------------ inputs
# The researcher's contact e-mail is read at runtime from the local, gitignored
# supplied file. It is only compared against PDF text and never stored or exported.
_sup = RAW / "supplied/old-site-repo/index.html"
_m = re.search(r"[\w.+-]+@[\w-]+(?:\.[\w-]+)+", _sup.read_text(encoding="utf-8", errors="replace")) if _sup.exists() else None
SUPPLIED_EMAIL = _m.group(0).lower() if _m else None
seeds = read_json(STAGING / "normalized/seed-claims.json")["publications"]
cands = read_json(STAGING / "normalized/match-candidates.json")
gs = read_json(STAGING / "normalized/google-scholar-profile.json")
orcid = read_json(RAW / f"profiles/orcid/{ORCID_ID}.json")
orcid_works = {}
for g in orcid["activities-summary"]["works"]["group"]:
    s = g["work-summary"][0]
    for e in (s.get("external-ids") or {}).get("external-id", []):
        if e["external-id-type"] == "doi":
            orcid_works[norm_doi(e["external-id-value"])] = {
                "title": s["title"]["title"]["value"], "type": s["type"],
                "year": ((s.get("publication-date") or {}).get("year") or {}).get("value"),
                "source": s.get("source", {}).get("source-name", {}).get("value"),
                "eid": next((x["external-id-value"] for x in s["external-ids"]["external-id"] if x["external-id-type"] == "eid"), None)}
oa_by_doi = {}
for f in glob.glob(str(RAW / "publications/openalex/works/*.json")):
    w = read_json(f)
    d = norm_doi(w.get("doi"))
    rel = "raw/" + f.replace("\\", "/").split("/raw/")[1]
    oa_by_doi.setdefault(d, (w, rel))
pdf_text = {}
for f in glob.glob(str(STAGING / "extracted/pdf/*.txt")):
    pdf_text[f.replace("\\", "/").rsplit("/", 1)[1][:-4]] = open(f, encoding="utf-8", errors="replace").read()
oa_check = {r["doi"]: r for r in read_json(STAGING / "normalized/open-access-check.json")}
s2_author_papers = read_json(RAW / f"profiles/s2/author-papers/{S2_OK}.json").get("data", [])
s2_dois_ok = {norm_doi((p.get("externalIds") or {}).get("DOI")) for p in s2_author_papers}

# ------------------------------------------------ 1. DOI-based publications
pubs, recon, relationships = [], [], []
seed_by_doi = {}
for c in cands:
    if c.get("accepted_for_lookup") and c.get("doi"):
        seed_by_doi.setdefault(c["doi"], set()).add(c["seed_id"])

TYPE_MAP = {"journal-article": ("article", "journal_article"), "posted-content": ("misc", "preprint")}
for f in sorted(glob.glob(str(RAW / "publications/crossref/works/*.json"))):
    rel = "raw/" + f.replace("\\", "/").split("/raw/")[1]
    m = read_json(f)["message"]
    doi = norm_doi(m["DOI"])
    pid = stable_id("pub", f"doi:{doi}")
    bibtype, ptype = TYPE_MAP.get(m["type"], ("misc", m["type"]))
    authors = []
    for i, a in enumerate(m.get("author", []), 1):
        given, family, note = fix_name(a.get("given"), a.get("family"))
        nm = f"{given} {family}".strip()
        entry = {"position": i, "given": given or None, "family": family, "display": nm,
                 "orcid": a.get("ORCID"), "is_researcher": is_researcher(nm),
                 "affiliation_crossref": [x.get("name") for x in a.get("affiliation", [])] or None}
        if note:
            entry["name_normalization"] = {"note": note, "crossref_given": a.get("given"), "crossref_family": a.get("family")}
        authors.append(entry)
    r_pos = [a["position"] for a in authors if a["is_researcher"]]
    issued, online, printed = date_parts(m, "issued"), date_parts(m, "published-online"), date_parts(m, "published-print")
    w, oa_rel = oa_by_doi.get(doi, (None, None))
    gs_row = next((a for a in gs["articles_first_page"] if norm_title(a["title"]) == norm_title(strip_tags(m["title"][0]))), None)
    title = strip_tags(m["title"][0])
    # --- chosen citation year: print year when volume/issue assigned, else issued
    chosen = printed if (printed and (m.get("volume") or m.get("issue"))) else issued
    year_values = {"crossref_issued": issued and issued[0], "crossref_published_online": online and online[0],
                   "crossref_published_print": printed and printed[0],
                   "openalex_publication_year": w and w.get("publication_year"),
                   "orcid_year": orcid_works.get(doi, {}).get("year") and int(orcid_works[doi]["year"]),
                   "google_scholar_year": gs_row and gs_row["year"]}
    for sid in seed_by_doi.get(doi, []):
        year_values[f"supplied_site_{sid}"] = next(s["year_as_listed"] for s in seeds if s["seed_id"] == sid)
    distinct_years = {v for v in year_values.values() if v}
    conflicts = []
    if len(distinct_years) > 1:
        conflicts.append({"field": "year", "values": year_values, "chosen": chosen[0],
                          "rule": "print year when volume/issue assigned, otherwise first-issued year",
                          "needs": "researcher confirmation of the year to display"})
    if w:
        cr_order = [surname_key(a["family"]) for a in authors]
        oa_order = [surname_key(a["author"]["display_name"]) for a in w.get("authorships", [])]
        if sorted(cr_order) == sorted(oa_order) and cr_order != oa_order:
            conflicts.append({"field": "author_order",
                              "values": {"crossref": [a["display"] for a in authors],
                                         "openalex": [a["author"]["display_name"] for a in w.get("authorships", [])],
                                         "google_scholar": gs_row and gs_row["authors_as_shown"],
                                         "supplied_site": [s["authors_as_listed"] for s in seeds if s["seed_id"] in seed_by_doi.get(doi, set())] or None},
                              "chosen": "crossref (DOI registration metadata)",
                              "rule": "DOI deposit order exported; other sources disagree",
                              "needs": "researcher confirmation of the official author order"})
    abstract, abs_src = strip_tags(m.get("abstract")), "crossref"
    if not abstract and w and w.get("abstract_inverted_index"):
        abstract, abs_src = reconstruct_abstract(w["abstract_inverted_index"]), "openalex_inverted_index (word order reconstructed)"
    if not abstract:
        abs_src = None
    pdf_key = slug(doi, 90)
    txt = pdf_text.get(pdf_key, "")
    kw_line = re.search(r"(?im)^\s*(key\s*words|keywords)\s*[:.\-–—]?\s*(.+)$", txt)
    author_keywords = [k.strip(" .;") for k in re.split(r"[;,]", kw_line.group(2)) if k.strip(" .;")] if kw_line else None
    # Affiliation lines as printed; e-mail addresses (researcher's and co-authors') are redacted.
    aff_lines = [re.sub(r"[\w.+-]+@[\w-]+(\.[\w-]+)+", "[e-mail redacted]", l.strip())
                 for l in txt.splitlines() if re.search(r"sadat academy|faculty of graduate studies for statistical research", l, re.I)][:3]
    institutional_email = bool(re.search(r"@sadatacademy\.edu\.eg", txt, re.I))
    email_match = bool(SUPPLIED_EMAIL) and SUPPLIED_EMAIL in txt.lower()  # boolean only; the address is never written out
    oa = oa_check.get(doi, {})
    src = (w or {}).get("primary_location") or {}
    rec = {
        "id": pid, "content_type": "publication", "publication_type": ptype, "bibtex_type": bibtype,
        "status": "published" if ptype != "preprint" else "preprint",
        "canonical_title": title, "title_original": {"value": title, "lang": lang_of(title), "source": "crossref"},
        "authors": authors, "researcher_author_positions": r_pos, "author_count": len(authors),
        "dates": {"issued": iso(issued), "published_online": iso(online), "published_print": iso(printed), "citation_year": chosen[0]},
        "venue": {"name": strip_tags((m.get("container-title") or [None])[0]), "name_lang": lang_of((m.get("container-title") or [""])[0]),
                  "all_names": [strip_tags(x) for x in m.get("container-title") or []] or None,
                  "short_name": strip_tags((m.get("short-container-title") or [None])[0]), "publisher": strip_tags(m.get("publisher")),
                  "issn": m.get("ISSN"), "openalex_source": ((src.get("source") or {}).get("display_name"))},
        "volume": m.get("volume"), "issue": m.get("issue"), "pages": m.get("page"), "article_number": m.get("article-number"),
        "identifiers": {"doi": doi, "openalex": w and w["id"].rsplit("/", 1)[-1], "scopus_eid": orcid_works.get(doi, {}).get("eid"),
                        "semantic_scholar_in_author_cluster": doi in s2_dois_ok},
        "abstract_original": {"value": abstract, "lang": lang_of(abstract), "source": abs_src} if abstract else None,
        "author_keywords": {"values": author_keywords, "source": "publisher PDF (CC licence)"} if author_keywords else None,
        "topics_machine": [{"name": t["display_name"], "subfield": (t.get("subfield") or {}).get("display_name"),
                            "field": (t.get("field") or {}).get("display_name"), "score": t.get("score")}
                           for t in (w or {}).get("topics", [])[:3]] or None,
        "language": (w or {}).get("language"),
        "urls": {"doi": f"https://doi.org/{doi}", "landing_page": src.get("landing_page_url"),
                 "oa_pdf": oa.get("pdf_url") if oa.get("creative_commons") else None},
        "open_access": {"status": (w or {}).get("open_access", {}).get("oa_status"), "license_openalex": oa.get("license_openalex"),
                        "license_crossref": oa.get("license_crossref")},
        "affiliation_at_publication": {"lines": aff_lines, "source": "publisher PDF (CC licence)"} if aff_lines else None,
        "citations": [x for x in [
            {"source": "Crossref is-referenced-by-count", "value": m.get("is-referenced-by-count"), **{k: v for k, v in prov(rel).items() if k in ("source_url", "retrieved_at")}},
            w and {"source": "OpenAlex cited_by_count", "value": w.get("cited_by_count"), **{k: v for k, v in prov(oa_rel).items() if k in ("source_url", "retrieved_at")}},
            gs_row and {"source": "Google Scholar (profile page)", "value": gs_row["cited_by_gs"], "source_url": gs["url"], "retrieved_at": gs["retrieved_at"]},
        ] if x],
        "links": {}, "conflicts": conflicts, "source_records": [rel] + ([oa_rel] if oa_rel else []),
        "last_verified": TODAY,
        # Competing metadata kept verbatim, never merged into canonical fields.
        "alternative_metadata": {k: v for k, v in {
            "google_scholar_venue_string": gs_row and gs_row["venue_as_shown"],
            "supplied_site": [{"venue": s["venue_as_listed"], "details": s["volume_issue_pages_as_listed"],
                               "badge_self_reported": s["badge_as_listed"]} for s in seeds if s["seed_id"] in seed_by_doi.get(doi, set())] or None,
            "orcid_title": orcid_works.get(doi, {}).get("title") if orcid_works.get(doi, {}).get("title") != title else None,
        }.items() if v},
    }
    if not m.get("page") and not m.get("article-number"):
        rec["missing_fields"] = ["pages"]
    # ---------------- authorship verification
    proof = []
    if r_pos:
        proof.append("Crossref author list contains the researcher's name")
    if doi in orcid_works:
        proof.append(f"listed on the researcher's ORCID record ({orcid_works[doi]['source']})")
    if w and any(a["author"].get("id", "").endswith(OA_AUTHOR) for a in w.get("authorships", [])):
        proof.append("OpenAlex attributes it to author A5102868128 (ORCID-linked)")
    if aff_lines:
        proof.append("publisher PDF prints a matching affiliation (Sadat Academy / FGSSR Cairo University)")
    if email_match:
        proof.append("publisher PDF prints the same contact e-mail as the researcher's own site")
    if institutional_email:
        proof.append("publisher PDF prints a sadatacademy.edu.eg address for the author")
    if gs_row:
        proof.append("listed on the researcher's Google Scholar profile (verified sadatacademy.edu.eg e-mail)")
    if seed_by_doi.get(doi):
        proof.append("listed on the researcher's earlier site")
    strong = (doi in orcid_works) or (w and any(a["author"].get("id", "").endswith(OA_AUTHOR) for a in w.get("authorships", [])) and (aff_lines or gs_row))
    rec["authorship"] = {"status": "verified" if (r_pos and strong) else "candidate", "evidence": proof,
                         "confidence": "high" if len(proof) >= 3 else "medium"}
    rec["verification_status"] = "conflicted" if conflicts and rec["authorship"]["status"] == "verified" else rec["authorship"]["status"]
    rec["record_note"] = "authorship verified; field-level conflicts open" if rec["verification_status"] == "conflicted" else None
    rec["confidence"] = rec["authorship"]["confidence"]
    pubs.append(rec)
    # evidence
    ev(pid, "doi", doi, rel)
    ev(pid, "title", title, rel)
    ev(pid, "authors", [a["display"] for a in authors], rel)
    ev(pid, "researcher_author_position", r_pos, rel, status=rec["authorship"]["status"], confidence=rec["confidence"])
    ev(pid, "venue", rec["venue"]["name"], rel)
    ev(pid, "citation_year", chosen[0], rel, status="conflicted" if conflicts else "verified",
       confidence="medium" if conflicts else "high")
    if doi in orcid_works:
        ev(pid, "listed_on_orcid", True, f"raw/profiles/orcid/{ORCID_ID}.json")
    if aff_lines:
        ev(pid, "affiliation_at_publication", aff_lines, f"raw/publications/pdf/{pdf_key}.pdf")
    if oa.get("license_openalex"):
        ev(pid, "license", oa.get("license_openalex"), oa_rel)
    for sid in seed_by_doi.get(doi, []):
        recon.append({"source": "supplied_site", "source_record": sid, "canonical_id": pid, "method": "title search → DOI (exact or prefix title, author 'Taha')", "decision": "linked"})
    recon.append({"source": "crossref", "source_record": doi, "canonical_id": pid, "method": "exact DOI", "decision": "canonical"})
    if oa_rel:
        recon.append({"source": "openalex", "source_record": w["id"], "canonical_id": pid, "method": "exact DOI", "decision": "linked"})
    if doi in orcid_works:
        recon.append({"source": "orcid", "source_record": doi, "canonical_id": pid, "method": "exact DOI", "decision": "linked"})
    if doi in s2_dois_ok:
        recon.append({"source": "semantic_scholar", "source_record": doi, "canonical_id": pid, "method": "exact DOI", "decision": "linked"})
    if gs_row:
        recon.append({"source": "google_scholar", "source_record": gs_row["title"], "canonical_id": pid, "method": "exact normalized title", "decision": "linked"})

# preprint ↔ journal version links (same normalized title, different DOI)
by_title = {}
for p in pubs:
    by_title.setdefault(norm_title(p["canonical_title"]), []).append(p)
for t, group in by_title.items():
    if len(group) > 1:
        journal = [p for p in group if p["publication_type"] != "preprint"]
        for p in group:
            if p["publication_type"] == "preprint" and journal:
                relationships.append({"from": p["id"], "relation": "version_of", "to": journal[0]["id"],
                                      "basis": "identical normalized title, same authors, preprint vs journal DOI", "status": "candidate"})
                p["website"] = {"display": False, "reason": f"preprint of {journal[0]['id']}"}

# ------------------------------------- 2. non-DOI works (GS rows + seeds)
doi_titles = {norm_title(p["canonical_title"]): p["id"] for p in pubs}
# TAM appears on GS without venue twice: same title as DOI records → linked, version ambiguous
other, pending = [], []
for a in gs["articles_first_page"]:
    nt = norm_title(a["title"])
    if nt in doi_titles:
        if not any(r["source"] == "google_scholar" and r["source_record"] == a["title"] and r["canonical_id"] == doi_titles[nt] for r in recon):
            recon.append({"source": "google_scholar", "source_record": a["title"] + (f" ({a['authors_as_shown']})"), "canonical_id": doi_titles[nt],
                          "method": "exact normalized title", "decision": "linked (duplicate GS row; preprint vs journal version ambiguous)"})
        continue
    pending.append(a)

# group GS-only rows: exact normalized title → same work
groups = {}
for a in pending:
    groups.setdefault(norm_title(a["title"]), []).append(a)
keys = list(groups)


def classify(rows):
    v = " ".join(filter(None, [rows[0].get("venue_as_shown")])).lower()
    if "dissertation" in v or "thesis" in v:
        return "mastersthesis", "thesis"
    if "conference" in v:
        return "inproceedings", "conference_paper"
    if "researchgate" in v or not v:
        return "misc", "self_published_material"
    return "article", "journal_article"


seed_titles = {norm_title(s["title_as_listed"]): s for s in seeds}
for k in keys:
    rows = groups[k]
    best = max(rows, key=lambda r: (bool(r.get("venue_as_shown")), r.get("year") or 0))
    bibtype, ptype = classify(rows)
    pid = stable_id("pub", f"title:{k}")
    seed = seed_titles.get(k) or next((s for t, s in seed_titles.items() if len(t) >= 25 and (k.startswith(t) or t.startswith(k))), None)
    venue = best.get("venue_as_shown")
    vol = iss = pages = None
    if venue and ptype == "journal_article":
        mm = re.match(r"(.+?),\s*([\d\-–]+)\s*,\s*(\d{4})$", venue)
        if mm:
            venue, pages = mm.group(1), mm.group(2)
    alt = {}
    if venue and ptype in ("conference_paper", "thesis"):
        venue = re.sub(r"\s*,\s*\d{4}$", "", venue).replace("�…", "…")
        if "…" in venue:
            # Google Scholar truncated the name: use the complete (shorter) form from the
            # supplied site, keep the truncated string as alternative metadata.
            alt["google_scholar_venue_truncated"] = venue
            venue = seed["venue_as_listed"] if seed and seed.get("venue_as_listed") else None
    if ptype == "thesis":
        venue = "Cairo University"
    authors_gs = [x.strip() for x in (best.get("authors_as_shown") or "").split(",") if x.strip()]
    rec = {
        "id": pid, "content_type": "publication", "publication_type": ptype, "bibtex_type": bibtype,
        "status": {"thesis": "completed (degree)", "conference_paper": "presented/published (proceedings unverified)",
                   "self_published_material": "self-published (type to confirm)"}.get(ptype, "published"),
        "canonical_title": best["title"], "title_original": {"value": best["title"], "lang": lang_of(best["title"]), "source": "google_scholar_profile"},
        "authors": [{"position": i, "display": n, "is_researcher": bool(re.search(r"\bI(M)?\s+Taha\b", n)), "format": "Google Scholar initials"}
                    for i, n in enumerate(authors_gs, 1)],
        "researcher_author_positions": [i for i, n in enumerate(authors_gs, 1) if re.search(r"\bI(M)?\s+Taha\b", n)],
        "dates": {"citation_year": best.get("year")},
        "venue": {"name": venue if ptype not in ("self_published_material",) else ("ResearchGate" if venue and "researchgate" in venue.lower() else None)},
        "pages": pages, "identifiers": {"doi": None},
        "abstract_original": None, "citations": [{"source": "Google Scholar (profile page)", "value": r["cited_by_gs"], "source_url": gs["url"], "retrieved_at": gs["retrieved_at"]} for r in rows if r["cited_by_gs"] is not None][:1],
        "links": {}, "conflicts": [], "source_records": ["normalized/google-scholar-profile.json"] + (["normalized/seed-claims.json"] if seed else []),
        "last_verified": TODAY, "alternative_metadata": alt or None,
    }
    proof = ["listed on the researcher's Google Scholar profile"] + (["listed on the researcher's earlier site"] if seed else [])
    missing = [f for f, v in [("doi", None), ("abstract", None), ("publisher/proceedings", None if ptype == "conference_paper" else 1)] if v is None]
    rec["authorship"] = {"status": "candidate", "evidence": proof, "confidence": "medium" if seed else "low"}
    rec["verification_status"] = "incomplete" if ptype in ("conference_paper",) else "candidate"
    rec["confidence"] = rec["authorship"]["confidence"]
    rec["missing_fields"] = missing
    if seed and seed.get("year_as_listed") and best.get("year") and seed["year_as_listed"] != best["year"]:
        rec["conflicts"].append({"field": "year", "values": {"google_scholar": best["year"], "supplied_site": seed["year_as_listed"]}})
    if len(rows) > 1:
        rec["notes"] = f"{len(rows)} identical-title rows on Google Scholar (merged by exact normalized title)"
    other.append(rec)
    for r in rows:
        recon.append({"source": "google_scholar", "source_record": r["title"], "canonical_id": pid, "method": "exact normalized title" if r is not best else "canonical (GS-only)", "decision": "linked" if r is not best else "canonical"})
    if seed:
        recon.append({"source": "supplied_site", "source_record": seed["seed_id"], "canonical_id": pid, "method": "normalized/prefix title", "decision": "linked"})
    ev(pid, "title", best["title"], status="candidate", confidence=rec["confidence"], source_id="SRC-GS-PROFILE", source_url=gs["url"], retrieved_at=gs["retrieved_at"])
    ev(pid, "researcher_authorship", True, status="candidate", confidence=rec["confidence"], source_id="SRC-GS-PROFILE", source_url=gs["url"], retrieved_at=gs["retrieved_at"])

# fuzzy duplicate candidates among GS-only records (NOT merged)
dup_candidates = []
for i, a in enumerate(other):
    for b in other[i + 1:]:
        ta, tb = norm_title(a["canonical_title"]), norm_title(b["canonical_title"])
        ratio = difflib.SequenceMatcher(None, ta, tb).ratio()
        prefix = ta.startswith(tb) or tb.startswith(ta)
        if ratio >= 0.85 or prefix:
            keep, drop = (a, b) if len(ta) >= len(tb) else (b, a)
            dup_candidates.append({"records": [a["id"], b["id"]], "titles": [a["canonical_title"], b["canonical_title"]],
                                   "similarity": round(ratio, 3), "prefix": prefix, "decision": "manual review (not merged)",
                                   "export": f"{keep['id']} exported; {drop['id']} held back until reviewed"})
            drop["website"] = {"display": False, "reason": f"possible duplicate of {keep['id']} (pending review)"}
            drop["export_to_bibtex"] = False

# seeds never matched to anything
matched_seeds = {r["source_record"] for r in recon if r["source"] == "supplied_site"}
for s in seeds:
    if s["seed_id"] not in matched_seeds:
        recon.append({"source": "supplied_site", "source_record": s["seed_id"], "canonical_id": None, "method": "-", "decision": "unmatched"})

# ------------------------------------------------------- rejected matches
rejected = [
    {"source": "semantic_scholar", "source_record": f"author {S2_REJECTED} 'Ibrahim B. M. Taha'", "canonical_id": None,
     "method": "author disambiguation", "decision": "rejected",
     "reason": "different person: 80+ papers in electrical power engineering, different middle initials; only overlap is a misattributed SOIC 2024 paper"},
    {"source": "semantic_scholar", "source_record": "'Design of a small sample laboratory grain dryer' (1970) in author cluster 2142163895",
     "canonical_id": None, "method": "topic/date plausibility", "decision": "rejected",
     "reason": "agricultural engineering, dated 1970, no DOI; inconsistent with the researcher's career (employment from 2017)"},
    {"source": "orcid", "source_record": "0000-0002-3108-2921 'Ibrahim Mohamed Taha (I.M.Taha)', Faculty of Agriculture, Al-Azhar University",
     "canonical_id": None, "method": "author disambiguation", "decision": "rejected",
     "reason": "homonym: same full name, different institution and field"},
]
for c in cands:
    if not c.get("accepted_for_lookup") and c["score"] >= 0.6:
        rejected.append({"source": c["source"], "source_record": f"{c.get('doi')} | {c['title'][:90]}", "canonical_id": None,
                         "method": "title search candidate", "decision": "rejected",
                         "reason": "; ".join(c.get("rejection_reasons", [])) or "below threshold"})
recon.extend(rejected)

# ----------------------------------------------- relationships & datasets
dc = read_json(RAW / "datasets/datacite/10-5281-zenodo-23120962.json")["data"]["attributes"]
ds_id = stable_id("dat", "doi:10.5281/zenodo.23120962")
jscs = next(p for p in pubs if p["identifiers"]["doi"] == "10.1080/00949655.2026.2759110")
dataset = {
    "id": ds_id, "content_type": "dataset", "canonical_title": dc["titles"][0]["title"],
    "title_original": {"value": dc["titles"][0]["title"], "lang": "en"},
    "creators": [c["name"] for c in dc["creators"]], "year": dc.get("publicationYear"),
    "identifiers": {"doi": "10.5281/zenodo.23120962"}, "publisher": dc.get("publisher"),
    "license": [r.get("rightsIdentifier") for r in dc.get("rightsList", [])],
    "related_identifiers": [{"relation": r["relationType"], "id": r["relatedIdentifier"]} for r in dc.get("relatedIdentifiers", [])],
    "urls": {"doi": "https://doi.org/10.5281/zenodo.23120962"},
    "verification_status": "verified", "confidence": "high",
    "authorship": {"evidence": ["DataCite creators include 'Taha, Ibrahim M.'", "co-creators match the JSCS 2026 paper"]},
    "source_records": ["raw/datasets/datacite/10-5281-zenodo-23120962.json"], "last_verified": TODAY,
}
relationships.append({"from": ds_id, "relation": "supplement_to", "to": jscs["id"], "basis": "dataset title names the paper; identical author list", "status": "candidate"})
jscs["links"]["supp"] = "https://doi.org/10.5281/zenodo.23120962"
ev(ds_id, "license", dataset["license"], "raw/datasets/datacite/10-5281-zenodo-23120962.json")

gh = read_json(STAGING / "normalized/github-repos.json")
software = []
for r in gh["repos"]:
    sid = stable_id("sw", r["full_name"])
    sw = {"id": sid, "content_type": "software_or_data_repository", "canonical_title": r["name"], "description": r["description"],
          "url": r["url"], "license_github": r["license"], "created_at": r["created_at"], "pushed_at": r["pushed_at"],
          "language": r["language"], "verification_status": "candidate", "confidence": "medium" if "CMP" in r["name"] else "low",
          "notes": None, "source_records": ["raw/profiles/github/IbrahimTaha2018-repos.json"], "last_verified": TODAY}
    if "CMP" in r["name"]:
        sw["notes"] = "Linked from the Zenodo deposit (IsSupplementTo). GitHub shows no licence while Zenodo states CC-BY-4.0: licence conflict."
        sw["conflicts"] = [{"field": "license", "values": {"github": r["license"], "zenodo": dataset["license"]}}]
        relationships.append({"from": sid, "relation": "source_of", "to": ds_id, "basis": "Zenodo IsSupplementTo points to this repository", "status": "verified"})
    else:
        sw["notes"] = "Purpose unclear from public metadata; needs researcher confirmation before any use."
    software.append(sw)

for p in pubs + other:
    for pos in p.get("researcher_author_positions") or []:
        relationships.append({"from": RESEARCHER_ID, "relation": "authored", "to": p["id"], "position": pos,
                              "status": p["authorship"]["status"]})
relationships.append({"from": RESEARCHER_ID, "relation": "created", "to": ds_id, "status": "verified"})

write_json(STAGING / "normalized/publications.json", pubs + other)
write_json(STAGING / "normalized/datasets.json", [dataset])
write_json(STAGING / "normalized/software.json", software)
write_json(STAGING / "normalized/relationships.json", relationships)
write_json(STAGING / "normalized/reconciliation.json", {"records": recon, "duplicate_candidates": dup_candidates})
write_json(registry_path, registry)
with (STAGING / "evidence/field-evidence.jsonl").open("w", encoding="utf-8") as f:
    for e in evidence:
        f.write(json.dumps(e, ensure_ascii=False) + "\n")

from collections import Counter
print("publications:", len(pubs + other), Counter(p["verification_status"] for p in pubs + other))
print("types:", Counter(p["publication_type"] for p in pubs + other))
print("duplicate candidates:", [(d["titles"][0][:40], d["titles"][1][:40], d["similarity"]) for d in dup_candidates])
print("relationships:", len(relationships), "| evidence records:", len(evidence), "| reconciliation rows:", len(recon))
for p in pubs + other:
    print(f"  {p['id']} {p['verification_status']:<11} {str(p['dates'].get('citation_year')):<5} {p['publication_type']:<24} {p['canonical_title'][:60]}")
