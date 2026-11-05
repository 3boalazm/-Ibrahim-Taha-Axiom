# Technical Comparison

> Phase 1 · Ibrahim Taha Axiom · 2026-11-05
> Local environment on inspection day: Windows 11, git 2.54, Node 26.13, npm 11.20. **Ruby/Bundler: not installed.**

## 1. Stack at a glance

| Dimension | al-folio | Academic Pages | Astro Scholar |
|---|---|---|---|
| Generator | Jekyll (Ruby) | Jekyll 4.4 (Ruby) | Astro 6.4 (Node) |
| Shape | Thin starter + ~19 runtime gems | Monolithic template (fork of Minimal Mistakes) | Single template repo |
| Templating | Liquid (in gems) | Liquid (in repo) | `.astro` components + TypeScript |
| Styling | Tailwind 4 (in `al_folio_core`) | SCSS + Susy + Breakpoint | Plain CSS with custom properties |
| Client JS | Feature JS from gems, many CDN libraries (SRI pinned) | jQuery + greedy-nav, uglify-js | Vanilla inline modules, Pagefind UI |
| Content format | Markdown, YAML, BibTeX, JSON | Markdown + front matter, YAML, TSV inputs | Markdown/MDX, JSON, BibTeX |
| Content validation | Config contract audit only | None | Zod schema (blog only) |
| BibTeX processing | jekyll-scholar + CSL (robust) | Offline pybtex → Markdown (lossy) | Regex parser (fragile) |
| Search | `al_search` build-time index, ninja-keys UI | None | Pagefind (postbuild static index) |
| Images | ImageMagick → responsive WebP | None | `astro:assets` + sharp |
| Math | MathJax | (not loaded by default) | KaTeX at build time |
| OG images | Static | Static | Generated per page (satori + resvg) |
| Analytics | 6 providers + cookie consent | GA variants | Umami (env var, off by default) |
| Deploy target | GitHub Pages (`gh-pages`) / Docker | GitHub Pages (Actions artifact) | GitHub Pages (`gh-pages`) + PR previews |
| Local toolchain | Ruby + Bundler (+ ImageMagick, + Python for extras), or Docker | Ruby + Bundler + Node, or Docker | Node only |
| Tests in repo | 7 integration scripts, Playwright visual regression, style contract | None | None |
| CI workflows | 25 | 3 | 3 |

## 2. Architecture assessment

### al-folio
- **Strengths:** a clear ownership model (starter vs gems), versioned features, an upgrade CLI with override drift detection, SRI-pinned third-party libraries, and the widest CI coverage (accessibility, links, visual regression, CodeQL). It also has the most academic features.
- **Weaknesses:** runtime code sits outside the repo, so understanding or overriding the UI means reading about 19 gem codebases. Its own docs list three failure modes that produce no error message. Every plugin needs edits in two places. The toolchain is heavy (Ruby, ImageMagick, Python). Liquid has no type safety.
- **Extensibility:** high, but through the Ruby gem ecosystem.

### Academic Pages
- **Strengths:** the simplest mental model (one file per item), GitHub Pages-safe plugins only, a working Docker/devcontainer, and useful Python generators.
- **Weaknesses:** a dated front-end (jQuery, Susy floats), no search, no tests, a lossy publication pipeline, legacy integrations, and a template model where every upgrade is a manual merge.
- **Extensibility:** low. You fork and edit.

### Astro Scholar
- **Strengths:** a modern static-first architecture, typed content collections, a fast and accessible baseline, build-time KaTeX, Pagefind, generated OG images, PR previews and a Node-only toolchain. The small codebase is easy to read in full.
- **Weaknesses:** shallow academic modelling, a fragile and duplicated BibTeX parser, no i18n, physical CSS, inline styles, an unused dependency, KaTeX CSS from a CDN without SRI, and no tests.
- **Extensibility:** high, through the Astro integrations ecosystem (i18n routing, MDX, content loaders, server endpoints and adapters if needed).

## 3. Fit against our product modules

| Module (from product brief) | al-folio | Academic Pages | Astro Scholar |
|---|---|---|---|
| Academic personal website | Strong | Good | Strong |
| Research & publications library | **Strongest** | Medium | Weak (needs rebuild) |
| Knowledge hub (articles, courses, talks) | Strong | Medium | Medium (good reading UX) |
| Research analytics | Partial (badges, scraper) | None | None |
| Collaboration & contact | Weak | Weak | Weak |
| Bilingual AR/EN + RTL | Partial (per-page RTL) | Poor | Poor (but easiest to refactor; small codebase) |
| Future CMS / admin dashboard | Hard (static Ruby; Git-CMS possible) | Hard | **Easiest** (Astro can add server routes; Git-based CMSs integrate well) |
| Maintainability by a small team | Medium (gem coupling) | Low | **High** |

## 4. Candidate directions (preliminary; not a final stack decision)

| Direction | Description | Pros | Cons |
|---|---|---|---|
| **A. Fresh Astro build** (recommended for discussion) | New codebase on Astro, written from scratch. Feature models taken from al-folio and Academic Pages, UX and engineering patterns from Astro Scholar. | Node-only toolchain; typed content; built-in i18n routing; RTL-first with logical CSS; static by default with an upgrade path to server routes for forms and admin; best performance baseline | Academic features (CSL citations, metrics, CV) must be built; more initial effort than forking |
| B. al-folio-based site | Start from the al-folio starter and override as needed | Most academic features on day 1; mature CI | Ruby toolchain; runtime in ~19 external gems; RTL per page only; bilingual routing and admin are hard; overrides drift with upstream |
| C. Full-stack framework (e.g., Next.js + DB) | Application-first platform | Admin dashboard and analytics easiest later | Heavier operations and hosting; worse static SEO defaults unless carefully built; slower to a polished public site; none of the references help directly |

**Scoring (weights reflect the brief; 1–5):**

| Criterion | Weight | A | B | C |
|---|---|---|---|---|
| Academic feature depth at launch | 3 | 3 | 5 | 2 |
| Bilingual + RTL quality | 3 | 5 | 2 | 4 |
| Performance & SEO | 2 | 5 | 4 | 3 |
| Path to CMS / dashboard | 2 | 4 | 2 | 5 |
| Maintainability / simplicity | 2 | 4 | 2 | 3 |
| Toolchain fit (this machine, Node present) | 1 | 5 | 2 | 5 |
| **Weighted total** (max 65) | | **55** | **39** | **45** |

Ranking: A (55) > C (45) > B (39). Recommendation details are in [`../product/architecture-recommendation.md`](../product/architecture-recommendation.md). This is **preliminary** and needs approval (decision D-04).

## 5. Reuse map (ideas, not code merges)

| We need | Learn from | How |
|---|---|---|
| BibTeX field vocabulary | al-folio `papers.bib` + `filtered_bibtex_keywords` | Adopt field names as our schema; strip internal fields on export |
| Citation rendering | al-folio (CSL via jekyll-scholar) | Use a JS CSL processor with standard CSL styles (verify licences) |
| Publication detail pages | Academic Pages `_publications` | Generate one route per entry key |
| Course and talk models | al-folio `_teachings`, Academic Pages `_talks` | Typed collections |
| CV from data | al-folio RenderCV / JSONResume | Single CV data source → page + PDF |
| Search | Astro Scholar Pagefind | Postbuild index, per-language |
| Theme bootstrap | Astro Scholar `BaseHead.astro` | Re-implement the technique; credit in notices if any code is copied |
| OG images | Astro Scholar `generateOgImage.ts` | Re-implement; satori/resvg are MPL-2.0 libraries |
| CI quality gates | al-folio workflows | axe, link check, Lighthouse, visual regression |
| Metrics | none (gap) | Scheduled job pulling compliant APIs → versioned JSON → build-time charts |
