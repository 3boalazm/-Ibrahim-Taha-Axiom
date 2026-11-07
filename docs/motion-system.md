# Motion system (Phase 5)

**Direction: quiet mathematical motion.** Motion appears where something is being drawn, measured or related: a density curve, an accumulating probability, an evidence edge, a timeline, a set of results. It also appears when the reader changes something. It never decorates, never loops, and never stands between a reader and the text. English and Arabic pages share one system. Nothing in it is language-specific except the direction-aware geometry noted below.

There are no animation dependencies. The system uses CSS, the Web Animations API, `IntersectionObserver`, cross-document View Transitions and SVG strokes, in about 320 lines of JS (`site/src/lib/motion.mjs`) and 240 lines of CSS (`site/src/styles/motion.css`).

## Principles

1. **Purpose.** Every animation answers "how is this built?" (the curve is drawn, then the area under it fills) or "what changed?" (results move to their new place). There is nothing else.
2. **Once.**
   - Entrances play once per page view; the brand mark draws once per browser session.
   - Nothing loops and nothing autoplays.
   - No continuous animation runs on graph nodes, backgrounds or the cursor.
3. **Exact.**
   - Numbers never count up or interpolate. A changed value is replaced by its new exact value.
   - The hero readout is the only per-frame number, and every frame shows Φ(z) (computed by `normal.mjs`) for the z drawn on screen.
   - The lab never draws a curve that was not computed: lines whose shape changes cross-fade between two precomputed states.
4. **Reading first.**
   - Text above the fold is never faded in, only moved a few pixels (see [Above the fold](#above-the-fold)).
   - Nothing delays navigation, and interactive UI stays clickable while it moves.
5. **Enhancement only.**
   - No content or state depends on an animation finishing.
   - Without JavaScript, or with reduced motion, every element is visible in its final state from the first frame.
6. **Cheap.**
   - Animations use transform, opacity, `stroke-dashoffset` and `clip-path`; the [disclosure](#patterns) height is the one exception.
   - Layout is read once, then animations start. No scroll listener drives an animation, and nothing runs `requestAnimationFrame` when nothing is moving.

## Layers

| Layer | File | Role |
| --- | --- | --- |
| Tokens | `site/src/styles/tokens.css` (motion block) | Durations, easings, stagger, distances, feedback. All collapse to 0 under `prefers-reduced-motion` |
| Patterns | `site/src/styles/motion.css` | Keyframes, reveal / stagger / settle, chart-reveal, hover-lift, press, focus ring, disclosure, page transition |
| Helpers | `site/src/lib/motion.mjs` | Gating, `tween`, `swapText`, `drawStrokes`, keyed `flip`, `initReveals`. The pure functions are unit-tested in node |
| Gate | Inline head script in `site/src/layouts/BaseLayout.astro` | `html[data-js]`; `html[data-motion]` only with JS **and** no reduced-motion preference; watchdog |

### Gating: why nothing can stay hidden

- **Scoping:** every rule that starts an element hidden or displaced is scoped to `html[data-motion]`. The head script sets that attribute only when `prefers-reduced-motion: no-preference` matches. Without JS the attribute never exists.
- **Watchdog:** if the motion module has not booted 2.5 s after `load` (a script error or a blocked module), the head script removes `data-motion`, and everything shows.
- **Late reduced motion:** if the reader turns on reduced motion while a page is open, `initMotion()` removes `data-motion` and reveals every pending block.
- **Hidden states set by their own script:** when a component needs a hidden starting state (the graph map waiting below the fold, the journey before it scrolls in), the script that will clear that state is also the script that sets it, and only when the element is still off screen.
- **Final state first:** JS helpers check `motionAllowed()`. When motion is off they apply the final state directly. `tween()` always ends on `onFrame(1)`, and `flip()` always runs the DOM update.

### Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--motion-instant` | 90 ms | Press feedback, toggles |
| `--motion-fast` | 160 ms | Hover, focus ring, small state changes |
| `--motion-base` | 240 ms | Filters, results, panels, the hero marker (upper bound), disclosure |
| `--motion-slow` | 420 ms | Entrances: reveal-once, stagger groups, settles |
| `--motion-draw` | 900 ms | Line-draw: curves, axes, graph edges, the timeline line |
| `--motion-page` | 220 ms | Cross-document page transition |
| `--ease-standard` | `cubic-bezier(.2, 0, 0, 1)` | State changes |
| `--ease-emphasized` | `cubic-bezier(.16, 1, .3, 1)` | Entrances: fast start, long settle |
| `--ease-exit` | `cubic-bezier(.3, 0, .8, .15)` | Leaving |
| `--ease-draw` | `cubic-bezier(.65, 0, .35, 1)` | Ink: even start and finish |
| `--stagger-step` / `--stagger-cap` | 45 ms / 8 | Delay between siblings. The 9th and later siblings share the 8th delay, so long lists never wait |
| `--rise-sm` / `--rise-md` | 6 px / 14 px | Entrance distance: small items / section blocks |
| `--lift` / `--press-scale` | −2 px / 0.97 | Hover-lift / button press |

The JS easings (`EASE` in `motion.mjs`) are the same control points as the CSS tokens. A unit test keeps the two in sync.

## Patterns

| Pattern | Mechanism | Where |
| --- | --- | --- |
| reveal-once | `[data-reveal]` gets `.is-revealed` the first time it enters view (`IntersectionObserver`, once) | Home sections after the hero: community, identity panel, research discovery, lab teaser |
| stagger-group | `[data-stagger]`: children get `--i` (capped at 8); delay = `--i × 45 ms` | Home: research area tiles, selected works, community links |
| settle-group | `[data-settle]`: CSS only, transform only. Readable from the first frame with or without JS | Section pages' main lists (`SectionRoute`, `EntryList`) |
| page-title settle | `.reveal`: transform only, so the heading is readable from the first frame | Page headers (`PageHeader`), the empty state |
| line-draw | `motion-draw` keyframes on `pathLength="1"` strokes. For strokes that use dash patterns or non-scaling strokes, `drawStrokes()` animates measured on-screen lengths | Hero axis, ticks and curve; journey line; brand mark; graph edges (`drawStrokes`) |
| chart-reveal | `.chart-wipe`: a data line revealed along x with `clip-path`, which keeps dash patterns intact. `motion-grow-y`: bars grow from their baseline to their own data height | Lab teaser chart; publication year histogram |
| hover-lift | −2 px and a shadow (`--lift`, `--shadow-lift`), only under `(hover: hover) and (pointer: fine)`, so touch never gets a stuck lifted card. The `.hover-lift` utility, or the same tokens inside a component | Publication cards view (keyboard focus inside a card gets the same emphasis); section cards |
| press feedback | `:active` scale 0.97 over 90 ms | Buttons, chips, segmented controls, header CTA, search trigger |
| focus-highlight | The `:focus-visible` ring closes in once over 160 ms. In the graph, keyboard focus lights a node's links exactly as hover does | Every control; graph nodes |
| number-transition | `swapText()`: the new exact value replaces the old one with a short slide-in. The text changes once, so it is safe on `aria-live` | Publication result count |
| keyed FLIP | `flip(root, update, { key })`: survivors glide from their old box to their new one, newcomers rise or fade in, removed items leave at once. Items marked `data-ghost` (lines whose shape changes) cross-fade instead of morphing | Publication results; lab charts |
| disclosure | `::details-content` block-size transition (`interpolate-size`) where supported (Chromium 131+), otherwise the native instant toggle. This is the one layout-property transition: 240 ms, user-initiated only. `.motion-static` opts a `<details>` out | Publication details, journey years, lab methods |
| page-transition | Cross-document `@view-transition`: a 220 ms cross-fade. The header and the current navigation pill keep their identity, so the pill glides to the new item. Skipped between English and Arabic (a mirrored layout should not morph). The opt-in, with its reduced-motion opt-out, is an inline `<style>` at the top of `<head>` (`BaseLayout.astro`), not in `motion.css`: Chromium checks a new page's opt-in early, so a rule that arrived with a slow stylesheet skipped the transition | Every same-language navigation |
| brand mark | Ring and axis draw, then the curve rises from its axis. Once per browser session (`sessionStorage`), never under reduced motion | Header mark |

## Surfaces

### Home hero: the standard normal figure

- **On load, drawn once:**
  1. Axis at 0 ms; ticks from 120 ms, 45 ms apart.
  2. Curve from 200 ms, drawn over 900 ms.
  3. The area under the curve accumulates from the left tail up to z from 650 ms. It is the same probability area, revealed along x, never reshaped.
  4. The z marker settles at 1250 ms.
- **Readout:** "z = 1.96 · Φ(z) = 0.975" is exact from the first frame.
- **Interaction (pointer, touch, arrow keys):**
  - The slider's ARIA value jumps straight to the target.
  - The drawing glides there with `tween()`, in 90–240 ms depending on distance (`travelDuration`). Each frame recomputes the density, area and readout for the z on screen with `normal.mjs`.
- **Static fallback:** the server-rendered SVG, complete at z = 1.96.
- **No autoplay** and no moving background.

### Knowledge graph (`/research/`)

- **Entry, once:** when the map first scrolls into view, nodes appear column by column (140 ms per column) and edges are drawn from their source column. Dashed method links fade in rather than draw, which keeps their dash pattern.
  - A map already on screen at load draws immediately.
  - A deep link (`?focus=`) shows the map at once, with no entrance.
- **Hover and keyboard focus:** a node's related edges are lit at once (`light()`), and the others recede to a lower opacity. Nothing animates during a preview, so moving across nodes stays calm.
- **Selection:** the selected node's edges are redrawn outward from that node. The near end is found geometrically, so the mirrored Arabic map works too. The node gets one focus-ring pulse, and the evidence panel settles.
- **Kept as they were:** the evidence panel, roving-tabindex keyboard navigation, RTL columns, and the list view (the default on narrow screens and the no-JS content).
- **Never:** continuous node motion, physics or idle animation.

### Journey (`/about/`)

- **Entry:** when the timeline first enters view, its line is drawn from the top (`scaleY`), and the year rows rise in sequence (capped at 8 steps).
- **Current year:** while reading, the dated year crossing the middle of the viewport is marked `.is-current`. This is visual orientation only, with no ARIA.
- **Expand and collapse:** year groups animate with the disclosure pattern.
- **Data:** the data model and chronology are unchanged. Undated items stay in their own group, which is never highlighted. No date is invented for an animation.

### Publications (`/publications/`, `/books/`)

- **Discrete changes:** type, year bar, selects, sort, view, chips and clear run a keyed FLIP. Results that stay glide to their new place, and new ones rise in.
  - State, URL (`replaceState`) and DOM update synchronously either way.
  - Typing in the search box re-filters without motion, because it changes too often.
- **Feedback:** the result count changes once to its exact value, and the active year bar and chips show immediately.
- **Details:** expanding a publication's details uses the disclosure pattern, so the layout does not jump.
- **Without JS:** the full list is server-rendered. A same-document View Transition was tried and rejected: in Chromium it routes all hit-testing to `<html>` while it runs, which swallows clicks.

### Shrinkage lab (`/lab/`)

- **Moving between states:** changing ρ (slider or preset) moves the chart geometry from the previous precomputed state to the selected one with a keyed FLIP. Lines whose shape changes cross-fade, so no intermediate curve is drawn.
- **Readouts and tables:** max VIF, λ, the spreads, the ratio and the data tables are replaced with the exact values of the selected state immediately (verified on the next frame). They are never interpolated.
- **Unchanged:** the 100-replicate methodology, the fixed seed and precomputed payload, the "illustrative controlled experiment" label and the "not the published COM-Poisson method" disclosure. There is no live simulation.
- **Reduced motion:** the update is instant, with the same values.

### Global

- **Page transitions:** 220 ms cross-fade, same language only.
- **Section choreography:** reveal-once and stagger below the fold, settle near the top.
- **Brand mark:** draws once per session.
- **Feedback:** press feedback on buttons, the focus-ring close-in, and the navigation pill glide.
- **Section navigation:** the current item is the last section whose anchor has passed the reading line (45 % of the viewport). It is computed once per frame while scrolling and stays correct after jumps and across long sections.

### Deliberately static

Prose, citations, tables, metric cards, the CV, the footer, search results and all form controls beyond press and focus feedback stay static. Hover previews in the graph are instant.

## Above the fold

The largest contentful paint on the home page is the hero lead (EN) or the name (AR). An element only counts as painted once its opacity is above 0, so text above the fold settles with **transform only** (`motion-settle`). It never fades in.

During Phase 5 a fade slipped through. Astro adds a scope attribute to every compound selector, so `.hhero__copy > *` (specificity 0,4,1) outranked the transform-only override (0,3,1). Its `animation` shorthand also reset the override's `animation-name`. As a result the name and lead faded in, and the measured LCP moved by about 0.6 s on `/`. The fix, now in place, puts the transform-only animation on the base rule. Two checks guard it:

- an e2e check that freezes the animation timeline at 0 through the Chrome DevTools Protocol and asserts that the hero name and lead, and the page-header `h1` on section pages, are opaque on the first frame;
- a unit test that checks the computed cascade, not only the keyframes.

## Rules for adding motion

- **Use the tokens and patterns above.** Never hard-code a duration or easing, and keep `@keyframes` names unique.
- **Gate hidden starting states with `html[data-motion]`.** Set them from the script that clears them, and only for elements still off screen.
- **Use fill-mode `backwards`** so an element's own styles (hover, focus) apply once an animation ends.
- **Measure, then animate.** Read all lengths and boxes first, then start the animations.
- **Strokes:**
  - `pathLength` breaks dash patterns and non-scaling strokes, so use `drawStrokes()` (measured lengths) or `.chart-wipe` there.
  - A single-keyframe WAAPI animation needs `offset: 0`.
- **Never use a same-document View Transition for interactive UI.** Use `flip()`.
- **Put each `::view-transition-*()` selector in its own rule.** One unsupported selector invalidates a whole selector list.
- **Never animate a number through values it never had.** Use `swapText()`.
- **Never fade text above the fold.** Check the computed style in a browser, not just the CSS source.
- **No loops, autoplay, parallax, cursor effects, scroll hijacking, video or 3D.**

## Testing

| Suite | What it checks |
| --- | --- |
| `site/tests/motion.test.mjs` (8 tests) | Bézier timing matches CSS; JS easings equal the CSS tokens; stagger, travel and duration helpers; every motion token is 0 under reduced motion; no infinite animation in the shipped CSS; content is hidden only behind the motion gate; the head-script gate and watchdog; transform-only keyframes on the hero copy (computed cascade) |
| `site/tests/e2e/motion.mjs` (41 checks) | First-frame opacity of the above-the-fold text (timeline frozen through CDP); the hero glides and ends exact; reveal-once reaches its end state; page transitions run within a language and skip across languages; the explorer stays clickable while results move, with exact state and URL; lab readouts and tables are exact on the next frame; the graph draws on entry and redraws on selection, with nothing looping; the journey line, years and current year. Under **reduced motion** and with **JavaScript disabled**, nothing is hidden and there are no JS errors |
| `site/tests/e2e/keyboard.mjs` (37 checks) | Includes graph focus lighting links, section navigation after a jump, and separators kept outside LTR isolates on Arabic pages |

To capture motion frames deterministically, call `Animation.enable` and `Animation.setPlaybackRate({ playbackRate: 0 })` through CDP before navigating, then seek. This freezes both CSS and WAAPI animations. The review strips in [`screenshots/phase-5/`](screenshots/phase-5/README.md) were made this way.
