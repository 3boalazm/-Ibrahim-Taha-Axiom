# Information Architecture Benchmark

> Phase 1 · Ibrahim Taha Axiom · 2026-11-05
> Site maps were reconstructed from route files, navigation data and collection config, not from screenshots. The draft IA at the end is a **structural proposal only**. It is not a visual design, and it contains no researcher data.

## 1. Reference site maps

### al-folio (navigation from `nav: true` + `nav_order` in `_pages/*.md`)

```
/                      about: profile, bio, news, latest posts, selected papers, socials
/blog/                 paginated, tag/category filters, featured posts, external posts
  /blog/:year/:title/  post (TOC, related posts, comments, Distill variant)
/publications/         bib_search filter + list grouped by year
  /bibliography/:key   jekyll-scholar details page (optional)
/projects/             cards grouped by category, masonry
  /projects/:name/     project page (+ related publications)
/repositories/         GitHub user/repo cards
/teaching/             course list
  /teachings/:course/  course page with weekly schedule and materials
/books/                reading list (bookshelf)
/people/               multiple profiles
/cv/                   RenderCV / JSONResume + PDF
/news/                 announcements
/plugins/              plugin catalogue (demo-only)
/404
```
**Pattern:** a flat top-level menu (about 8–10 items) plus a dropdown. Navigation order is set per page in front matter. The home page acts as a hub that aggregates several collections.

### Academic Pages (navigation from `_data/navigation.yml`)

```
/                      about (sidebar author profile on every page)
/publications/         grouped by publication_category (Books / Journal Articles / Conference Papers)
  /publication/:slug   one page per paper (+ citation, PDF, slides, BibTeX link)
/talks/                list (+ optional talk map)
  /talks/:slug         talk page (type, venue, location)
/teaching/             list
  /teaching/:slug
/portfolio/            list
  /portfolio/:slug
/year-archive/         blog posts by year (+ /categories/, /tags/)
/cv/                   Markdown CV with auto-included lists
/markdown/             author guide (demo-only)
/talkmap/              Leaflet map
/sitemap/, /terms/, /404
```
**Pattern:** every collection has a list page and a detail page. The sidebar identity card is the constant anchor. It has the cleanest URL taxonomy of the three.

### Astro Scholar (routes from `src/pages/` + `Header.astro`)

```
/                      hero, 3 latest publications, 3 latest posts
/publications/         flat list sorted by year (no detail pages)
/projects/             cards from projects.json
/team/                 members, roles, alumni
/blog/ ("News")        paginated list  ─┐ grouped under a "More" style menu
/tags/, /tags/:tag     tag index        │
/archive/              chronological   ─┘
/blog/:slug            post with TOC, authors, tags
/about/, /404, /rss.xml, /robots.txt, /:route.png (OG images)
```
**Pattern:** 4 primary items plus a secondary group, which is the most minimal of the three. Publications have no detail pages, which limits SEO and sharing.

## 2. Comparison of IA qualities

| Quality | al-folio | Academic Pages | Astro Scholar |
|---|---|---|---|
| Top-level items | 8–10 + dropdown | 7 | 4 + secondary group |
| Home page role | Hub / dashboard | Bio + sidebar | Hero + teasers |
| List → detail consistency | Mixed (publications rarely have details) | **Consistent for every collection** | Blog only |
| Cross-linking (paper ↔ project ↔ person) | **Projects → publications; co-authors** | Weak | **Authors ↔ team** |
| Taxonomy | Tags, categories, project categories, year | Tags, categories, publication category, year | Tags, year |
| Identity persistence | About page only | **Sidebar on all pages** | Header title only |
| Wayfinding aids | Cmd-K search, TOC, back-to-top, scroll progress bar | Breadcrumbs (off by default), archives | Search modal, TOC, archive |
| Language structure | Single language; per-page `lang` | Single locale | English only |

**Takeaways**
1. Use AP's **list + detail for every content type**, plus AF's and AS's **cross-links** (publication ↔ project ↔ person ↔ talk ↔ course).
2. Keep primary navigation to **5–7 items** (AS discipline) and push secondary content into a "More" group or the footer.
3. Make the home page a **curated hub** (AF), not a full dump.
4. Add **search** and **facets** as first-class wayfinding, since the publications library will be the largest collection.

## 3. Content model observed (entities and relations)

| Entity | al-folio | Academic Pages | Astro Scholar |
|---|---|---|---|
| Person / profile | `_config` + `about.md` + `coauthors.yml` | `_config.author` / `_data/authors.yml` | `authors.json` |
| Publication | BibTeX entry (rich custom fields) | Markdown file per paper | BibTeX entry (basic) |
| Project | `_projects/*.md` (category, importance, related pubs) | `_portfolio/*` | `projects.json` (status, authors) |
| Talk | — | `_talks/*.md` (type, venue, location) | — |
| Course | `_teachings/*.md` (schedule, materials) | `_teaching/*.md` (type, venue) | — |
| Article / post | `_posts` | `_posts` | `content/blog` (Zod schema) |
| News item | `_news` | — | (blog used as news) |
| CV | `_data/cv.yml` (RenderCV) / `resume.json` | `_pages/cv.md` | external URL |
| Book (authored) | as BibTeX `@book` | `category: books` | as BibTeX `@book` |
| Venue | `_data/venues.yml` | free text | free text |

## 4. Draft IA for Ibrahim Taha Axiom (structure only, for review)

> Labels are placeholders. Bilingual routing is shown as an option pending decision D-03.

```
/{lang}/                          Home: identity, research focus, featured work, latest updates
/{lang}/about/                    Biography, affiliations, research interests, awards
/{lang}/research/                 Research areas / themes
  /{lang}/research/{area}/        Area hub → related projects, publications, articles
/{lang}/projects/                 Projects (status, period, team, funding)
  /{lang}/projects/{slug}/
/{lang}/publications/             Library: search, facets (type, year, topic, language), sort, export
  /{lang}/publications/{key}/     Publication detail: abstract, links, cite (styles), BibTeX, metrics, related
/{lang}/books/                    Authored books (if applicable)
/{lang}/teaching/                 Courses
  /{lang}/teaching/{course}/      Schedule, materials
/{lang}/talks/                    Talks, lectures, media appearances
  /{lang}/talks/{slug}/
/{lang}/hub/                      Knowledge hub: articles, notes, resources, datasets/code
  /{lang}/hub/{slug}/
/{lang}/metrics/                  Research analytics (public subset)
/{lang}/cv/                       Structured CV + PDF
/{lang}/news/                     Announcements
/{lang}/contact/                  Contact & collaboration (typed inquiry form)
/search/                          Full-text search (also a global shortcut)
/admin/                           Future CMS (not public; later phase)
```

**Primary navigation (proposal, 6 items):** About · Research · Publications · Teaching · Hub · Contact. Secondary items (Talks, Books, Metrics, CV, News) go in a "More" menu or the footer, and the CV is also a call-to-action button.

**Cross-link rules (proposal):** every publication can reference projects, people, talks and research areas. Every project and area page lists its publications automatically. Every person (co-author) can have an internal or external profile link.
