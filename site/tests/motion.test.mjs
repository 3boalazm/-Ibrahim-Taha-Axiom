// Motion system (docs/motion-system.md): the pure helpers in src/lib/motion.mjs, and
// the guarantees the stylesheets must keep (no loops, nothing hidden without a gate,
// every token zero under reduced motion, JS easings equal to the CSS tokens).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, ROOT, page, requireBuild, routes } from './helpers.mjs';
import { EASE, clamp, cubicBezier, lerp, parseDuration, polylineLength, staggerDelay, travelDuration } from '../src/lib/motion.mjs';

const tokens = readFileSync(join(ROOT, 'src', 'styles', 'tokens.css'), 'utf8');

/** Every stylesheet the site ships: bundled CSS plus any inline <style> in built pages. */
function shippedCss() {
  requireBuild();
  const dir = join(DIST, '_astro');
  const files = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8'));
  const inline = routes().flatMap((r) => [...page(r).matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]));
  return [...files, ...inline].join('\n');
}

test('cubicBezier reproduces CSS timing functions', () => {
  const linear = cubicBezier(0, 0, 1, 1);
  for (const x of [0, 0.1, 0.37, 0.5, 0.9, 1]) assert.ok(Math.abs(linear(x) - x) < 1e-6, `linear(${x})`);
  // CSS "ease" = cubic-bezier(0.25, 0.1, 0.25, 1); reference by 200-step bisection in double precision
  assert.ok(Math.abs(cubicBezier(0.25, 0.1, 0.25, 1)(0.5) - 0.8024033875848569) < 1e-5);
  for (const [name, pts] of Object.entries(EASE)) {
    const f = cubicBezier(...pts);
    assert.equal(f(0), 0, `${name}(0)`);
    assert.equal(f(1), 1, `${name}(1)`);
    let prev = 0;
    for (let i = 1; i <= 200; i += 1) {
      const v = f(i / 200);
      assert.ok(v >= prev - 1e-9, `${name} is not monotone at ${i / 200}`);
      prev = v;
    }
  }
});

test('JS easing constants are the CSS easing tokens', () => {
  for (const [key, name] of [
    ['standard', '--ease-standard'],
    ['emphasized', '--ease-emphasized'],
    ['exit', '--ease-exit'],
    ['draw', '--ease-draw'],
  ]) {
    const m = tokens.match(new RegExp(`${name}:\\s*cubic-bezier\\(([^)]+)\\)`));
    assert.ok(m, `${name} is defined`);
    assert.deepEqual(m[1].split(',').map(Number), EASE[key], `${name} matches EASE.${key}`);
  }
});

test('stagger, travel and duration helpers', () => {
  assert.equal(staggerDelay(0), 0);
  assert.equal(staggerDelay(3), 135);
  assert.equal(staggerDelay(40), 8 * 45, 'long lists never wait longer than the cap');
  assert.equal(staggerDelay(-2), 0);
  assert.equal(travelDuration(0), 90);
  assert.equal(travelDuration(1), 165);
  assert.equal(travelDuration(-10), 240, 'long jumps are capped');
  assert.equal(parseDuration('240ms'), 240);
  assert.equal(parseDuration('0.42s'), 420);
  assert.equal(parseDuration(' 0ms '), 0);
  assert.equal(parseDuration(''), 0);
  assert.equal(polylineLength([[0, 0], [3, 4], [3, 10]]), 11);
  assert.equal(lerp(2, 4, 0.25), 2.5);
  assert.equal(clamp(5, 0, 1), 1);
});

test('every motion token collapses to zero under prefers-reduced-motion', () => {
  const at = tokens.indexOf('@media (prefers-reduced-motion: reduce)');
  assert.ok(at > 0, 'tokens.css has a reduced-motion block');
  const defined = [...tokens.slice(0, at).matchAll(/(--motion-[a-z]+):\s*\d/g)].map((m) => m[1]);
  assert.ok(defined.length >= 6, 'the duration scale is defined');
  const reduced = tokens.slice(at);
  for (const name of defined) assert.match(reduced, new RegExp(`${name}:\\s*0ms`), `${name} is zeroed`);
  for (const name of ['--stagger-step', '--rise-sm', '--rise-md', '--lift']) assert.match(reduced, new RegExp(`${name}:\\s*0(ms|px)`), `${name} is zeroed`);
});

test('no animation loops anywhere in the shipped CSS', () => {
  assert.doesNotMatch(shippedCss(), /infinite/);
});

test('content is only ever hidden behind a motion gate', () => {
  // Rules (outside @keyframes) that make something transparent must be scoped to
  // html[data-motion] — set only with JS and no reduced-motion preference — or to a
  // class added by the same script that removes it.
  const css = shippedCss().replace(/@keyframes[^{]+\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  const offenders = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
    .filter(([, , body]) => /(^|;)\s*opacity:\s*0(;|$|\s*!)/.test(body))
    .map(([, sel]) => sel.trim())
    .filter((sel) => !/data-motion|\.is-awaiting|\.motion-armed/.test(sel));
  assert.deepEqual(offenders, []);
});

test('the head script gates motion on JS + no reduced-motion, with a watchdog', () => {
  for (const r of ['/', '/ar/']) {
    const html = page(r);
    assert.match(html, /matchMedia\('\(prefers-reduced-motion: no-preference\)'\)/, `${r}: data-motion depends on the preference`);
    assert.match(html, /__axiomMotion/, `${r}: watchdog removes data-motion if the module never boots`);
  }
});

test('page transitions opt in inline in <head>, before any stylesheet, with the reduced-motion opt-out', () => {
  // Only in an external stylesheet, the opt-in arrived too late whenever that file was slow:
  // Chromium then skipped the transition and reported an InvalidStateError (CI on main,
  // run 42330599704; reproduced with a 150-400 ms delay on CSS).
  for (const r of routes()) {
    const head = page(r).split('</head>')[0];
    const at = head.indexOf('@view-transition{navigation:auto}');
    assert.ok(at > 0, `${r}: inline opt-in`);
    assert.match(head, /@media \(prefers-reduced-motion:\s?reduce\)\{@view-transition\{navigation:none\}\}/, `${r}: reduced-motion opt-out`);
    const firstSheet = head.search(/<link[^>]*rel="?stylesheet/);
    assert.ok(firstSheet === -1 || at < firstSheet, `${r}: before the first stylesheet`);
  }
  // one place only: the bundled CSS does not set it again
  const dir = join(DIST, '_astro');
  const bundled = readdirSync(dir).filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(dir, f), 'utf8'));
  assert.doesNotMatch(bundled.join('\n'), /@view-transition/);
});

test('above-the-fold copy never starts invisible (transform-only keyframes on the hero copy)', () => {
  const css = shippedCss();
  const settle = css.match(/@keyframes motion-settle\{[^}]*\}\}?/);
  assert.ok(settle, 'motion-settle exists');
  assert.doesNotMatch(settle[0], /opacity/);
  // keyframes that start hidden (opacity 0 in their first frame)
  const fades = new Set(
    [...css.matchAll(/@keyframes ([\w-]+)\{((?:[^{}]*\{[^}]*\})*)\}/g)]
      .filter((m) => /(?:from|0%)\{[^}]*opacity:\s*0(?:[;}]|$)/.test(m[2]))
      .map((m) => m[1]),
  );
  assert.ok(fades.has('motion-rise-sm'), 'the fade-in keyframes are detected');
  // The cascade matters, not the intent: an `animation` shorthand on .hhero__copy > *
  // once overrode an `animation-name: motion-settle` on the name and the lead, and the
  // measured LCP moved by ~0.6 s. Every rule on the hero copy must name a non-fading
  // keyframe (the browser check in tests/e2e/motion.mjs verifies the computed result).
  const heroRules = [...css.matchAll(/([^{}]*\.hhero__(?:copy|name|lead)[^{}]*)\{([^}]*)\}/g)];
  assert.ok(heroRules.length > 0, 'hero copy rules found');
  for (const [, sel, body] of heroRules) {
    for (const [, name] of body.matchAll(/animation(?:-name)?:\s*([\w-]+)/g)) {
      assert.ok(!fades.has(name), `${sel.trim()} must not use the fade-in keyframes ${name}`);
    }
  }
});
