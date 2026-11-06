/**
 * Motion helpers shared by every script on the site (docs/motion-system.md).
 *
 * Rules the helpers enforce:
 * - Motion is an enhancement. Every helper performs the final state change even
 *   when motion is off (reduced motion, no `data-motion`, unsupported API), so no
 *   content or state ever depends on an animation finishing.
 * - Numbers are never invented or interpolated: swapText replaces a value with
 *   the new exact value (the hero readout is the only per-frame number, and each
 *   frame is exact for the z on screen).
 * - One-shot only: nothing here loops.
 *
 * The pure functions at the top have no DOM access and are tested in node
 * (tests/motion.test.mjs).
 */

// ------------------------------------------------------------------ pure

/** Control points shared with the CSS easing tokens in tokens.css. */
export const EASE = {
  standard: [0.2, 0, 0, 1],
  emphasized: [0.16, 1, 0.3, 1],
  exit: [0.3, 0, 0.8, 0.15],
  draw: [0.65, 0, 0.35, 1],
};

/** CSS-equivalent cubic-bezier timing function: returns t ↦ progress. */
export function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i += 1) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-6) return sy(t);
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    // bisection fallback
    let lo = 0;
    let hi = 1;
    t = x;
    for (let i = 0; i < 30; i += 1) {
      const v = sx(t);
      if (Math.abs(v - x) < 1e-6) break;
      if (v < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

export const lerp = (a, b, t) => a + (b - a) * t;
export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Delay for the index-th sibling of a stagger group, capped so long lists never wait. */
export function staggerDelay(index, step = 45, cap = 8) {
  return Math.min(Math.max(0, index), cap) * step;
}

/**
 * Duration for moving a marker by `distance` (in its own units): short hops feel
 * immediate, long jumps get a little more time, never more than `max`.
 */
export function travelDuration(distance, { min = 90, max = 240, full = 2 } = {}) {
  return Math.round(lerp(min, max, clamp(Math.abs(distance) / full, 0, 1)));
}

/** "240ms" | "0.24s" | "" → milliseconds. */
export function parseDuration(value) {
  const v = String(value ?? '').trim();
  if (!v) return 0;
  const n = parseFloat(v);
  if (!Number.isFinite(n)) return 0;
  return v.endsWith('ms') ? n : v.endsWith('s') ? n * 1000 : n;
}

/** Length of a polyline given as [[x, y], …] (used for screen-space line-draw). */
export function polylineLength(points) {
  let L = 0;
  for (let i = 1; i < points.length; i += 1) L += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  return L;
}

// ------------------------------------------------------------------ DOM

const hasDom = typeof window !== 'undefined' && typeof document !== 'undefined';
const reducedQuery = hasDom && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/** True when motion is allowed: JS ran the head script, and the reader did not ask for reduced motion. */
export function motionAllowed() {
  return hasDom && !(reducedQuery && reducedQuery.matches) && document.documentElement.hasAttribute('data-motion');
}

/** A motion token from tokens.css in milliseconds (0 under reduced motion). */
export function token(name) {
  if (!hasDom) return 0;
  return parseDuration(getComputedStyle(document.documentElement).getPropertyValue(name));
}

export const css = (ease) => `cubic-bezier(${ease.join(', ')})`;

/**
 * requestAnimationFrame tween. Calls onFrame(easedProgress) every frame and
 * always ends with onFrame(1). Returns a cancel function. Instant when motion is off.
 */
export function tween({ duration, easing = EASE.standard, onFrame, onDone }) {
  if (!motionAllowed() || !(duration > 0)) {
    onFrame(1);
    onDone?.();
    return () => {};
  }
  const ease = cubicBezier(...easing);
  const t0 = performance.now();
  let raf = requestAnimationFrame(function step(now) {
    const t = Math.min(1, (now - t0) / duration);
    onFrame(ease(t));
    if (t < 1) raf = requestAnimationFrame(step);
    else onDone?.();
  });
  return () => cancelAnimationFrame(raf);
}

/**
 * number-transition — a quantity changed because the reader did something: the
 * new exact value replaces the old one with a short slide-in. Values are never
 * interpolated (no counting through numbers that were never true); the only
 * place intermediate values appear is the hero readout, where every frame is
 * the exact Φ(z) of the z drawn on screen. Safe on aria-live elements: the text
 * changes once, to its final value.
 */
export function swapText(el, text) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  if (!motionAllowed()) return;
  el.animate(
    [
      { opacity: 0, transform: 'translateY(0.35em)' },
      { opacity: 1, transform: 'none' },
    ],
    { duration: token('--motion-fast'), easing: css(EASE.emphasized) },
  );
}

/** On-screen length of an SVG geometry element (correct under non-scaling strokes and stretched viewBoxes). */
export function screenLength(el, samples = 48) {
  const m = el.getScreenCTM?.();
  const total = el.getTotalLength?.() ?? 0;
  if (!m || !total) return 0;
  const pts = [];
  for (let i = 0; i <= samples; i += 1) {
    const p = el.getPointAtLength((total * i) / samples).matrixTransform(m);
    pts.push([p.x, p.y]);
  }
  return polylineLength(pts);
}

/**
 * line-draw for a set of SVG paths via the Web Animations API: each stroke grows
 * from its start (or from its end when reverse(el) is true). Lengths are measured
 * first and the animations started after, so layout is read once. When the
 * animation ends it is removed, and the element's own CSS (dash patterns included)
 * applies again.
 */
export function drawStrokes(els, { duration = token('--motion-draw'), delay = () => 0, reverse = () => false, easing = EASE.draw } = {}) {
  if (!motionAllowed() || !(duration > 0)) return [];
  const lengths = els.map((el) => screenLength(el));
  return els.map((el, i) => {
    const L = Math.max(1, lengths[i]);
    const from = reverse(el) ? -L : L;
    return el.animate(
      [
        { strokeDasharray: `${L} ${L}`, strokeDashoffset: from },
        { strokeDasharray: `${L} ${L}`, strokeDashoffset: 0 },
      ],
      { duration, delay: delay(el, i), easing: css(easing), fill: 'backwards' },
    );
  });
}

/**
 * Keyed FLIP across an update that may move, hide, add or replace elements.
 *
 * - Survivors move from their old box to their new one (translate, plus scale
 *   when `scale` is true — used for SVG marks whose size encodes data).
 * - Newcomers fade in (`enter: 'rise'` adds a small upward settle).
 * - Elements with data-ghost whose shape changed (lines, curves) cross-fade
 *   instead of morphing, so no intermediate shape is ever drawn.
 * - SVG children are moved in user units, so the result is exact at any zoom.
 *
 * Unlike a same-document View Transition, the page stays interactive while
 * this runs (Chromium routes all hit-testing to <html> during a transition).
 */
export function flip(
  root,
  update,
  { selector = '[data-k]', key = (el) => el.dataset.k, scale = true, enter = 'fade', duration = token('--motion-base'), easing = EASE.standard } = {},
) {
  if (!motionAllowed() || !(duration > 0) || !root) {
    update();
    return;
  }
  const visible = (r) => r.width > 0 || r.height > 0;
  const before = new Map();
  const ghosts = new Map();
  root.querySelectorAll(selector).forEach((el) => {
    const r = el.getBoundingClientRect();
    if (!visible(r)) return;
    before.set(key(el), r);
    if (el.hasAttribute('data-ghost')) ghosts.set(key(el), { clone: el.cloneNode(true), sig: el.getAttribute('points') ?? el.getAttribute('d') ?? '' });
  });
  update();
  const timing = { duration, easing: css(easing) };
  const scaleOf = new Map();
  const svgScale = (svg) => {
    if (!scaleOf.has(svg)) {
      const m = svg?.getScreenCTM?.();
      scaleOf.set(svg, m ? { x: m.a || 1, y: m.d || 1 } : { x: 1, y: 1 });
    }
    return scaleOf.get(svg);
  };
  const vh = window.innerHeight;
  const after = [...root.querySelectorAll(selector)].map((el) => ({ el, rect: el.getBoundingClientRect() })).filter(({ rect }) => visible(rect));
  for (const { el, rect } of after) {
    const k = key(el);
    const b = before.get(k);
    // off-screen before and after: nothing to see, nothing to animate
    if ((!b || b.bottom < 0 || b.top > vh) && (rect.bottom < 0 || rect.top > vh)) continue;
    if (el.hasAttribute('data-ghost')) {
      const g = ghosts.get(k);
      const sig = el.getAttribute('points') ?? el.getAttribute('d') ?? '';
      if (g && g.sig !== sig && el.parentNode) {
        g.clone.removeAttribute('data-k');
        g.clone.setAttribute('aria-hidden', 'true');
        el.parentNode.insertBefore(g.clone, el);
        g.clone.animate([{ opacity: 1 }, { opacity: 0 }], { ...timing, fill: 'forwards' }).finished.then(
          () => g.clone.remove(),
          () => g.clone.remove(),
        );
        el.animate([{ opacity: 0 }, { opacity: 1 }], timing);
      }
      continue;
    }
    if (!b) {
      el.animate(
        enter === 'rise' ? [{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }] : [{ opacity: 0 }, { opacity: 1 }],
        { ...timing, easing: css(EASE.emphasized) },
      );
      continue;
    }
    const svg = el instanceof SVGElement ? el.ownerSVGElement : null;
    const s = svg ? svgScale(svg) : { x: 1, y: 1 };
    const dx = (b.left - rect.left) / s.x;
    const dy = (b.top - rect.top) / s.y;
    const sx = scale && rect.width > 0.5 && b.width > 0.5 ? b.width / rect.width : 1;
    const sy = scale && rect.height > 0.5 && b.height > 0.5 ? b.height / rect.height : 1;
    if (Math.abs(dx) < 0.01 && Math.abs(dy) < 0.01 && Math.abs(sx - 1) < 0.001 && Math.abs(sy - 1) < 0.001) continue;
    // FLIP maps the new top-left corner onto the old one, so the origin must be that corner.
    if (svg) el.style.transformBox = 'fill-box';
    el.style.transformOrigin = '0 0';
    el.animate([{ transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})` }, { transform: 'none' }], timing);
  }
}

// ------------------------------------------------------------------ reveal-once / stagger-group

/**
 * reveal-once: [data-reveal] elements and [data-stagger] groups get .is-revealed
 * the first time they enter the viewport; children of a stagger group get --i.
 * The hidden starting state lives in motion.css under html[data-motion], so
 * without JavaScript (or with reduced motion) nothing is ever hidden.
 */
export function initReveals(scope = document) {
  if (!hasDom) return;
  const targets = [...scope.querySelectorAll('[data-reveal]:not(.is-revealed), [data-stagger]:not(.is-revealed)')];
  targets.forEach((el) => {
    if (el.hasAttribute('data-stagger')) [...el.children].forEach((c, i) => c.style.setProperty('--i', String(Math.min(i, 8))));
  });
  if (!motionAllowed() || typeof IntersectionObserver !== 'function') {
    targets.forEach((el) => el.classList.add('is-revealed'));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-revealed');
        io.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.08 },
  );
  targets.forEach((el) => io.observe(el));
}

/** Boot: marks the motion layer as alive and reveals everything if motion is switched off later. */
export function initMotion() {
  if (!hasDom) return;
  window.__axiomMotion = true;
  initReveals();
  reducedQuery?.addEventListener?.('change', (e) => {
    if (e.matches) {
      document.documentElement.removeAttribute('data-motion');
      document.querySelectorAll('[data-reveal], [data-stagger]').forEach((el) => el.classList.add('is-revealed'));
    }
  });
}
