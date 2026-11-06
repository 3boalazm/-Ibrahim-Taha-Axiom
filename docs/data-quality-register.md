# Data-quality register

> Generated from `site/src/data/review/open-issues.json` by `npm run dq:register` (updated 2026-11-06). That file is the source of truth: edit it, then regenerate this page. An issue is closed only by a recorded decision of its named owner (who, when, the answer as given, and what changed); the build rejects a resolved issue without one. Nothing here was resolved by guesswork.

**15 resolved, 1 open** (of 16).

| Category | Resolved | Open |
| --- | --- | --- |
| year | DQ-01, DQ-02, DQ-03 | — |
| author-order | DQ-04 | — |
| identity | DQ-05, DQ-06, DQ-07, DQ-08, DQ-09, DQ-10, DQ-11 | — |
| classification | DQ-12 | DQ-13 |
| relationship | DQ-14 | — |
| metadata | DQ-15, DQ-16 | — |

## DQ-01 · year · resolved

**Question.** Which year should the beta ridge paper carry: the print issue or the online-first date?

- **Applies to:** `publication:abonazel2023beta`
- **Shown before the decision:** 2023 (Crossref print year, volume 52, issue 9)
- **Alternatives on record:** 2021 (published online first)
- **Sources:** research/data-quality-report.md (Year conflicts); research/data-gaps-and-questions.md (question 6)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): 2023, the year of the printed issue.
- **Applied:** No change needed: the entry already carries 2023 (volume 52, issue 9). The 2021 online-first date stays on record here only.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-02 · year · resolved

**Question.** Which year should the SOIC prior-selection paper carry?

- **Applies to:** `publication:seliem2024note`
- **Shown before the decision:** 2024 (first issued; Crossref has no print date)
- **Alternatives on record:** 2025 (volume 13(2), as shown by ORCID, Google Scholar and the earlier site)
- **Sources:** research/data-quality-report.md (Year conflicts); research/data-gaps-and-questions.md (question 6)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): 2024, the year it was first issued.
- **Applied:** No change needed: the entry already carries 2024. The 2025 volume year shown by ORCID and Google Scholar stays on record here only.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-03 · year · resolved

**Question.** The record gives year 2022 with volume 7, while the DOI (10.3389/fams.2021.780322) encodes 2021. Which year and volume are correct?

- **Applies to:** `publication:abonazel2022two`
- **Shown before the decision:** 2022, volume 7
- **Alternatives on record:** 2021, volume 7
- **Sources:** site/src/data/approved/publications.bib (entry abonazel2022two)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): 2022, volume 7.
- **Applied:** No change needed: the entry already carries 2022, volume 7. The DOI is an identifier and stays as registered.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-04 · author-order · resolved

**Question.** Which author order is official for the TAM paper?

- **Applies to:** `publication:elnady2022tam`
- **Shown before the decision:** Elnady, Taha, Abdella (DOI deposit order)
- **Alternatives on record:** Abdella, Taha, Elnady (OpenAlex, the preprint, Google Scholar and the earlier site)
- **Sources:** research/data-quality-report.md (Author-order conflict); research/data-gaps-and-questions.md (question 7)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): Elnady, Taha, Abdella.
- **Applied:** No change needed: the entry already lists the authors in this order (the DOI deposit order).
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-05 · identity · resolved

**Question.** ORCID lists two Scopus Author IDs. Are both the researcher’s, and should they be merged at Scopus?

- **Applies to:** `profile:identifiers`
- **Shown before the decision:** Both IDs (57226774796 and 58577960300) are listed as identifiers
- **Sources:** research/author-identity-review.md (item 1); research/data-gaps-and-questions.md (question 4)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): Only Scopus Author ID 57226774796 is correct.
- **Applied:** Scopus ID 58577960300 removed from the profile identifiers, and so from the structured data (sameAs). ORCID still lists both IDs; correcting ORCID and Scopus is for the researcher.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-06 · identity · resolved

**Question.** Two ResearchGate addresses are in the approved data. Are they the same profile, and which is canonical?

- **Applies to:** `profile:identifiers`, `project:statistical-guides`, `metrics:researchgate`
- **Shown before the decision:** Identifier and project link use profile/Ibrahim_Taha11; the metrics snapshot uses profile/Ibrahim-Taha-5
- **Sources:** site/src/data/approved/profile.json; site/src/data/approved/projects.json; site/src/data/approved/research-metrics.json
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): The same profile; the canonical address is Ibrahim-Taha-5.
- **Applied:** The ResearchGate identifier and the statistical-guides project link now use researchgate.net/profile/Ibrahim-Taha-5, the address the metrics snapshot already used. Ibrahim_Taha11 is no longer linked.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-07 · identity · resolved

**Question.** Which Sadat Academy branch is current?

- **Applies to:** `profile:affiliations`
- **Shown before the decision:** Maadi, Cairo (biography, 2026 paper, earlier site)
- **Alternatives on record:** Tanta (printed on the 2023 and 2025 papers)
- **Sources:** research/author-identity-review.md (item 2); research/data-quality-report.md (readiness table)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): Other wording: appointed to the Tanta branch; teaching at the main campus in Maadi (in the researcher’s words: «التعيين فرع طنطا», «التدريس في المقر الرئيسي في المعادي»).
- **Applied:** The Sadat Academy affiliation carries a note with this wording, in English and in the researcher’s Arabic, on the home and profile pages. The first sentence of the biography says the same; its Arabic draft was updated to match and is still labelled a draft.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-08 · identity · resolved

**Question.** Semantic Scholar attributes the 2024 SOIC paper to a different “Ibrahim B. M. Taha” and adds a 1970 record to the correct profile. Will the researcher claim the profile and request corrections?

- **Applies to:** `external:semantic-scholar`
- **Shown before the decision:** Semantic Scholar figures are not used on the site
- **Sources:** research/author-identity-review.md (item 3)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): No action for now.
- **Applied:** No change: Semantic Scholar figures stay unused on the site. The misattribution remains at Semantic Scholar unless the researcher claims the profile.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-09 · identity · resolved

**Question.** Is GitHub account IbrahimTaha2018 the researcher’s, what is the SVM_New repository, and which licence applies to the data repository (Zenodo says CC BY 4.0; the GitHub repository has none)?

- **Applies to:** `project:com-poisson-penalized-estimation`, `external:github`
- **Shown before the decision:** The GitHub data repository is linked from the project; SVM_New is not shown
- **Sources:** research/author-identity-review.md (item 4); research/data-gaps-and-questions.md (question 5)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): GitHub account IbrahimTaha2018 is the researcher’s. SVM_New is an old experimental repository: do not show it for now. Licence of the data repository: CC BY 4.0, matching Zenodo.
- **Applied:** The GitHub link stays and SVM_New stays unlisted. The project’s GitHub link is labelled "Data repository (GitHub, CC BY 4.0)" (Arabic draft updated). The repository itself still has no licence file; adding one is for the researcher.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-10 · identity · resolved

**Question.** What is the official Arabic spelling of the researcher’s name?

- **Applies to:** `profile:name`
- **Shown before the decision:** The Arabic pages keep the name in its original Latin form
- **Sources:** research/author-identity-review.md (item 5); research/data-gaps-and-questions.md (missing data table)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher); display form chosen by the project owner (project chat, 2026-11-06)): Official Arabic name: ابراهيم محمد ابراهيم محمود طه.
- **Applied:** profile.name.ar is ابراهيم محمد طه, the short form the project owner chose for headings, spelled as the researcher writes it. The new approved field profile.officialName.ar holds the full official name and is shown on the profile page. Both are alternateName in the home page’s structured data. Arabic pages no longer fall back to the Latin name.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-11 · identity · resolved

**Question.** The co-author appears as “Rady, E. H. A.” in one record and “Rady, E. A.” in two. Is this one person, and which form should be cited?

- **Applies to:** `publication:rady2019biased`, `publication:rady2019shrinkage`, `publication:rady2018ridge`
- **Shown before the decision:** Kept as recorded; the explorer’s co-author filter treats them as separate names
- **Sources:** site/src/data/approved/publications.bib (entries rady2019biased, rady2019shrinkage, rady2018ridge)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher); identity confirmed by the project owner (project chat, 2026-11-06)): Not sure whether the two forms are one person; cite as "Rady, E. A.". Asked whether to apply this to the record reading "Rady, E. H. A.", the project owner answered with the co-author’s full name, الحسيني عبد البر ابراهيم راضي, identifying one person.
- **Applied:** rady2019biased now reads "Rady, E. A." like the other two entries, so the explorer’s co-author filter lists one co-author for all three papers.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-12 · classification · resolved

**Question.** The self-published guides are typed inconsistently (book, misc, techreport). What type is each, and are “Sample Size Calculation” and “A Comprehensive Guide to Ridge Regression” duplicates of other entries?

- **Applies to:** `publication:taha2026panels`, `publication:taha2026logistic`, `publication:taha2026sample`, `publication:taha2026regression`, `publication:taha2025comprehensive`, `publication:taha2025comprehensivea`, `publication:taha2026fit`, `publication:taha2026normality`
- **Shown before the decision:** Types kept as recorded: four @book, two @misc, two @techreport
- **Sources:** research/data-gaps-and-questions.md (question 10); research/data-quality-report.md (readiness table)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): taha2026panels, taha2026logistic, taha2026sample, taha2026regression, taha2025comprehensive and taha2025comprehensivea: Book. taha2026fit and taha2026normality: TechReport. "Sample Size Calculation" and "A Comprehensive Guide to Ridge Regression": each is the entry already listed above.
- **Applied:** taha2025comprehensive and taha2025comprehensivea changed from @misc to @book (publisher ResearchGate, like the other guides), giving 6 books and 2 technical reports. The short-titled Google Scholar records pub-0020 ("Sample Size Calculation") and pub-0021 ("A Comprehensive Guide to Ridge Regression Theory, Methods, and Applications") are treated as duplicates of taha2026sample and taha2025comprehensive and stay out of the bibliography (research/publication-reconciliation.csv).
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-13 · classification · open

**Question.** Were the 2018 and 2019 conference papers published in proceedings, and did the researcher present them?

- **Applies to:** `talk:conference-2018-nb-ridge`, `talk:conference-2019-zinb-liu`
- **Shown now:** Listed as conference papers; the presenter is not stated
- **Sources:** research/data-gaps-and-questions.md (question 9)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): Not sure, for all four questions (2018 and 2019: published in proceedings? presented by the researcher?).
- **Outcome:** the answer does not settle the question, so it stays open and the site keeps showing the value above.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-14 · relationship · resolved

**Question.** Phase 4 adds method nodes (ridge, Liu-type, LASSO/elastic net, PLS-SEM, Monte Carlo) linked only where a publication’s own text names the method. Are these labels acceptable? Two older area links are weak: taha2026regression → penalized-count-regression and taha2026uncertainty → bayesian-estimation.

- **Applies to:** `manifest:methods`, `publication:taha2026regression`, `publication:taha2026uncertainty`
- **Shown before the decision:** Method links quote the publication text and are checked at build; the two weak area links are kept as approved
- **Sources:** site/src/data/approved/public-content.manifest.json (relationships)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher); target area chosen by the project owner (project chat, 2026-11-06)): All method labels are acceptable. taha2026regression → penalized-count-regression: replace. taha2026uncertainty → bayesian-estimation: replace.
- **Applied:** Both links now point to statistical-reporting-and-software, the target the project owner chose: penalized-count-regression goes from 7 to 6 publications, bayesian-estimation from 2 to 1, statistical-reporting-and-software from 3 to 5. Method labels unchanged.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-15 · metadata · resolved

**Question.** The journal name was deposited with Persian letter forms (ی and ک instead of ي and ك), and the record is tagged langid english although the venue is Arabic. Should the venue be normalised?

- **Applies to:** `publication:elnady2022tam`
- **Shown before the decision:** Kept exactly as deposited (search matches both letter forms)
- **Sources:** site/src/data/approved/publications.bib (entry elnady2022tam)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): Keep the record as deposited.
- **Applied:** No change: the venue keeps its deposited letter forms and langid. Search still matches both letter forms.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat

## DQ-16 · metadata · resolved

**Question.** Is there a file, DOI or link for the 2019 JMASM paper?

- **Applies to:** `publication:rady2019biased`
- **Shown before the decision:** Listed without DOI or URL
- **Sources:** research/data-gaps-and-questions.md (question 8)
- **Decides:** researcher
- **Answer** (2026-11-06, Ibrahim Taha (researcher)): None at present.
- **Applied:** No change: the entry stays listed without DOI, URL or file until one exists.
- **Source of the answer:** Data Quality Review, final responses (completed 2026-11-06 18:22, 16 of 16 answered), relayed by the project owner in the project chat
