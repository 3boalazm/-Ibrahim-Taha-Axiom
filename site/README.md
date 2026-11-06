# site/ — Ibrahim Taha Axiom website (Astro, deployed on Vercel)

Bilingual academic website: English at `/`, Arabic (RTL) at `/ar/`. Static output, no client framework. Interactive features are small inline scripts that enhance server-rendered HTML; each loads only on the pages that use it (see [`../docs/interaction-architecture.md`](../docs/interaction-architecture.md)).

```bash
npm ci
npm run dev        # http://localhost:4321/
npm run build      # static output in dist/
npm run qa         # post-build checks (links, metadata, robots, privacy, contrast, sitemap)
npm run lab:verify # recompute the lab from its seed and check every quoted number
npm test           # node:test suites in tests/ (run after the build)
npm run test:e2e   # browser checks; needs CHROME_PATH and `npm i --no-save puppeteer-core@25`
npm run inventory  # content counts derived from the approved data
npm run preview    # serve dist/
```

CI runs build → qa → lab:verify → test → test:e2e on every pull request touching `site/` (`../.github/workflows/site-ci.yml`).

## Content gate (read this first)

The site shows **only** what is approved. A researcher-specific item appears only if it is in `src/data/approved/` **and** listed in `src/data/approved/public-content.manifest.json`. The researcher agreed to publication and the project owner confirmed it on 2026-11-06 (recorded in the manifest's `researcherApproval`). Approved now:
- the profile, with direct contact details;
- 22 bibliography entries (10 journal articles, 4 books, 2 technical reports, 2 conference papers, 1 master's thesis, 1 preprint, 2 other works; all 22 are in the Publications explorer, and the books also have a Books page);
- 6 research areas, 3 projects, 5 courses, 2 talks, 5 methods and 1 dataset;
- the CV, and a dated metrics snapshot;
- 42 evidence-backed relationships.

Run `npm run inventory` for the current figures rather than trusting this paragraph. Arabic: 81 AI-assisted drafts, none reviewed yet, each shown with a visible draft label ([`../docs/translation-status.md`](../docs/translation-status.md)). Full rules: [`../docs/public-content-policy.md`](../docs/public-content-policy.md). Search indexing is controlled by `src/data/public-settings/launch.json`: [`../docs/website-launch-checklist.md`](../docs/website-launch-checklist.md).

## Structure

```
src/
├── components/
│   ├── layout/        BaseLayout pieces: SiteHeader (search button), SiteFooter (translation status), Seo (meta, hreflang, JSON-LD, robots)
│   ├── home/          HomeHero (normal-density figure), IdentityPanel, MetricCards, ResearchDiscovery, LabTeaser
│   ├── search/        SearchDialog (Ctrl/⌘ K, combobox + listbox)
│   ├── publications/  PublicationExplorer (search, filters, sorts, views, URL state), PublicationItem, CiteBlock, AuthorList
│   ├── research/      KnowledgeGraph (verified relationships), EntryList
│   ├── about/         Journey (dated milestones)
│   ├── contact/       ContactComposer (mailto, nothing sent from the site)
│   ├── lab/           ShrinkageLab
│   ├── navigation/    LanguageSwitcher, ThemeToggle, Breadcrumbs
│   ├── profile/       ProfileSummary (approved profile fields only)
│   ├── shared/        PageHeader, SectionNav, EmptyState, LangText (language fallback + draft label), DraftNote, Wordmark
│   └── views/         HomeView, SectionRoute (all section pages), PublicationView (detail), LabView
├── content/{en,ar}/   Page copy per section (typed content collection; describes the site, never the researcher)
├── data/
│   ├── approved/        Public-content manifest (approval, relationships) + approved data (BibTeX, profile, areas, projects, courses, talks, methods, datasets, CV, metrics)
│   ├── translations/    ar.json: Arabic drafts (status per entry)
│   ├── review/          open-issues.json: unresolved data questions (DQ-01…)
│   └── public-settings/ launch.json (site name, canonical origin, indexing switch)
├── i18n/ui.ts         Interface strings (EN/AR)
├── lab/               The lab's statistics (build time only)
├── layouts/           BaseLayout.astro
├── lib/               Framework-free logic shared by build, browser and tests: text, search, explorer, normal
├── pages/             Thin route files: / and /ar/ for every section, /publications/[key]/, /search-index/[lang].json, 404, robots.txt
├── styles/            tokens.css (design tokens) + global.css
└── utils/             schema.ts (zod), content.ts (gate), publications.ts (BibTeX → typed records), relations.ts, graph.ts, search-index.ts, format.ts, paths.ts
scripts/               qa.mjs, lab-verify.mjs, content-inventory.mjs
tests/                 node:test suites (+ e2e/keyboard.mjs, browser)
```

## Publications
- Parsed at build time from `src/data/approved/publications.bib` with **@retorquere/bibtex-parser** (a real parser; sentence-casing disabled so titles stay exactly as written).
- Features: the explorer (search across title, authors, year, venue, DOI and keywords with Arabic normalisation; type, year-range, selected, co-author and research-area filters; four sorts; list/compact/cards views; shareable URL state), DOI links, abstract expansion, citation copy and BibTeX/RIS export per entry.
- Internal website fields (`selected`, `abbr`, `abstract`, `pdf`, `supp`, …) never appear in copied or downloaded BibTeX.
- Works with an empty dataset (pages show an empty state rather than failing).

## The lab (`/lab/`)
An **illustrative controlled experiment**, not the researcher's published COM-Poisson method. A dial raises the correlation between four predictors, and three estimators (maximum likelihood, ridge with λ by cross-validation, and a norm-scaled ridge) are refitted on data rebuilt from the same random draws. Full design and results: [`../docs/lab-methodology.md`](../docs/lab-methodology.md).

- `src/lab/model.ts`: seeded data generation, the NB2 working model, penalised Fisher scoring, approximate standard errors, 5-fold CV on Poisson deviance.
- `src/lab/metrics.ts`: build-time Monte Carlo, 100 replicates at each of the 15 correlation levels (spread = 2·RMS of the slope SDs, RMSE).
- `src/lab/snapshots.ts`: every state the page can show, computed at build and shipped as a JSON payload of about 15 KB. **No statistics code reaches the browser.** `CLAIMS` holds every number the prose quotes, computed from the rounded payload.
- `src/components/lab/ShrinkageLab.astro`: markup, EN/AR copy and the client script (state lookup, charts and the table, drawn from payload values).
- `npm run lab:verify` recomputes everything from the seed. It checks convergence, spread = 2·RMS(sd), and every quoted number in both languages (25 claims), and it ensures retired wording appears only in the revision note.

Rules: the lab may never invent a number, and the maths is never changed for visual effect. If the copy changes, `CLAIMS` and the verifier change with it. If the model changes, rebuild and re-run `lab:verify`.

## Design system
`src/styles/tokens.css` is the whole system: colour (warm bone paper and deep pine-dark themes), typography (Fraunces for display, IBM Plex Sans for interface, IBM Plex Sans Arabic / Noto Kufi Arabic and Noto Naskh Arabic for Arabic), a fluid type scale, spacing, radii, shadows and motion. Components only consume tokens, and `npm run qa` re-checks every text/background pair for WCAG contrast in both themes — change a hex and run it again.

The direction is **dark-forest editorial**: a full-bleed image masthead with the title set large, a pill navigation bar, brass-indexed numerals, soft `--radius-3`/`--radius-4` surfaces and generous white space. Layout uses CSS logical properties throughout, so RTL comes from `dir="rtl"` with no mirrored CSS.

## Imagery
All photography lives in `public/images/` (WebP, plus a 1200×630 `og.jpg`) and every alt text is bilingual and kept in `src/utils/imagery.ts` — never inline in a component.

The images are **abstract still lifes generated for this project**, all in one material language — bone/ivory plaster, brushed brass, soft raking light, film grain — so the set reads as a single series: a translucent regression surface, sculpted density curves, a metallic lattice, a writing desk, embossed contours, a glass mosaic ribbon, stacked strata, a brass sine wave on a plinth, a tetrahedron–octahedron–sphere group with a caliper, a grid of frosted-glass cubes, and a tangent rod touching a plaster curve. Each one depicts a statistical or mathematical object, so the imagery carries the subject rather than decorating it. That is a deliberate content rule, not a style preference:

- no depictions of people (no portraits, faces or hands) in any generated asset, so no image can be read as a claim about a real person or conflict with a modesty/religious constraint — the single exception is the researcher's own approved portrait described below;
- no religious symbols, figurative art of living beings, alcohol or political imagery;
- no text in any asset, so nothing is misread or mistranslated;
- no third-party stock licence to track, and no copyright or attribution burden.

### Portrait
`public/images/portrait.webp` (4:5, About) and `portrait-wide.webp` (16:9, home identity band) derive from the researcher's own photograph, supplied by the project owner. Only the background was replaced — engraved brass sine wave and normal density curve on bone plaster — so the face, pose and clothing are untouched. The original stays at `public/images/portrait.jpg`; regenerate the crops with ImageMagick rather than re-generating the person, and update both alt texts in `imagery.ts` if the framing changes.

### Logo and icons
The mark is a **normal-density curve on its axis, inside a brass ring** — the subject of the site drawn as a symbol. It is vector, not a photograph, so it stays crisp at any size and inherits the theme:

- `site/src/components/shared/Mark.astro` renders it **inline**, with the curve on `currentColor` and the ring on `--mark-ring`. Header, footer and anything else uses this component; it never loads an image.
- `public/images/mark.svg` is the same geometry as a standalone file (for `og`, social avatars, print), and `mark-inverse.svg` is the reversed version for dark surfaces.
- Geometry lives in `.scratch/mark/build_mark.py` (`Mark` class: sigma, peak, taper, ring radius). Edit the numbers there, rerun it, and copy the regenerated path into `Mark.astro`. The script also regenerates every raster icon, so the vector and the icons cannot drift.

| file | use |
| --- | --- |
| `favicon.ico`, `favicon-16/32/48.png` | browser tabs: **pine field, brass ring, bone curve**, with a heavier stroke and a wider taper than the big mark so it survives 16 px |
| `apple-touch-icon.png` (180) | iOS home screen: pine field, mark inset so iOS corner rounding cannot clip the ring |
| `icon-192.png`, `icon-512.png` + `site.webmanifest` | installable app, pine background and theme colour |
| `images/mark.svg`, `mark-inverse.svg` | standalone vector, for share images and anything outside the app |

Rules: icons stay **opaque** (a transparent tab icon turns black in dark browser themes); the tab version is drawn for its smallest size rather than scaled down from the large one; below 44rem the header hides the wordmark and shows the mark alone, while the link keeps the full site name as its accessible name.

### Research metrics
Citation, read and h-index figures are content, not decoration: they change on third-party platforms without notice. They live in `src/data/approved/research-metrics.json` (platform, URL, retrieval date, figures) and are rendered by `src/utils/metrics.ts`, which always prints the platform and the date next to the number. The manifest's `metrics.approved` flag is the gate. Never add a metric that is not in that file, and re-verify the file (or remove the block) at each content review.

When real photographs are added later, they must be approved like any other researcher data (see [`../docs/public-content-policy.md`](../docs/public-content-policy.md)) and their alt text added to `imagery.ts`.

## Bilingual / RTL
- `<html lang dir>` per page; the language switcher links to the equivalent page; hreflang `en`, `ar`, `x-default`.
- Mixed-direction data is isolated: author names in `<bdi>`, DOIs and URLs forced LTR, foreign-language titles keep their own `lang` and direction.
- Missing translations fall back to the original language with a visible note. Content is never machine-translated.

## Deployment
Vercel project `ibrahim-taha-axiom`, Root Directory `site/`, Node 26.x. `vercel.json` skips builds when a commit does not touch `site/`. See [`../docs/deployment.md`](../docs/deployment.md).
