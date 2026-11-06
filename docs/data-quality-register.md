# Data-quality register

> Generated from `site/src/data/review/open-issues.json` (updated 2026-11-06). That file is the source of truth: edit it, then regenerate this page. Every issue below is **open**. Nothing here has been resolved by guesswork; the site shows the *current* value and the alternatives stay recorded until the named owner decides.

| Category | Open issues |
| --- | --- |
| year | DQ-01, DQ-02, DQ-03 |
| author-order | DQ-04 |
| identity | DQ-05, DQ-06, DQ-07, DQ-08, DQ-09, DQ-10, DQ-11 |
| classification | DQ-12, DQ-13 |
| relationship | DQ-14 |
| metadata | DQ-15, DQ-16 |

## DQ-01 · year · open

**Question.** Which year should the beta ridge paper carry: the print issue or the online-first date?

- **Applies to:** `publication:abonazel2023beta`
- **Shown now:** 2023 (Crossref print year, volume 52, issue 9)
- **Alternatives on record:** 2021 (published online first)
- **Sources:** research/data-quality-report.md (Year conflicts); research/data-gaps-and-questions.md (question 6)
- **Decides:** researcher

## DQ-02 · year · open

**Question.** Which year should the SOIC prior-selection paper carry?

- **Applies to:** `publication:seliem2024note`
- **Shown now:** 2024 (first issued; Crossref has no print date)
- **Alternatives on record:** 2025 (volume 13(2), as shown by ORCID, Google Scholar and the earlier site)
- **Sources:** research/data-quality-report.md (Year conflicts); research/data-gaps-and-questions.md (question 6)
- **Decides:** researcher

## DQ-03 · year · open

**Question.** The record gives year 2022 with volume 7, while the DOI (10.3389/fams.2021.780322) encodes 2021. Which year and volume are correct?

- **Applies to:** `publication:abonazel2022two`
- **Shown now:** 2022, volume 7
- **Alternatives on record:** 2021, volume 7
- **Sources:** site/src/data/approved/publications.bib (entry abonazel2022two)
- **Decides:** researcher

## DQ-04 · author-order · open

**Question.** Which author order is official for the TAM paper?

- **Applies to:** `publication:elnady2022tam`
- **Shown now:** Elnady, Taha, Abdella (DOI deposit order)
- **Alternatives on record:** Abdella, Taha, Elnady (OpenAlex, the preprint, Google Scholar and the earlier site)
- **Sources:** research/data-quality-report.md (Author-order conflict); research/data-gaps-and-questions.md (question 7)
- **Decides:** researcher

## DQ-05 · identity · open

**Question.** ORCID lists two Scopus Author IDs. Are both the researcher’s, and should they be merged at Scopus?

- **Applies to:** `profile:identifiers`
- **Shown now:** Both IDs (57226774796 and 58577960300) are listed as identifiers
- **Sources:** research/author-identity-review.md (item 1); research/data-gaps-and-questions.md (question 4)
- **Decides:** researcher

## DQ-06 · identity · open

**Question.** Two ResearchGate addresses are in the approved data. Are they the same profile, and which is canonical?

- **Applies to:** `profile:identifiers`, `project:statistical-guides`, `metrics:researchgate`
- **Shown now:** Identifier and project link use profile/Ibrahim_Taha11; the metrics snapshot uses profile/Ibrahim-Taha-5
- **Sources:** site/src/data/approved/profile.json; site/src/data/approved/projects.json; site/src/data/approved/research-metrics.json
- **Decides:** researcher

## DQ-07 · identity · open

**Question.** Which Sadat Academy branch is current?

- **Applies to:** `profile:affiliations`
- **Shown now:** Maadi, Cairo (biography, 2026 paper, earlier site)
- **Alternatives on record:** Tanta (printed on the 2023 and 2025 papers)
- **Sources:** research/author-identity-review.md (item 2); research/data-quality-report.md (readiness table)
- **Decides:** researcher

## DQ-08 · identity · open

**Question.** Semantic Scholar attributes the 2024 SOIC paper to a different “Ibrahim B. M. Taha” and adds a 1970 record to the correct profile. Will the researcher claim the profile and request corrections?

- **Applies to:** `external:semantic-scholar`
- **Shown now:** Semantic Scholar figures are not used on the site
- **Sources:** research/author-identity-review.md (item 3)
- **Decides:** researcher

## DQ-09 · identity · open

**Question.** Is GitHub account IbrahimTaha2018 the researcher’s, what is the SVM_New repository, and which licence applies to the data repository (Zenodo says CC BY 4.0; the GitHub repository has none)?

- **Applies to:** `project:com-poisson-penalized-estimation`, `external:github`
- **Shown now:** The GitHub data repository is linked from the project; SVM_New is not shown
- **Sources:** research/author-identity-review.md (item 4); research/data-gaps-and-questions.md (question 5)
- **Decides:** researcher

## DQ-10 · identity · open

**Question.** What is the official Arabic spelling of the researcher’s name?

- **Applies to:** `profile:name`
- **Shown now:** The Arabic pages keep the name in its original Latin form
- **Sources:** research/author-identity-review.md (item 5); research/data-gaps-and-questions.md (missing data table)
- **Decides:** researcher

## DQ-11 · identity · open

**Question.** The co-author appears as “Rady, E. H. A.” in one record and “Rady, E. A.” in two. Is this one person, and which form should be cited?

- **Applies to:** `publication:rady2019biased`, `publication:rady2019shrinkage`, `publication:rady2018ridge`
- **Shown now:** Kept as recorded; the explorer’s co-author filter treats them as separate names
- **Sources:** site/src/data/approved/publications.bib (entries rady2019biased, rady2019shrinkage, rady2018ridge)
- **Decides:** researcher

## DQ-12 · classification · open

**Question.** The self-published guides are typed inconsistently (book, misc, techreport). What type is each, and are “Sample Size Calculation” and “A Comprehensive Guide to Ridge Regression” duplicates of other entries?

- **Applies to:** `publication:taha2026panels`, `publication:taha2026logistic`, `publication:taha2026sample`, `publication:taha2026regression`, `publication:taha2025comprehensive`, `publication:taha2025comprehensivea`, `publication:taha2026fit`, `publication:taha2026normality`
- **Shown now:** Types kept as recorded: four @book, two @misc, two @techreport
- **Sources:** research/data-gaps-and-questions.md (question 10); research/data-quality-report.md (readiness table)
- **Decides:** researcher

## DQ-13 · classification · open

**Question.** Were the 2018 and 2019 conference papers published in proceedings, and did the researcher present them?

- **Applies to:** `talk:conference-2018-nb-ridge`, `talk:conference-2019-zinb-liu`
- **Shown now:** Listed as conference papers; the presenter is not stated
- **Sources:** research/data-gaps-and-questions.md (question 9)
- **Decides:** researcher

## DQ-14 · relationship · open

**Question.** Phase 4 adds method nodes (ridge, Liu-type, LASSO/elastic net, PLS-SEM, Monte Carlo) linked only where a publication’s own text names the method. Are these labels acceptable? Two older area links are weak: taha2026regression → penalized-count-regression and taha2026uncertainty → bayesian-estimation.

- **Applies to:** `manifest:methods`, `publication:taha2026regression`, `publication:taha2026uncertainty`
- **Shown now:** Method links quote the publication text and are checked at build; the two weak area links are kept as approved
- **Sources:** site/src/data/approved/public-content.manifest.json (relationships)
- **Decides:** researcher

## DQ-15 · metadata · open

**Question.** The journal name was deposited with Persian letter forms (ی and ک instead of ي and ك), and the record is tagged langid english although the venue is Arabic. Should the venue be normalised?

- **Applies to:** `publication:elnady2022tam`
- **Shown now:** Kept exactly as deposited (search matches both letter forms)
- **Sources:** site/src/data/approved/publications.bib (entry elnady2022tam)
- **Decides:** researcher

## DQ-16 · metadata · open

**Question.** Is there a file, DOI or link for the 2019 JMASM paper?

- **Applies to:** `publication:rady2019biased`
- **Shown now:** Listed without DOI or URL
- **Sources:** research/data-gaps-and-questions.md (question 8)
- **Decides:** researcher

