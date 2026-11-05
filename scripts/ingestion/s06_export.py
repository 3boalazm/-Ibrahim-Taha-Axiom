"""Step 6: exports + validation.

- exports/publications.candidates.bib : website source candidate (standard
  fields + approved internal fields + langid), with status comments.
- exports/publications.citations.bib  : public citation export; internal
  website fields removed (al-folio filtered_bibtex_keywords).
- exports/*.candidates.json           : normalized JSON per collection.
- exports/validation-report.json      : results of parsing both .bib files
  with bibtexparser (a real parser) and structural checks.
Unknown values are omitted, never guessed.
"""
import json
import re
import unicodedata

import bibtexparser
from bibtexparser.bparser import BibTexParser

from common import RAW, STAGING, now_iso, read_json, write_json

EXP = STAGING / "exports"
pubs = read_json(STAGING / "normalized/publications.json")
datasets = read_json(STAGING / "normalized/datasets.json")
software = read_json(STAGING / "normalized/software.json")
rels = read_json(STAGING / "normalized/relationships.json")
gs = read_json(STAGING / "normalized/google-scholar-profile.json")
tg = read_json(STAGING / "normalized/telegram-channel.json")
seedc = read_json(STAGING / "normalized/seed-claims.json")
orcid = read_json(RAW / "profiles/orcid/0000-0002-6141-5387.json")
oa_author = read_json(RAW / "profiles/openalex/authors/A5102868128.json")

INTERNAL = {"selected", "abbr", "abstract", "pdf", "code", "slides", "poster", "video", "supp", "website", "arxiv",
            "award", "preview", "additional_info", "annotation", "bibtex_show", "html", "altmetric", "dimensions",
            "google_scholar_id", "inspirehep_id", "hal", "pmid", "eprint", "blog", "award_name"}
STOP = {"a", "an", "the", "on", "of", "for", "to", "in", "and", "using", "new"}
PROPER = {"bayesian", "liu", "egypt", "conway", "maxwell", "poisson", "ardl", "tam", "glm", "glms"}


def ascii_slug(s):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower())


def esc(s):
    s = s.replace("\\", "\\textbackslash{}")
    s = re.sub(r"(?<!\\)([&%#_$])", r"\\\1", s)
    # keep braces balanced: drop unmatched ones (none expected in sourced data)
    depth, out = 0, []
    for ch in s:
        if ch == "{":
            depth += 1
        elif ch == "}":
            if depth == 0:
                continue
            depth -= 1
        out.append(ch)
    return "".join(out) + "}" * depth


def protect_title(t):
    words = []
    for tok in t.split(" "):
        core = re.sub(r"^[^\w]+|[^\w]+$", "", tok)
        needs = (len(core) >= 2 and core.isupper()) or any(c.isupper() for c in core[1:]) \
            or core.lower() in PROPER or re.split(r"[-–]", core.lower())[0] in PROPER
        words.append("{" + esc(tok) + "}" if needs and core else esc(tok))
    return " ".join(words)


def bib_name(a):
    if a.get("family"):
        return f"{a['family']}, {a['given']}" if a.get("given") else a["family"]
    parts = a["display"].split()           # Google Scholar format: "MR Abonazel"
    if len(parts) >= 2 and parts[0].isupper() and len(parts[0]) <= 4:
        initials = " ".join(f"{c}." for c in parts[0])
        return f"{' '.join(parts[1:])}, {initials}"
    return a["display"]


def family_of(a):
    return a.get("family") or a["display"].split()[-1]


REG_PATH = STAGING / "normalized/id-registry.json"
REG = read_json(REG_PATH)
used = {v for k, v in REG.items() if k.startswith("bibkey:")}


def make_key(p):
    """Citation keys are assigned once and persisted, so they stay stable even
    if a later correction changes the first author or the year."""
    if f"bibkey:{p['id']}" in REG:
        return REG[f"bibkey:{p['id']}"]
    key = _new_key(p)
    REG[f"bibkey:{p['id']}"] = key
    return key


def _new_key(p):
    fam = ascii_slug(family_of(p["authors"][0])) if p["authors"] else "anon"
    year = str(p["dates"].get("citation_year") or "nd")
    word = next((ascii_slug(w) for w in re.findall(r"[A-Za-z]+", p["canonical_title"]) if w.lower() not in STOP and len(w) > 2), "work")
    key, n = f"{fam}{year}{word}", 0
    while key in used:
        n += 1
        key = f"{fam}{year}{word}{chr(96 + n)}"
    used.add(key)
    return key


def fields_for(p):
    f = []
    f.append(("author", " and ".join(bib_name(a) for a in p["authors"])))
    f.append(("title", protect_title(p["canonical_title"])))
    t = p["bibtex_type"]
    venue = (p.get("venue") or {}).get("name")
    if t == "article" and venue:
        f.append(("journal", esc(venue)))
    elif t == "inproceedings" and venue:
        f.append(("booktitle", esc(venue)))
    elif t == "mastersthesis":
        f.append(("school", "Cairo University"))
    elif t == "misc" and venue:
        f.append(("howpublished", esc(venue)))
    if p["dates"].get("citation_year"):
        f.append(("year", str(p["dates"]["citation_year"])))
    for k in ("volume", "issue"):
        if p.get(k):
            f.append(("volume" if k == "volume" else "number", esc(str(p[k]))))
    if p.get("pages"):
        f.append(("pages", esc(p["pages"].replace("–", "-").replace("-", "--").replace("----", "--"))))
    elif p.get("article_number"):
        f.append(("pages", esc(str(p["article_number"]))))
    pub = (p.get("venue") or {}).get("publisher")
    if pub:
        f.append(("publisher", esc(pub)))
    doi = (p.get("identifiers") or {}).get("doi")
    if doi:
        f.append(("doi", doi))
        f.append(("url", f"https://doi.org/{doi}"))
    ak = p.get("author_keywords")
    if ak:
        f.append(("keywords", esc(", ".join(ak["values"]))))
    lang = (p.get("title_original") or {}).get("lang") or "en"
    f.append(("langid", {"en": "english", "ar": "arabic"}[lang]))
    # ---- internal website fields (approved vocabulary) ----
    short = (p.get("venue") or {}).get("short_name")
    if short and len(short) <= 12 and re.search(r"[A-Za-z]", short):
        f.append(("abbr", esc(short)))
    ab = p.get("abstract_original")
    if ab and ab.get("value") and "reconstructed" not in (ab.get("source") or ""):
        f.append(("abstract", esc(ab["value"])))
    if (p.get("urls") or {}).get("oa_pdf"):
        f.append(("pdf", p["urls"]["oa_pdf"]))
    if p["links"].get("supp"):
        f.append(("supp", p["links"]["supp"]))
    return f


def render(key, p, fields, comments=True):
    lines = []
    if comments:
        lines.append(f"% id={p['id']} status={p['verification_status']} confidence={p['confidence']} authorship={p['authorship']['status']}")
        for c in p.get("conflicts", []):
            vals = ", ".join(f"{k}={v}" for k, v in c["values"].items() if v)
            lines.append(f"% CONFLICT {c['field']}: {vals}. Exported value follows rule: {c.get('rule', 'see JSON')}. Needs review.")
        for m in p.get("missing_fields", []) or []:
            lines.append(f"% INCOMPLETE: {m} unknown")
    w = max(len(k) for k, _ in fields)
    body = ",\n".join(f"  {k.ljust(w)} = {{{v}}}" for k, v in fields)
    lines.append(f"@{p['bibtex_type']}{{{key},\n{body}\n}}")
    return "\n".join(lines)


exportable = [p for p in pubs if p.get("export_to_bibtex", True) and p["publication_type"] != "preprint"
              and p["verification_status"] != "rejected"]
exportable.sort(key=lambda p: (-(p["dates"].get("citation_year") or 0), p["canonical_title"]))
header = (f"% Ibrahim Taha Axiom: candidate publication source (Phase 2, generated {now_iso()})\n"
          "% NOT REVIEWED. Do not publish until the researcher approves.\n"
          "% Status legend: verified | conflicted (authorship verified, field conflict open) | candidate | incomplete.\n"
          "% Internal website fields (abbr, abstract, pdf, supp, ...) are removed in publications.citations.bib.\n"
          "% Sources: Crossref, OpenAlex, ORCID, publisher PDFs (CC), Google Scholar profile page, researcher's earlier site.\n")
cand_out, cite_out, keymap = [header], [header.replace("candidate publication source", "citation export (internal fields removed)")], {}
for p in exportable:
    key = make_key(p)
    keymap[p["id"]] = key
    fl = fields_for(p)
    cand_out.append(render(key, p, fl))
    cite_out.append(render(key, p, [(k, v) for k, v in fl if k not in INTERNAL], comments=False))
write_json(REG_PATH, REG)
(EXP / "publications.candidates.bib").write_text("\n\n".join(cand_out) + "\n", encoding="utf-8")
(EXP / "publications.citations.bib").write_text("\n\n".join(cite_out) + "\n", encoding="utf-8")

for p in pubs:
    p["bibtex_key"] = keymap.get(p["id"])
    p.setdefault("website", {"display": p["id"] in keymap, "reason": None if p["id"] in keymap else "not exported"})
write_json(EXP / "publications.candidates.json", {"generated_at": now_iso(), "status": "unreviewed candidates", "records": pubs,
                                                  "relationships": [r for r in rels if r["to"].startswith("pub") or r["from"].startswith("pub")]})

# ------------------------------------------------------------- researcher
emp = orcid["activities-summary"]["employments"]["affiliation-group"][0]["summaries"][0]["employment-summary"]
profile = {
    "id": "res-0001", "content_type": "researcher", "generated_at": now_iso(), "status": "unreviewed candidates",
    "names": {
        "canonical": {"value": "Ibrahim Mohamed Taha", "lang": "en", "status": "verified",
                      "basis": "OpenAlex display name, publisher PDFs, researcher's site; ORCID uses 'Ibrahim M. Taha'"},
        "variants": [{"value": v, "source": s} for v, s in [("Ibrahim M. Taha", "ORCID, Google Scholar, Crossref"),
                     ("Ibrahim Mohamed Taha", "OpenAlex, Crossref, publisher PDFs"), ("I. M. Taha", "Semantic Scholar"),
                     ("IM Taha / I Taha", "Google Scholar author strings"), ("Taha, Ibrahim M.", "DataCite, OpenAlex alternatives")]],
        "arabic": {"value": None, "status": "incomplete", "note": "Official Arabic spelling not found in any source; needs the researcher."},
    },
    "identifiers": [
        {"type": "ORCID", "value": "0000-0002-6141-5387", "url": "https://orcid.org/0000-0002-6141-5387", "status": "verified", "confidence": "high",
         "basis": "researcher-maintained record; employment and works match all other anchors"},
        {"type": "OpenAlex author", "value": "A5102868128", "status": "verified", "confidence": "high", "basis": "linked to the ORCID iD; 9 works all consistent"},
        {"type": "Google Scholar", "value": "VgoxbyYAAAAJ", "url": "https://scholar.google.com/citations?user=VgoxbyYAAAAJ", "status": "verified",
         "confidence": "high", "basis": "verified sadatacademy.edu.eg e-mail; linked from the researcher's site; works match"},
        {"type": "Scopus Author ID", "value": "57226774796", "status": "restricted", "confidence": "medium", "basis": "listed on ORCID; Scopus not accessible"},
        {"type": "Scopus Author ID", "value": "58577960300", "status": "restricted", "confidence": "medium",
         "basis": "listed on ORCID; a second Scopus ID suggests a split profile (merge request may be needed)"},
        {"type": "ResearcherID (Web of Science)", "value": "A-3519-2019", "status": "restricted", "confidence": "medium", "basis": "listed on ORCID; WoS not accessible"},
        {"type": "Semantic Scholar author", "value": "2142163895", "status": "candidate", "confidence": "medium",
         "basis": "7 matching DOIs; also holds one misattributed 1970 record"},
        {"type": "Semantic Scholar author", "value": "145792199", "status": "rejected", "basis": "different person (power engineering), see identity review"},
        {"type": "ResearchGate", "value": "Ibrahim_Taha11", "url": "https://www.researchgate.net/profile/Ibrahim_Taha11", "status": "restricted",
         "confidence": "medium", "basis": "linked from the researcher's site; not accessed (automated access restricted)"},
        {"type": "LinkedIn", "value": "ibrahimaboalazm", "status": "restricted", "confidence": "medium", "basis": "linked from the researcher's site; login wall"},
        {"type": "GitHub", "value": "IbrahimTaha2018", "url": "https://github.com/IbrahimTaha2018", "status": "candidate", "confidence": "medium",
         "basis": "linked from the researcher's Zenodo deposit"},
    ],
    "affiliations": [
        {"organization": "Sadat Academy for Management Sciences", "department": emp.get("department-name"),
         "role": (emp.get("role-title") or "").strip(), "start_year": int(emp["start-date"]["year"]["value"]), "end_year": None,
         "location_variants": [{"value": "Tanta, Egypt", "source": "publisher PDFs 2023 (Economics and Business), 2025 (Organizacija)"},
                               {"value": "Maadi, Cairo", "source": "publisher PDF 2026 (Production Engineering Archives); researcher's earlier site"}],
         "status": "verified", "confidence": "high", "basis": "ORCID employment + Google Scholar verified e-mail + OpenAlex + PDFs",
         "open_question": "Branch appears as Tanta (2023, 2025) and Maadi, Cairo (2026). Which is current, and should the history be shown?"},
        {"organization": "Faculty of Graduate Studies for Statistical Research (FGSSR), Cairo University",
         "department": "Department of Applied Statistics and Econometrics", "role": "PhD candidate (claimed)",
         "status": "candidate", "confidence": "medium",
         "basis": "affiliation printed in SOIC 2024 and Frontiers 2022 PDFs; OpenAlex lists Cairo University 2024-2026; PhD status only self-reported"},
    ],
    "education": [{"degree": "Master's", "institution": "Cairo University", "year": 2019,
                   "thesis_title": "Handling Multicollinearity Problem in Generalized Linear Models", "status": "candidate",
                   "basis": "Google Scholar entry 'Masters dissertation, Cairo University'"},
                  {"degree": "PhD (in progress)", "field": "Applied Statistics and Econometrics", "institution": "FGSSR, Cairo University",
                   "status": "candidate", "basis": "researcher's earlier site only"}],
    "research_interests": {
        "researcher_maintained": {"values": [k["content"] for k in (orcid["person"].get("keywords") or {}).get("keyword", [])], "source": "ORCID keywords"},
        "google_scholar": {"values": gs["interests"], "source": "Google Scholar profile"},
        "self_described": {"values": seedc["research_areas_claimed"], "source": "researcher's earlier site"},
    },
    "outreach": {"name": "Statistical Analysis – Egypt", "telegram": {"title": tg["title"], "members_observed": tg["members_observed"],
                 "retrieved_at": tg["retrieved_at"], "url": tg["url"], "status": "verified (count observed)"},
                 "facebook": {"status": "restricted", "self_reported": {"page_followers": "390,000+", "group_members": "118,000+"}},
                 "ownership": {"status": "candidate", "basis": "self-reported founder/admin; not verifiable from public pages"}},
    "professional_claims": {"consulting_projects": {"value": "450+", "status": "candidate", "basis": "self-reported; not verifiable"},
                            "software": {"values": seedc["software_claimed"], "status": "candidate", "basis": "self-reported; ORCID keywords confirm SPSS, AMOS, SmartPLS, R"}},
    "contact": {"status": "private", "note": "Personal e-mail and phone exist in the supplied source. Not exported; publishing needs explicit approval (D-08)."},
}
write_json(EXP / "researcher-profile.candidates.json", profile)

# ------------------------------------------------------------ other collections
by_type = {}
for p in pubs:
    by_type.setdefault(p["publication_type"], []).append(p)


def pick(title_start):
    return next(p["id"] for p in pubs if p["canonical_title"].startswith(title_start))


lines = [
    {"id": "line-01", "label": "Penalized / shrinkage estimators for count regression (negative binomial, zero-inflated, Conway-Maxwell-Poisson)",
     "publications": [pick("Ridge estimators for the negative"), pick("New shrinkage parameters"), pick("A new biased estimator"),
                      pick("Development of Penalized"), pick("An analytical family")], "datasets": [datasets[0]["id"]]},
    {"id": "line-02", "label": "Shrinkage estimators for beta regression", "publications": [pick("Beta ridge"), pick("A New Two-Parameter")]},
    {"id": "line-03", "label": "Bayesian estimation (prior selection)", "publications": [pick("A Note on Prior")]},
    {"id": "line-04", "label": "Applied behavioural / management studies (TAM, green creativity, cybersecurity behaviour, green HRM; SEM-based)",
     "publications": [pick("Using TAM to Evaluate the Effect of Intensive"), pick("The Role of Environmental"), pick("The Impact of Students"), pick("The moderating role")]},
]
write_json(EXP / "projects.candidates.json", {
    "generated_at": now_iso(), "projects": [],
    "note": "No formally documented research projects (grants, project pages) were found. The groupings below are INFERRED from shared topics and linked deposits. They are proposals for the researcher to confirm, rename or discard.",
    "proposed_research_lines": [dict(l, status="candidate", basis="inferred from publication topics") for l in lines]})
write_json(EXP / "courses.candidates.json", {
    "generated_at": now_iso(), "courses": [],
    "teaching_role": {"value": "Teaching Assistant, Mathematics, Statistics, and Insurance, Sadat Academy for Management Sciences (since 2017)",
                      "status": "verified", "source": "ORCID employment record"},
    "claimed_teaching_topics": {"status": "candidate", "source": "researcher's earlier site (services section)",
                                "values": ["R programming & statistical computing", "SPSS · Stata · EViews workshops", "Statistical inference & probability"]},
    "note": "No course titles, codes, terms or materials were found in any source. Needs the researcher (course list, syllabi, slides)."})
talks = []
for p in by_type.get("conference_paper", []):
    talks.append({"id": f"talk-{p['id'][4:]}", "content_type": "talk", "title": p["canonical_title"], "event": p["venue"]["name"],
                  "year": p["dates"]["citation_year"], "related_publication": p["id"], "presented_by_researcher": None,
                  "status": "candidate", "note": "Conference paper is listed; whether and by whom it was presented is unknown."})
write_json(EXP / "talks.candidates.json", {"generated_at": now_iso(), "talks": talks,
                                           "note": "No talk list, slides or event pages found. Only conference papers suggest possible presentations."})
write_json(EXP / "datasets.candidates.json", {"generated_at": now_iso(), "datasets": datasets})
write_json(EXP / "software.candidates.json", {"generated_at": now_iso(), "repositories": software})

# ------------------------------------------------------------------ validate
report = {"generated_at": now_iso(), "parser": f"bibtexparser {bibtexparser.__version__}", "files": {}}
REQ = {"article": ["author", "title", "journal", "year"], "inproceedings": ["author", "title", "booktitle", "year"],
       "mastersthesis": ["author", "title", "school", "year"], "misc": ["author", "title"]}
for name in ("publications.candidates.bib", "publications.citations.bib"):
    parser = BibTexParser(common_strings=False)
    parser.ignore_nonstandard_types = False
    db = bibtexparser.loads((EXP / name).read_text(encoding="utf-8"), parser=parser)
    issues = []
    keys = [e["ID"] for e in db.entries]
    if len(keys) != len(set(keys)):
        issues.append("duplicate keys")
    for e in db.entries:
        for r in REQ.get(e["ENTRYTYPE"], []):
            if not e.get(r):
                issues.append(f"{e['ID']}: missing required '{r}'" + (" (unknown, left empty)" if r == "year" else ""))
        if "doi" in e and not re.fullmatch(r"10\.\d{4,9}/\S+", e["doi"]):
            issues.append(f"{e['ID']}: malformed doi")
        if "doi" in e and e["doi"] != e["doi"].lower():
            issues.append(f"{e['ID']}: doi not normalized")
        if "langid" not in e:
            issues.append(f"{e['ID']}: langid missing")
        if any(v.strip() in ("", "None", "null") for v in e.values()):
            issues.append(f"{e['ID']}: empty/None value")
        if name.endswith("citations.bib"):
            leaked = sorted(set(e) & INTERNAL)
            if leaked:
                issues.append(f"{e['ID']}: internal fields leaked {leaked}")
    # round-trip: parsed titles must equal source titles once LaTeX protection is removed
    src = {keymap[p["id"]]: p["canonical_title"] for p in exportable}
    for e in db.entries:
        back = re.sub(r"[{}]", "", e.get("title", "")).replace("\\&", "&").replace("\\%", "%")
        if back != src[e["ID"]]:
            issues.append(f"{e['ID']}: title round-trip mismatch")
    report["files"][name] = {"entries": len(db.entries), "types": {t: sum(1 for e in db.entries if e["ENTRYTYPE"] == t) for t in REQ},
                             "issues": issues, "valid": not [i for i in issues if "unknown, left empty" not in i]}
write_json(EXP / "validation-report.json", report)
print(json.dumps(report, indent=1, ensure_ascii=False)[:2500])
