# QA checklist

## Automated (CI: `.github/workflows/site-ci.yml`)

Runs on every pull request and every push to `main` that touches `site/`:

| Step | Command | Checks |
| --- | --- | --- |
| Build | `npm run build` | Content schemas; every manifest relationship resolves and quoted evidence is found; 67 HTML files |
| QA | `npm run qa` | One h1 per page, internal links, language switch, approved mailto/tel only, forbidden files (raw .bib, manifest, profile JSON) and client-side model code absent, lab payload, colour contrast of token pairs, sitemap (66 URLs) |
| Lab | `npm run lab:verify` | Recomputes all 15 states × 100 replicates from the seed, checks convergence, and checks every number quoted in EN/AR text (see [lab-methodology.md](lab-methodology.md)) |
| Unit and build tests | `npm test` | `node:test` suites in `site/tests/`: routes, `lang`/`dir`, headings, canonical/hreflang/robots/sitemap, JSON-LD, citation meta, search (Arabic, author, mixed, DOI), explorer state/filters/sorts/facets, manifest integrity, consent record, translation status, lab payload, normal-curve maths |
| Browser tests | `npm run test:e2e` | Headless Chrome: search keyboard flow and focus return, explorer URL state, graph roving focus and RTL columns, hero slider, identity tabs, journey, contact `?path=`, no JS errors |

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

CI runs Node 26 (`engines`). The first CI run is the first execution on Node 26.

**Not run:** axe or another automated accessibility engine, Lighthouse, real-device testing, VoiceOver/NVDA/TalkBack, and visual-regression diffing. Do not cite them as done.

## Manual matrix (before a release)

Mark each cell after checking it in a real browser.

| Width | EN light | EN dark | AR light | AR dark |
| --- | --- | --- | --- | --- |
| 360 (small phone) | ☐ | ☐ | ☐ | ☐ |
| 390 (phone) | ☐ | ☐ | ☐ | ☐ |
| 768–1024 (tablet) | ☐ | ☐ | ☐ | ☐ |
| ≥1280 (desktop) | ☐ | ☐ | ☐ | ☐ |

Per cell:

1. **Home:** the hero figure responds to the pointer and the arrow keys, identity tabs switch, the metric cards show the source and date, and nothing animates by itself.
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
9. **Reduced motion** (OS setting): there are no transitions.
10. **Keyboard only:** every control is reachable, and the focus ring is visible on both themes.
