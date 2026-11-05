# Repository Inventory

> Phase 1 · Ibrahim Taha Axiom · inspected 2026-11-05
> Scope: what each reference project **is**, where it came from, and what is inside it. Comparisons live in [feature-matrix.md](feature-matrix.md) and [technical-comparison.md](technical-comparison.md).

## 1. Provenance

The three projects already existed locally as extracted GitHub archives (no `.git` folder) under `D:\Ibrahim\academicpages\`. They were **copied, not moved**, into `references/`; the originals were left untouched. Copies were verified byte-identical (SHA-256 of every file, 613 files, 0 differences). Per-file manifests are in [`references/_manifests/`](../references/_manifests/).

| Reference | Original local path | Workspace path | Upstream | Upstream HEAD on 2026-11-05 | Snapshot vs HEAD | Files | Size |
|---|---|---|---|---|---|---|---|
| al-folio | `academicpages/al-folio-main` | `references/al-folio` | github.com/alshedivat/al-folio | `e0a684cfe161` | Sampled files identical (`Gemfile`, `_config.yml`) | 228 | 58.9 MB |
| Academic Pages | `academicpages/academicpages.github.io-master` | `references/academic-pages` | github.com/academicpages/academicpages.github.io | `9e19e6318817` | Sampled files identical (`_config.yml`, `package.json`) | 312 | 4.4 MB |
| Astro Scholar | `academicpages/astro-scholar-main` | `references/astro-scholar` | github.com/shravanngoswamii/astro-scholar | `ea6e3c5b8823` | Sampled files identical (`package.json`, 2 components) | 73 | 0.8 MB |

**Git history:** not available. The local copies are archive snapshots. Recovering history means cloning upstream (see decision D-02 in [decisions-pending.md](../docs/decisions-pending.md)).

**Size note:** most of al-folio's 58.9 MB is demo media: `assets/video/tutorial_al_folio.mp4` (26 MB), `assets/plotly/demo.html` (4.2 MB), a Pexels video (1.5 MB) and an MP3 (0.9 MB).

---

## 2. al-folio (v1.x)

**What it is:** a *thin Jekyll starter*, not a theme. Since v1.0 all runtime code (layouts, includes, Sass, Liquid tags, JS) lives in about 19 versioned Ruby gems published by the `al-org-dev` organization. The starter repo holds wiring, demo content, docs and tests ([`docs/ARCHITECTURE.md`](../references/al-folio/docs/ARCHITECTURE.md)).

| Area | Findings (from files, not README) |
|---|---|
| Stack | Jekyll + `theme: al_folio_core 1.0.15`, Tailwind 4.1.18 style engine (inside the gem), jekyll-scholar for BibTeX, about 20 Jekyll plugins (`Gemfile`), Python helpers (`requirements.txt`: rendercv, scholarly, nbconvert), Node only for lint and tests (Prettier, Playwright). |
| Feature gems | `al_search`, `al_math`, `al_charts`, `al_comments`, `al_cookie`, `al_analytics`, `al_citations`, `al_ext_posts`, `al_img_tools`, `al_newsletter`, `al_email_protect`, `al_marimo`, `al_rtl`, `al_icons`, `al_folio_cv`, `al_folio_distill`, `al_folio_upgrade`, `al_folio_bootstrap_compat`. |
| Content folders | `_pages` (14), `_posts` (33 demos), `_projects` (9), `_news` (3), `_teachings` (2), `_books` (1), `_bibliography/papers.bib`, `_data/` (`citations.yml` 144 KB, `coauthors.yml`, `cv.yml`, `socials.yml`, `venues.yml`, `repositories.yml`, `featured_plugins.yml`). |
| Pages | about (profile, news, latest posts, selected papers), blog, publications, projects, repositories, teaching, books, people (`profiles` layout), CV, news, plugins, dropdown demo, 404. |
| Publications | `{% bibliography %}` via jekyll-scholar: APA style, grouped by year (descending). Custom BibTeX fields: `abbr, abstract, pdf, code, slides, poster, video, supp, website, html, arxiv, hal, pmid, doi, selected, preview, award, annotation, additional_info, bibtex_show`. Internal fields are filtered out of the displayed BibTeX (`filtered_bibtex_keywords`). Author highlighting comes from `scholar.last_name/first_name`, author truncation from `max_author_limit: 3`, co-author links from `_data/coauthors.yml`, venue abbreviations from `_data/venues.yml`. A client-side filter is enabled with `bib_search: true`. |
| Metrics | Altmetric, Dimensions, Google Scholar and INSPIRE-HEP badges (`enable_publication_badges`). `_data/citations.yml` is refreshed by `bin/update_scholar_citations.py` (the `scholarly` scraper), scheduled Mon/Wed/Fri in `update-citations.yml` with a 90 s timeout. GitHub repository cards come from `github-stats-extended`. Trophies are disabled because that public service went offline. |
| CV | `layout: cv` with `cv_format: rendercv` (YAML in `_data/cv.yml`) or JSONResume (`assets/json/resume.json`). PDF button. `render-cv.yml` workflow. |
| Teaching | `layout: course` with term, time, location and a weekly `schedule[]` of topics and materials. A strong model. |
| Books | `layout: book-review` is a **reading list** (Open Library cover, stars, started/finished). It is not an "authored books" model. |
| Search | `al_search`: a Cmd-K palette (ninja-keys), with the index built at build time from pages, posts, socials and the bibliography. |
| SEO | Open Graph and Schema.org are **off by default** (`serve_og_meta`, `serve_schema_org`). Sitemap, `robots.txt`, RSS. `docs/SEO.md` describes ScholarlyArticle markup and Google Scholar indexing guidance. |
| Theming | `enable_darkmode: true`. The implementation is in `al_folio_core` and is not visible in the snapshot. |
| i18n / RTL | One `lang:` per site plus per-page `lang:`. `al_rtl` sets `dir="rtl"` on `<html>` for RTL languages while keeping code and math LTR (`_posts/2022-10-15-rtl.md`, Persian demo). There is no parallel-language routing or translated UI-string layer in the starter. |
| Other features | Giscus/Disqus comments, Loops newsletter, external posts via RSS, cookie consent, GA/Cronitor/Pirsch/OpenPanel/Cloudflare/Simple analytics, email obfuscation, ImageMagick WebP responsive images, lazy loading, zoom/lightbox, MathJax/pseudocode/TikZJax, Mermaid/Chart.js/ECharts/Plotly/Vega/Leaflet, Distill layout, Jupyter/marimo notebooks. |
| CI (25 workflows) | deploy, axe accessibility, broken links (lychee), CodeQL, Lighthouse badges, Prettier, render-cv, unit/integration tests, Playwright visual regression, citations update, TOC update, upgrade audit, Docker images, star history. |
| Maintenance | `bundle exec al-folio upgrade audit` and override drift tracking (`.al-folio-overrides.yml`). This is the strongest upgrade story of the three. |
| Known pitfalls | Features **fail silently** unless the gem, the `_config.yml` flag and the page front matter all agree. `Gemfile` and the `plugins:` list must be kept in sync by hand. `baseurl` mistakes render the site unstyled. |
| Inspection limit | Layouts, CSS and JS are not in this snapshot (they ship in the gems), so UI-level findings for al-folio come from config, docs, tests and content. A deeper review needs the gem sources (decision D-13). |

## 3. Academic Pages (v0.8.x / 0.9.x)

**What it is:** a GitHub Pages *template* forked (then detached) from Minimal Mistakes (© 2016 Michael Rose). It is a monolithic Jekyll site: you "Use this template" and edit everything in place. `package.json` says `0.8.1.1`; its `AGENTS.md` says v0.9.x.

| Area | Findings |
|---|---|
| Stack | Jekyll 4.4 + kramdown/GFM + Rouge. Plugins limited to the GitHub Pages whitelist (feed, gist, paginate, sitemap, redirect-from, jemoji). jQuery 3.7 + greedy-navigation. SCSS with vendored Susy grid, Breakpoint, Font Awesome and Academicons. Uglify-js. Python content generators (`pybtex`, `pandas`, `geopy`). |
| Collections | `publications`, `talks`, `teaching`, `portfolio`, plus `_posts` (all in `_config.yml → collections`). |
| Pages | about, publications, talks, teaching, portfolio, CV (Markdown), blog archive by year/category/tag, talkmap, sitemap, Markdown guide, terms, 404 (`_pages/`). |
| Publications | **One Markdown file per paper** with front matter `title, category, permalink, excerpt, date, venue, paperurl, slidesurl, bibtexurl, citation`. The `citation` field is a pre-formatted HTML string. Each paper gets its own page. The list is grouped by `publication_category` (books / journal articles / conference papers). |
| Content generators | `markdown_generator/`: TSV → Markdown (`publications.py`, `talks.py`), BibTeX → Markdown (`pubsFromBib.py`), ORCID → BibTeX notebook. These are **one-way, lossy** conversions: the citation string is built by hand and missing fields are skipped. |
| Profile | The sidebar author profile appears on every page: avatar, name, pronouns, bio, location, employer, about 12 academic IDs (Academia, arXiv, Google Scholar, INSPIRE-HEP, Impactstory, ORCID, PubMed, Semantic Scholar, SSRN, ResearchGate, Scopus, Zotero) plus developer and social links. |
| Talks | `talk_type, venue, location, date`. The `talkmap` notebook geocodes locations (geopy) and a workflow commits a Leaflet map on every push to `_talks/`. |
| CV | Hand-written Markdown, with auto-generated lists of publications, talks and teaching. Navigation comments mention a JSON CV alternative. |
| Search | **None.** |
| Metrics | **None.** It only links to the Google Scholar profile. |
| SEO | Canonical, Open Graph, Twitter cards (only when a Twitter username is set), basic JSON-LD Person/Organization, schema.org microdata (`CreativeWork`, `Person`), site verification tags (Google, Bing, Yandex, and Alexa, which is a dead service). |
| Theming | 6 palettes (`default, air, sunrise, mint, dirt, contrast`) × light/dark. The toggle supports system/light/dark and persists to `localStorage`. Plotly charts are redrawn on theme change. Mermaid is lazy-loaded. |
| i18n / RTL | UI strings in `_data/ui-text.yml` for en, es, fr, tr, pt, it, zh (**no Arabic**). `<html lang>` is taken from `site.locale`. **No RTL**: the layout uses Susy floats with physical left/right. |
| Comments & analytics | Disqus, Discourse, Facebook, Google+ (dead), Staticman, custom. Google, Google Universal (sunset), GA4, custom. |
| Deploy | GitHub Actions → GitHub Pages (Ruby 3.1, Node 24 for minification). Docker and devcontainer. |
| Maintenance | The README admits that pulling template updates means cherry-picking or rebasing with conflicts. It carries legacy code (jQuery, Susy, Google+/Alexa/Universal Analytics). |

## 4. Astro Scholar (v0.6.1)

**What it is:** a small, modern Astro template for researchers and labs, listed in the official Astro themes catalog. MIT © 2026 Shravan Goswami.

| Area | Findings |
|---|---|
| Stack | Astro 6.4 (static output), MDX, TypeScript, content collections with a Zod schema (blog only), remark-math + rehype-katex, Shiki dual themes, `@astrojs/sitemap`, `@astrojs/rss`, Pagefind (postbuild), satori + resvg + sharp for OG images, Umami analytics via environment variable. No UI framework: vanilla `<script>` and plain CSS custom properties. Atkinson Hyperlegible webfont. |
| Pages | `index` (hero, latest 3 publications, latest 3 posts), `about`, `publications`, `projects`, `team`, `blog/[...page]` (paginated, labelled "News" in nav), `blog/[...slug]` (with TOC), `tags/`, `tags/[tag]`, `archive`, `404`, `rss.xml`, `robots.txt`, `[...route].png` (per-page OG images). |
| Data | `src/consts.ts` (title, external `CV_URL`, contact, social links limited to 6 icon types), `src/data/authors.json` (id, role, bio, avatar, links, `sortOrder`, `alumni`), `src/data/projects.json` (status, year, authors), `src/data/publications.bib`. |
| Publications | A **hand-written regex BibTeX parser**, duplicated in `index.astro` and `publications.astro`. It handles only one level of nested braces. It sorts by year with no grouping, abstract, filters or "selected" flag. Links are PDF/URL/DOI. **Defect:** the "Copy BibTeX" button rebuilds the entry from only title/author/year, so the copied citation drops the venue, DOI and other fields. The `bibliography` npm dependency is declared but unused. |
| Team | Authors link to team profiles (`AuthorLink`), with roles and alumni. This is the best "lab/group" model of the three. |
| Search | A Pagefind full-text modal with `/` to open and `Esc` to close. The UI is lazy-loaded and does not work in dev mode. |
| SEO | Canonical, Open Graph, Twitter, **auto-generated OG image per page**, sitemap, RSS, robots. **No JSON-LD** and no scholarly meta tags. |
| Theming | Light/dark with a no-flash inline script, `localStorage` plus `prefers-color-scheme`, critical CSS inlined, and transitions suppressed until the theme is ready. |
| i18n / RTL | **None.** `<html lang="en">` is hard-coded in 10 files, all UI strings are English literals, and there are 58 physical-direction CSS declarations (`left/right`, `margin-left` and similar) across 12 files. |
| Responsive | Breakpoints at 600–1200 px, a mobile menu, and a TOC with separate mobile and desktop variants. |
| Deploy | GitHub Actions → `gh-pages` branch, PR preview deployments, a release workflow, and an HTML link post-processor (`rel` attributes, link checking). |
| Quality notes | Many inline `style=""` attributes (publications page). KaTeX CSS comes from a CDN without SRI. `projects.json` and `authors.json` are not schema-validated. The README claims a Lighthouse score of 100. |

---

## 5. One-line verdict per project

- **al-folio:** the richest academic feature set and the best maintenance tooling, but heavy (Ruby, about 19 gems), with opaque runtime and silent failure modes, and RTL only per page.
- **Academic Pages:** the simplest mental model (one file per item), with strong talks, teaching and profile-link coverage, but dated technology, no search, no metrics, no RTL, and a lossy publication pipeline.
- **Astro Scholar:** the most modern and fastest foundation with the cleanest UX details, but thin academic depth, a fragile BibTeX handling layer and no i18n or RTL.
