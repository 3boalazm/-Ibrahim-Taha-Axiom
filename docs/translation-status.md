# Arabic translation status

> Counts are generated from `site/src/data/translations/ar.json` (prepared 2026-11-06, marked reviewed 2026-11-07) and the approved data files. Regenerate this page after any review.

**Status: 83 Arabic translations, all marked reviewed on 2026-11-07; 0 drafts awaiting review.** The translations are AI-assisted Modern Standard Arabic, written for this site with standard statistical terminology. On 2026-11-07 the project owner wrote in the project chat: «شيل انو اي نص في الموقع مش متراجع الموقع اتراجع كله بالفعل» ("remove [the notice] that any text on the site is unreviewed: the whole site has already been reviewed"). On that confirmation every entry was set to `reviewed`, and `reviewedBy` in `ar.json` quotes it. **The owner did not say who reviewed the text, so no reviewer is named here or on the site, and the site does not say that the researcher reviewed it** (decision D-24; the record is in the approval history of `public-content.manifest.json`). The same confirmation covers the lab's Arabic interface text, which is written in the lab's component rather than in `ar.json`. Approved Arabic, meaning text in the data files that the researcher supplied or approved (or, for two link labels, that the project owner gave verbatim), still takes precedence over a translation.

Two drafts were edited on 2026-11-06 to follow data changes the researcher decided: the first sentence of the biography (Tanta branch and Maadi campus, DQ-07) and the label of the GitHub data-repository link (CC BY 4.0, DQ-09). Both were drafts until D-24.

On 2026-11-07 the summary draft of the two conference papers was rewritten to follow their reclassification: papers in the conference proceedings, with oral presentation by Ibrahim unconfirmed (DQ-13). It was a draft until D-24. The two source-link labels on that page, «وقائع المؤتمر (PDF)» and «النص الكامل (ResearchGate)», are not drafts: the project owner gave them verbatim, and they are stored as approved Arabic in `talks.json`.

Also on 2026-11-07, the community changes (D-23) added two drafts: the WhatsApp group's label in the profile («مجموعة Statistical Analysis – Egypt على واتساب») and on the projects page («مجموعة واتساب»). They also edited the draft of the project's summary, which now names WhatsApp and calls the Telegram space a group («مجموعة»). All three were drafts until D-24. The approved Arabic label of the Telegram link now reads «الإحصاء وتطبيقاته (مجموعة تيليجرام)» instead of «… (قناة تيليجرام)», because Telegram's public page describes a group.

| Content | Approved Arabic fields | Drafts awaiting review | Reviewed translations |
| --- | --- | --- | --- |
| profile | 4 | 0 | 27 |
| research-areas | 2 | 0 | 10 |
| projects | 1 | 0 | 11 |
| courses | 0 | 0 | 11 |
| talks (conference papers) | 2 | 0 | 1 |
| cv | 5 | 0 | 11 |
| methods | 0 | 0 | 10 |
| datasets | 0 | 0 | 2 |

## How translations and drafts appear on the site

- `manifest.translations.ar.showDrafts` is `true`, so the Arabic pages show the Arabic translations instead of falling back to English.
- A reviewed entry is plain Arabic text with no label. Since 2026-11-07 every entry is reviewed, so no page carries a draft label, a draft note, a draft badge in search or the graph, or a translation-status count.
- The labelling stays in the code for Arabic text added later as a draft (`status: "draft"`). Such a draft gets a visible label, «ترجمة مبدئية — لم يراجعها الباحث بعد» (inline, or a page-level note on pages made mostly of drafts); search and the graph show their draft badge; the assistant is told that some Arabic text is unreviewed; and the Arabic footer explains the label and gives the live count under «حالة الترجمة». This was checked on 2026-11-07 by setting one entry back to `draft` in a trial build: the label, the home page's note and the footer line with its count came back.
- The lab's Arabic interface text is written in its component, not in `ar.json`, so it has no draft label of its own: a later change to it would not be labelled automatically.
- The Arabic footer always says «عناوين المنشورات وأسماء الدوريات والأشخاص تبقى بلغتها الأصلية.» (publication titles and the names of journals and people keep their original language).
- English pages never show Arabic drafts.
- To hide every draft at once, set `showDrafts` to `false`. Untranslated fields then fall back to English, marked with `lang="en"`.

## What is never translated

Publication titles, abstracts, journal and publisher names, people's names, DOIs, URLs, ORCID/Scopus/OpenAlex identifiers and BibTeX keys stay in their original form. Identifiers are rendered as isolated left-to-right runs. The researcher's Arabic name is approved, not translated: the Arabic headings show «ابراهيم محمد طه», and the profile page also gives the official full name «ابراهيم محمد ابراهيم محمود طه» (DQ-10 in [data-quality-register.md](data-quality-register.md)). Co-authors' names stay in their original form.

## Terminology used in the translations

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

## Reviewing a new draft

For Arabic text added later as a draft (`status: "draft"`):

1. The researcher reads the Arabic page next to the English one (the language switch keeps the same page).
2. If the text is accepted, copy it into the field's `ar` value in `site/src/data/approved/*.json`. Approved text overrides the draft.
3. Either delete the draft entry or set its `status` to `"reviewed"` and set `reviewedBy` at the top of `ar.json`. The test suite refuses a reviewed entry without a reviewer.
4. Run `npm run build && npm run qa && npm test`.
