# Ibrahim Taha Axiom — Academic Platform

> **Phase 4: live interactive academic site.** The bilingual (EN/AR) website for the researcher Ibrahim Mohamed Taha is live at **https://ibrahim-taha-axiom.vercel.app** and built from [`site/`](site/README.md). The repository also keeps the Phase 1 research workspace: read-only reference snapshots of three open-source academic templates and the analysis comparing them. Content counts are generated from the approved data with `cd site && npm run inventory`; never edit them by hand.

## ملخص بالعربية

هذا هو الـ Workspace الموحّد لمشروع **Ibrahim Taha Axiom**. يحتوي على:

1. **`references/`**: نسخ مطابقة بالبايت للمشاريع الثلاثة (al-folio، Academic Pages، Astro Scholar). هي مراجع للدراسة فقط، ولا يتم تعديلها ولا دمج أكوادها.
2. **`research/`**: التحليل: جرد المشاريع، مصفوفة مقارنة الميزات، بنية المعلومات، تقييم تجربة المستخدم، المقارنة التقنية، ومراجعة التراخيص.
3. **`product/`**: الـ Product Brief المبدئي والتوصية المعمارية الأولية.
4. **`docs/decisions-pending.md`**: **سجل القرارات**: المعتمدة (اللغات، Astro، BibTeX، نطاق أول إصدار) والمعلّقة التي نحتاجها أثناء المرحلة الثانية.

أهم النتائج:
- **al-folio** هو الأغنى أكاديميًا (المنشورات، الـ CV، المقاييس، المقررات) لكنه ثقيل (Ruby + حوالي 19 gem) ودعمه للـ RTL جزئي.
- **Academic Pages** هو الأبسط (ملف لكل عنصر) لكنه قديم تقنيًا: بلا بحث، بلا مقاييس، وبلا RTL.
- **Astro Scholar** هو الأحدث والأسرع والأفضل في تجربة القراءة، لكنه ضعيف أكاديميًا ومعالجة BibTeX فيه هشّة.
- **لا يوجد أي مشروع جاهز للعربية/RTL كموقع كامل، ولا أي مشروع فيه نموذج تواصل أو لوحة مقاييس أو CMS.** هذه فجوات يغطيها منتجنا.
- 🟢 **معتمد:** الموقع ثنائي اللغة، الإنجليزية افتراضية + العربية مع RTL كامل (D-03).
- 🟢 **معتمد:** المنشورات تُدار في ملف BibTeX واحد (D-05).
- 🟢 **معتمد:** بناء جديد على Astro (D-04)، مع نقل نماذج البيانات الأكاديمية من al-folio وAcademic Pages، وتصميم ثنائي اللغة وRTL من البداية.

## Structure

```
ibrahim-taha-axiom/
├── README.md                          ← you are here
├── references/                        ← READ-ONLY reference snapshots (MIT)
│   ├── README.md                      provenance + rules
│   ├── _manifests/*.sha256            per-file hashes to prove nothing changed
│   ├── al-folio/                      github.com/alshedivat/al-folio @ e0a684c
│   ├── academic-pages/                github.com/academicpages/academicpages.github.io @ 9e19e63
│   └── astro-scholar/                 github.com/shravanngoswamii/astro-scholar @ ea6e3c5
├── research/
│   ├── repository-inventory.md        what each project is and contains
│   ├── feature-matrix.md              feature comparison + adopt / learn / reuse / avoid
│   ├── information-architecture.md    site maps, content models, draft IA
│   ├── ux-benchmark.md                UX scorecard, patterns, RTL readiness
│   ├── technical-comparison.md        stacks, architecture, scored directions
│   ├── licensing-review.md            licences, third-party assets, service terms
│   │   ── Phase 2: research data (unreviewed by the researcher) ──
│   ├── data-source-register.md        every source, access status, identity confidence
│   ├── research-data-inventory.md     counts by status + publication catalog
│   ├── author-identity-review.md      identity anchors, homonyms, authorship evidence
│   ├── metrics-source-review.md       source-labelled, dated metrics
│   ├── research-portfolio-analysis.md output, collaboration, research lines
│   ├── data-quality-report.md         completeness, conflicts, website readiness
│   ├── translation-inventory.md       AR/EN readiness
│   ├── data-gaps-and-questions.md     questions for the researcher (Arabic)
│   └── publication-reconciliation.csv, asset-inventory.csv
├── scripts/ingestion/                 Phase 2 pipeline (s01…s08), see its README
├── data-staging/                      LOCAL ONLY (gitignored): raw sources, evidence, exports
├── product/
│   ├── product-brief.md               vision, audiences, modules M1–M6, MVP proposal
│   └── architecture-recommendation.md architecture direction (Astro approved; libraries pending spikes)
├── site/                              ← the Astro website (Vercel Root Directory), see site/README.md
├── docs/
│   ├── decisions-pending.md           decision log, approved + open (Arabic)
│   ├── deployment.md                  Vercel setup, environment variables, release procedure
│   ├── public-content-policy.md       what the website may show, the consent record, how to approve content
│   ├── website-launch-checklist.md    indexing status + custom-domain steps
│   ├── interaction-architecture.md    search, explorer, knowledge graph, journey, lab, contact (Phase 4)
│   ├── lab-methodology.md             the shrinkage lab: design, estimators, results, revision history
│   ├── data-quality-register.md       open data issues (years, author order, identity, classification)
│   ├── translation-status.md          Arabic drafts vs reviewed text, terminology, review steps
│   ├── qa-checklist.md                automated checks, what was run, the manual EN/AR × light/dark matrix
│   ├── branch-protection.md           recommended required checks for main (not applied)
│   └── screenshots/phase-4/           review screenshots (EN/AR, light/dark, 390/1280)
├── .github/workflows/site-ci.yml      CI: build → QA → lab verification → tests → browser tests
└── .env.example                       environment template (real values never committed)
```

## Suggested reading order
1. [`docs/decisions-pending.md`](docs/decisions-pending.md): what needs your approval
2. [`research/feature-matrix.md`](research/feature-matrix.md)
3. [`product/product-brief.md`](product/product-brief.md)
4. [`product/architecture-recommendation.md`](product/architecture-recommendation.md)
5. The remaining `research/` documents for detail

## Workspace rules
- **References are read-only.** Do not edit, build or `npm install` inside `references/`. To run a reference, copy it somewhere else first.
- **No code merging.** References are study material. Any copied snippet must be recorded in a future `THIRD_PARTY_NOTICES.md` (see [licensing review](research/licensing-review.md)).
- **No fabricated research data.** Researcher content comes only from approved sources listed in `site/src/data/approved/public-content.manifest.json`; conflicts are recorded, not resolved by guesswork.
- `references/**` is stored without line-ending conversion (`.gitattributes`), so files stay byte-identical to the original snapshots.

Verify that the references are untouched (Git Bash / Linux / macOS):

```bash
for p in al-folio academic-pages astro-scholar; do (cd references/$p && sha256sum --quiet -c ../_manifests/$p.sha256) && echo "$p OK"; done
```

## Status
- [x] Phase 1: workspace, inspection, comparison, product brief, preliminary architecture
- [x] Blocking decisions approved (2026-11-05): languages EN default + AR (D-03), Astro (D-04), BibTeX (D-05), MVP scope (D-11)
- [x] Hosting: Vercel project `ibrahim-taha-axiom` with a temporary EN/AR placeholder (see [`docs/deployment.md`](docs/deployment.md))
- [x] Phase 2: research data collected, reconciled and analysed (reports in `research/`; data in local `data-staging/`)
- [x] Phase 3: bilingual website live at https://ibrahim-taha-axiom.vercel.app (EN `/`, AR `/ar/`). Researcher content is gated by [`docs/public-content-policy.md`](docs/public-content-policy.md); search indexing is ON (canonical: ibrahim-taha-axiom.vercel.app, custom domain pending; see [`docs/website-launch-checklist.md`](docs/website-launch-checklist.md))
- [x] Researcher approval recorded (2026-11-06): the researcher agreed to publication and the project owner confirmed it ([`docs/public-content-policy.md`](docs/public-content-policy.md) §1)
- [x] Phase 4: interactive academic experience: site search (Ctrl/⌘ K), publication explorer, knowledge graph from verified relationships, journey, corrected and verified shrinkage lab, contact composer, Arabic drafts with visible status, CI ([`docs/interaction-architecture.md`](docs/interaction-architecture.md))
- [ ] Researcher review of the Arabic drafts ([`docs/translation-status.md`](docs/translation-status.md)) and answers to the open data questions ([`docs/data-quality-register.md`](docs/data-quality-register.md))
- [ ] Custom domain (D-07a) and the remaining open decisions in [`docs/decisions-pending.md`](docs/decisions-pending.md)
