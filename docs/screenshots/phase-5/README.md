# Phase 5 screenshots: motion review

All images come from the built site (`site/dist`) in headless Chromium 153, served locally.

- **Motion strips:** captured with the animation timeline frozen through the Chrome DevTools Protocol (`Animation.setPlaybackRate(0)`) and then seeked, so each frame is a real, deterministic moment of the animation, not a mock-up.
- **Static shots:** taken after all animations finished.
- **Viewport:** desktop shots use a 1280 px viewport (element crops are narrower), mobile shots 390 px. Strips are 1400 px wide.

The system is documented in [`../../motion-system.md`](../../motion-system.md), and the test and audit results are in [`../../qa-checklist.md`](../../qa-checklist.md#run-during-phase-5-2026-11-06).

## Motion strips

| File | What it shows |
| --- | --- |
| `motion-01-hero-entry.jpg` | Hero figure on load: axis and ticks, the curve drawn, the area accumulating from the left tail up to z, the marker settling. The readout is exact in every frame |
| `motion-02-graph-entry.jpg` | Knowledge graph entry: columns appear in turn and edges are drawn from their source; dashed method links fade in |
| `motion-03-graph-selection.jpg` | Selecting a node: its edges are redrawn outward from it, the others recede, and the evidence panel settles |
| `motion-04-explorer-filter.jpg` | Publication filter change (keyed FLIP): remaining results glide to their new place and new ones rise in. That the list stays clickable meanwhile is checked by `tests/e2e/motion.mjs` |
| `motion-05-lab-transition.jpg` | Lab, preset ρ = 0 → ρ = .995: the chart geometry moves between two precomputed states while the readouts already show the selected state's exact values |
| `motion-06-journey-reveal.jpg` | Journey: the timeline line draws from the top and the years rise in sequence |

## Static shots

| File | What it shows |
| --- | --- |
| `home-en-desktop-light.jpg` | Home, final state after the entrance |
| `reduced-motion-first-frame-home-en.jpg` | The same page under `prefers-reduced-motion`, first frame. It is byte-identical to the previous image: with reduced motion the final state is the first frame |
| `home-ar-mobile-dark.jpg` | Arabic home at 390 px, dark: the figure's axes are not mirrored, and Φ(z) reads left to right |
| `research-graph-focus-en-desktop-light.jpg` | Keyboard focus on "Ridge estimation" lights its four publication links, as hover does; the panel invites a selection |
| `research-graph-ar-desktop-dark.jpg` | Arabic map, dark: areas on the right, the evidence panel on the left |
| `research-list-en-mobile-light.jpg` | List view, the default below 48 rem and the no-JS content |
| `publications-ar-mobile-light.jpg` | Arabic explorer controls at 390 px, with the full-year histogram |
| `about-journey-ar-desktop-light.jpg` | Arabic journey: the year being read (2019) highlighted, the period «التعليم · 2012–2015» with its separator in place, and undated items in their own group |
| `lab-en-desktop-dark.jpg` | Lab at the default ρ = .9, dark; the "On this page" bar marks "Experiment" while the figures are on screen |
| `no-js-publications-en.jpg` | JavaScript disabled: every publication is listed, and a note says the filters need JavaScript |
| `a11y-histogram-full-years-ar-320-dark.jpg` | Year bars labelled with full years at 320 px, Arabic, dark (axe label-in-name fix) |
| `a11y-footer-cta-light-en.jpg` | Footer CTA in light mode, previously dark on dark |
| `a11y-footer-dark-en.jpg` | Dark-mode footer with the inverted-ink tokens (it was 1.04:1 before) |

## Motion review checklist

Use it with the strips above, then in a real browser on EN and AR, in light and dark, on desktop and on a phone.

- [ ] **Purpose:** every animation shows how something is built (curve, area, edges, timeline) or what changed (results, lab state). Nothing is decorative.
- [ ] **Once:** after the entrances finish, nothing moves while the page is left alone (`document.getAnimations().length === 0`). There are no loops, autoplay, parallax or cursor effects.
- [ ] **Reading first:** headings, the hero name and the lead are readable on the first frame; they move a few pixels but never fade in.
- [ ] **Exact numbers:** the hero readout, the lab readouts and tables, and the result count always show true values. They never count up through numbers that were not computed.
- [ ] **Usable while moving:** filters, graph nodes and links respond during an animation, and navigation is never delayed.
- [ ] **Calm previews:** hover and keyboard focus in the graph light links instantly. Only a selection animates.
- [ ] **Reduced motion:** no entrances or transitions, everything visible at once, and the same values and state.
- [ ] **No JavaScript:** all content is visible, and no element waits for a reveal.
- [ ] **EN/AR parity:** the same motion in both languages. Layouts mirror, the graph redraws outward from the node on either side, and mathematical axes never mirror. Separators sit in the reading direction.
- [ ] **Timing:** drawing takes at most 900 ms, UI changes at most 240 ms, and stagger is capped at 8 steps. A page transition (220 ms) happens within a language only.
- [ ] **Mobile:** smooth on a mid-range phone, with no horizontal overflow at 320 px and no hover-lift stuck after a tap.
