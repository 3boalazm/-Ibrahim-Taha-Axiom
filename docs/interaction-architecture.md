# Interaction architecture (Phase 4, motion in Phase 5)

The site is static-first Astro: every page is complete HTML at build time, and each interactive feature is a small inline script that enhances HTML already on the page. There is no framework runtime and no client-side routing. Only one feature calls a server: the site assistant sends a visitor's question to `POST /api/chat` ([below](#site-assistant-corner-launcher-every-page)). All data comes from `site/src/data/approved/` through the same build-time utilities the pages use, so an interactive view can never show something a static page would not. The assistant's answers are the one designed exception: they are generated per question and presented as AI answers.

Shared, framework-free logic lives in `site/src/lib/*.mjs`. Both the build and the browser import it, and `node --test` tests it directly:

| Module | Used by | Purpose |
| --- | --- | --- |
| `text.mjs` | search, explorer | Arabic/Latin normalisation (diacritics, alef/yaa/taa-marbuta forms, tatweel, Arabic-Indic digits), tokenising, the definite article, the bilingual statistics glossary, highlight ranges mapped onto the original text, `arNoun` (MSA number agreement) |
| `search.mjs` | search dialog | Weighted field scoring, category grouping, session history |
| `explorer.mjs` | publication explorer | URL state, filters, sorts, facets |
| `normal.mjs` | home hero | Φ (A&S 7.1.26), density and area paths |
| `motion.mjs` | every page (boot), hero, graph, journey, explorer, lab | Motion gating, easing, `tween`, `swapText`, `drawStrokes`, keyed `flip`, reveal-once ([motion-system.md](motion-system.md)) |

## Site search (header button, Ctrl/⌘ K, `/`)

- **Index:** `src/pages/search-index/[lang].json.ts` emits `/search-index/en.json` and `/ar.json`. Each holds 54 records: publications, books, research areas, projects, methods, teaching, conference papers and pages. They are built from approved data only, and each language's titles are what that language's pages show. The index is fetched on first open (about 35 KB), never on page load.
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
  - co-author, keyed by last name plus exact initials, so that different initials are never merged by guesswork. The bibliography carries one form per person: all three Rady entries read "Rady, E. A." (DQ-11);
  - research area, using verified manifest relationships only.
- **Sorts:** newest, oldest, A–Z, selected first. **Views:** list, compact, cards.
- **Shareable URLs:** `?q=&type=&from=&to=&sel=1&author=&area=&sort=&view=`. Invalid values fall back to defaults, and history uses `replaceState`, so filtering does not flood the back button.
- **Without JavaScript:** every publication is in the HTML, newest first, with full details, citation copy, and BibTeX/RIS export (generated from the parsed bib at build time).
- **Motion:** discrete changes (type, year bar, selects, sort, view, chips, clear) move the results with a keyed FLIP, and the list stays clickable throughout. Typing re-filters without motion. The result count changes once to its exact value, and the year bars grow from their baseline on first view.

## Knowledge graph (`/research/`)

- **Edges:** the 42 relationships in `public-content.manifest.json`, each with its evidence text. A relationship whose evidence quotes a title fails the build if the quote is not found (`src/utils/relations.ts`). Nothing is inferred from keywords.
- **Layout:** three columns, computed at build time (`src/utils/graph.ts`):
  - areas and methods on the start side;
  - publications in the centre;
  - projects, conference papers and the dataset on the end side.
- **Rendering:** nodes are HTML buttons over an SVG edge layer, and the columns mirror in Arabic. 41 edges are drawn. The project → dataset link joins two end-column nodes, so it appears in the panel and the list rather than as a line.
- **Keyboard:** the graph is one Tab stop (roving tabindex). Arrow keys move within and between columns, Enter or Space selects, and Escape clears.
  - Hovering or focusing a node lights its edges as a preview, instantly.
  - Selecting a node lights its edges and opens a panel with the evidence and links.
  - `?focus=area:…` preselects a node; the home page's area cards use this.
- **Alternatives:** a full list view with the same connections is the default on narrow screens and always available through the Map/List switch. It is also the no-JS content.
- **Motion:** the map draws once when it first enters view, column by column. A deep link (`?focus=`) skips the entrance. Selecting a node redraws its edges outward from it. Nodes never move on their own.

## Journey (`/about/`)

Milestones are built only from dated approved records: education, roles, publications, conference papers and projects. Undated items are listed separately and never placed on the timeline. Each year is a `<details>` element; an "Expand all" button and links to related publications are provided. Periods are localised, and an ongoing period shows as "present" or «الآن». In Arabic the " · " separator follows the page direction and only the numbers are isolated, so a range reads «التعليم · 2012–2015».

Motion: the timeline line draws when it first enters view and the years rise in sequence. While reading, the dated year at the middle of the viewport is highlighted (visual only; the undated group never is). Year groups open and close smoothly where the browser supports it.

## Section navigation ("On this page")

The current item is the last section whose anchor has passed the reading line (45 % of the viewport). It is computed once per frame while scrolling, so it stays right after a jump and across long sections such as the lab's figures. The bar itself is a plain list of in-page links, and without JavaScript nothing is marked.

## Contact composer (`/contact/`)

There are four paths: collaboration, consulting, supervision and lectures/workshops. `?path=` preselects one, and the home page links to each.

- The script builds a `mailto:` link with a subject and a structured body. Nothing is sent from the site, so there is no endpoint, no stored data and no "message sent" state. A copy-to-clipboard fallback is offered.
- Validation is local: a message needs at least 20 characters, and errors are announced with `aria-invalid` and a live region.
- A server endpoint (D-08) would need server-side validation, rate limiting, a honeypot and no PII in logs before it could replace this.

## Home page

The home page is made of these sections:

- **Hero:** name, role and positioning, with CTAs to publications and research areas. The figure is a real standard normal density: pointer, touch or arrow keys move z, and Φ(z) is computed, not drawn.
  - On first view the figure draws itself once: axis, ticks, curve, then the area accumulates up to z and the marker settles. The readout is exact from the first frame.
  - After that nothing moves unless the reader moves z; the marker then glides, and every frame is exact.
- **Identity panel:** the approved portrait, then tabs (ARIA tabs, added by JS only) for affiliations, education, interests, academic profiles and contact.
- **Research discovery:** area cards with publication previews from verified links, a graph teaser and projects.
- **Selected publications.**
- **Lab teaser:** a chart drawn from the payload's computed spreads.
- **Metric cards:** OpenAlex and ResearchGate, each with its own source, retrieval date and definitions, never combined.
- **Contents index and contact paths.**

## Site assistant (corner launcher, every page)

- **What it is:** a launcher in the bottom inline-end corner opens a small chat panel. It is labelled "Ask about this site" / «اسأل عن الموقع», and below 40rem it becomes a round icon button that keeps its accessible name.
  - Answers come from `POST /api/chat`, a Vercel Function that sends the question, the last 8 messages and the site's approved content to Google Gemini.
  - Details: [`site/README.md`](../site/README.md#site-assistant-apichat). Content rules: [public-content-policy.md](public-content-policy.md#7-site-assistant-ai-answers) §7.
- **UI:** a non-modal `<dialog>`, so the page behind stays usable.
  - Opening moves focus to the question box. Enter sends, and Shift+Enter starts a new line. Escape or the close button closes the panel, and focus returns to the launcher.
  - The conversation is a focusable `role="log"` region, so screen readers announce new messages.
  - Four example questions are offered until the first question. "New chat" clears the conversation.
- **Rendering:** answers are text with a small Markdown subset: paragraphs, "- " lists, bold, and links to site paths or https URLs.
  - The script builds them with DOM nodes, never `innerHTML`, so HTML inside an answer shows as text.
  - Links open in the same tab.
- **State:** the conversation is kept in `sessionStorage` (`axiom-chat:en` / `axiom-chat:ar`, the last 30 messages), so it follows the visitor across pages in the same tab. Error notices are shown but not stored.
- **Layout:** at every width the panel sits between the sticky site header and the launcher, so its title and close button are never covered. On phones it spans the width.
  - In Arabic the layout mirrors: launcher and panel on the left.
  - The footer gets extra bottom padding, so the launcher never covers its last line.
- **Errors:** if the server is not configured, busy or unreachable, or the question is too long, the panel shows a clear notice, never an invented answer.
- **Without JavaScript:** the widget is `hidden` in the HTML and appears only when its script runs, so there is no dead button.
- **Motion:** none.

## Install as an app (floating button, opposite the assistant)

- **What it is:** the site installs from the browser as an app with its own window and icon: an English app starting at `/` and an Arabic one starting at `/ar/`. Pages already opened stay readable offline. Details: [`site/README.md`](../site/README.md#install-as-an-app); decision D-21.
- **Where:** one floating "Install the app" / «ثبّت التطبيق» button in the bottom inline-start corner, opposite the assistant's launcher: bottom right in Arabic, bottom left in English, at the same height and distance from the bottom. On screens up to 40rem it is a round icon button like the launcher, and its label stays for screen readers. The owner asked for it there on 2026-11-07, in place of the first version's footer and phone-menu buttons and written steps.
- **When it shows:** only after a Chromium browser (Chrome, Edge) fires `beforeinstallprompt`, that is, when the browser itself can install the site. One press opens the browser's install prompt, and the button hides, since there is one prompt per event. The browser's own confirmation always remains: no site can install itself.
  - Safari (iPhone, iPad, Mac) and Firefox give pages no install prompt, so they get no button. Installing there goes through the browser's own menu (Safari: Share, then "Add to Home Screen").
  - Hidden inside the installed app (`display-mode: standalone` or `navigator.standalone`; the page then sets `html[data-app="standalone"]`), and without JavaScript, because the button is `hidden` in the HTML.
- **Focus:** an ordinary button, after the assistant's launcher in the tab order. Nothing moves focus.
- **Announcements:** after installing, a polite `role="status"` region says where to find the app.
- **Offline:**
  - An unsaved page shows an offline page in its own language and theme, with "Try again", a link home and the saved pages of that language.
  - Saved pages open as usual.
  - The assistant needs the network and shows its normal error notice offline; its requests are never answered from a cache.
- **Motion:** none.

## Studio credit (end of every page)

- **What it is:** the last band inside the footer: "Developed by Aboalazm OS Studio" / «من تطوير Aboalazm OS Studio», plus one button, "Visit the studio" / «زيارة الاستوديو». The button opens <https://aboalazm-os.vercel.app/> in a new tab; screen readers hear "(opens in a new tab)". Details: [`site/README.md`](../site/README.md#studio-credit); decision D-22.
- **Look:** the studio's identity, not the site's. It keeps the same look in both of the site's themes.
- **Layout:**
  - wide screens: text at the inline start, the button at the inline end;
  - up to 30rem: stacked, with the button full width;
  - Arabic: mirrored, and the arrow points the reading way.
- **Focus:** the button comes after the footer links and before the floating buttons in the tab order. It shows the studio's amber ring at once, instead of the site's closing-in focus animation.
- **With the floating buttons:** they set `--floating-clearance`, and the band keeps that much room at its end, so at the end of a page they never cover the button.
- **Motion:** only a 200 ms background change on hover, with the studio's easing; none under reduced motion.

## Motion and accessibility rules

- Motion follows [motion-system.md](motion-system.md):
  - entrances play once, and state changes animate briefly;
  - nothing loops or autoplays; there is no parallax, scroll hijacking or cursor effect;
  - `prefers-reduced-motion` makes every change instant.
  - No content or state depends on an animation: without JavaScript or with reduced motion, everything is visible in its final state.
- Every interactive control works by keyboard, and each feature has a no-JS fallback.
- Every page has exactly one `h1`.
- In Arabic, identifiers (DOIs, URLs, ORCID) and numbers are isolated left-to-right runs, while separators such as " · " stay outside the isolate in the page direction. SVG figures use `direction: ltr`, so mathematical axes are not mirrored.
- JavaScript budget:
  - **Every page:** the search dialog script (about 6 KB, 2.5 KB gzip; its index is lazy-loaded) and the motion boot with the shared motion module (about 5 KB, 2.3 KB gzip, cached across pages and reused by the feature scripts). The motion module is new in Phase 5.
  - **Every page, from this change on:** the assistant widget's inline script (about 3.9 KB, 1.7 KB gzip). It makes a network request only when a question is sent.
  - **Feature scripts:** each loads only on the pages that use it.
