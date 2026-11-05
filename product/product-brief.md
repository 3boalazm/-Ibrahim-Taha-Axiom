# Product Brief — Ibrahim Taha Axiom (draft v0.1)

> Phase 1 · 2026-11-05 · **Status: draft for review.**
> This brief defines *what* the platform should do. It deliberately contains **no researcher data**: no biography, publications, affiliations or metrics are assumed or imported. Those will be supplied by the researcher in a later phase (decision D-14).

## 1. Vision

A single, authoritative academic home for one researcher. It presents their identity and work, makes the research easy to find, read and cite, shares knowledge beyond papers, shows research impact honestly, and turns visitors into collaborators. It should be simple enough to maintain for years.

## 2. Audiences

| Audience | Primary needs |
|---|---|
| Peer researchers | Find and cite publications, understand research areas, find collaboration hooks |
| Students / prospective supervisees | Teaching materials, research topics, how to apply or ask for supervision |
| Hiring, grant and award committees | CV, impact summary, selected work, verified academic IDs |
| Conference organisers and media | Bio, photo, talks, contact for invitations |
| General readers | Accessible articles and explanations |
| The researcher (owner/editor) | Low-effort updates, correctness, control over what is public |

## 3. Product modules

### M1 — Academic personal website
Identity (name, role, affiliation, photo), biography, research interests, awards, academic IDs (ORCID, Scholar, Scopus, etc.), CV page with PDF, news.
*References:* AS hero, AP identity card, AF about hub and CV.

### M2 — Research & publications library
A single structured source of truth for publications (format decided in D-05). List view with search, facets (type, year, topic, language) and sort. A detail page per publication with abstract, links (PDF, DOI, code, data, slides, video), "Cite" in multiple styles, BibTeX/RIS export, related items, and scholarly metadata (`citation_*`, JSON-LD). Selected/featured works, co-author linking, author highlighting.
*References:* AF publications model, AP detail pages.

### M3 — Academic knowledge hub
Articles and essays, research notes, teaching (courses with schedules and materials), talks and lectures, authored books, resources (datasets, code, tools). Everything is cross-linked by research area.
*References:* AF courses and posts, AP talks, AS reading UX.

### M4 — Research analytics
Public impact overview (publication counts by year and type, citations, h-index-like indicators, top works, collaboration network) built from **terms-compliant** data sources (D-06), refreshed on a schedule and stored as versioned snapshots so numbers are reproducible. Site traffic analytics are a separate, privacy-first concern (D-10).
*References:* gap in all three. AF badges are only a partial precedent.

### M5 — Collaboration & contact
Typed inquiry flows (collaboration, supervision, speaking or media, general), spam protection, clear response expectations, and no raw email exposure by default. Optional newsletter or updates subscription.
*References:* gap in all three.

### M6 — Future CMS / admin dashboard
Phase A: structured files edited through a Git-based CMS, with preview builds. Phase B: an authenticated dashboard for content, publication import (DOI/ORCID), metrics refresh, inquiries inbox and site settings. Not in the MVP; the architecture must not block it.
*References:* gap in all three.

## 4. Cross-cutting requirements

| Area | Requirement |
|---|---|
| Localization | Probably bilingual Arabic/English with full RTL, to be confirmed (D-03). If confirmed: parallel routes, translated UI strings, logical CSS, an Arabic typeface, and bidi-safe mixed-language bibliographies. |
| SEO | Per-page metadata, generated OG images, sitemap, robots, canonical and hreflang, JSON-LD (Person, ScholarlyArticle, Course, Event), Google Scholar meta tags. |
| Accessibility | WCAG 2.2 AA target, keyboard-first interactions, `prefers-reduced-motion`, axe checks in CI. |
| Performance | Static-first. Core Web Vitals "good" on mobile. No blocking third-party scripts. |
| Theming | Light/dark with system default, no flash of the wrong theme. A single brand palette (no palette switcher). |
| Privacy | Cookieless analytics by default. No third-party trackers without consent. |
| Content integrity | Schema-validated content. Build fails with a clear message instead of failing silently. No fabricated data. |
| Maintainability | Small dependency surface, documented content model, automated quality gates. |

## 5. MVP proposal (to confirm in D-11)

**In:** M1 (full), M2 (list, detail, search, cite/export), M3 (articles, teaching, talks, books), the M4 snapshot page (if data sources are approved), M5 (contact form), bilingual/RTL (if confirmed), SEO, accessibility and performance baselines.
**Later:** M6 CMS (Phase A), M4 interactive dashboard, newsletter, comments, talk map, reading list, notebooks.
**Out:** multiple colour palettes, scraping-based metrics, social-network embeds that track users.

## 6. Success measures (initial)
- The researcher can add a publication or article in under 5 minutes without touching code (after M6 Phase A).
- Every publication has a stable URL, valid scholarly metadata and correct citation export.
- Lighthouse ≥ 95 in all categories on mobile for key pages, and 0 axe violations.
- Both language versions render correctly in RTL and LTR with no layout regressions (visual tests).

## 7. Explicitly not decided in Phase 1
Final tech stack, hosting, domain, visual design and brand, content, data sources, and the CMS product. See [`../docs/decisions-pending.md`](../docs/decisions-pending.md).
