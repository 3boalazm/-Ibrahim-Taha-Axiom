# Data Quality, Integrity & Website Readiness

> Phase 2 · Ibrahim Taha Axiom · generated 2026-11-05T20:18:50+00:00 by `scripts/ingestion/s08_reports.py`
> **Not yet reviewed by the researcher.** Committed to the repository with the project owner's approval (2026-11-05). Nothing here goes on the public website until the researcher approves it. Personal contact data is deliberately excluded.

## C. Completeness and integrity (17 exported publication records)

| Check | Count | Records |
|---|---|---|
| Missing DOI | 8 | pub-0011, pub-0012, pub-0013, pub-0014, pub-0015, pub-0017, pub-0018, pub-0019 |
| Missing venue | 0 | — |
| Missing abstract | 9 | pub-0001, pub-0011, pub-0012, pub-0013, pub-0014, pub-0015, pub-0017, pub-0018, pub-0019 |
| Authorship not yet verified | 8 | pub-0011, pub-0012, pub-0013, pub-0014, pub-0015, pub-0017, pub-0018, pub-0019 |
| Conflicting publication year | 2 | pub-0002, pub-0003 |
| Conflicting author order | 1 | pub-0006 |
| Possible duplicates (held back, not merged) | 3 | pub-0014 <> pub-0016; pub-0018 <> pub-0020; pub-0019 <> pub-0021 |
| No legitimate open PDF link | 12 | pub-0001, pub-0002, pub-0004, pub-0006, pub-0011, pub-0012, pub-0013, pub-0014, pub-0015, pub-0017, pub-0018, pub-0019 |
| Broken DOI links | 0 | all checked DOIs resolve |
| DOIs not yet link-checked | 3 | 10.1080/00949655.2026.2759110, 10.19139/soic-2310-5070-4220, 10.30657/pea.2026.32.12 |
| Unresolved identity matches | 2 | Semantic Scholar misattributions (see identity review); GitHub `SVM_New` |
| Pages missing (online-first / not deposited) | 1 | pub-0004 |

**Year conflicts** come from online-first vs print dates. Export rule: Crossref print year when one exists, otherwise the first-issued year. Commun. Stat. Simul. Comput. (online 2021, issue 52(9) print 2023) → exported **2023**. SOIC prior-selection paper (online 2024; no print date in Crossref, while ORCID, Google Scholar and the earlier site show 2025 for volume 13(2)) → exported **2024**. All values are kept in the JSON for the researcher's decision.

**Author-order conflict:** the JSTC (EKB) DOI deposit lists Elnady–Taha–Abdella. OpenAlex, the preprint, Google Scholar and the earlier site list Abdella–Taha–Elnady. The DOI deposit order is exported pending confirmation. The deposit also had malformed name splits, which were normalized by moving tokens only (originals kept in JSON).

## BibTeX validation (parser: bibtexparser 1.4.3)
| File | Entries | Valid | Issues |
|---|---|---|---|
| publications.candidates.bib | 17 | True | none |
| publications.citations.bib | 17 | True | none |
Checks: unique keys, required fields per entry type, DOI syntax and lower-case normalization, `langid` present, no empty values, **no internal website fields in the citation export**, and title round-trip identical to the source title.

## D. Website content readiness

| ID | Title | Status | Readiness |
|---|---|---|---|
| pub-0001 | An analytical family of correlation-weighted elastic-net es… | verified | Needs additional metadata; Abstract unavailable (closed or not deposited) |
| pub-0002 | Beta ridge regression estimators: simulation and application | conflicted | Needs researcher review; Restricted by copyright (link only, no PDF) |
| pub-0003 | A Note on Prior Selection in Bayesian Estimation | conflicted | Needs researcher review |
| pub-0004 | Development of Penalized Estimation for Conway-Maxwell-Pois… | verified | Needs additional metadata |
| pub-0006 | Using TAM to Evaluate the Effect of Intensive Usage of Digi… | conflicted | Needs researcher review |
| pub-0007 | The Role of Environmental Monitoring in Promoting Green Cre… | verified | Ready for publication (after researcher sign-off) |
| pub-0008 | The Impact of Students’ Cybersecurity Vulnerability Behavio… | verified | Ready for publication (after researcher sign-off) |
| pub-0009 | The moderating role of green human resource management prac… | verified | Ready for publication (after researcher sign-off) |
| pub-0010 | A New Two-Parameter Estimator for Beta Regression Model: Me… | verified | Ready for publication (after researcher sign-off) |
| pub-0011 | A new biased estimator for zero-inflated count regression m… | candidate | Needs researcher review; Needs additional metadata |
| pub-0012 | Ridge estimators for the negative binomial regression model… | incomplete | Needs additional metadata |
| pub-0013 | New shrinkage parameters for Liu-type zero inflated negativ… | incomplete | Needs additional metadata |
| pub-0014 | A Comprehensive Guide to the ARDL Bounds Testing Approach f… | candidate | Needs researcher review; Needs additional metadata; Type to confirm |
| pub-0015 | Handling Multicollinearity Problem in Generalized Linear Mo… | candidate | Needs researcher review; Needs additional metadata |
| pub-0017 | The Regression Handbook: 250+ Models Explained From Classic… | candidate | Needs researcher review; Needs additional metadata; Type to confirm |
| pub-0018 | Sample Size Calculation: From Classical Methods to Recent D… | candidate | Needs researcher review; Needs additional metadata; Type to confirm |
| pub-0019 | A Comprehensive Guide to Ridge Regression: Theory, Methods,… | candidate | Needs researcher review; Needs additional metadata; Type to confirm |

**Profile and other content:**
| Item | Readiness |
|---|---|
| Name, role, affiliation (Sadat Academy TA) | Ready after sign-off (verified); branch (Tanta 2023–2025 vs Maadi 2026) to confirm |
| PhD candidacy (FGSSR) | Needs researcher review (self-reported) |
| Biography text | Needs researcher review: only the earlier-site text exists (marketing tone); needs an official bio in EN + AR |
| Research interests | Ready after sign-off (ORCID keywords); Arabic labels needed |
| Research lines | Needs researcher review (inferred) |
| Dataset (Zenodo) | Ready after sign-off |
| GitHub repositories | Needs researcher review (licence conflict / unclear purpose) |
| Courses / talks | Needs additional metadata (none documented) |
| Metrics block | Needs researcher review (choose sources; dated labels) |
| Journal quartile badges (Q1/Q2) | Not suitable unless sourced (SJR/JCR + year) |
| Consulting count (450+), community follower counts | Needs researcher review: self-reported marketing figures; Telegram count observable |
| Personal e-mail and phone | Private / do not publish (use the contact form, D-08) |
| Closed-access PDF (Commun. Stat. Simul. Comput.) | Restricted by copyright: DOI link only |
| Self-published guides | Needs researcher review (type, URL, whether to list) |
| Rejected / misattributed records | Not suitable for the public website |

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
