# Research data ingestion (Phase 2)

Local pipeline that collects, reconciles and exports the researcher's scholarly data. **Everything it writes goes to `data-staging/` (gitignored)** except the reports in `research/`.

## Run

```bash
cd scripts/ingestion
python -m venv .venv
./.venv/Scripts/python -m pip install -r requirements.txt     # Windows; use .venv/bin/python on macOS/Linux
./.venv/Scripts/python s01_seed_supplied.py   # candidate claims from the researcher's earlier site
./.venv/Scripts/python s02_collect.py         # Crossref, OpenAlex, ORCID, Semantic Scholar, 1 Google Scholar page, Telegram page
./.venv/Scripts/python s03_supplement.py      # ORCID-only DOIs, DataCite, open-access CC PDFs (+ text)
./.venv/Scripts/python s04_github.py          # public repos linked from the Zenodo deposit
./.venv/Scripts/python s05_build.py           # canonical model, reconciliation, authorship, evidence
./.venv/Scripts/python s06_export.py          # BibTeX + JSON exports, bibtexparser validation
./.venv/Scripts/python s07_metrics.py         # dated metrics snapshot + portfolio tables
./.venv/Scripts/python s08_reports.py         # research/*.md and *.csv
```

`s01` expects `data-staging/extracted/supplied/old-site-index.txt` (text extracted from the supplied site). Requests are cached; delete a cached file to refetch it.

## Rules built into the code
- Official APIs only. **Google Scholar: one robots-allowed profile page, no pagination.** ResearchGate, LinkedIn and Facebook are never fetched.
- Generic User-Agent. No personal e-mail is sent (optional `INGEST_CONTACT_EMAIL`, see `.env.example`).
- Every request is logged (`data-staging/evidence/retrieval-log.jsonl`: URL, time, status, size, SHA-256).
- Matching never merges on fuzzy titles: DOI → exact normalized title → otherwise a *duplicate candidate* for manual review.
- Conflicting values are kept side by side. Exports follow documented rules and flag every conflict.
- PDFs are downloaded only when a Creative Commons licence is stated. E-mail addresses are redacted from extracted affiliation lines.
- Stable IDs and citation keys are persisted in `data-staging/normalized/id-registry.json`.

## Outputs
| Path | Content |
|---|---|
| `data-staging/exports/publications.candidates.bib` | website source candidate (approved field vocabulary + `langid`) |
| `data-staging/exports/publications.citations.bib` | citation export without internal fields |
| `data-staging/exports/*.candidates.json` | publications, researcher profile, projects, courses, talks, datasets, software |
| `data-staging/exports/validation-report.json` | parser validation results |
| `data-staging/evidence/field-evidence.jsonl` | field-level evidence records |
| `data-staging/metrics/<date>/` | metrics snapshot + portfolio analysis |
| `research/` | reports and CSVs (Phase 2 deliverables) |
