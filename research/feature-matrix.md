# Feature Comparison Matrix

> Phase 1 · Ibrahim Taha Axiom · 2026-11-05
> Every rating comes from reading the reference source files (see [repository-inventory.md](repository-inventory.md)). For al-folio, UI internals live in external gems, so its ratings rely on config, docs, tests and content.

## Legend

| Symbol | Meaning |
|---|---|
| ✅ | Present and usable as-is |
| 🟡 | Present but partial, fragile or dated, so it needs development |
| ❌ | Absent |
| (1–5) | Implementation quality: 1 = poor, 3 = adequate, 5 = excellent |
| **Ours?** | **Must** = in MVP · **Should** = early release · **Could** = later · **No** = exclude |

Columns: **AF** = al-folio · **AP** = Academic Pages · **AS** = Astro Scholar · **Best** = the reference to learn from.

---

## A. Identity & profile

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Home / about with bio and photo | ✅ (4) | ✅ (3) | ✅ (4) | AF + AS | Must | AF combines news, selected papers and latest posts. AS has the cleaner hero. |
| Persistent profile card | 🟡 (3) | ✅ (4) | ❌ | AP | Could | AP's sidebar on every page is informative but eats width on mobile. |
| Academic profile links (Scholar, ORCID, Scopus, ResearchGate…) | ✅ (5) | ✅ (4) | 🟡 (2) | AF | Must | AF uses jekyll-socials + Academicons. AS has a fixed union of 6 icons. |
| Contact details | ✅ (3) | 🟡 (2) | 🟡 (2) | AF | Must | AF adds a contact note and optional email obfuscation. |
| Contact / collaboration form | ❌ | ❌ | ❌ | — | Must | Gap in all three. Needs a backend or form service (decision D-08). |
| Team / lab members | 🟡 (3) | ❌ | ✅ (4) | AS | Could | AS has roles, alumni and author → profile links. |

## B. Publications library

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| BibTeX as single source of truth | ✅ (5) | 🟡 (2) | 🟡 (2) | AF | Must | AP converts one-way to Markdown. AS uses a regex parser that loses data. |
| Grouping (year / type) | ✅ (4) | ✅ (3) | 🟡 (2) | AF | Must | AF groups by year. AP groups by category. We want both views. |
| Selected / featured papers | ✅ (4) | ❌ | 🟡 (2) | AF | Must | `selected={true}` in BibTeX. |
| Rich per-paper links (PDF, DOI, code, slides, video, poster, data…) | ✅ (5) | 🟡 (2) | 🟡 (2) | AF | Must | AF's custom-field vocabulary is the de facto standard. |
| Abstract toggle | ✅ (4) | 🟡 (2) | ❌ | AF | Must | |
| Show / copy BibTeX | ✅ (4) | 🟡 (2) | 🟡 (1) | AF | Must | AS copies an incomplete entry (bug). AF hides internal fields. |
| Author highlighting and truncation | ✅ (4) | ❌ | ❌ | AF | Must | `max_author_limit` with click-to-expand. |
| Co-author / team links | ✅ (3) | ❌ | ✅ (4) | AS | Should | |
| Venue abbreviation badges | ✅ (4) | ❌ | ❌ | AF | Should | |
| Thumbnails / previews | ✅ (3) | 🟡 (2) | ❌ | AF | Could | |
| Dedicated page per publication | 🟡 (2) | ✅ (4) | ❌ | AP | Must | Needed for SEO, sharing and scholarly meta tags. |
| Search / filter inside publications | ✅ (4) | ❌ | 🟡 (2) | AF | Must | We also want filters by type, year, topic and language. |
| Citation styles (APA, IEEE…) and export (RIS, BibTeX, CSL-JSON) | 🟡 (3) | 🟡 (1) | ❌ | AF | Should | AF renders APA via CSL. None offers export. |
| Import from ORCID / DOI | ❌ | 🟡 (2) | ❌ | AP | Should | AP has a notebook. A scripted importer is better (Phase 3+). |

## C. Research analytics

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Altmetric / Dimensions badges | ✅ (4) | ❌ | ❌ | AF | Should | Third-party embeds, so check their terms of use. |
| Citation counts | 🟡 (2) | ❌ | ❌ | AF (avoid method) | Should | AF scrapes Google Scholar with `scholarly`. That is brittle and against Scholar's terms. Use OpenAlex, Crossref, Semantic Scholar or ORCID APIs instead. |
| Metrics dashboard (totals, h-index, trends, charts) | ❌ | ❌ | ❌ | — | Should | Gap in all three, and a differentiator for us. |
| Repository / code stats | ✅ (3) | ❌ | ❌ | AF | Could | Relies on external services, one of which already died. |
| Talk map | ❌ | ✅ (3) | ❌ | AP | Could | Leaflet + geocoding in CI. |

## D. Knowledge & teaching content

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Research projects | ✅ (4) | 🟡 (2) | ✅ (3) | AF | Must | AF has categories, importance and `related_publications`. AS has status. |
| Teaching / courses | ✅ (5) | ✅ (3) | ❌ | AF | Should | AF's weekly schedule plus materials model is excellent. |
| Talks / presentations | ❌ | ✅ (4) | ❌ | AP | Should | AP models type, venue, location and slides. |
| Authored books | 🟡 (2) | 🟡 (3) | 🟡 (2) | AP | Should | Only as BibTeX `@book` or a category. AF's "books" is a reading list. |
| Reading list / bookshelf | ✅ (4) | ❌ | ❌ | AF | Could | |
| CV page | ✅ (5) | 🟡 (3) | 🟡 (1) | AF | Must | AF uses RenderCV/JSONResume plus PDF. AS only links to an external PDF. |
| News / announcements | ✅ (4) | ❌ | 🟡 (2) | AF | Should | |
| Articles / blog | ✅ (5) | ✅ (3) | ✅ (4) | AF features, AS reading UX | Must | |
| Math rendering | ✅ (4) | 🟡 (2) | ✅ (4) | AS (KaTeX, build-time) | Should | AP loads no math library in its core includes. |
| Diagrams and charts in content | ✅ (5) | ✅ (3) | ❌ | AF | Could | |
| Notebooks (Jupyter / marimo) | ✅ (4) | ❌ | ❌ | AF | Could | |
| Comments on articles | ✅ (4) | 🟡 (2) | ❌ | AF (Giscus) | Could | AP's providers are mostly obsolete. |
| Newsletter | 🟡 (3) | ❌ | ❌ | AF | Could | |
| External posts (RSS ingest) | ✅ (3) | ❌ | ❌ | AF | Could | |

## E. Discovery & SEO

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Site-wide search | ✅ (4) | ❌ | ✅ (4) | AS (full-text) + AF (command palette) | Must | Pagefind supports multilingual indexes. |
| Tags / categories / archives | ✅ (4) | ✅ (3) | ✅ (4) | AS | Should | |
| RSS | ✅ | ✅ | ✅ | — | Should | |
| Sitemap + robots | ✅ | 🟡 | ✅ | AS | Must | |
| Open Graph / Twitter | 🟡 (3, off by default) | ✅ (3) | ✅ (5) | AS | Must | AS generates an OG image per page. |
| JSON-LD (Person, ScholarlyArticle) | 🟡 (3, off by default) | 🟡 (2) | ❌ | AF | Must | |
| Google Scholar `citation_*` meta | ❌ | ❌ | ❌ | — | Must | Gap in all three. Needs per-publication pages. |
| hreflang for bilingual pages | ❌ | ❌ | ❌ | — | Must | Bilingual confirmed (D-03); English is `x-default`. |

## F. Experience & presentation

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Dark / light mode | ✅ (4) | ✅ (4) | ✅ (5) | AS (no flash) + AP (3-state) | Must | |
| Multiple colour palettes | ❌ | ✅ (3) | ❌ | AP | No | Brand consistency matters more than palette choice. |
| Responsive layout | ✅ (4) | ✅ (3) | ✅ (4) | AS / AF | Must | |
| Reading UX (TOC, progress bar, copy code) | ✅ (4) | 🟡 (2) | ✅ (4) | AS + AF | Should | |
| Accessibility testing in CI | ✅ (5) | ❌ | 🟡 (2) | AF (axe + Lighthouse) | Must | |
| Image optimisation | ✅ (4) | ❌ | ✅ (4) | AS (`astro:assets`) | Must | |

## G. Localization

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Translated UI strings | 🟡 (2) | ✅ (3) | ❌ | AP (`ui-text.yml` pattern) | Must* | AP has 7 languages, none of them Arabic. |
| RTL layout | 🟡 (3) | ❌ | ❌ | AF (`dir` on `<html>`, code and math stay LTR) | Must* | Per-page only. No reference uses CSS logical properties throughout. |
| Parallel language versions (AR/EN routing) | ❌ | ❌ | ❌ | — | Must* | Gap in all three. |
| Arabic typography / fonts | ❌ | ❌ | ❌ | — | Must* | |

\* Confirmed: D-03 approved a bilingual site, English (default) + Arabic.

## H. Content management

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| File-based content (Markdown / YAML / JSON / BibTeX) | ✅ | ✅ | ✅ | — | Must | |
| Typed / validated content schema | 🟡 (3) | ❌ | 🟡 (3) | AS (Zod) | Must | AS validates the blog only. We should validate every collection. |
| Data import scripts | 🟡 (2) | ✅ (3) | ❌ | AP | Should | |
| Visual editor / admin | ❌ | ❌ | ❌ | — | Should (Phase 3+) | Gap in all three (Future CMS module). |
| Editorial preview (PR previews) | ❌ | ❌ | ✅ (4) | AS | Should | |

## I. Platform, extensibility & operations

| Feature | AF | AP | AS | Best | Ours? | Notes |
|---|---|---|---|---|---|---|
| Plugin / feature-flag architecture | ✅ (4) | ❌ | 🟡 (3) | AF (concept) | Should | Copy the idea of a feature registry, not the silent-failure behaviour. |
| Upgrade / override audit | ✅ (5) | ❌ | ❌ | AF | Could | |
| CI breadth (links, a11y, visual regression) | ✅ (5) | 🟡 (2) | ✅ (3) | AF | Should | |
| Privacy-friendly analytics | ✅ (4) | 🟡 (2) | ✅ (4) | AS (Umami via env) | Should | |
| Cookie consent | ✅ (3) | ❌ | ❌ | AF | Could | Avoidable if analytics is cookieless. |
| Email obfuscation | ✅ (3) | ❌ | ❌ | AF | Should | |
| Docker / devcontainer | ✅ | ✅ | ❌ | AF | Could | |

---

## Adopt / Learn / Reuse / Avoid

### Features to adopt (into our product requirements)
1. **BibTeX-driven library** with AF's custom-field vocabulary (`selected, abbr, abstract, pdf, code, slides, video, poster, doi, arxiv, award, preview`), author highlighting, truncation and a client-side filter.
2. **One page per publication** (AP), so we can add `citation_*` meta, ScholarlyArticle JSON-LD and shareable URLs.
3. **Typed collections** for publications, projects, talks, courses, news, articles, people and CV (AS's Zod approach, applied everywhere).
4. **Course model with weekly schedule and materials** (AF) and **talk model with type, venue, location and slides** (AP).
5. **CV generated from structured data** with a PDF export (AF's RenderCV / JSONResume idea).
6. **Full-text search** (AS Pagefind) with a keyboard shortcut.
7. **Per-page OG images** (AS satori) and complete SEO metadata.
8. **No-flash, 3-state theme toggle** (AS technique + AP's system/light/dark option).

### UX patterns to learn from
- AF: the "about" page as a dashboard (bio, news, selected papers, latest posts); click-to-reveal author lists; abstract and BibTeX toggles inline.
- AP: an always-visible identity card with academic IDs; publications grouped by type with clear headings.
- AS: a calm editorial layout, a sticky blurred header, a search modal with `/` and `Esc`, tag chips, mobile and desktop TOC variants, and a custom 404.

### Technical approaches to reuse (as ideas, re-implemented)
- Static-first build with build-time data processing (all three).
- AF's feature-flag registry and CI gates (axe, broken links, visual regression).
- AF's `filtered_bibtex_keywords` idea: keep internal fields out of exported BibTeX.
- AS's content collections, `astro:assets` image pipeline, Pagefind postbuild and PR preview deploys.
- AP's data-generator idea (scripts that turn exports into content), but done losslessly.

### Things to avoid
- Scraping Google Scholar (AF `scholarly`): brittle, rate-limited and against its terms.
- Regex BibTeX parsing and duplicated parsing logic (AS).
- Lossy one-way BibTeX → Markdown conversion with hand-built citation strings (AP).
- Features that fail silently when a flag is missing (AF), and two config lists that must be kept in sync by hand (AF Gemfile + `plugins:`).
- Physical `left/right` CSS (AS, AP), which blocks RTL; use logical properties from day one.
- Hard-coded `lang="en"` and English string literals in templates (AS).
- Dependence on free third-party badge or stat services that disappear (AF trophies).
- Obsolete integrations (AP: Google+, Alexa, Universal Analytics, Staticman) and jQuery-era scripts.
- Inline styles and unpinned CDN assets without SRI (AS).
