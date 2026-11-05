"""Step 7: dated metrics snapshot + portfolio analysis tables.

Each metric carries platform, source URL, retrieval time, scope and method.
Platform figures are never mixed: a Google Scholar count is never relabelled
as OpenAlex or vice versa. Derived values are labelled as estimates.
Snapshots are written to data-staging/metrics/<date>/ and never overwritten.
"""
from collections import Counter

from common import RAW, STAGING, now_iso, read_json, write_json

stamp = now_iso()
day = stamp[:10]
gs = read_json(STAGING / "normalized/google-scholar-profile.json")
oa = read_json(RAW / "profiles/openalex/authors/A5102868128.json")
s2 = read_json(RAW / "profiles/s2/author/2142163895.json")
pubs = read_json(STAGING / "normalized/publications.json")
log = {}
for line in (STAGING / "evidence/retrieval-log.jsonl").read_text(encoding="utf-8").splitlines():
    import json
    e = json.loads(line)
    if e.get("status") == 200:
        log[e["dest"]] = e


def p(dest):
    e = log[dest]
    return {"source_url": e["url"], "retrieved_at": e["retrieved_at"]}


M = []


def add(metric, value, platform, prov, scope, method="reported by platform", limitations=None):
    M.append({"metric": metric, "value": value, "source_platform": platform, **prov, "scope": scope,
              "method": method, "coverage_limitations": limitations})


gsp = {"source_url": gs["url"], "retrieved_at": gs["retrieved_at"]}
gs_lim = "Google Scholar's own index; includes non-journal items (guides, thesis, conference papers) and duplicate rows; not reproducible from open data."
for key, label in [("citations", "citation count"), ("h_index", "h-index"), ("i10_index", "i10-index")]:
    for window, v in gs["metrics"][key].items():
        add(f"{label} ({window})", v, "Google Scholar", gsp, "Google Scholar profile VgoxbyYAAAAJ", limitations=gs_lim)
for y, v in gs["citations_by_year_chart"].items():
    add(f"citations in {y}", v, "Google Scholar", gsp, "profile citation chart", limitations=gs_lim + " The current year is partial.")

oap = p("raw/profiles/openalex/authors/A5102868128.json")
oa_lim = "OpenAlex author A5102868128 only (9 works); misses the JMASM 2019 paper, conference papers, thesis and guides; citation links limited to OpenAlex-indexed citing works."
add("works count", oa["works_count"], "OpenAlex", oap, "author A5102868128", limitations=oa_lim)
add("citation count", oa["cited_by_count"], "OpenAlex", oap, "author A5102868128", limitations=oa_lim)
add("h-index", oa["summary_stats"]["h_index"], "OpenAlex", oap, "author A5102868128", limitations=oa_lim)
add("i10-index", oa["summary_stats"]["i10_index"], "OpenAlex", oap, "author A5102868128", limitations=oa_lim)
add("2-year mean citedness", oa["summary_stats"]["2yr_mean_citedness"], "OpenAlex", oap, "author A5102868128", limitations=oa_lim)
for row in oa.get("counts_by_year", []):
    add(f"citations in {row['year']}", row["cited_by_count"], "OpenAlex", oap, "author A5102868128 counts_by_year", limitations=oa_lim)
    add(f"works in {row['year']}", row["works_count"], "OpenAlex", oap, "author A5102868128 counts_by_year", limitations=oa_lim)

s2p = p("raw/profiles/s2/author/2142163895.json")
s2_lim = "Semantic Scholar author 2142163895; includes one misattributed 1970 record; the Bayesian prior paper is wrongly attached to a different author (145792199)."
for k, label in [("paperCount", "paper count"), ("citationCount", "citation count"), ("hIndex", "h-index")]:
    add(label, s2.get(k), "Semantic Scholar", s2p, "author 2142163895", limitations=s2_lim)

# per-work citation counts by source (never summed across sources)
per_work = []
for pub in pubs:
    for c in pub.get("citations", []):
        per_work.append({"publication_id": pub["id"], "title": pub["canonical_title"], **c})

# ---------------------------------------------- derived (catalog-based)
verified = [x for x in pubs if x["authorship"]["status"] == "verified" and x["publication_type"] != "preprint"]
oa_counts = sorted([next((c["value"] for c in x["citations"] if c["source"].startswith("OpenAlex")), 0) or 0 for x in verified], reverse=True)
h_est = sum(1 for i, c in enumerate(oa_counts, 1) if c >= i)
add("h-index (estimate)", h_est, "derived from OpenAlex per-work counts",
    {"source_url": None, "retrieved_at": stamp}, f"{len(verified)} authorship-verified DOI works in this catalog",
    method="h = max h such that h works have >= h OpenAlex citations",
    limitations="Estimate over verified DOI works only; not comparable with Google Scholar's h-index.")

by_year = Counter((x["dates"].get("citation_year"), x["authorship"]["status"]) for x in pubs if x["publication_type"] != "preprint" and x.get("export_to_bibtex", True))
by_type = Counter((x["publication_type"], x["verification_status"]) for x in pubs if x["publication_type"] != "preprint" and x.get("export_to_bibtex", True))
coauth = Counter()
positions = Counter()
for x in verified:
    for a in x["authors"]:
        if a["is_researcher"]:
            positions["first" if a["position"] == 1 else ("last" if a["position"] == len(x["authors"]) else "middle")] += 1
        else:
            coauth[a["display"]] += 1
venues = Counter(x["venue"]["name"] for x in verified)
publishers = Counter(x["venue"].get("publisher") for x in verified)
topics = Counter()
for x in verified:
    for t in (x.get("topics_machine") or [])[:1]:
        topics[(t["field"], t["subfield"])] += 1
oa_status = Counter((x.get("open_access") or {}).get("status") for x in verified)

analysis = {
    "generated_at": stamp, "catalog_scope": "records in normalized/publications.json (preprint and held-back duplicates excluded)",
    "publications_by_year_and_authorship_status": [{"year": y, "authorship_status": s, "count": n} for (y, s), n in sorted(by_year.items(), key=lambda k: (k[0][0] or 0, k[0][1]))],
    "publications_by_type_and_status": [{"type": t, "status": s, "count": n} for (t, s), n in sorted(by_type.items())],
    "verified_works": len(verified),
    "researcher_author_position_in_verified": dict(positions),
    "coauthors_in_verified": coauth.most_common(),
    "distinct_coauthors_in_verified": len(coauth),
    "venues_in_verified": venues.most_common(), "publishers_in_verified": publishers.most_common(),
    "primary_topic_field_subfield_in_verified (OpenAlex, machine-assigned)": [{"field": f, "subfield": s, "count": n} for (f, s), n in topics.most_common()],
    "open_access_status_in_verified (OpenAlex)": dict(oa_status),
    "most_cited_by_source": {
        src: sorted([{"id": w["publication_id"], "title": w["title"], "value": w["value"]} for w in per_work if w["source"].startswith(src) and w["value"] is not None],
                    key=lambda r: -r["value"])[:5]
        for src in ("Google Scholar", "OpenAlex", "Crossref")},
}
out = STAGING / f"metrics/{day}"
write_json(out / "metrics-snapshot.json", {"snapshot_date": day, "generated_at": stamp, "metrics": M, "per_work_citations": per_work})
write_json(out / "portfolio-analysis.json", analysis)
print(f"{len(M)} metric rows, {len(per_work)} per-work citation rows -> metrics/{day}/")
print("h-index estimate (OpenAlex, verified works):", h_est, "| verified works:", len(verified))
print("positions:", dict(positions), "| distinct co-authors:", len(coauth), coauth.most_common(5))
print("topics:", topics.most_common())
print("OA:", dict(oa_status))
print("S2:", s2.get("paperCount"), s2.get("citationCount"), s2.get("hIndex"))
