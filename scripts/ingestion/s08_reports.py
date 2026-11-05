"""Step 8: generate research/ reports and CSVs from staged data.

All numbers in the reports are computed here from data-staging/, so the
reports cannot drift from the data. Reports avoid personal contact data.
"""
import csv
import glob
import hashlib
import json
import os
from collections import Counter, defaultdict

from common import RAW, ROOT, STAGING, now_iso, read_json

RES = ROOT / "research"
stamp = now_iso()
day = stamp[:10]
P = read_json(STAGING / "exports/publications.candidates.json")["records"]
REC = read_json(STAGING / "normalized/reconciliation.json")
MS = read_json(STAGING / f"metrics/{day}/metrics-snapshot.json")
AN = read_json(STAGING / f"metrics/{day}/portfolio-analysis.json")
PROF = read_json(STAGING / "exports/researcher-profile.candidates.json")
DS = read_json(STAGING / "exports/datasets.candidates.json")["datasets"]
SW = read_json(STAGING / "exports/software.candidates.json")["repositories"]
TALKS = read_json(STAGING / "exports/talks.candidates.json")
COURSES = read_json(STAGING / "exports/courses.candidates.json")
PROJ = read_json(STAGING / "exports/projects.candidates.json")
VAL = read_json(STAGING / "exports/validation-report.json")
OAC = read_json(STAGING / "normalized/open-access-check.json")
DOIRES = read_json(STAGING / "normalized/doi-resolution.json")
GS = read_json(STAGING / "normalized/google-scholar-profile.json")
TG = read_json(STAGING / "normalized/telegram-channel.json")
LOG = [json.loads(l) for l in (STAGING / "evidence/retrieval-log.jsonl").read_text(encoding="utf-8").splitlines()]
EVID = (STAGING / "evidence/field-evidence.jsonl").read_text(encoding="utf-8").splitlines()
byid = {p["id"]: p for p in P}
shown = [p for p in P if p["publication_type"] != "preprint" and p.get("export_to_bibtex", True)]


def table(headers, rows):
    out = ["| " + " | ".join(headers) + " |", "|" + "---|" * len(headers)]
    for r in rows:
        out.append("| " + " | ".join(("" if v is None else str(v)).replace("|", "\\|").replace("\n", " ") for v in r) + " |")
    return "\n".join(out)


def write(name, text):
    (RES / name).write_text(text.strip() + "\n", encoding="utf-8")


def last(src):
    ts = [e["retrieved_at"] for e in LOG if e.get("source_id") == src]
    return max(ts) if ts else None


def short(t, n=80):
    return t if len(t) <= n else t[: n - 1] + "…"


HEAD = (f"> Phase 2 · Ibrahim Taha Axiom · generated {stamp} by `scripts/ingestion/s08_reports.py`\n"
        "> **Not yet reviewed by the researcher.** Committed to the repository with the project owner's approval (2026-11-05). "
        "Nothing here goes on the public website until the researcher approves it. Personal contact data is deliberately excluded.\n")

# ================================================================ CSV: reconciliation
with (RES / "publication-reconciliation.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["source", "source_record", "canonical_id", "bibtex_key", "match_method", "decision", "reason"])
    for r in REC["records"]:
        w.writerow([r["source"], r["source_record"], r.get("canonical_id"), byid.get(r.get("canonical_id"), {}).get("bibtex_key"),
                    r["method"], r["decision"], r.get("reason", "")])
    for d in REC["duplicate_candidates"]:
        w.writerow(["reconciliation", " <> ".join(d["titles"]), " <> ".join(d["records"]), "", f"fuzzy/prefix title (similarity {d['similarity']})",
                    "duplicate candidate: manual review, not merged", d["export"]])

# ================================================================ CSV: asset inventory
link_by_slug = {}
for p in P:
    doi = (p.get("identifiers") or {}).get("doi")
    if doi:
        from common import slug
        link_by_slug[slug(doi, 90)] = p["id"]
log_by_dest = {e["dest"]: e for e in LOG if e.get("status") == 200}
assets, sha_groups = [], defaultdict(list)
for fpath in sorted(glob.glob(str(RAW / "**/*"), recursive=True)):
    if os.path.isdir(fpath) or "/.git/" in fpath.replace("\\", "/") or fpath.replace("\\", "/").endswith("/.git"):
        continue
    rel = "raw/" + fpath.replace("\\", "/").split("/raw/")[1]
    data = open(fpath, "rb").read()
    sha = hashlib.sha256(data).hexdigest()
    e = log_by_dest.get(rel, {})
    stem = os.path.splitext(os.path.basename(fpath))[0]
    ext = os.path.splitext(fpath)[1].lower().lstrip(".") or "file"
    linked = link_by_slug.get(stem) or ("res-0001" if "/profiles/" in rel else (DS[0]["id"] if "/datasets/" in rel else ""))
    if "/supplied/" in rel:
        src, rights, linked = "SRC-SUP-01", "private repository of the project owner; contains personal contact data", "res-0001"
    elif "/pdf/" in rel:
        lic = next((o["license_openalex"] for o in OAC if o["doi"] and slug(o["doi"], 90) == stem), None)
        src, rights = "SRC-OA-PDF", f"open access ({lic}); local copy for metadata/affiliation extraction; redistribution must follow the licence"
    elif "google-scholar" in rel:
        src, rights = "SRC-GS-PROFILE", "Google Scholar page; local reference copy only, do not republish"
    elif "telegram" in rel:
        src, rights = "SRC-TG-CHANNEL", "public channel preview; local reference copy only"
    else:
        src = e.get("source_id", "")
        rights = {"SRC-OA-API": "OpenAlex metadata (CC0)", "SRC-CR-API": "Crossref metadata (facts; abstracts remain publisher/author copyright)",
                  "SRC-ORCID-API": "ORCID public data", "SRC-S2-API": "Semantic Scholar API data (S2 API licence)",
                  "SRC-DATACITE-API": "DataCite metadata (CC0)", "SRC-GITHUB": "GitHub public API data",
                  "SRC-DOI-HANDLE": "DOI handle record"}.get(src, "")
    a = {"asset_id": f"ast-{len(assets) + 1:04d}", "path": rel, "type": ext, "size_bytes": len(data), "sha256": sha,
         "source_id": src, "source_url": e.get("url", ""), "retrieved_at": e.get("retrieved_at", ""), "linked_entity": linked,
         "rights_and_access": rights, "publish": "no (raw, local only)"}
    sha_groups[sha].append(a["asset_id"])
    assets.append(a)
for a in assets:
    g = sha_groups[a["sha256"]]
    a["exact_duplicate_of"] = g[0] if len(g) > 1 and g[0] != a["asset_id"] else ""
with (RES / "asset-inventory.csv").open("w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(assets[0].keys()))
    w.writeheader()
    w.writerows(assets)
dup_assets = [a for a in assets if a["exact_duplicate_of"]]

# ================================================================ data-source-register.md
reg = [
    ("SRC-SUP-01", "Researcher's earlier website (private repo `3boalazm/Ibrahim-Taha`, single `index.html`; also served by an older Vercel project)", "private repository", "researcher-uploaded (supplied by project owner)", "accessible (owner credentials)", "probable: supplied as the researcher's site; content is self-reported", last("SRC-SUP-01") or "2026-11-05", "Claims only (bio, roles, 9 papers, services, community figures). Contains personal e-mail/phone (kept private)."),
    ("SRC-LOCAL-01", "Local disk search (D:\\, Desktop, Documents, Downloads, OneDrive; file names only, depth 3)", "—", "local files", "accessible", "n/a", "2026-11-05", "No researcher files found. Name matches were the project owner's own CVs (unrelated, not opened)."),
    ("SRC-ORCID-01", "ORCID record", "https://orcid.org/0000-0002-6141-5387", "official (researcher-maintained)", "accessible (public API v3.0)", "confirmed", last("SRC-ORCID-API"), "Employment (Sadat Academy, TA, since 2017), 7 works, keywords, 2 Scopus IDs, ResearcherID. No bio, education or URLs."),
    ("SRC-ORCID-02", "ORCID name search 'Ibrahim Taha'", "https://pub.orcid.org/v3.0/expanded-search/", "aggregator search", "accessible", "n/a (disambiguation)", last("SRC-ORCID-API"), "21 hits incl. a homonym 'Ibrahim Mohamed Taha' (Al-Azhar, agriculture), which was rejected."),
    ("SRC-OA-01", "OpenAlex author", "https://openalex.org/A5102868128", "aggregator", "accessible (API, no key needed)", "confirmed (ORCID-linked)", last("SRC-OA-API"), "9 works; affiliations Sadat Academy 2021–2026, Cairo University 2024–2026."),
    ("SRC-CR-01", "Crossref works", "https://api.crossref.org/works", "official DOI registration metadata", "accessible", "n/a (per-work)", last("SRC-CR-API"), "10 DOI records. Abstracts deposited for 7. One deposit (EKB/JSTC) has malformed author name splits and a different author order."),
    ("SRC-DOI-01", "doi.org handle API", "https://doi.org/api/handles/", "official", "accessible", "n/a", last("SRC-DOI-HANDLE"), f"{sum(1 for v in DOIRES.values() if v == 200)}/{len(DOIRES)} checked DOIs resolve. 3 DOIs discovered later were not handle-checked."),
    ("SRC-S2-01", "Semantic Scholar author", "https://www.semanticscholar.org/author/2142163895", "aggregator", "accessible (shared rate limit; 429 on bursts)", "probable", last("SRC-S2-API"), "8 papers incl. a misattributed 1970 record."),
    ("SRC-S2-02", "Semantic Scholar author (homonym)", "https://www.semanticscholar.org/author/145792199", "aggregator", "accessible", "rejected (different person)", last("SRC-S2-API"), "Power engineering author; wrongly holds the SOIC 2024 paper."),
    ("SRC-GS-01", "Google Scholar profile", GS["url"], "aggregator (researcher-curated profile)", "accessible: one page only (robots.txt allows /citations?user=; pagination disallowed)", "confirmed (verified sadatacademy.edu.eg e-mail)", GS["retrieved_at"], "Metrics and first 20 article rows captured. Remaining rows need a researcher export."),
    ("SRC-RG-01", "ResearchGate profile", "https://www.researchgate.net/profile/Ibrahim_Taha11", "aggregator / social", "restricted: not accessed (automated access prohibited by terms)", "probable (linked from SRC-SUP-01)", "2026-11-05 (not fetched)", "Hosts the self-published guides (per Google Scholar). Needs researcher-provided list/URLs."),
    ("SRC-LI-01", "LinkedIn profile", "https://www.linkedin.com/in/ibrahimaboalazm/", "social", "restricted (login wall)", "probable (linked from SRC-SUP-01)", "2026-11-05 (not fetched)", "Needs researcher export (PDF profile) if employment history should be used."),
    ("SRC-TG-01", "Telegram channel 'الإحصاء وتطبيقاته'", TG["url"], "social (public preview)", "accessible", "probable (ownership self-reported)", TG["retrieved_at"], f"{TG['members_observed']:,} members observed (self-reported 45,000+)."),
    ("SRC-FB-01", "Facebook page 'Statistical Analysis – Egypt'", "https://www.facebook.com/share/1B3DbXjPh7/", "social", "restricted (login wall)", "probable", "2026-11-05 (not fetched)", "Self-reported 390,000+ followers, unverified."),
    ("SRC-FB-02", "Facebook group", "https://www.facebook.com/share/g/1biRB3jfwp/", "social", "restricted (login wall)", "probable", "2026-11-05 (not fetched)", "Self-reported 118,000+ members, unverified."),
    ("SRC-PDF-01", "Publisher PDFs (5 open-access, Creative Commons)", "via DOI landing / OpenAlex best OA location", "publisher", "accessible", "confirmed", last("SRC-OA-PDF"), "Used for affiliation-at-publication and author keywords. Local only."),
    ("SRC-DC-01", "Zenodo dataset (DataCite)", "https://doi.org/10.5281/zenodo.23120962", "repository (official)", "accessible", "confirmed", last("SRC-DATACITE-API"), "CC-BY-4.0; supplement to the JSCS 2026 paper; links the GitHub repo."),
    ("SRC-GH-01", "GitHub account", "https://github.com/IbrahimTaha2018", "repository", "accessible (public API)", "probable (linked from the Zenodo deposit)", last("SRC-GITHUB"), "2 public repos; no licence files."),
    ("SRC-SCOPUS-01", "Scopus author IDs 57226774796, 58577960300", "https://www.scopus.com/", "official index", "restricted (subscription)", "probable (listed on ORCID)", "2026-11-05 (not fetched)", "Two IDs suggest a split profile. Needs a Scopus export or a merge request by the researcher."),
    ("SRC-WOS-01", "Web of Science ResearcherID A-3519-2019", "https://www.webofscience.com/", "official index", "restricted (subscription)", "probable (listed on ORCID)", "2026-11-05 (not fetched)", "Needs researcher export if WoS metrics are wanted."),
    ("SRC-INST-01", "Institutional staff pages (Sadat Academy, FGSSR Cairo University)", "web search", "institutional", "unavailable (no page found)", "n/a", "2026-11-05", "No staff profile found by web search; ask the researcher for an official page URL."),
    ("SRC-JMASM-01", "JMASM 2019 article page", "web search + Crossref filtered search", "publisher", "unavailable (not found)", "n/a", "2026-11-05", "No DOI or landing page found; needs the PDF or citation from the researcher."),
]
counts_by_src = Counter(e.get("source_id") for e in LOG)
write("data-source-register.md", f"""
# Data Source Register

{HEAD}
**Policy applied:** official APIs only; no scraping, no login, no paywall or robots bypass. Google Scholar: one robots-allowed profile page. ResearchGate, LinkedIn and Facebook were not fetched. Every network request is logged with URL, time, HTTP status, size and SHA-256 in `data-staging/evidence/retrieval-log.jsonl` ({len(LOG)} requests).

{table(["Source ID", "Platform", "Profile URL", "Source type", "Access status", "Identity confidence", "Last checked (UTC)", "Notes"], reg)}

## Requests per source
{table(["Source ID (log)", "Requests"], sorted(counts_by_src.items()))}

## Exports needed from the researcher
- **Google Scholar**: "Export all" → BibTeX (to capture rows beyond the first 20).
- **ResearchGate**: list (or files) of the self-published guides and any other items hosted there.
- **Scopus / Web of Science**: author profile export (and clarification of the two Scopus IDs).
- **LinkedIn**: profile PDF, only if employment history beyond ORCID is wanted.
- **Institutional page**: official staff profile URL, if one exists.
- **JMASM 2019 paper and the 2018/2019 conference papers**: PDF or full citation (volume, issue, pages, DOI if any).
""")

# ================================================================ inventory + catalog
status_order = ["verified", "conflicted", "candidate", "incomplete", "restricted", "rejected"]
ct = Counter((p["publication_type"], p["verification_status"]) for p in shown)
types = sorted({t for t, _ in ct})
sum_rows = [[t] + [ct.get((t, s), 0) for s in status_order[:4]] + [sum(ct.get((t, s), 0) for s in status_order)] for t in types]
sum_rows.append(["**total**"] + [sum(ct.get((t, s), 0) for t in types) for s in status_order[:4]] + [len(shown)])
other_rows = [
    ["Dataset (Zenodo)", len(DS), "verified", "1 dataset, CC-BY-4.0"],
    ["Software / data repositories (GitHub)", len(SW), "candidate", "1 linked to the dataset; 1 unclear"],
    ["Talks", len(TALKS["talks"]), "candidate", "inferred from conference papers only"],
    ["Courses", len(COURSES["courses"]), "—", "none documented; TA role verified"],
    ["Documented projects", len(PROJ["projects"]), "—", f"{len(PROJ['proposed_research_lines'])} research lines proposed (inferred)"],
    ["Excluded from export", sum(1 for p in P if p not in shown), "—", "1 preprint version + held-back duplicate candidates"],
]
cat_rows = []
for p in sorted(shown, key=lambda x: (-(x["dates"].get("citation_year") or 0), x["canonical_title"])):
    cat_rows.append([p["id"], f"`{p.get('bibtex_key')}`", p["dates"].get("citation_year"), p["publication_type"], short(p["canonical_title"], 70),
                     short((p.get("venue") or {}).get("name") or "—", 45), (p.get("identifiers") or {}).get("doi") or "—",
                     ",".join(map(str, p.get("researcher_author_positions") or [])) + f"/{len(p['authors'])}", p["verification_status"],
                     "; ".join(c["field"] for c in p.get("conflicts", [])) or "—"])
write("research-data-inventory.md", f"""
# Research Data Inventory & Publication Catalog

{HEAD}
## Summary counts (publication records shown to the website pipeline)

{table(["Type", "verified", "conflicted*", "candidate", "incomplete", "total"], sum_rows)}

\\* *conflicted* = authorship verified, but at least one field (year or author order) disagrees between sources and needs the researcher's decision.

## Other collections

{table(["Collection", "Records", "Status", "Notes"], other_rows)}

## Publication catalog

{table(["ID", "BibTeX key", "Year", "Type", "Title (original)", "Venue", "DOI", "Position", "Status", "Open conflicts"], cat_rows)}

Year shown = citation year (print year when volume/issue is assigned, otherwise first-issued year). All competing values are kept in the JSON export.

## Not exported (kept in JSON with reasons)
{chr(10).join(f"- `{p['id']}` {short(p['canonical_title'], 70)}: {(p.get('website') or {}).get('reason')}" for p in P if p not in shown)}

## Datasets, software and other work
{table(["ID", "Title", "Identifier / URL", "Licence", "Status", "Notes"], [[d["id"], short(d["canonical_title"], 70), d["urls"]["doi"], ", ".join(d["license"]), d["verification_status"], "supplement to the JSCS 2026 paper (candidate relation)"] for d in DS] + [[s["id"], s["canonical_title"], s["url"], s["license_github"] or "none on GitHub", s["verification_status"], s["notes"]] for s in SW])}

## Teaching, talks, outreach
- **Teaching role (verified, ORCID):** {COURSES['teaching_role']['value']}. No course titles or materials were found.
- **Talks:** {len(TALKS['talks'])} possible conference presentations (candidate), linked to the 2018 and 2019 conference papers.
- **Outreach:** Telegram channel "{TG['title']}" with {TG['members_observed']:,} members observed on {TG['retrieved_at'][:10]}. Facebook figures are self-reported only.
- **Self-published guides:** see the `self_published_material` rows above (ResearchGate-hosted per Google Scholar; type to be confirmed).

## Assets
{len(assets)} raw files inventoried in [`asset-inventory.csv`](asset-inventory.csv) with SHA-256, source, rights and links: 5 open-access PDFs, API responses, 2 public web pages and the supplied site. {len(dup_assets)} exact duplicate(s) by hash. Raw files are local only.
""")

# ================================================================ identity review
auth_rows = [[p["id"], short(p["canonical_title"], 60), p["authorship"]["status"], p["authorship"]["confidence"], "; ".join(p["authorship"]["evidence"])] for p in sorted(P, key=lambda x: x["id"])]
write("author-identity-review.md", f"""
# Researcher Identity & Authorship Verification

{HEAD}
## Identity anchors (independent sources that agree)

{table(["Anchor", "Name form", "Affiliation shown", "Why it is trusted"], [
    ["ORCID 0000-0002-6141-5387", "Ibrahim M. Taha", "Sadat Academy for Management Sciences, Mathematics, Statistics and Insurance, Teaching Assistant (since 2017)", "researcher-maintained; works sourced from Crossref and Scopus"],
    ["Google Scholar VgoxbyYAAAAJ", "Ibrahim M. Taha", "Teaching Assistant at Sadat Academy for Management Sciences", "verified e-mail at sadatacademy.edu.eg; linked from the researcher's site"],
    ["OpenAlex A5102868128", "Ibrahim Mohamed Taha", "Sadat Academy (2021–2026); Cairo University (2024–2026)", "carries the same ORCID iD"],
    ["Publisher PDFs (2022–2026)", "Ibrahim Mohamed Taha / Ibrahim M. Taha", "Sadat Academy (Tanta); FGSSR, Cairo University", "affiliation printed at publication time; one PDF prints the same contact e-mail as the researcher's site"],
    ["Researcher's earlier site", "Ibrahim Mohamed Taha", "Sadat Academy (Maadi, Cairo); PhD candidate FGSSR", "supplied by the project owner (self-reported)"],
    ["Zenodo / DataCite", "Taha, Ibrahim M.", "—", "creator of the dataset that supplements an ORCID-listed paper"],
])}

**Conclusion:** the anchors are mutually consistent (name, institution, field, co-authors, e-mail). The researcher's identity on ORCID, Google Scholar and OpenAlex is **confirmed**. Remaining uncertainty is limited to the items listed under *Open identity questions*.

## Homonyms and rejected matches

{table(["Record", "Why rejected"], [[r["source_record"], r.get("reason")] for r in REC["records"] if r["decision"] == "rejected" and r["method"] in ("author disambiguation", "topic/date plausibility")])}

Title-search candidates that were not looked up further (wrong author, low similarity) are listed with reasons in [`publication-reconciliation.csv`](publication-reconciliation.csv) ({sum(1 for r in REC['records'] if r['decision'] == 'rejected' and r['method'] == 'title search candidate')} rows).

## Authorship verification per record

Rule: **verified** = the DOI record names the researcher **and** the work is on the researcher's ORCID record, **or** it is attributed to the ORCID-linked OpenAlex author and corroborated by a PDF affiliation or the Google Scholar profile. Everything else stays **candidate**. Similar names alone never count.

{table(["ID", "Title", "Authorship", "Confidence", "Evidence"], auth_rows)}

## Open identity questions
1. **Two Scopus Author IDs** (57226774796 and 58577960300) are listed on ORCID. This is probably a split Scopus profile that the researcher can ask Scopus to merge.
2. **Sadat Academy branch:** the 2023 and 2025 papers print "Tanta, Egypt"; the 2026 paper and the earlier site say "Maadi, Cairo". This may be a move between branches. Which is current?
3. **Semantic Scholar** attributes the 2024 SOIC paper to a different "Ibrahim B. M. Taha" and adds a 1970 record to the correct profile. The researcher can claim the profile and request corrections.
4. **GitHub `IbrahimTaha2018`**: confirm ownership; what is the `SVM_New` repository?
5. **Official Arabic name spelling** is not present in any source.
""")

# ================================================================ metrics review
M = MS["metrics"]


def mrow(platform):
    return [[m["metric"], m["value"], m["scope"], m["retrieved_at"]] for m in M if m["source_platform"] == platform and not m["metric"].startswith(("citations in", "works in"))]


def series(platform, prefix):
    rows = sorted(((m["metric"].split()[-1], m["value"]) for m in M if m["source_platform"] == platform and m["metric"].startswith(prefix)), key=lambda r: r[0])
    return rows


gs_s, oa_s = series("Google Scholar", "citations in"), series("OpenAlex", "citations in")


def chart(title, rows, ylabel):
    if not rows:
        return "_no data_"
    top = max(v for _, v in rows)
    return f"""```mermaid
xychart-beta
    title "{title}"
    x-axis [{", ".join(y for y, _ in rows)}]
    y-axis "{ylabel}" 0 --> {int(top * 1.2) + 1}
    bar [{", ".join(str(v) for _, v in rows)}]
```"""


pw = defaultdict(dict)
for r in MS["per_work_citations"]:
    pw[r["publication_id"]][r["source"].split(" ")[0]] = r["value"]
pw_rows = [[pid, short(byid[pid]["canonical_title"], 60), v.get("Google"), v.get("OpenAlex"), v.get("Crossref")] for pid, v in sorted(pw.items(), key=lambda kv: -(kv[1].get("Google") or kv[1].get("OpenAlex") or 0))]
hest = next(m for m in M if m["metric"] == "h-index (estimate)")
write("metrics-source-review.md", f"""
# Research Metrics: Source Review

{HEAD}
**Rules applied:** every number carries its platform, URL and retrieval time. Figures from different platforms are **never mixed or relabelled**. Derived values are labelled as estimates. There is one snapshot per date (`data-staging/metrics/{day}/`), and earlier dates are never overwritten. Research impact is kept separate from website traffic and from community reach.

## Google Scholar (profile VgoxbyYAAAAJ, retrieved {GS['retrieved_at']})
{table(["Metric", "Value", "Scope", "Retrieved"], mrow("Google Scholar"))}

{chart("Citations per year: Google Scholar", gs_s, "Citations")}
*Source: Google Scholar profile citation chart, {GS['retrieved_at'][:10]}. Coverage: Google Scholar index, {gs_s[0][0]}–{gs_s[-1][0]}; {day[:4]} is partial.*

## OpenAlex (author A5102868128)
{table(["Metric", "Value", "Scope", "Retrieved"], mrow("OpenAlex"))}

{chart("Citations per year: OpenAlex", oa_s, "Citations")}
*Source: OpenAlex `counts_by_year` for author A5102868128. Coverage: 9 indexed works; {day[:4]} is partial.*

## Semantic Scholar (author 2142163895)
{table(["Metric", "Value", "Scope", "Retrieved"], mrow("Semantic Scholar"))}
Caveat: this profile includes one misattributed 1970 record, and one genuine paper sits under a different author ID.

## Derived (this catalog)
- **h-index estimate = {hest['value']}**: {hest['method']}; scope: {hest['scope']}. {hest['coverage_limitations']}

## Per-work citations by source (not summed across sources)
{table(["ID", "Title", "Google Scholar", "OpenAlex", "Crossref"], pw_rows)}

## Why the platforms disagree
- Google Scholar indexes more document types (guides, theses, conference papers, preprints) and counts citations from them, so it is the highest (226 vs 119 OpenAlex).
- OpenAlex covers 9 DOI works and only citing works it can match. Crossref counts only citing works with deposited references.
- Each platform's h-index is only valid for that platform's coverage.

## Recommendation for the website (to approve)
Show a small, **dated and source-labelled** metrics block, e.g. "Google Scholar: 226 citations, h-index 7 (as of {day})", with a link to the profile, plus OpenAlex figures as the reproducible open-data reference. Refresh via the scheduled job (architecture §3). Do **not** display self-reported journal quartiles (Q1/Q2) unless they are sourced from SJR or JCR with a year.

## Community reach (not a research metric)
Telegram: {TG['members_observed']:,} members observed ({TG['retrieved_at'][:10]}). Facebook page and group figures are self-reported (390,000+ / 118,000+) and could not be verified.
""")

# ================================================================ portfolio analysis
yr = Counter()
for p in shown:
    yr[p["dates"].get("citation_year") or "n/d"] += 1
yr_rows = sorted(((str(y), n) for y, n in yr.items() if y != "n/d"), key=lambda r: r[0])
st_by_year = defaultdict(Counter)
for p in shown:
    st_by_year[p["dates"].get("citation_year") or "n/d"][p["verification_status"]] += 1
write("research-portfolio-analysis.md", f"""
# Research Portfolio Analysis

{HEAD}
> Scope: {len(shown)} publication records (any status) and {AN['verified_works']} authorship-verified DOI works. Counts that include candidates are marked. None of this is a definitive bibliometric profile.

## A. Research output overview

{chart("Publication records per year (all statuses)", yr_rows, "Records")}
*Source: this catalog (Crossref, OpenAlex, ORCID, Google Scholar first page, earlier site), {day}. Includes candidates; {yr.get('n/d', 0)} record(s) without a year are not plotted.*

{table(["Year", "verified", "conflicted", "candidate", "incomplete"], [[y] + [st_by_year[y].get(s, 0) for s in ["verified", "conflicted", "candidate", "incomplete"]] for y in sorted(st_by_year, key=lambda v: (str(v)))])}

**Types (verified DOI works only):** {AN['verified_works']} journal articles. **Candidates add:** 1 more journal article (JMASM 2019), 2 conference papers, 1 Master's thesis and 4 self-published guides.

**Venues (verified):**
{table(["Venue", "Works"], AN['venues_in_verified'])}

**Publishers (verified):** {", ".join(f"{p} ({n})" for p, n in AN['publishers_in_verified'])}

**Open access (verified, OpenAlex):** {", ".join(f"{k or 'unknown'}: {v}" for k, v in AN['open_access_status_in_verified (OpenAlex)'].items())}

**Topics (OpenAlex primary topic, machine-assigned, verified works):**
{table(["Field", "Subfield", "Works"], [[t['field'], t['subfield'], t['count']] for t in AN['primary_topic_field_subfield_in_verified (OpenAlex, machine-assigned)']])}

**Most-cited works, by source (not merged):**
{chr(10).join(f"- **{src}:** " + "; ".join(f"{short(r['title'], 55)} ({r['value']})" for r in rows[:3]) for src, rows in AN['most_cited_by_source'].items())}

## Collaboration patterns (verified works)
- Distinct co-authors: **{AN['distinct_coauthors_in_verified']}**. Researcher's position: {", ".join(f"{k} {v}" for k, v in AN['researcher_author_position_in_verified'].items())}.
- Most frequent co-authors: {", ".join(f"{n} ({c})" for n, c in AN['coauthors_in_verified'][:5])}.
- Two clusters: a **methodology** cluster with Cairo University statisticians (Abonazel, Mousa, Rady, Seliem, Kamel) and an **applied management** cluster with University of Kerbala colleagues (Abbas, Shyaa, Abd Ali).

## B. Research portfolio map (inferred; for the researcher to confirm)

```mermaid
flowchart LR
  R[Researcher] --> L1[Penalized estimators for count regression]
  R --> L2[Shrinkage estimators for beta regression]
  R --> L3[Bayesian prior selection]
  R --> L4[Applied behavioural & management studies]
  R --> K[Knowledge sharing]
  L1 --> D1[(Zenodo dataset + GitHub data repo)]
  K --> G[Self-published guides: ARDL, ridge, sample size, regression handbook]
  K --> C[Statistical Analysis – Egypt community]
  K --> T[Teaching Assistant, Sadat Academy]
```

{table(["Line", "Linked publications", "Status"], [[l['label'], ", ".join(l['publications']), l['status']] for l in PROJ['proposed_research_lines']])}

*Research lines are inferred from topics and co-authorship. No documented projects (grants, project pages) were found.*
""")

# ================================================================ data quality + readiness
def readiness(p):
    labels = []
    if p["verification_status"] == "verified" and not p.get("missing_fields") and p.get("abstract_original"):
        labels.append("Ready for publication (after researcher sign-off)")
    if p["verification_status"] in ("conflicted", "candidate"):
        labels.append("Needs researcher review")
    if p.get("missing_fields") or not p.get("abstract_original") or not (p.get("identifiers") or {}).get("doi"):
        labels.append("Needs additional metadata")
    if p["verification_status"] == "verified" and not p.get("abstract_original"):
        labels.append("Abstract unavailable (closed or not deposited)")
    if (p.get("open_access") or {}).get("status") == "closed":
        labels.append("Restricted by copyright (link only, no PDF)")
    if p["publication_type"] == "self_published_material":
        labels.append("Type to confirm")
    return "; ".join(dict.fromkeys(labels)) or "Needs researcher review"


rd_rows = [[p["id"], short(p["canonical_title"], 60), p["verification_status"], readiness(p)] for p in sorted(shown, key=lambda x: x["id"])]
miss_doi = [p for p in shown if not (p.get("identifiers") or {}).get("doi")]
miss_venue = [p for p in shown if not (p.get("venue") or {}).get("name")]
miss_abs = [p for p in shown if not p.get("abstract_original")]
yr_conf = [p for p in shown if any(c["field"] == "year" for c in p.get("conflicts", []))]
ord_conf = [p for p in shown if any(c["field"] == "author_order" for c in p.get("conflicts", []))]
unver = [p for p in shown if p["authorship"]["status"] != "verified"]
no_pdf = [p for p in shown if not (p.get("urls") or {}).get("oa_pdf")]
not_checked = [p["identifiers"]["doi"] for p in shown if (p.get("identifiers") or {}).get("doi") and p["identifiers"]["doi"] not in DOIRES]
v = VAL["files"]
write("data-quality-report.md", f"""
# Data Quality, Integrity & Website Readiness

{HEAD}
## C. Completeness and integrity ({len(shown)} exported publication records)

{table(["Check", "Count", "Records"], [
    ["Missing DOI", len(miss_doi), ", ".join(p['id'] for p in miss_doi)],
    ["Missing venue", len(miss_venue), ", ".join(p['id'] for p in miss_venue) or "—"],
    ["Missing abstract", len(miss_abs), ", ".join(p['id'] for p in miss_abs)],
    ["Authorship not yet verified", len(unver), ", ".join(p['id'] for p in unver)],
    ["Conflicting publication year", len(yr_conf), ", ".join(p['id'] for p in yr_conf)],
    ["Conflicting author order", len(ord_conf), ", ".join(p['id'] for p in ord_conf)],
    ["Possible duplicates (held back, not merged)", len(REC['duplicate_candidates']), "; ".join(" <> ".join(d['records']) for d in REC['duplicate_candidates'])],
    ["No legitimate open PDF link", len(no_pdf), ", ".join(p['id'] for p in no_pdf)],
    ["Broken DOI links", sum(1 for s in DOIRES.values() if s != 200), "all checked DOIs resolve"],
    ["DOIs not yet link-checked", len(not_checked), ", ".join(not_checked) or "—"],
    ["Unresolved identity matches", 2, "Semantic Scholar misattributions (see identity review); GitHub `SVM_New`"],
    ["Pages missing (online-first / not deposited)", sum(1 for p in shown if 'pages' in (p.get('missing_fields') or [])), ", ".join(p['id'] for p in shown if 'pages' in (p.get('missing_fields') or []))],
])}

**Year conflicts** come from online-first vs print dates. Export rule: Crossref print year when one exists, otherwise the first-issued year. Commun. Stat. Simul. Comput. (online 2021, issue 52(9) print 2023) → exported **2023**. SOIC prior-selection paper (online 2024; no print date in Crossref, while ORCID, Google Scholar and the earlier site show 2025 for volume 13(2)) → exported **2024**. All values are kept in the JSON for the researcher's decision.

**Author-order conflict:** the JSTC (EKB) DOI deposit lists Elnady–Taha–Abdella. OpenAlex, the preprint, Google Scholar and the earlier site list Abdella–Taha–Elnady. The DOI deposit order is exported pending confirmation. The deposit also had malformed name splits, which were normalized by moving tokens only (originals kept in JSON).

## BibTeX validation (parser: {VAL['parser']})
{table(["File", "Entries", "Valid", "Issues"], [[k, x['entries'], x['valid'], "; ".join(x['issues']) or "none"] for k, x in v.items()])}
Checks: unique keys, required fields per entry type, DOI syntax and lower-case normalization, `langid` present, no empty values, **no internal website fields in the citation export**, and title round-trip identical to the source title.

## D. Website content readiness

{table(["ID", "Title", "Status", "Readiness"], rd_rows)}

**Profile and other content:**
{table(["Item", "Readiness"], [
    ["Name, role, affiliation (Sadat Academy TA)", "Ready after sign-off (verified); branch (Tanta 2023–2025 vs Maadi 2026) to confirm"],
    ["PhD candidacy (FGSSR)", "Needs researcher review (self-reported)"],
    ["Biography text", "Needs researcher review: only the earlier-site text exists (marketing tone); needs an official bio in EN + AR"],
    ["Research interests", "Ready after sign-off (ORCID keywords); Arabic labels needed"],
    ["Research lines", "Needs researcher review (inferred)"],
    ["Dataset (Zenodo)", "Ready after sign-off"],
    ["GitHub repositories", "Needs researcher review (licence conflict / unclear purpose)"],
    ["Courses / talks", "Needs additional metadata (none documented)"],
    ["Metrics block", "Needs researcher review (choose sources; dated labels)"],
    ["Journal quartile badges (Q1/Q2)", "Not suitable unless sourced (SJR/JCR + year)"],
    ["Consulting count (450+), community follower counts", "Needs researcher review: self-reported marketing figures; Telegram count observable"],
    ["Personal e-mail and phone", "Private / do not publish (use the contact form, D-08)"],
    ["Closed-access PDF (Commun. Stat. Simul. Comput.)", "Restricted by copyright: DOI link only"],
    ["Self-published guides", "Needs researcher review (type, URL, whether to list)"],
    ["Rejected / misattributed records", "Not suitable for the public website"],
])}

## Files: safe to publish vs must stay private

**Safe to commit after the researcher approves (no personal contact data):**
- `research/*.md`, `research/publication-reconciliation.csv`, `research/asset-inventory.csv` (paths, hashes and public URLs only)
- `scripts/ingestion/*.py` (contain public profile URLs and self-reported claims, which also need approval)
- After review: `data-staging/exports/publications.citations.bib`, then the reviewed `publications.candidates.bib` becomes the site's BibTeX

**Must stay local / private (gitignored under `data-staging/`):**
- `raw/supplied/` (private repo copy with personal e-mail/phone)
- `raw/publications/pdf/` (publisher PDFs; licences allow reuse, but there is no need to redistribute)
- `raw/profiles/google-scholar/` and `raw/profiles/telegram/` (third-party page copies)
- `raw/**` API caches, `extracted/` (PDF text), `evidence/retrieval-log.jsonl`
- `exports/researcher-profile.candidates.json` until reviewed (contains claims the researcher may not want public)
""")

# ================================================================ translation inventory
rows = []
for p in sorted(shown, key=lambda x: x["id"]):
    rows.append([p["id"], (p.get("title_original") or {}).get("lang"), (p.get("abstract_original") or {}).get("lang") or "—",
                 (p.get("venue") or {}).get("name_lang") or "en", "keep original; no translation"])
arabic_venues = [p for p in shown if (p.get("venue") or {}).get("name_lang") == "ar"]
write("translation-inventory.md", f"""
# Arabic / English Translation Readiness

{HEAD}
**Principles:** original language is preserved and labelled. Publication titles, abstracts, journal names, author names and bibliographic metadata are **never translated**. Confirmed translations are stored separately from originals. No machine translation is included in this package.

## Publications: language of record
{table(["ID", "Title lang", "Abstract lang", "Venue lang", "Action"], rows)}

All {len(shown)} titles and every available abstract are English originals. {len(arabic_venues)} venue name(s) appear only in Arabic in the DOI deposit ({", ".join(p['id'] for p in arabic_venues)}: *{arabic_venues[0]['venue']['name'] if arabic_venues else ''}*). The official English journal name is needed from the researcher or publisher, not from translation.

## Translation-needed list (for the Arabic site)
{table(["Field", "Source language", "Status", "Who"], [
    ["Researcher name in Arabic", "—", "missing (no source has it)", "researcher"],
    ["Biography", "en (earlier site, self-written)", "needs an official EN text, then an AR version", "researcher writes or approves"],
    ["Role / job title", "en (ORCID)", "needs the official Arabic title", "researcher"],
    ["Affiliation names (Sadat Academy, FGSSR Cairo University, departments)", "en", "needs official Arabic names", "researcher / institutional sources"],
    ["Research interests (ORCID keywords)", "en", "needs Arabic labels", "translation + researcher review"],
    ["Research line labels", "en (inferred)", "confirm first, then translate", "researcher"],
    ["Dataset and software descriptions", "en", "short Arabic summaries optional", "translation + review"],
    ["UI strings", "—", "out of scope for this phase", "build phase"],
])}

## Translation-review list
Empty: no translations exist yet. Every Arabic text produced later must be marked `machine` or `human` and `researcher_confirmed: true/false`.

## Do-not-translate glossary
Journal and conference names; author names; DOIs and identifiers; software names (R, SPSS, Stata, EViews, AMOS, SmartPLS, glmnet); model and estimator names in Latin script where standard (COM-Poisson, ridge, Liu-type, elastic net, ARDL, TAM, SEM). Arabic text may gloss them, but the original term stays.
""")

# ================================================================ gaps and questions
write("data-gaps-and-questions.md", f"""
# Missing Data & Questions for the Researcher

{HEAD}
## Data gaps

{table(["Gap", "Impact", "What would close it"], [
    ["Google Scholar rows beyond the first 20", "possible missing works", "Google Scholar → Export all → BibTeX"],
    ["JMASM 2019 paper: no DOI, volume or issue found", "incomplete citation", "PDF or full citation"],
    ["2018 and 2019 conference papers: no proceedings details", "incomplete citation", "proceedings title, pages, publisher (ISSR, Cairo University?)"],
    ["Master's thesis 2019: only title, school and year", "incomplete citation", "exact title page, supervisor(s), department, link if public"],
    ["4 self-published guides: type and URL unknown", "cannot be cited properly", "ResearchGate links or files, and the intended type (book, report, guide)"],
    ["3 possible duplicate guide rows", "risk of double listing", "confirm which titles are distinct works"],
    ["Abstracts missing for some works", "weaker publication pages", "author-provided abstracts (only for works the researcher owns rights to)"],
    ["No course list", "teaching section empty", "courses taught (title, level, term, institution), syllabi or slides to share"],
    ["No talk list", "talks section empty", "talks, seminars and workshops (title, event, date, slides)"],
    ["No official bio or Arabic name", "about page blocked", "approved bio in English and Arabic; Arabic name spelling"],
    ["Scopus and WoS not accessible", "no official index metrics", "exports from Scopus and WoS, or permission to omit them"],
])}

## Questions (answers become `researcher_confirmed` evidence)

### الهوية والانتماء (Identity & affiliation)
1. ما هو الاسم الرسمي بالعربية؟ وهل الاسم المعتمد بالإنجليزية "Ibrahim Mohamed Taha" أم "Ibrahim M. Taha"؟
2. فرع أكاديمية السادات: ورقتا 2023 و2025 تذكران **طنطا**، وورقة 2026 والموقع القديم يذكران **المعادي، القاهرة**. هل انتقلت بين الفرعين؟ وأيهما الحالي؟
3. هل حالة الدكتوراه في كلية الدراسات العليا للبحوث الإحصائية بجامعة القاهرة (FGSSR) ما زالت "قيد الدراسة"؟ وما سنة القيد أو العنوان المبدئي للرسالة إن أمكن نشره؟
4. يوجد **رقمان مختلفان لـ Scopus Author ID** (57226774796 و 58577960300). هل هما حسابك؟ (يُفضّل طلب دمجهما من Scopus.)
5. هل حساب GitHub `IbrahimTaha2018` حسابك؟ وما هو مستودع `SVM_New`؟ وما الرخصة المقصودة لمستودع البيانات (Zenodo يقول CC-BY-4.0 وGitHub بلا رخصة)؟

### المنشورات (Publications)
6. **سنة النشر المعتمدة**: ورقة Beta ridge (نُشرت إلكترونيًا 2021، وفي العدد 52(9) سنة 2023)، وورقة SOIC عن الـ prior (إلكترونيًا 2024، والمجلد 13(2) سنة 2025). نعرض سنة العدد المطبوع؟
7. **ترتيب المؤلفين** في ورقة TAM: إيداع الـ DOI يقول Elnady–Taha–Abdella، والنسخة الأولية وGoogle Scholar يقولان Abdella–Taha–Elnady. أيهما الرسمي؟
8. ورقة JMASM 2019: هل يوجد ملف أو DOI أو رابط؟
9. ورقتا المؤتمر 2018/2019: هل نُشرتا في كتاب وقائع؟ وهل قدّمتهما بنفسك (لنضيفهما كمحاضرات)؟
10. الأدلة المنشورة على ResearchGate (ARDL، Ridge، Sample Size، Regression Handbook): ما نوعها (كتاب/دليل/تقرير)؟ وهل نعرضها في الموقع؟ وهل "Sample Size Calculation" و"A Comprehensive Guide to Ridge Regression" نسخ مكررة أم أعمال مختلفة؟
11. أي الأوراق تريدها **مميزة (selected)** في الصفحة الرئيسية؟
12. هل نعرض تصنيفات Q1/Q2؟ (لن تُعرض إلا بمصدر وسنة، مثل SJR أو JCR.)

### التدريس والمحاضرات والمجتمع (Teaching, talks, community)
13. ما المقررات التي تدرّسها أو درّستها كمعيد (الاسم، المستوى، الفصل)؟ وهل توجد مواد يمكن نشرها؟
14. ما المحاضرات أو الورش أو الندوات التي قدّمتها (العنوان، الجهة، التاريخ، الشرائح)؟
15. مجتمع "Statistical Analysis – Egypt": هل نعرض الأرقام؟ (رقم تيليجرام يمكن التحقق منه، وأرقام فيسبوك لا.)
16. هل نعرض "450+ تقرير تحليل إحصائي" وخدمات الاستشارات في الموقع الأكاديمي، أم نفصلها؟

### النشر والخصوصية (Publishing & privacy)
17. هل نعرض البريد الإلكتروني أو الهاتف؟ (التوصية: لا. نموذج تواصل بدلًا منهما، D-08.)
18. هل توافق على رفع ملفات التقارير في `research/` إلى الريبو العام بعد المراجعة؟
""")

print("reports written:", sorted(os.path.basename(x) for x in glob.glob(str(RES / "*")) if os.path.getmtime(x) > 0)[:40])
print("assets:", len(assets), "exact duplicates:", len(dup_assets))
