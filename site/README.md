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
│   ├── shared/        PageHeader, EmptyState, TypeBadge, LangText (language fallback), Wordmark
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
`src/styles/tokens.css` defines colour (light "paper" and dark themes), typography (Source Serif 4 for reading and display, IBM Plex Sans for interface, IBM Plex Sans Arabic and Noto Naskh Arabic for Arabic), a fluid type scale, spacing, widths, borders, radii and motion. Components only consume tokens. Layout uses CSS logical properties throughout, so RTL comes from `dir="rtl"` and no mirrored CSS is needed. Fonts are self-hosted via Fontsource (SIL OFL).

## Bilingual / RTL
- `<html lang dir>` per page; the language switcher links to the equivalent page; hreflang `en`, `ar`, `x-default`.
- Mixed-direction data is isolated: author names in `<bdi>`, DOIs and URLs forced LTR, foreign-language titles keep their own `lang` and direction.
- Missing translations fall back to the original language with a visible note. Content is never machine-translated.

## Deployment
Vercel project `ibrahim-taha-axiom`, Root Directory `site/`, Node 26.x. `vercel.json` skips builds when a commit does not touch `site/`. See [`../docs/deployment.md`](../docs/deployment.md).
