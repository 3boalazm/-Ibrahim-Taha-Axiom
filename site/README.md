# site/ — Ibrahim Taha Axiom website (Astro, deployed on Vercel)

Bilingual academic website: English at `/`, Arabic (RTL) at `/ar/`. Static output, no client framework, about 2 KB of inline JS per page.

```bash
npm ci
npm run dev      # http://localhost:4321/
npm run build    # static output in dist/
npm run qa       # post-build checks (links, metadata, robots, privacy, contrast)
npm run preview  # serve dist/
```

## Content gate (read this first)

The site shows **only** what is approved. A researcher-specific item appears only if it is in `src/data/approved/` **and** listed in `src/data/approved/public-content.manifest.json`. As of 2026-11-05 the profile (including direct contact details), 17 publications, 4 research areas, 3 projects, 2 talks, teaching and CV are approved. Books is empty and hidden from navigation. Full rules: [`../docs/public-content-policy.md`](../docs/public-content-policy.md). Search indexing is controlled by `src/data/public-settings/launch.json`: [`../docs/website-launch-checklist.md`](../docs/website-launch-checklist.md).

## Structure

```
src/
├── components/
│   ├── layout/        BaseLayout pieces: SiteHeader, SiteFooter, Seo (meta, hreflang, JSON-LD, robots)
│   ├── navigation/    LanguageSwitcher, ThemeToggle, Breadcrumbs
│   ├── profile/       ProfileSummary (approved profile fields only)
│   ├── publications/  PublicationLibrary (search, type filter, year groups), PublicationItem, CiteBlock, AuthorList
│   ├── research/      EntryList (research areas / projects + evidence-backed related publications)
│   ├── shared/        PageHeader, EmptyState, LangText (language fallback), Wordmark
│   └── views/         HomeView, SectionRoute (all section pages), PublicationView (detail)
├── content/{en,ar}/   Page copy per section (typed content collection; describes the site, never the researcher)
├── data/
│   ├── approved/        Public-content manifest + approved data (BibTeX, profile, areas, projects, courses, talks, CV)
│   └── public-settings/ launch.json (site name, canonical origin, indexing switch)
├── i18n/ui.ts         Interface strings (EN/AR)
├── layouts/           BaseLayout.astro
├── pages/             Thin route files: / and /ar/ for every section, /publications/[key]/, 404, robots.txt
├── styles/            tokens.css (design tokens) + global.css
└── utils/             schema.ts (zod), content.ts (gate), publications.ts (BibTeX → typed records), paths.ts
scripts/qa.mjs         Post-build QA
```

## Publications
- Parsed at build time from `src/data/approved/publications.bib` with **@retorquere/bibtex-parser** (a real parser; sentence-casing disabled so titles stay exactly as written).
- Features: grouping by year, filter by type, search (title, authors, venue, keywords, year, DOI), selected styling, DOI links, abstract expansion, citation copy (APA-style text, BibTeX) and download (.bib, .ris), and a detail page per entry with Google Scholar `citation_*` meta and schema.org JSON-LD.
- Internal website fields (`selected`, `abbr`, `abstract`, `pdf`, `supp`, …) never appear in copied or downloaded BibTeX.
- Works with an empty dataset (current state).

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
`public/images/portrait.webp` (4:5, About), `portrait-wide.webp` (16:9, home identity band) and `og.jpg` (the 1200×630 share card) all derive from the researcher's own photograph, supplied by the project owner. Only the background was replaced — engraved brass sine wave and normal density curve on bone plaster — so the face, pose and clothing are untouched. The original stays at `public/images/portrait.jpg`; regenerate the crops with ImageMagick rather than re-generating the person, and update both alt texts in `imagery.ts` if the framing changes.

### Research metrics
Citation, read and h-index figures are content, not decoration: they change on third-party platforms without notice. They live in `src/data/approved/research-metrics.json` (platform, URL, retrieval date, figures) and are rendered by `src/utils/metrics.ts`, which always prints the platform and the date next to the number. The manifest's `metrics.approved` flag is the gate. Never add a metric that is not in that file, and re-verify the file (or remove the block) at each content review.

When real photographs are added later, they must be approved like any other researcher data (see [`../docs/public-content-policy.md`](../docs/public-content-policy.md)) and their alt text added to `imagery.ts`.

## Bilingual / RTL
- `<html lang dir>` per page; the language switcher links to the equivalent page; hreflang `en`, `ar`, `x-default`.
- Mixed-direction data is isolated: author names in `<bdi>`, DOIs and URLs forced LTR, foreign-language titles keep their own `lang` and direction.
- Missing translations fall back to the original language with a visible note. Content is never machine-translated.

## Deployment
Vercel project `ibrahim-taha-axiom`, Root Directory `site/`, Node 26.x. `vercel.json` skips builds when a commit does not touch `site/`. See [`../docs/deployment.md`](../docs/deployment.md).
