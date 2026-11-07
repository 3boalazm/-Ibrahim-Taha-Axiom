# QA checklist

## Automated (CI: `.github/workflows/site-ci.yml`)

Runs on every pull request and every push to `main` that touches `site/`:

| Step | Command | Checks |
| --- | --- | --- |
| Build | `npm run build` | Content schemas; every manifest relationship resolves and quoted evidence is found; 67 HTML files |
| QA | `npm run qa` | One h1 per page, internal links, language switch, approved mailto/tel only, forbidden files (raw .bib, manifest, profile JSON) and client-side model code absent, lab payload, colour contrast of token pairs, sitemap (66 URLs) |
| Lab | `npm run lab:verify` | Recomputes all 15 states × 100 replicates from the seed, checks convergence, and checks every number quoted in EN/AR text (see [lab-methodology.md](lab-methodology.md)) |
| Unit and build tests | `npm test` | `node:test` suites in `site/tests/`: routes, `lang`/`dir`, headings, canonical/hreflang/robots/sitemap, JSON-LD, citation meta, search (Arabic, author, mixed, DOI), explorer state/filters/sorts/facets, manifest integrity, consent record, translation status, lab payload, normal-curve maths, motion tokens, gating and loops (`motion.test.mjs`), the site assistant (`chat.test.mjs`: knowledge in sync with the build, secret scan, request handling against a fake Google endpoint), the installable app (`app.test.mjs`: manifests, icon sizes and the maskable safe zone, manifest links, hidden install controls, `sw.js` in step with the build and its routing) |
| Browser tests | `npm run test:e2e` | Headless Chrome. `keyboard.mjs`: search keyboard flow and focus return, explorer URL state, section navigation after a jump, graph roving focus, focus preview and RTL columns, hero slider, identity tabs, journey, contact `?path=`, Arabic separators outside LTR isolates. `motion.mjs`: first-frame opacity of above-the-fold text, hero glide, reveal-once, page transitions, explorer clickable while moving, lab values exact, graph entry and selection, journey; then the same pages under reduced motion and without JavaScript. `chat.mjs`: the site assistant with `/api/chat` intercepted: keyboard and focus, rendering, persistence, error notices, Arabic layout, the panel clear of the sticky header, no JavaScript. `app.mjs`: Chrome's manifest and installability checks, the service worker, offline reading with the server stopped, a withdrawn page, the floating install button (its corner opposite the assistant, one press, one prompt), no button in Safari or Firefox, the installed app and no JavaScript. No JS errors in any suite |

## Run during Phase 4 (2026-11-06)

These were run in the development sandbox (Node 22, headless Chromium 153) on the final tree:

| Check | Result |
| --- | --- |
| `npm run build` | 67 HTML files |
| `npm run qa` | All QA checks passed; sitemap 66 URLs |
| `npm run lab:verify` | ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 50 tests, 50 pass, 0 fail |
| `npm run test:e2e` | 34 checks, all pass, no JavaScript errors |
| Overflow sweep, 13 page types | No horizontal overflow at 320, 360, 390, 768, 1024, 1280 and 1440 px, EN/AR (182 combinations) |
| Overflow sweep, publication pages | All 22 publication pages, EN/AR, at 320 and 360 px (88 combinations): no overflow |
| Header fit | Header fits from 961 to 1920 px; the menu collapses below 1024 px |
| Visual review | The screenshots in [`screenshots/phase-4/`](screenshots/phase-4/README.md) were reviewed by eye. Fixes that came out of the review: Arabic fake-italic, author contrast on the publication header, the Latin title face on Arabic pages, isolation of the `.bib`/`.ris` labels, a DOI overflowing at 320 px, and personal names breaking across lines |

CI runs Node 26 (`engines`); the Phase 4 pull request and `main` have since passed on Node 26.

**Not run in Phase 4:** axe or another automated accessibility engine, Lighthouse, real-device testing, VoiceOver/NVDA/TalkBack, and visual-regression diffing. axe and Lighthouse were first run in Phase 5 (below).

## Run during Phase 5 (2026-11-06)

Run in the development sandbox (Node 22, headless Chromium 153) on the final tree of the Phase 5 branch:

| Check | Result |
| --- | --- |
| `npm ci` → `npm run build` | 248 packages; 67 HTML files |
| `npm run qa` | All QA checks passed; sitemap 66 URLs |
| `npm run lab:verify` | ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 58 tests, 58 pass, 0 fail (Phase 4: 50) |
| `npm run test:e2e` | 78 checks, all pass, no JavaScript errors: `keyboard.mjs` 37 (Phase 4: 34), `motion.mjs` 41 (new) |
| Overflow sweep, 12 page types, EN/AR, light | No horizontal overflow at 320, 360, 390, 768, 1024, 1280 and 1440 px (168 combinations) before the accessibility fixes, and again at 320, 360 and 390 px after them (72 combinations) |
| axe-core 4.14.0 (WCAG 2.2 AA rules) | **Before** (8 page types × EN/AR × light/dark, 1280 px, 32 runs): 5 rules violated, listed below. **After:** 0 violations in those 32 runs; 0 in 52 runs at 1280 px (13 page types incl. 404 × EN/AR × light/dark) and 0 in 52 runs at 390 px with reduced motion. Run after animations finish |
| Lighthouse 12.8.2 | Table below |
| Visual review | The screenshots and motion strips in [`screenshots/phase-5/`](screenshots/phase-5/README.md) were reviewed by eye |
| CI (GitHub Actions, Node 26, Google Chrome 156) | Green on the final commits of the pull request. The branch's first CI run failed inside the keyboard suite. The raw log was not reachable from the sandbox, and GitHub did not allow a re-run from it, so which check failed is not known. The same code passed on the next run, and 16 local runs (6 with the CPU saturated) passed. The keyboard suite now waits for the state it asserts instead of fixed pauses, and failing checks are reported as annotations on the pull request |

axe before the fixes:

| Rule | Nodes / runs | Where | Fix |
| --- | --- | --- | --- |
| color-contrast | 94 / 24 | dark footer (1.04:1), brass small text in light mode (3.15–3.32:1), the count on the active type chip (3.8:1) | `--color-brass-ink` for small brass text; the footer uses the inverted-ink tokens in both themes; the count inherits the active chip's ink |
| label-content-name-mismatch | 116 / 32 | brand link, wordmark; then, while fixing, the language switch and the year bars | Visible text kept in each accessible name ("Ibrahim Taha Axiom"); the language switch is named by its visible text; year bars show the full year ("2018", not "18"), with the count from `data-n` |
| link-name | 32 / 32 | collapsed header CTA | Label visually hidden instead of `display: none` |
| landmark-unique | 4 / 4 | graph map region | Distinct region name |
| aria-prohibited-attr | 4 / 4 | explorer active filters | `role="group"` |

Lighthouse 12.8.2, simulated mobile unless marked desktop, median of 3 runs. It ran against a local static server with Brotli and Vercel-like caching, built from `main` (`2f8c8d5`) and from this branch, because the sandbox cannot reach `vercel.app`. Use these numbers to compare the two builds, not as field data.

| Page | Performance main → branch | LCP main → branch |
| --- | --- | --- |
| `/` | 87 → 90 | 3.5 s → 3.2 s |
| `/ar/` | 76 → 75 | 4.4 s → 4.4 s |
| `/` desktop | 99 → 99 | |
| `/research/`, `/ar/research/` | 92 → 91, 77 → 77 | within ±0.1 s |
| `/publications/`, `/ar/publications/` | 92 → 91, 79 → 77 | within ±0.1 s |
| `/lab/` | 91 → 92 | within ±0.1 s |
| `/publications/` desktop | 100 → 100 | |

- **Accessibility:** 93–97 on `main`, 100 on all nine pages on the branch.

- **TBT and SEO:** total blocking time is 0 ms and SEO 100 on every page in both builds.
- **Best Practices:** 96 on `/`, `/ar/` and `/publications/` and 100 elsewhere, the same on `main`. The flagged item is Lighthouse's font-size audit, which reports 20.5 % (`/`) and 5.4 % (`/publications/`) legible text. A direct count of visible text at 412 px finds 72 % and 62 % at 12 px or more, so the cause is not established. The small text is `--step--2` (11.52 px).
- **CLS:** at most 0.048, on both builds. It comes from the web-font swap shifting the hero figure, not from motion.
- **LCP regression found and fixed:** an earlier branch build measured `/` at 84 (LCP 4.0 s) and `/ar/` at 72 (5.2 s). The hero name and lead faded in, because a scoped selector outranked the transform-only rule. The table shows the fixed build: LCP minus FCP is 0 on every page again, as on `main`. A first-frame e2e check now guards it ([motion-system.md](motion-system.md#above-the-fold)).
- **JavaScript:** every page now also loads the motion boot and shared motion module (about 5 KB, 2.3 KB gzip), in addition to the search script that was already there.

Bugs found by these checks and fixed on the branch:

- the light-mode footer CTA was dark on dark (pre-existing);
- keyboard focus on a graph node did not light its links;
- the "On this page" bar kept a stale or empty item after a jump (pre-existing);
- in Arabic, " · " separators inside LTR isolates were stranded at the far end of the line («· 2019جامعة القاهرة»). This was pre-existing, in the journey periods, identity and profile facts, and publication venue lines.

**Still not run:** real-device testing, VoiceOver/NVDA/TalkBack, and visual-regression diffing. Do not cite them as done.

## Run for the data-quality decisions (2026-11-06)

Run in the development sandbox (Node 22, headless Chromium 153) on the final tree of the branch that applies the researcher's Data Quality Review decisions ([data-quality-register.md](data-quality-register.md)):

| Check | Result |
| --- | --- |
| `npm ci` → `npm run build` | 67 HTML files |
| `npm run qa` | All QA checks passed |
| `npm run lab:verify` | Unchanged: ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 71 tests, 71 pass, 0 fail (Phase 5: 58). New: `data-quality.test.mjs` (12 tests: the applied decisions, then the built pages) and a governance test that `docs/data-quality-register.md` equals the output of `npm run dq:register` |
| Negative checks | Marking DQ-13 resolved without a decision fails the build (`[content gate] … status 'resolved' requires response.outcome 'decided'`); a hand-edited register fails the governance test. Both were reverted after the check |
| `npm run test:e2e` | 78 checks, all pass, no JavaScript errors (`keyboard.mjs` 37, `motion.mjs` 41). Three checks counted 4 books and now count 6 (DQ-12); one of them had matched the count as a substring and now matches the whole number |
| Overflow: home, profile, projects, books, research (EN/AR) × light/dark | 0 px at 320, 390 and 1280 px (60 combinations) |
| axe-core 4.14.0 | 0 violations in 40 runs: the same 10 pages × light/dark at 390 and 1280 px, run after animations finish |
| Arabic name, measured in the browser | Letter-spacing 0 and line height 1.3 for the Arabic name on `/ar/` and `/ar/about/`. At 320 px the home-page name wraps onto two lines; at the earlier line height of 1 the ink of each line was 4 px taller than the line, and now it fits with 8 px to spare. The official name is an isolated right-to-left unit (`<bdi dir="rtl">`, inline-block) and stays on one line at every width tested. The English names are unchanged |
| Fonts | Every English page already loads the Arabic 500-weight file for the language switch («العربية»). The official name uses that weight, so the English profile page loads no extra font file (at weight 400 it had loaded one more, 42.8 KB) |
| Visual review | The screenshots in [`screenshots/dq-review/`](screenshots/dq-review/README.md) were reviewed by eye |

**Not run:** Lighthouse (no script, image or loading change), real devices and screen readers.

**Seen, not changed:** at 280 px, below the 320 px target, the header's menu button overflows by 6 px (English) and 18 px (Arabic). The header is not touched by this work.

## Run for the conference-paper reclassification (2026-11-07)

Run in the development sandbox (Node 22, headless Chromium 153) on the final tree of the branch that narrows DQ-13 and relabels the 2018 and 2019 records as conference papers ([data-quality-register.md](data-quality-register.md#dq-13--classification--open)):

| Check | Result |
| --- | --- |
| `npm ci` → `npm run build` | 67 HTML files |
| `npm run qa` | All QA checks passed (67 pages, 143 files, 30 external links) |
| `npm run lab:verify` | Unchanged: ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 75 tests, 75 pass, 0 fail (before: 71). New in `data-quality.test.mjs`: DQ-13 is open only for oral-presentation attribution; both papers carry their source links (data and the built EN/AR pages); the labels read Conference Papers / أوراق المؤتمرات (title, h1, header count, search category, graph kind and column, every section link); no page or structured data claims a presentation. The existing "superseded identifiers" test now also rejects the footer label "Scopus (2 ids)" |
| Negative checks | Each new test failed when its condition was broken and passed again after the file was restored (`cmp` identical): a sentence "Ibrahim presented this paper at the conference." added to `/talks/` failed the claim test; the old "Talks" nav label on `/` failed the label test; removing the 2018 source link failed the link test; restoring the old two-part DQ-13 question failed the DQ-13 test. The claim checker also rejects probe sentences in English and Arabic («قدّم ابراهيم الورقة في المؤتمر.», «ألقاها ابراهيم في المؤتمر.»). The extended identifiers test failed on the build made before the footer fix |
| `E2E_REQUIRED=1 npm run test:e2e` | 78 checks, all pass, no JavaScript errors (`keyboard.mjs` 37, `motion.mjs` 41) |
| axe-core 4.14.0 | 0 violations in 24 runs: home, conference papers, profile, research and the two papers' publication pages (EN/AR) × light/dark at 1280 px, with reduced motion |
| Overflow | 0 px at 320 and 375 px for the same 12 pages (24 combinations) |
| Visual review | The four screenshots in [`screenshots/conference-papers/`](screenshots/conference-papers/README.md) were reviewed by eye |

**Not run:** Lighthouse (no script, image or loading change), real devices and screen readers.

**Evidence, as checked on 2026-11-07.** Fetched and read: the 2019 full text on ResearchGate (running header of the 54th conference, 9–11 December 2019, first page 35, the three authors); the Crossref records of the two Wiley papers (`10.1002/cpe.6685` reference 29 and `10.1002/cpe.7045` reference 2, both citing the papers in the conference proceedings); the conference site, which announces the 53rd conference for 3–5 December 2018. Not opened: the official 2018 proceedings PDF returned HTTP 500 to the sandbox's fetcher twice over HTTPS and failed over HTTP, so its page range (49–66) is as reported by the project owner. No source examined says who presented either paper.

## Run for the site assistant (2026-11-07)

Run in the development sandbox (Node 22, headless Chromium 153) on the final tree of the change that adds the site assistant ([site/README.md](../site/README.md#site-assistant-apichat)):

| Check | Result |
| --- | --- |
| `npm ci` → `npm run build` | 67 HTML files; `/chat/knowledge.json` holds 36,254 characters |
| `npm run chat:knowledge` | Regenerated `site/server/knowledge.mjs`; byte-identical to the committed copy |
| `npm run qa` | All QA checks passed (67 pages, 144 files, 30 external links). The new file is `/chat/knowledge.json`; QA scans it like every other build file |
| `npm run lab:verify` | Unchanged: ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 83 tests, 83 pass, 0 fail (before: 75). The 8 new tests in `chat.test.mjs`:<br>1. the committed knowledge matches the build;<br>2. the knowledge holds approved content and the site's rules;<br>3. the widget is on every page, hidden until its script runs, in the page language;<br>4. nothing key-shaped appears in the code, the docs or the build;<br>5. the server refuses wrong methods, foreign or missing origins, wrong content types, malformed, empty, oversized or too-long input and invented history roles; it answers 503 without a key and 429 when rate-limited, without sending anything upstream;<br>6. it sends the grounded prompt to the right Google endpoint, with the key in a header only;<br>7. upstream failures become clear errors that never echo the key;<br>8. rate limit, history shaping and input clean-up |
| Negative checks | Each of these failed its test, and the test passed again after the file was restored (`cmp` identical):<br>- a key-shaped string added under `site/src` (secret scan);<br>- an edited server copy of the knowledge (sync test);<br>- the key moved into the request URL (endpoint test);<br>- answers rendered with `insertAdjacentHTML` (the e2e check "HTML in an answer is shown as text").<br>Of the 5 new layout checks, 4 failed on the build before the fixes below: unstyled messages in English and Arabic, and a gap of −29 px at 1280 × 700 and −65 px at 320 × 640. The fifth, at 1280 × 900, passed there, because at that height the old panel already cleared the header |
| `E2E_REQUIRED=1 npm run test:e2e` | 117 checks, all pass, no JavaScript errors: `keyboard.mjs` 37, `motion.mjs` 41, and the new `chat.mjs` 39. `chat.mjs` intercepts `/api/chat` and checks:<br>- the launcher and the panel; focus and keyboard (Enter, Tab, Escape, focus return); the request body;<br>- Markdown links and lists; HTML shown as text; styled messages;<br>- persistence across pages, and earlier turns sent as context;<br>- error notices (not configured, failed request, rate limit), and that they are not stored; "New chat";<br>- Arabic: left side, right to left, Arabic links;<br>- the panel clear of the sticky header at 1280 × 900, 1280 × 700 and 320 × 640, with the close button topmost at its centre;<br>- the fit at 320 px, the icon-only launcher's name, and no button without JavaScript |
| axe-core 4.14.0 | 0 violations in 24 runs (the 12 pages of the previous run × light/dark), and in 8 runs with the panel open and an answer shown (`/`, `/ar/`, `/talks/`, `/ar/talks/` × light/dark) |
| Overflow | 0 px at 320 and 375 px in the same 24 page × width runs; the open panel fits in 8 more |
| Hovered-button contrast | Found by axe on the hovered launcher, but older than this change: `.button:hover` replaced the background of solid and accent buttons with the page's hover colour, so hovered text nearly disappeared.<br>**Before** (`main`, 7bac99d): the home CTA, the lab teaser button and the contact composer button measured 1.13:1 light and 1.18:1 dark; the footer CTA 13.07:1 light and 1.10:1 dark. 1 of 8 passed.<br>**After** (`global.css`: the variant hover rules set their own background): 13.92:1 light and 14.59:1 dark; the footer CTA 11.66:1 and 8.85:1; the launcher the same as the solid buttons. 12 of 12 pass |
| Lighthouse 12.8.2 | Table below |
| Visual review | The two screenshots in [`screenshots/site-assistant/`](screenshots/site-assistant/README.md) were reviewed by eye. The first review found two bugs that the checks above had missed:<br>- **Unstyled messages.** Astro's scoped CSS does not reach nodes that a script creates; the rules now hang off the log with `:global()`.<br>- **The panel under the sticky header** on phones and short desktop screens. At 320 px in Arabic, the close button was also pushed off the left edge by an example question that could not wrap.<br>Both are fixed, and the new e2e checks cover them |

Lighthouse 12.8.2, simulated mobile, median of 3 runs, against a local static server with Brotli and Vercel-like caching (the sandbox cannot reach `vercel.app`). Use the numbers to compare the builds, not as field data.

| Page | Performance main → branch | LCP main → branch | CLS main → branch |
| --- | --- | --- | --- |
| `/` | 90 → 89 | 3.2 s → 3.2 s | 0.018 → 0.018 |
| `/ar/` | 75 → 75 | 4.5 s → 4.5 s | 0.046 → 0.027 |
| `/publications/` | 91 → 92 | 2.9 s → 2.9 s | 0 → 0 |
| `/talks/` | 93 → 93 | 2.7 s → 2.7 s | 0 → 0.017 |

- **TBT, accessibility, SEO:** total blocking time is 0 ms everywhere, and accessibility and SEO score 100 on all four pages in both builds.
- **Best Practices:** unchanged: 96 on `/`, `/ar/` and `/publications/`, 100 on `/talks/`. The cause is the font-size audit described in the Phase 5 run.
- **What "main" and "branch" are:** "main" is `7bac99d`. "Branch" includes this pull request's earlier conference-paper commits.
- **The assistant on its own:** `/talks/` and `/` were also measured on `f59b074` (this branch before the assistant) against the final tree. Performance went 93 → 93 and 90 → 89, LCP was unchanged, and CLS went 0.017 → 0.017 and 0.018 → 0.018. The assistant adds no layout shift.
- **The `/talks/` shift** came with the longer conference-paper text. Lighthouse attributes it to a web-font swap on the page container. A direct trace in Chromium shows no shift, because the fonts arrive before the first paint. It is below the 0.1 "good" threshold and was not changed.

**Not run:** a live request to Google (the sandbox cannot reach it, and the key belongs only in Vercel), real devices and screen readers.

## Run for the installable app (2026-11-07)

Run in the development sandbox (Node 22, headless Chromium 153) on the final tree of the change that makes the site installable ([site/README.md](../site/README.md#install-as-an-app)):

| Check | Result |
| --- | --- |
| `npm run build` | 67 HTML files, unchanged, because the offline page is built inside the service worker.<br>New output:<br>- `/sw.js`: 15,408 bytes, `VERSION` `9d7edae83eea`. It precaches 16 files: `/`, `/ar/`, 5 CSS and 9 JS files;<br>- `/site.webmanifest` and `/ar/site.webmanifest`;<br>- two maskable icons.<br>Two builds of the same tree gave the same `VERSION` |
| `npm run chat:knowledge` | Byte-identical to the committed copy; the assistant is unaffected |
| `npm run qa` | All QA checks passed (67 pages, 148 files, 30 external links) |
| `npm run lab:verify` | Unchanged: ✓ 15 states × 100 replicates, ML spread 11.3× ridge at ρ = 0.995, VIF 264.5, max \|score\| 9.9e-14, 25 claims |
| `npm test` | 92 tests, 92 pass, 0 fail (before: 83). The 9 new tests in `app.test.mjs` check:<br>1. one app per language (id, start, scope, direction; descriptions taken from the home pages);<br>2. icon sizes, read from the PNG headers;<br>3. the maskable icons' safe zone, measured pixel by pixel (37.6 % and 37.5 % of the width, limit 40 %);<br>4. shortcuts that are existing pages, named as in the menu;<br>5. every page linking its own language's manifest;<br>6. the install controls `hidden` in the HTML;<br>7. `sw.js` complete and in step with `dist`, with a `VERSION` that recomputes;<br>8. the offline strings in both languages;<br>9. the worker's routing, run in a sandbox |
| Negative checks | Each of these failed its test, and the test passed again after the file was restored (`cmp` identical):<br>- the built worker without its `/api/` exclusion: the routing test failed at "GET /api/chat", and the `VERSION` test failed too;<br>- `icon-512.png` copied over the maskable icon: the safe-zone test;<br>- `hidden` removed from one install button on `/about/`: the hidden-controls test;<br>- `/ar/` removed from the precache list: 3 checks in `app.mjs`, including the Arabic home page offline;<br>- the worker without the 404 handling: the withdrawn-page check in `app.mjs` |
| `E2E_REQUIRED=1 npm run test:e2e` | 217 checks, all pass, no JavaScript errors: `keyboard.mjs` 37, `motion.mjs` 41, `chat.mjs` 39, and the new `app.mjs` 100. The first three now run with the service worker controlling their pages. `app.mjs` checks:<br>- **Chrome's view:** for `/` and `/ar/publications/`, `Page.getAppManifest` reports no errors and `Page.getInstallabilityErrors` returns none. Chrome's parsed app ids are `/` and `/ar/`. (`Page.getAppId` returns nothing in Chrome 153, so it is not used.)<br>- **The worker:** it activates with navigation preload on and controls the page; the first visit's page is saved too.<br>- **Offline, with the server stopped:**<br>&nbsp;&nbsp;– a saved page opens styled;<br>&nbsp;&nbsp;– both home pages open although they were never visited;<br>&nbsp;&nbsp;– the offline page appears in each language, listing only that language's saved pages, and follows the dark theme;<br>&nbsp;&nbsp;– `/api/chat` fails instead of being answered from a cache.<br>- **Online again:** the network wins again, and a page answered 404 loses its saved copy.<br>- **The install button:**<br>&nbsp;&nbsp;– Chromium's prompt via a simulated `beforeinstallprompt`, in the footer and the phone menu;<br>&nbsp;&nbsp;– the steps dialog for iPhone (English, Arabic, 320 px), iPad, Mac Safari and Firefox for Android, each with focus in and out, Escape, the Close button and the backdrop;<br>&nbsp;&nbsp;– no button inside the installed app or without JavaScript |
| First CI run (GitHub Actions, Google Chrome 156) | **Failed: 5 checks in `app.mjs`; every other step passed.**<br>- **Cause:** unlike the sandbox's Chromium 153, headless Chrome 156 sends a real `beforeinstallprompt` for the site, which shows it considers the site installable. The site rightly prefers the browser's real prompt to the user-agent guess. So on the first page emulating an iPhone, the button opened Chrome's prompt instead of the steps dialog (4 checks). The "no button yet" check also failed, because the real event had already arrived.<br>- **Fix:** test pages now hold real events back (a capture listener stops `isTrusted` events before the site's handler). One probe lets them through and checks that the button appears.<br>- **Proof of the fix:** a real event could not be produced in the sandbox; `Page.requestAppBanner` no longer exists, and `--bypass-app-banner-engagement-checks` did not help. The hold-back was checked instead with the same listener applied to a synthetic event: the site's handler did not run and the button stayed hidden, while the control showed it. |
| Second CI run (`2ce11bf`) | **The 5 failures were gone.** The probe reported, as a CI notice, that Chrome 156 sent a real `beforeinstallprompt` for the site and that the install button appeared.<br>**One new failure, a race in the test:** "with the menu closed, focus goes to the menu button".<br>- When a dialog closes, the browser restores focus synchronously. That failed here, because the button that opened the dialog sits in the phone menu, which had already closed, so focus stayed on the dialog's own Close button.<br>- The `close` event, whose handler moves focus to the menu button, is queued as a separate task, as the HTML specification requires.<br>- Checked in the sandbox: focus is on the dialog's Close button immediately after `close()`, and on the menu button one task later.<br>- The check now waits for focus to arrive, and so do the two other focus-after-close checks. The site is unchanged.<br>The CI result of this fix is reported in pull request #9 |
| axe-core 4.14.0 | 0 violations:<br>- the 24 page runs and 8 assistant runs of the previous run;<br>- 30 runs of states the page audit cannot see, because they stay hidden until JavaScript shows them:<br>&nbsp;&nbsp;– the footer install button, shown and hovered (`/`, `/ar/`, `/publications/`, `/ar/lab/` × light/dark);<br>&nbsp;&nbsp;– the phone menu with the button, and the steps dialog (iPhone, `/` and `/ar/` × light/dark);<br>&nbsp;&nbsp;– the Arabic dialog at 320 px;<br>&nbsp;&nbsp;– the offline page (English and Arabic × light/dark; the dark runs confirmed by the computed body colour) |
| Overflow | 0 px at 320 and 375 px in the 24 page × width runs. The open dialog fits at 320, 390, 820 and 1280 px |
| Footer button contrast | 14.83:1 in light and 14.9:1 in dark; hovered, 15.37:1 and 15.3:1 |
| Lighthouse 12.8.2 | Table below |
| Visual review | The six screenshots in [`screenshots/installable-app/`](screenshots/installable-app/README.md) were reviewed by eye. The review caught a mistake in the audit script, not the site: its first offline runs labelled "dark" were rendered light, because a helper pinned the light theme on every new document. The script was fixed and re-run; the dark offline page passes axe (above) |

Lighthouse 12.8.2, simulated mobile, against a local static server with Brotli and Vercel-like caching. Storage is reset before each run, so every run is a first visit, including the new script. "Before" is `70f1b36`, this branch before the installable app.

| Page | Performance before → after | LCP before → after | CLS before → after |
| --- | --- | --- | --- |
| `/` | 89 → 89 | 3.2 s → 3.2 s | 0.018 → 0.018 |
| `/ar/` | 75 → 75 | 4.5 s → 4.5 s | 0.046 → 0.046 |
| `/publications/` | 92 → 92 | 2.9 s → 2.9 s | 0 → 0 |
| `/talks/` | 93 → 89 (3 runs); 91 → 93 (7 runs) | 2.7 s → 3.2 s; 2.9 s → 2.7 s | 0.017 → 0.017 |

- **`/talks/`:** the 3-run median dropped 4 points, but the baseline itself ranged from 87 to 93. Seven alternating runs per build gave 91 before and 93 after, so the drop was noise.
- **TBT, accessibility, SEO, Best Practices:** total blocking time is 0 ms everywhere, and accessibility and SEO score 100 in both builds. Best Practices is unchanged (96, 96, 96, 100).
- **The page cost:** the script that registers the worker and drives the button is inlined into every page: 1,889 bytes, 937 gzipped. The worker itself is fetched after `load`.
- **The last worker change** (removing saved copies of 404 pages) came after these measurements and affects only that case.
- **No PWA category:** Lighthouse 12 removed it, so installability was checked through Chrome's protocol instead (above).

**Not run:**
- real devices: iPhone, iPad, Mac, Android;
- a real installation (headless Chrome cannot install an app);
- screen readers.

## Run for the floating install button (2026-11-07)

The owner asked for one button opposite the assistant that installs in one press, instead of the written steps: «مش عاوز دا انا عاوز يبقا زرار قصاد الشات بوت عاليمين ادوس عليه يتثبت علطول». Same environment as the run above: the sandbox's Node 22 and Chromium 153, on the built site.

| Check | Result |
| --- | --- |
| `npm run build` | 67 pages. `sw.js` VERSION `b2e15a510940`, 16 files precached; the same VERSION after a rebuild |
| `npm test` | 92 tests, all pass. The install test now requires exactly one hidden button per page and no dialog, menu or footer copies |
| `npm run qa`, `npm run lab:verify` | Both pass. The assistant's knowledge file is byte-identical after `npm run chat:knowledge` |
| `E2E_REQUIRED=1 npm run test:e2e` | 175 checks, all pass, no JavaScript errors: `keyboard.mjs` 37, `motion.mjs` 41, `chat.mjs` 39, `app.mjs` 58. The steps-dialog and menu cases are gone. Measured:<br>- English, 1280 px: the button at 16–174 px and the assistant at 1081–1264 px, both 16 px from the bottom.<br>- Arabic, 390 px: a 48 px round button at 326–374 px of 390, opposite the assistant.<br>- 320 px: both fit, overflow 0.<br>- At the end of a page, the footer text ends at 544 px and the button starts at 576 px. |
| The other suites with the button showing | CI's Chrome 156 sends a real `beforeinstallprompt`, so there the button shows on every page. Keyboard, motion and chat were run against a build with the button visible on all 67 pages: 37, 41 and 39 checks, all pass. After a rebuild, the button is `hidden` on all 67 pages again |
| axe-core 4.14.0 | 30 runs, 0 violations: the button shown and hovered on 4 pages in both themes, 390 px with and without the assistant's panel open, 320 px Arabic, and the offline page |
| Contrast | Light 9.01:1, hovered 13.93:1. Dark 10.69:1, hovered 14.59:1 |
| Phone layout | With the assistant's panel open, the panel ends 8 px above the install button, in both languages and themes |
| Screenshots | 3 new ones in [`screenshots/installable-app/`](screenshots/installable-app/), all viewed. The 4 of the steps dialog, menu and footer were removed |
| Not tested | Real devices, a real install, the Safari and Firefox engines (only their user agents), screen readers |

## Manual matrix (before a release)

Mark each cell after checking it in a real browser.

| Width | EN light | EN dark | AR light | AR dark |
| --- | --- | --- | --- | --- |
| 360 (small phone) | ☐ | ☐ | ☐ | ☐ |
| 390 (phone) | ☐ | ☐ | ☐ | ☐ |
| 768–1024 (tablet) | ☐ | ☐ | ☐ | ☐ |
| ≥1280 (desktop) | ☐ | ☐ | ☐ | ☐ |

Per cell:

1. **Home:** the hero figure draws once on load and then responds to the pointer and the arrow keys (the readout is exact at every step), identity tabs switch, the metric cards show the source and date, and nothing else animates by itself.
2. **Search:** Ctrl/⌘ K and `/` open it, Escape closes it and focus returns. Try `ridge`, `الحرف`, `Abonazel ٢٠٢٣` and `ridge انحدار`.
3. **Publications:**
   - filter by type and by a year bar; set a co-author and an area;
   - reload, and the state survives; copy the URL into a new tab, and it reproduces;
   - check the cards and compact views, and copy a citation.
4. **Research:** Tab into the graph, use the arrow keys and Enter, and check the panel evidence. Escape clears the selection. Switch to the list view. In Arabic, areas are on the right.
5. **About:** expand all journey years; undated items are listed separately.
6. **Lab:**
   - presets and the slider work, and the URL updates;
   - the data table matches the chart;
   - the methods panel opens;
   - the "not the published COM-Poisson method" statement is visible.
7. **Contact:** each path prefills the subject, and a short message is refused. The mailto opens a draft and nothing claims to be "sent".
8. **Arabic only:** draft labels are visible; DOIs, URLs and identifiers read left to right; ticks read −3 … 3; the footer shows «حالة الترجمة».
9. **Reduced motion** (OS setting): there are no transitions or entrances, and every element is visible on first paint; the hero, graph, explorer and lab still update to the same exact values.
10. **Keyboard only:** every control is reachable, and the focus ring is visible on both themes.
11. **Site assistant:**
    - the launcher sits in the bottom corner (left in Arabic) and opens the panel below the header;
    - Escape closes it, and focus returns to the launcher.
    - Once `GEMINI_API_KEY` is set, ask three questions: one about the site (the answer cites a page), one general statistics question (it starts "General explanation (not from the site):"), and "Did Ibrahim present the 2018 paper?" (the answer must not say he did).
