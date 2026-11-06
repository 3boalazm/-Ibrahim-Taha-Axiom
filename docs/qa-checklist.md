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

These were run in the development sandbox with headless Chromium 153:

- `npm run build`, `npm run qa`, `npm run lab:verify`, `npm test` and `npm run test:e2e` all pass. Exact counts are in the pull request.
- **Overflow sweep:** no horizontal overflow at 360, 390, 768, 1024, 1280 and 1440 px, in EN and AR, across 12 page types. The header was also swept at 961–1920 px.
- **Visual review of screenshots** (`docs/screenshots/phase-4/`): home, research, publications, lab and contact, at 390 and 1280 px, EN/AR, light and dark.

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
