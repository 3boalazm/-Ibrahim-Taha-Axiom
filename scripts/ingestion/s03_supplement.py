"""Step 3: supplementary collection after the first pass.

- Parse the single Google Scholar profile page and the Telegram page into
  structured snapshots (no further requests to Google Scholar).
- Fetch full records for DOIs found only in ORCID.
- Fetch DataCite/Zenodo metadata for dataset DOIs.
- One targeted Crossref search for the JMASM 2019 paper.
- Download open-access PDFs ONLY when Crossref/OpenAlex state a Creative
  Commons licence, store locally (never committed), hash, extract text.
"""
import glob
import hashlib
import html
import json
import re
import subprocess
import urllib.parse as up

from common import RAW, STAGING, fetch, fetch_json, norm_doi, now_iso, read_json, slug, write_json

q = up.quote


def text(x):
    return re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", x))).strip()


def log_time(dest_rel):
    for line in (STAGING / "evidence/retrieval-log.jsonl").read_text(encoding="utf-8").splitlines():
        e = json.loads(line)
        if e.get("dest") == dest_rel and e.get("status") == 200:
            return e["retrieved_at"], e["url"]
    return None, None


# ------------------------------------------------- Google Scholar snapshot
s = (RAW / "profiles/google-scholar/VgoxbyYAAAAJ.html").read_text(encoding="utf-8", errors="replace")
ts, url = log_time("raw/profiles/google-scholar/VgoxbyYAAAAJ.html")
cells = [text(x) for x in re.findall(r'class="gsc_rsb_std">(.*?)</td>', s)]
since = [text(x) for x in re.findall(r'class="gsc_rsb_sth">(.*?)</th>', s)][-1]
years = re.findall(r'class="gsc_g_t"[^>]*>(\d{4})</span>', s)
vals = re.findall(r'class="gsc_g_al">(\d+)</span>', s)
articles = []
for r in re.findall(r'<tr class="gsc_a_tr">(.*?)</tr>', s, re.S):
    grays = [text(x) for x in re.findall(r'<div class="gs_gray">(.*?)</div>', r, re.S)]
    cited = re.search(r'class="gsc_a_ac[^"]*"[^>]*>(\d*)</a>', r)
    year = re.search(r'class="gsc_a_h gsc_a_hc gs_ibl">(\d*)<', r)
    articles.append({
        "title": text(re.search(r'class="gsc_a_at"[^>]*>(.*?)</a>', r, re.S).group(1)),
        "authors_as_shown": grays[0] if grays else None,
        "venue_as_shown": grays[1] if len(grays) > 1 else None,
        "year": int(year.group(1)) if year and year.group(1) else None,
        "cited_by_gs": int(cited.group(1)) if cited and cited.group(1) else None,
    })
gs = {
    "source_id": "SRC-GS-PROFILE", "url": url, "retrieved_at": ts,
    "method": "single GET of public profile page; robots.txt allows /citations?user=; pagination not fetched (disallowed)",
    "display_name": text(re.search(r'id="gsc_prf_in"[^>]*>(.*?)</div>', s, re.S).group(1)),
    "profile_lines": [text(x) for x in re.findall(r'class="gsc_prf_il"[^>]*>(.*?)</div>', s, re.S)],
    "interests": [text(x) for x in re.findall(r'class="gsc_prf_inta[^"]*"[^>]*>(.*?)</a>', s)],
    "metrics": {"citations": {"all": int(cells[0]), since: int(cells[1])},
                "h_index": {"all": int(cells[2]), since: int(cells[3])},
                "i10_index": {"all": int(cells[4]), since: int(cells[5])}},
    "citations_by_year_chart": dict(zip(years[-len(vals):], map(int, vals))),
    "articles_first_page": articles,
    "coverage_note": "Only the first page of the article list (20 rows) is captured. The profile has more rows ('Show more').",
}
write_json(STAGING / "normalized/google-scholar-profile.json", gs)
print("GS snapshot:", gs["display_name"], gs["metrics"], len(articles), "articles")

# ----------------------------------------------------------- Telegram snapshot
tg = (RAW / "profiles/telegram/StatisticalAnalysisEgypt.html").read_text(encoding="utf-8", errors="replace")
ts, url = log_time("raw/profiles/telegram/StatisticalAnalysisEgypt.html")
extra = text((re.search(r'<div class="tgme_page_extra">(.*?)</div>', tg, re.S) or [None, ""])[1])
m = re.search(r"([\d\s]+)\s+members", extra)
write_json(STAGING / "normalized/telegram-channel.json", {
    "source_id": "SRC-TG-CHANNEL", "url": url, "retrieved_at": ts,
    "title": text((re.search(r'<div class="tgme_page_title"[^>]*>(.*?)</div>', tg, re.S) or [None, ""])[1]),
    "members_observed": int(m.group(1).replace(" ", "")) if m else None, "raw_extra": extra,
})

# --------------------------------------------- ORCID-only DOIs: full records
orcid = read_json(RAW / "profiles/orcid/0000-0002-6141-5387.json")
orcid_dois = set()
for g in orcid["activities-summary"]["works"]["group"]:
    for e in (g["work-summary"][0].get("external-ids") or {}).get("external-id", []):
        if e["external-id-type"] == "doi":
            orcid_dois.add(norm_doi(e["external-id-value"]))
for d in sorted(orcid_dois):
    if not (RAW / f"publications/crossref/works/{slug(d, 90)}.json").exists():
        fetch_json(f"https://api.crossref.org/works/{q(d)}", RAW / f"publications/crossref/works/{slug(d, 90)}.json",
                   source_id="SRC-CR-API", method="Crossref REST /works/{doi} (discovered via ORCID)")
        fetch_json(f"https://api.openalex.org/works/doi:{d}", RAW / f"publications/openalex/works/{slug(d, 90)}.json",
                   source_id="SRC-OA-API", method="OpenAlex /works/doi:{doi} (discovered via ORCID)")
        print("fetched ORCID-only DOI", d)

# ------------------------------------------------------- DataCite / Zenodo
for d in ["10.5281/zenodo.23120962"]:
    fetch_json(f"https://api.datacite.org/dois/{q(d, safe='')}", RAW / f"datasets/datacite/{slug(d, 90)}.json",
               source_id="SRC-DATACITE-API", method="DataCite REST /dois/{doi}")

# --------------------------------------------------- JMASM targeted search
fetch_json("https://api.crossref.org/works?query.bibliographic=" + q("new biased estimator zero-inflated count regression models")
           + "&filter=container-title:" + q("Journal of Modern Applied Statistical Methods") + "&rows=10",
           RAW / "publications/crossref/search/seed-07-jmasm.json", source_id="SRC-CR-API",
           method="Crossref REST /works search filtered by container-title")

# ------------------------------------ open-access PDFs (CC-licensed only)
pdf_log = []
for f in sorted(glob.glob(str(RAW / "publications/openalex/works/*.json"))):
    w = read_json(f)
    d = norm_doi(w.get("doi"))
    cr_path = RAW / f"publications/crossref/works/{slug(d, 90)}.json" if d else None
    lic_cr = []
    if cr_path and cr_path.exists():
        lic_cr = [l.get("URL") for l in (read_json(cr_path).get("message", {}).get("license") or [])]
    loc = w.get("best_oa_location") or {}
    lic_oa = loc.get("license")
    pdf = loc.get("pdf_url")
    cc = any("creativecommons.org" in (u or "") for u in lic_cr) or (lic_oa or "").startswith("cc")
    rec = {"doi": d, "oa_status": (w.get("open_access") or {}).get("oa_status"), "license_openalex": lic_oa,
           "license_crossref": lic_cr, "pdf_url": pdf, "creative_commons": cc}
    if pdf and cc:
        st, body, e = fetch(pdf, RAW / f"publications/pdf/{slug(d, 90)}.pdf", source_id="SRC-OA-PDF",
                            method="download of open-access PDF (Creative Commons licence stated)", retries=2)
        rec["download_status"] = st
        if body and body[:4] == b"%PDF":
            out = STAGING / f"extracted/pdf/{slug(d, 90)}.txt"
            out.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run(["pdftotext", "-enc", "UTF-8", "-l", "3", str(RAW / f"publications/pdf/{slug(d, 90)}.pdf"), str(out)], check=False)
            rec["text_extracted_pages"] = "1-3"
            rec["sha256"] = hashlib.sha256(body).hexdigest()
        elif body:
            rec["download_status"] = "not a PDF (HTML landing page returned)"
    pdf_log.append(rec)
write_json(STAGING / "normalized/open-access-check.json", pdf_log)
for r in pdf_log:
    print("OA:", r["doi"], r["oa_status"], r["license_openalex"], "CC" if r["creative_commons"] else "no-CC", r.get("download_status"))
