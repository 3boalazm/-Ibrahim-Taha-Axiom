# Ibrahim Taha Axiom — Academic Platform Research Workspace

> **Phase 1: Research workspace.** This repository holds read-only reference snapshots of three open-source academic website templates and the analysis comparing them. It is the starting point for an academic and research platform for one researcher. **There is no product code yet.**

## ملخص بالعربية

هذا هو الـ Workspace الموحّد لمشروع **Ibrahim Taha Axiom**. يحتوي على:

1. **`references/`**: نسخ مطابقة بالبايت للمشاريع الثلاثة (al-folio، Academic Pages، Astro Scholar). هي مراجع للدراسة فقط، ولا يتم تعديلها ولا دمج أكوادها.
2. **`research/`**: التحليل: جرد المشاريع، مصفوفة مقارنة الميزات، بنية المعلومات، تقييم تجربة المستخدم، المقارنة التقنية، ومراجعة التراخيص.
3. **`product/`**: الـ Product Brief المبدئي والتوصية المعمارية الأولية.
4. **`docs/decisions-pending.md`**: **القرارات التي تحتاج موافقتك** قبل الانتقال للمرحلة الثانية.

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
│   └── licensing-review.md            licences, third-party assets, service terms
├── product/
│   ├── product-brief.md               vision, audiences, modules M1–M6, MVP proposal
│   └── architecture-recommendation.md architecture direction (Astro approved; libraries pending spikes)
└── docs/
    └── decisions-pending.md           decisions that need approval (Arabic)
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
- **No fabricated research data.** Researcher content will be supplied by the researcher (decision D-14).
- `references/**` is stored without line-ending conversion (`.gitattributes`), so files stay byte-identical to the original snapshots.

Verify that the references are untouched (Git Bash / Linux / macOS):

```bash
for p in al-folio academic-pages astro-scholar; do (cd references/$p && sha256sum --quiet -c ../_manifests/$p.sha256) && echo "$p OK"; done
```

## Status
- [x] Phase 1: workspace, inspection, comparison, product brief, preliminary architecture
- [ ] Phase 2: blocked on the decisions in [`docs/decisions-pending.md`](docs/decisions-pending.md)
