# Interaction architecture (Phase 4)

The site is static-first Astro: every page is complete HTML at build time, and each interactive feature is a small inline script that enhances HTML already on the page. There is no framework runtime and no client-side routing. No interactive feature calls a server. All data comes from `site/src/data/approved/` through the same build-time utilities the pages use, so an interactive view can never show something a static page would not.

Shared, framework-free logic lives in `site/src/lib/*.mjs`. Both the build and the browser import it, and `node --test` tests it directly:

| Module | Used by | Purpose |
| --- | --- | --- |
| `text.mjs` | search, explorer | Arabic/Latin normalisation (diacritics, alef/yaa/taa-marbuta forms, tatweel, Arabic-Indic digits), tokenising, the definite article, the bilingual statistics glossary, highlight ranges mapped onto the original text, `arNoun` (MSA number agreement) |
| `search.mjs` | search dialog | Weighted field scoring, category grouping, session history |
| `explorer.mjs` | publication explorer | URL state, filters, sorts, facets |
| `normal.mjs` | home hero | Φ (A&S 7.1.26), density and area paths |

## Site search (header button, Ctrl/⌘ K, `/`)

- **Index:** `src/pages/search-index/[lang].json.ts` emits `/search-index/en.json` and `/ar.json`. Each holds 54 records: publications, books, research areas, projects, methods, teaching, talks and pages. They are built from approved data only, and each language's titles are what that language's pages show. The index is fetched on first open (about 35 KB), never on page load.
- **Matching:** every query term must match. Matches can be exact words, prefixes, or glossary equivalents (الحرف ↔ ridge, التعدد الخطي ↔ multicollinearity …). So Arabic, author-name and mixed queries work without machine translation.
- **UI:** a native `<dialog>` holds a combobox input with `aria-activedescendant` over a listbox.
  - Results are grouped by category and highlighted.
  - Arrow keys, Home/End and Enter work; Escape closes the dialog and focus returns to the trigger.
  - There is an empty state, and recent queries are kept in `sessionStorage` only. Nothing leaves the browser.
- **Without JavaScript:** the header button is hidden rather than left dead (`html[data-js]` is set by an inline head script). The navigation and the fully rendered publication list remain.

## Publication explorer (`/publications/`, `/books/`)

- **Search:** title, authors, year, venue, DOI and keywords, using the same normalisation and glossary.
- **Filters:**
  - type (with counts that ignore the type filter);
  - year range (a clickable histogram that includes empty years);
  - selected only;
  - co-author, keyed by last name plus exact initials so that "Rady, E. A." and "Rady, E. H. A." stay distinct (DQ-05);
  - research area, using verified manifest relationships only.
- **Sorts:** newest, oldest, A–Z, selected first. **Views:** list, compact, cards.
- **Shareable URLs:** `?q=&type=&from=&to=&sel=1&author=&area=&sort=&view=`. Invalid values fall back to defaults, and history uses `replaceState`, so filtering does not flood the back button.
- **Without JavaScript:** every publication is in the HTML, newest first, with full details, citation copy, and BibTeX/RIS export (generated from the parsed bib at build time).

## Knowledge graph (`/research/`)

- **Edges:** the 42 relationships in `public-content.manifest.json`, each with its evidence text. A relationship whose evidence quotes a title fails the build if the quote is not found (`src/utils/relations.ts`). Nothing is inferred from keywords.
- **Layout:** three columns, computed at build time (`src/utils/graph.ts`):
  - areas and methods on the start side;
  - publications in the centre;
  - projects, talks and the dataset on the end side.
- **Rendering:** nodes are HTML buttons over an SVG edge layer, and the columns mirror in Arabic. 41 edges are drawn. The project → dataset link joins two end-column nodes, so it appears in the panel and the list rather than as a line.
- **Keyboard:** the graph is one Tab stop (roving tabindex). Arrow keys move within and between columns, Enter or Space selects, and Escape clears.
  - Selecting a node lights its edges and opens a panel with the evidence and links.
  - `?focus=area:…` preselects a node; the home page's area cards use this.
- **Alternatives:** a full list view with the same connections is the default on narrow screens and always available through the Map/List switch. It is also the no-JS content.

## Journey (`/about/`)

Milestones are built only from dated approved records: education, roles, publications, talks and projects. Undated items are listed separately and never placed on the timeline. Each year is a `<details>` element; an "Expand all" button and links to related publications are provided. Periods are localised, and an ongoing period shows as "present" or «الآن».

## Contact composer (`/contact/`)

There are four paths: collaboration, consulting, supervision and lectures/workshops. `?path=` preselects one, and the home page links to each.

- The script builds a `mailto:` link with a subject and a structured body. Nothing is sent from the site, so there is no endpoint, no stored data and no "message sent" state. A copy-to-clipboard fallback is offered.
- Validation is local: a message needs at least 20 characters, and errors are announced with `aria-invalid` and a live region.
- A server endpoint (D-08) would need server-side validation, rate limiting, a honeypot and no PII in logs before it could replace this.

## Home page

The home page is made of these sections:

- **Hero:** name, role and positioning, with CTAs to publications and research areas. The figure is a real standard normal density: pointer, touch or arrow keys move z, and Φ(z) is computed, not drawn. Nothing animates on its own.
- **Identity panel:** the approved portrait, then tabs (ARIA tabs, added by JS only) for affiliations, education, interests, academic profiles and contact.
- **Research discovery:** area cards with publication previews from verified links, a graph teaser and projects.
- **Selected publications.**
- **Lab teaser:** a chart drawn from the payload's computed spreads.
- **Metric cards:** OpenAlex and ResearchGate, each with its own source, retrieval date and definitions, never combined.
- **Contents index and contact paths.**

## Motion and accessibility rules

- Motion is limited to state changes (hover, selection, disclosure). There is no autoplay, parallax, scroll hijacking or perpetual animation, and `prefers-reduced-motion` removes transitions.
- Every interactive control works by keyboard, and each feature has a no-JS fallback.
- Every page has exactly one `h1`. Identifiers (DOIs, URLs, ORCID) are isolated left-to-right runs in Arabic, and SVG figures use `direction: ltr` so mathematical axes are not mirrored.
- JavaScript budget: each feature's script is only loaded on pages that use it. The search dialog script is the only one on every page; it is about 6 KB, and its index is lazy-loaded.
