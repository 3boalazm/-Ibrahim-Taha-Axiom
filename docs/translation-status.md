# Arabic translation status

> Counts are generated from `site/src/data/translations/ar.json` (prepared 2026-11-06) and the approved data files. Regenerate this page after any review.

**Status: 81 Arabic drafts, 0 reviewed.** The drafts are AI-assisted Modern Standard Arabic. They were written for this site with standard statistical terminology, and **none has been reviewed by the researcher**. Approved Arabic, meaning text in the data files that the researcher supplied or approved (or, for two link labels, that the project owner gave verbatim), always takes precedence over a draft.

Two drafts were edited on 2026-11-06 to follow data changes the researcher decided: the first sentence of the biography (Tanta branch and Maadi campus, DQ-07) and the label of the GitHub data-repository link (CC BY 4.0, DQ-09). Both are still unreviewed drafts.

On 2026-11-07 the summary draft of the two conference papers was rewritten to follow their reclassification: papers in the conference proceedings, with oral presentation by Ibrahim unconfirmed (DQ-13). It is still an unreviewed draft. The two source-link labels on that page, «وقائع المؤتمر (PDF)» and «النص الكامل (ResearchGate)», are not drafts: the project owner gave them verbatim, and they are stored as approved Arabic in `talks.json`.

| Content | Approved Arabic fields | Drafts awaiting review | Reviewed drafts |
| --- | --- | --- | --- |
| profile | 4 | 26 | 0 |
| research-areas | 2 | 10 | 0 |
| projects | 1 | 10 | 0 |
| courses | 0 | 11 | 0 |
| talks (conference papers) | 2 | 1 | 0 |
| cv | 5 | 11 | 0 |
| methods | 0 | 10 | 0 |
| datasets | 0 | 2 | 0 |

## How drafts appear on the site

- `manifest.translations.ar.showDrafts` is `true`, so the Arabic pages show drafts instead of falling back to English.
- Every draft carries a visible label: «ترجمة مبدئية — لم يراجعها الباحث بعد» (inline, or a page-level note on pages made mostly of drafts). The Arabic footer explains the label and gives the live count under «حالة الترجمة».
- English pages never show Arabic drafts.
- To hide every draft at once, set `showDrafts` to `false`. Untranslated fields then fall back to English, marked with `lang="en"`.

## What is never translated

Publication titles, abstracts, journal and publisher names, people's names, DOIs, URLs, ORCID/Scopus/OpenAlex identifiers and BibTeX keys stay in their original form. Identifiers are rendered as isolated left-to-right runs. The researcher's Arabic name is approved, not translated: the Arabic headings show «ابراهيم محمد طه», and the profile page also gives the official full name «ابراهيم محمد ابراهيم محمود طه» (DQ-10 in [data-quality-register.md](data-quality-register.md)). Co-authors' names stay in their original form.

## Terminology used in the drafts

| English | Arabic |
| --- | --- |
| penalized estimation | التقدير الجزائي (المعاقَب) |
| count regression | انحدار بيانات العدّ |
| ridge | الحَرْف (Ridge) |
| Liu-type estimator | المقدِّر من نوع ليو (Liu-type) |
| multicollinearity | التعدد الخطي |
| negative binomial | ذو الحدين السالب |
| panel data | بيانات البانل |
| cointegration | التكامل المشترك |
| generalized linear models | النماذج الخطية المعمَّمة |
| structural equation modeling | نمذجة المعادلات البنائية |
| cross-validation | التحقق المتقاطع |
| bias / variance inflation factor | التحيّز / معامل تضخّم التباين |
| deviance / overdispersion | الانحرافية / فرط التشتت |
| maximum likelihood | الإمكان الأعظم |

## Reviewing a draft

1. The researcher reads the Arabic page next to the English one (the language switch keeps the same page).
2. If the text is accepted, copy it into the field's `ar` value in `site/src/data/approved/*.json`. Approved text overrides the draft.
3. Either delete the draft entry or set its `status` to `"reviewed"` and set `reviewedBy` at the top of `ar.json`. The test suite refuses a reviewed entry without a reviewer.
4. Run `npm run build && npm run qa && npm test`.
