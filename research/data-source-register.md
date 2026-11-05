# Data Source Register

> Phase 2 · Ibrahim Taha Axiom · generated 2026-11-05T20:18:50+00:00 by `scripts/ingestion/s08_reports.py`
> **Not yet reviewed by the researcher.** Committed to the repository with the project owner's approval (2026-11-05). Nothing here goes on the public website until the researcher approves it. Personal contact data is deliberately excluded.

**Policy applied:** official APIs only; no scraping, no login, no paywall or robots bypass. Google Scholar: one robots-allowed profile page. ResearchGate, LinkedIn and Facebook were not fetched. Every network request is logged with URL, time, HTTP status, size and SHA-256 in `data-staging/evidence/retrieval-log.jsonl` (84 requests).

| Source ID | Platform | Profile URL | Source type | Access status | Identity confidence | Last checked (UTC) | Notes |
|---|---|---|---|---|---|---|---|
| SRC-SUP-01 | Researcher's earlier website (private repo `3boalazm/Ibrahim-Taha`, single `index.html`; also served by an older Vercel project) | private repository | researcher-uploaded (supplied by project owner) | accessible (owner credentials) | probable: supplied as the researcher's site; content is self-reported | 2026-11-05 | Claims only (bio, roles, 9 papers, services, community figures). Contains personal e-mail/phone (kept private). |
| SRC-LOCAL-01 | Local disk search (D:\, Desktop, Documents, Downloads, OneDrive; file names only, depth 3) | — | local files | accessible | n/a | 2026-11-05 | No researcher files found. Name matches were the project owner's own CVs (unrelated, not opened). |
| SRC-ORCID-01 | ORCID record | https://orcid.org/0000-0002-6141-5387 | official (researcher-maintained) | accessible (public API v3.0) | confirmed | 2026-11-05T19:57:54+00:00 | Employment (Sadat Academy, TA, since 2017), 7 works, keywords, 2 Scopus IDs, ResearcherID. No bio, education or URLs. |
| SRC-ORCID-02 | ORCID name search 'Ibrahim Taha' | https://pub.orcid.org/v3.0/expanded-search/ | aggregator search | accessible | n/a (disambiguation) | 2026-11-05T19:57:54+00:00 | 21 hits incl. a homonym 'Ibrahim Mohamed Taha' (Al-Azhar, agriculture), which was rejected. |
| SRC-OA-01 | OpenAlex author | https://openalex.org/A5102868128 | aggregator | accessible (API, no key needed) | confirmed (ORCID-linked) | 2026-11-05T20:02:41+00:00 | 9 works; affiliations Sadat Academy 2021–2026, Cairo University 2024–2026. |
| SRC-CR-01 | Crossref works | https://api.crossref.org/works | official DOI registration metadata | accessible | n/a (per-work) | 2026-11-05T20:02:46+00:00 | 10 DOI records. Abstracts deposited for 7. One deposit (EKB/JSTC) has malformed author name splits and a different author order. |
| SRC-DOI-01 | doi.org handle API | https://doi.org/api/handles/ | official | accessible | n/a | 2026-11-05T20:00:48+00:00 | 7/7 checked DOIs resolve. 3 DOIs discovered later were not handle-checked. |
| SRC-S2-01 | Semantic Scholar author | https://www.semanticscholar.org/author/2142163895 | aggregator | accessible (shared rate limit; 429 on bursts) | probable | 2026-11-05T20:12:10+00:00 | 8 papers incl. a misattributed 1970 record. |
| SRC-S2-02 | Semantic Scholar author (homonym) | https://www.semanticscholar.org/author/145792199 | aggregator | accessible | rejected (different person) | 2026-11-05T20:12:10+00:00 | Power engineering author; wrongly holds the SOIC 2024 paper. |
| SRC-GS-01 | Google Scholar profile | https://scholar.google.com/citations?user=VgoxbyYAAAAJ&hl=en | aggregator (researcher-curated profile) | accessible: one page only (robots.txt allows /citations?user=; pagination disallowed) | confirmed (verified sadatacademy.edu.eg e-mail) | 2026-11-05T19:58:50+00:00 | Metrics and first 20 article rows captured. Remaining rows need a researcher export. |
| SRC-RG-01 | ResearchGate profile | https://www.researchgate.net/profile/Ibrahim_Taha11 | aggregator / social | restricted: not accessed (automated access prohibited by terms) | probable (linked from SRC-SUP-01) | 2026-11-05 (not fetched) | Hosts the self-published guides (per Google Scholar). Needs researcher-provided list/URLs. |
| SRC-LI-01 | LinkedIn profile | https://www.linkedin.com/in/ibrahimaboalazm/ | social | restricted (login wall) | probable (linked from SRC-SUP-01) | 2026-11-05 (not fetched) | Needs researcher export (PDF profile) if employment history should be used. |
| SRC-TG-01 | Telegram channel 'الإحصاء وتطبيقاته' | https://t.me/StatisticalAnalysisEgypt | social (public preview) | accessible | probable (ownership self-reported) | 2026-11-05T19:58:51+00:00 | 46,523 members observed (self-reported 45,000+). |
| SRC-FB-01 | Facebook page 'Statistical Analysis – Egypt' | https://www.facebook.com/share/1B3DbXjPh7/ | social | restricted (login wall) | probable | 2026-11-05 (not fetched) | Self-reported 390,000+ followers, unverified. |
| SRC-FB-02 | Facebook group | https://www.facebook.com/share/g/1biRB3jfwp/ | social | restricted (login wall) | probable | 2026-11-05 (not fetched) | Self-reported 118,000+ members, unverified. |
| SRC-PDF-01 | Publisher PDFs (5 open-access, Creative Commons) | via DOI landing / OpenAlex best OA location | publisher | accessible | confirmed | 2026-11-05T20:03:12+00:00 | Used for affiliation-at-publication and author keywords. Local only. |
| SRC-DC-01 | Zenodo dataset (DataCite) | https://doi.org/10.5281/zenodo.23120962 | repository (official) | accessible | confirmed | 2026-11-05T20:02:43+00:00 | CC-BY-4.0; supplement to the JSCS 2026 paper; links the GitHub repo. |
| SRC-GH-01 | GitHub account | https://github.com/IbrahimTaha2018 | repository | accessible (public API) | probable (linked from the Zenodo deposit) | 2026-11-05T20:04:46+00:00 | 2 public repos; no licence files. |
| SRC-SCOPUS-01 | Scopus author IDs 57226774796, 58577960300 | https://www.scopus.com/ | official index | restricted (subscription) | probable (listed on ORCID) | 2026-11-05 (not fetched) | Two IDs suggest a split profile. Needs a Scopus export or a merge request by the researcher. |
| SRC-WOS-01 | Web of Science ResearcherID A-3519-2019 | https://www.webofscience.com/ | official index | restricted (subscription) | probable (listed on ORCID) | 2026-11-05 (not fetched) | Needs researcher export if WoS metrics are wanted. |
| SRC-INST-01 | Institutional staff pages (Sadat Academy, FGSSR Cairo University) | web search | institutional | unavailable (no page found) | n/a | 2026-11-05 | No staff profile found by web search; ask the researcher for an official page URL. |
| SRC-JMASM-01 | JMASM 2019 article page | web search + Crossref filtered search | publisher | unavailable (not found) | n/a | 2026-11-05 | No DOI or landing page found; needs the PDF or citation from the researcher. |

## Requests per source
| Source ID (log) | Requests |
|---|---|
| SRC-CR-API | 22 |
| SRC-DATACITE-API | 1 |
| SRC-DOI-HANDLE | 7 |
| SRC-GITHUB | 2 |
| SRC-GS-PROFILE | 1 |
| SRC-OA-API | 25 |
| SRC-OA-PDF | 5 |
| SRC-ORCID-API | 2 |
| SRC-S2-API | 18 |
| SRC-TG-CHANNEL | 1 |

## Exports needed from the researcher
- **Google Scholar**: "Export all" → BibTeX (to capture rows beyond the first 20).
- **ResearchGate**: list (or files) of the self-published guides and any other items hosted there.
- **Scopus / Web of Science**: author profile export (and clarification of the two Scopus IDs).
- **LinkedIn**: profile PDF, only if employment history beyond ORCID is wanted.
- **Institutional page**: official staff profile URL, if one exists.
- **JMASM 2019 paper and the 2018/2019 conference papers**: PDF or full citation (volume, issue, pages, DOI if any).
