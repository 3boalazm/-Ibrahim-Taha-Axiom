"""Step 2: collect public scholarly metadata (cached + logged, see common.py).

Policy:
- Official APIs only (Crossref, OpenAlex, ORCID public API, Semantic Scholar).
- Google Scholar: ONE fetch of the profile page, which robots.txt allows
  (`Allow: /citations?user=`). No pagination (`cstart` is disallowed), no
  search pages, no retries on CAPTCHA.
- ResearchGate, LinkedIn, Facebook: not fetched (login walls / terms). They are
  recorded in the source register with the export needed from the researcher.
"""
import difflib
import json
import re
import urllib.parse as up

from common import RAW, STAGING, fetch, fetch_json, norm_doi, norm_title, read_json, slug, write_json

seeds = read_json(STAGING / "normalized/seed-claims.json")["publications"]
q = up.quote


def similarity(a: str, b: str) -> float:
    na, nb = norm_title(a), norm_title(b)
    if not na or not nb:
        return 0.0
    ratio = difflib.SequenceMatcher(None, na, nb).ratio()
    ta, tb = set(na.split()), set(nb.split())
    jacc = len(ta & tb) / max(1, len(ta | tb))
    return round(max(ratio, jacc), 3)


def has_taha(names: list[str]) -> bool:
    return any(re.search(r"\btaha\b", n or "", re.I) for n in names)


# ---------------------------------------------------------------- A. search
candidates = []
for s in seeds:
    title = s["title_as_listed"]
    _, cr, _ = fetch_json(
        f"https://api.crossref.org/works?query.bibliographic={q(title)}&query.author=Taha&rows=5",
        RAW / f"publications/crossref/search/{s['seed_id']}.json",
        source_id="SRC-CR-API", method="Crossref REST /works search")
    for it in (cr or {}).get("message", {}).get("items", []):
        t = (it.get("title") or [""])[0]
        names = [f"{a.get('given', '')} {a.get('family', '')}".strip() for a in it.get("author", [])]
        year = (it.get("issued", {}).get("date-parts") or [[None]])[0][0]
        candidates.append({
            "seed_id": s["seed_id"], "source": "crossref", "doi": norm_doi(it.get("DOI")),
            "title": t, "year": year, "container": (it.get("container-title") or [None])[0],
            "type": it.get("type"), "authors": names, "score": similarity(title, t),
            "taha_in_authors": has_taha(names),
        })
    _, oa, _ = fetch_json(
        f"https://api.openalex.org/works?search={q(title)}&per-page=5",
        RAW / f"publications/openalex/search/{s['seed_id']}.json",
        source_id="SRC-OA-API", method="OpenAlex /works search")
    for w in (oa or {}).get("results", []):
        names = [a["author"]["display_name"] for a in w.get("authorships", [])]
        candidates.append({
            "seed_id": s["seed_id"], "source": "openalex", "openalex_id": w["id"],
            "doi": norm_doi(w.get("doi")), "title": w.get("title") or "",
            "year": w.get("publication_year"),
            "container": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
            "type": w.get("type"), "authors": names, "score": similarity(title, w.get("title") or ""),
            "taha_in_authors": has_taha(names),
        })


# Extra targeted queries for seeds the plain title search did not find.
EXTRA = {
    "seed-07": [("crossref", "query.bibliographic=" + q("new biased estimator zero-inflated count regression models") + "&query.author=" + q("Rady Abonazel Taha")),
                ("openalex", "search=" + q("biased estimator zero-inflated count regression Rady Abonazel"))],
    "seed-08": [("openalex", "search=" + q("Liu-type zero-inflated negative binomial shrinkage parameters Rady"))],
    "seed-09": [("openalex", "search=" + q("ridge estimators negative binomial regression Rady Abonazel Taha"))],
}
for sid, queries in EXTRA.items():
    title = next(s for s in seeds if s["seed_id"] == sid)["title_as_listed"]
    for i, (src, qs) in enumerate(queries):
        if src == "crossref":
            _, cr, _ = fetch_json(f"https://api.crossref.org/works?{qs}&rows=5", RAW / f"publications/crossref/search/{sid}-x{i}.json",
                                  source_id="SRC-CR-API", method="Crossref REST /works targeted search")
            for it in (cr or {}).get("message", {}).get("items", []):
                t = (it.get("title") or [""])[0]
                names = [f"{a.get('given', '')} {a.get('family', '')}".strip() for a in it.get("author", [])]
                candidates.append({"seed_id": sid, "source": "crossref", "doi": norm_doi(it.get("DOI")), "title": t,
                                   "year": (it.get("issued", {}).get("date-parts") or [[None]])[0][0],
                                   "container": (it.get("container-title") or [None])[0], "type": it.get("type"),
                                   "authors": names, "score": similarity(title, t), "taha_in_authors": has_taha(names)})
        else:
            _, oa, _ = fetch_json(f"https://api.openalex.org/works?{qs}&per-page=5", RAW / f"publications/openalex/search/{sid}-x{i}.json",
                                  source_id="SRC-OA-API", method="OpenAlex /works targeted search")
            for w in (oa or {}).get("results", []):
                names = [a["author"]["display_name"] for a in w.get("authorships", [])]
                candidates.append({"seed_id": sid, "source": "openalex", "openalex_id": w["id"], "doi": norm_doi(w.get("doi")),
                                   "title": w.get("title") or "", "year": w.get("publication_year"),
                                   "container": ((w.get("primary_location") or {}).get("source") or {}).get("display_name"),
                                   "type": w.get("type"), "authors": names, "score": similarity(title, w.get("title") or ""),
                                   "taha_in_authors": has_taha(names)})


def accept(c, seed):
    """Candidate is looked up in detail only if an author named Taha is present
    AND the title matches. A year mismatch alone never blocks a near-exact title
    (online-first vs print years differ); it is flagged as a conflict instead."""
    if not c["taha_in_authors"]:
        return False
    a, b = norm_title(seed["title_as_listed"]), norm_title(c["title"])
    prefix = len(a) >= 25 and b.startswith(a)
    if c["score"] >= 0.95 or prefix:
        return True
    year_ok = seed["year_as_listed"] is None or c["year"] is None or abs(c["year"] - seed["year_as_listed"]) <= 1
    return c["score"] >= 0.85 and year_ok


by_seed = {s["seed_id"]: s for s in seeds}
for c in candidates:
    c["accepted_for_lookup"] = accept(c, by_seed[c["seed_id"]])
    y = by_seed[c["seed_id"]]["year_as_listed"]
    if c["accepted_for_lookup"] and y and c["year"] and c["year"] != y:
        c["year_conflict"] = {"listed": y, "source": c["year"]}
    if not c["accepted_for_lookup"]:
        reasons = []
        if c["score"] < 0.85:
            reasons.append(f"title similarity {c['score']} < 0.85")
        if not c["taha_in_authors"]:
            reasons.append("no author named Taha")
        y = by_seed[c["seed_id"]]["year_as_listed"]
        if y and c["year"] and abs(c["year"] - y) > 1:
            reasons.append(f"year {c['year']} vs listed {y}")
        c["rejection_reasons"] = reasons
write_json(STAGING / "normalized/match-candidates.json", candidates)

dois = sorted({c["doi"] for c in candidates if c["accepted_for_lookup"] and c["doi"]})
print(f"search candidates: {len(candidates)}; accepted DOIs: {len(dois)}")

# ------------------------------------------------------- B. full DOI records
oa_author_ids = {}
for d in dois:
    fetch_json(f"https://api.crossref.org/works/{q(d)}", RAW / f"publications/crossref/works/{slug(d, 90)}.json",
               source_id="SRC-CR-API", method="Crossref REST /works/{doi}")
    _, w, _ = fetch_json(f"https://api.openalex.org/works/doi:{d}", RAW / f"publications/openalex/works/{slug(d, 90)}.json",
                         source_id="SRC-OA-API", method="OpenAlex /works/doi:{doi}")
    for a in (w or {}).get("authorships", []):
        names = [a["author"].get("display_name") or "", a.get("raw_author_name") or ""]
        if has_taha(names) and a["author"].get("id"):
            aid = a["author"]["id"].rsplit("/", 1)[-1]
            oa_author_ids.setdefault(aid, {"name": a["author"]["display_name"], "orcid": a["author"].get("orcid"), "dois": []})
            oa_author_ids[aid]["dois"].append(d)
write_json(STAGING / "normalized/openalex-taha-author-ids.json", oa_author_ids)
print("OpenAlex author IDs for 'Taha' on matched works:", {k: (v["name"], len(v["dois"]), v["orcid"]) for k, v in oa_author_ids.items()})

# ---------------------------------------------- C. OpenAlex author profiles
for aid in oa_author_ids:
    fetch_json(f"https://api.openalex.org/authors/{aid}", RAW / f"profiles/openalex/authors/{aid}.json",
               source_id="SRC-OA-API", method="OpenAlex /authors/{id}")
    _, aw, _ = fetch_json(f"https://api.openalex.org/works?filter=author.id:{aid}&per-page=200",
                          RAW / f"profiles/openalex/author-works/{aid}.json",
                          source_id="SRC-OA-API", method="OpenAlex /works?filter=author.id")
    # Works attributed to this author that the seed list did not contain:
    # fetch their full Crossref + OpenAlex records too (discovery).
    for w in (aw or {}).get("results", []):
        d = norm_doi(w.get("doi"))
        if d and d not in dois:
            fetch_json(f"https://api.crossref.org/works/{q(d)}", RAW / f"publications/crossref/works/{slug(d, 90)}.json",
                       source_id="SRC-CR-API", method="Crossref REST /works/{doi} (discovered via OpenAlex author)")
            fetch_json(f"https://api.openalex.org/works/doi:{d}", RAW / f"publications/openalex/works/{slug(d, 90)}.json",
                       source_id="SRC-OA-API", method="OpenAlex /works/doi:{doi} (discovered via OpenAlex author)")

# ------------------------------------------------------------------ D. ORCID
fetch_json("https://pub.orcid.org/v3.0/expanded-search/?q=" + q("family-name:Taha AND given-names:Ibrahim") + "&rows=200",
           RAW / "profiles/orcid/expanded-search-ibrahim-taha.json", headers={"Accept": "application/json"},
           source_id="SRC-ORCID-API", method="ORCID public API v3.0 expanded-search")
orcids = {v["orcid"].rsplit("/", 1)[-1] for v in oa_author_ids.values() if v.get("orcid")}
for oid in orcids:
    fetch_json(f"https://pub.orcid.org/v3.0/{oid}/record", RAW / f"profiles/orcid/{oid}.json",
               headers={"Accept": "application/json"}, source_id="SRC-ORCID-API", method="ORCID public API v3.0 /record")

# -------------------------------------------------------- E. Semantic Scholar
s2_fields = "title,year,venue,publicationDate,journal,authors,externalIds,citationCount,isOpenAccess,openAccessPdf"
s2_authors = {}
for d in dois:
    st, p, _ = fetch_json(f"https://api.semanticscholar.org/graph/v1/paper/DOI:{q(d)}?fields={s2_fields}",
                          RAW / f"publications/s2/paper/{slug(d, 90)}.json", source_id="SRC-S2-API",
                          method="Semantic Scholar Graph API /paper/DOI", pause=3.5, retries=5)
    for a in (p or {}).get("authors", []):
        if has_taha([a.get("name", "")]) and a.get("authorId"):
            s2_authors.setdefault(a["authorId"], {"name": a["name"], "dois": []})["dois"].append(d)
write_json(STAGING / "normalized/s2-taha-author-ids.json", s2_authors)
for sid in s2_authors:
    fetch_json(f"https://api.semanticscholar.org/graph/v1/author/{sid}?fields=name,affiliations,paperCount,citationCount,hIndex,externalIds,url",
               RAW / f"profiles/s2/author/{sid}.json", source_id="SRC-S2-API", method="Semantic Scholar /author", pause=3.5, retries=5)
    fetch_json(f"https://api.semanticscholar.org/graph/v1/author/{sid}/papers?fields=title,year,venue,externalIds,citationCount&limit=100",
               RAW / f"profiles/s2/author-papers/{sid}.json", source_id="SRC-S2-API", method="Semantic Scholar /author/papers", pause=3.5, retries=5)
print("Semantic Scholar author IDs:", {k: (v["name"], len(v["dois"])) for k, v in s2_authors.items()})

# --------------------------------------- F. Google Scholar (single page, robots-allowed)
st, body, entry = fetch("https://scholar.google.com/citations?user=VgoxbyYAAAAJ&hl=en",
                        RAW / "profiles/google-scholar/VgoxbyYAAAAJ.html", source_id="SRC-GS-PROFILE",
                        method="single HTTP GET of public profile page (robots.txt: Allow /citations?user=)",
                        headers={"Accept-Language": "en"}, retries=1)
print("Google Scholar profile page:", st)

# ------------------------------------------- G. Telegram public channel page
st, body, entry = fetch("https://t.me/StatisticalAnalysisEgypt", RAW / "profiles/telegram/StatisticalAnalysisEgypt.html",
                        source_id="SRC-TG-CHANNEL", method="single HTTP GET of public channel preview", retries=1)
print("Telegram channel page:", st)

# ------------------------------------------------- H. DOI resolution check
res = {}
for d in dois:
    st, _, e = fetch(f"https://doi.org/api/handles/{q(d)}", RAW / f"publications/doi-handles/{slug(d, 90)}.json",
                     source_id="SRC-DOI-HANDLE", method="doi.org handle API")
    res[d] = st
write_json(STAGING / "normalized/doi-resolution.json", res)
print("DOI handle status:", res)
