# QA checklist

## Automated (CI: `.github/workflows/site-ci.yml`)

Runs on every pull request and every push to `main` that touches `site/`:

| Step | Command | Checks |
| --- | --- | --- |
| Build | `npm run build` | Content schemas; every manifest relationship resolves and quoted evidence is found; 67 HTML files |
| QA | `npm run qa` | One h1 per page, internal links, language switch, approved mailto/tel only, forbidden files (raw .bib, manifest, profile JSON) and client-side model code absent, lab payload, colour contrast of token pairs, sitemap (66 URLs) |
| Lab | `npm run lab:verify` | Recomputes all 15 states × 100 replicates from the seed, checks convergence, and checks every number quoted in EN/AR text (see [lab-methodology.md](lab-methodology.md)) |
| Unit and build tests | `npm test` | `node:test` suites in `site/tests/`: routes, `lang`/`dir`, headings, canonical/hreflang/robots/sitemap, JSON-LD, citation meta, search (Arabic, author, mixed, DOI), explorer state/filters/sorts/facets, manifest integrity, consent record, translation status, lab payload, normal-curve maths, motion tokens, gating and loops (`motion.test.mjs`) |
| Browser tests | `npm run test:e2e` | Headless Chrome. `keyboard.mjs`: search keyboard flow and focus return, explorer URL state, section navigation after a jump, graph roving focus, focus preview and RTL columns, hero slider, identity tabs, journey, contact `?path=`, Arabic separators outside LTR isolates. `motion.mjs`: first-frame opacity of above-the-fold text, hero glide, reveal-once, page transitions, explorer clickable while moving, lab values exact, graph entry and selection, journey; then the same pages under reduced motion and without JavaScript. No JS errors in either suite |

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
