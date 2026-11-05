#!/usr/bin/env node
/**
 * Verifies the numbers behind /lab/ (run: npm run lab:verify).
 *
 * The lab is a statistical claim, so it gets a test like one:
 *   1. the payload the page ships is internally consistent
 *   2. at high collinearity the unpenalised estimator's sampling spread is far
 *      larger than the penalised one's — the effect the page demonstrates
 *   3. at zero collinearity ridge is *not* better — the honest caveat the copy makes
 *   4. VIF crosses the conventional 5 and 10 lines exactly where the copy says
 * Fails loudly if any of that stops being true.
 */
import { readFileSync } from 'node:fs';

const dist = new URL('../dist/lab/index.html', import.meta.url);
let html;
try {
  html = readFileSync(dist, 'utf8');
} catch {
  console.error('✗ dist/lab/index.html not found — run `npm run build` first');
  process.exit(1);
}

const raw = html.match(/<script type="application\/json" id="lab-payload">([\s\S]*?)<\/script>/)?.[1];
if (!raw) {
  console.error('✗ lab payload is missing from the built page');
  process.exit(1);
}
const cfg = JSON.parse(raw.replaceAll('&quot;', '"').replaceAll('&amp;', '&'));
const errors = [];
const check = (ok, message) => {
  if (!ok) errors.push(message);
};

const { states, truth, rho } = cfg;
check(Array.isArray(states) && states.length === 15, `expected 15 states, got ${states?.length}`);
check(Array.isArray(truth) && truth.length === 4, 'expected 4 true coefficients');
check(states.every((s) => s.ml.beta.length === 4 && s.ridge.beta.length === 4 && s.cw.beta.length === 4), 'every state needs four coefficients per estimator');
check(states.every((s) => s.cv.length === 11), 'every state needs an 11-point CV curve');
check(
  states.every((s, i) => i === 0 || s.rho > states[i - 1].rho),
  'rho must increase across states',
);

const at = (target) => states[rho.findIndex((r) => Math.abs(r - target) < 1e-9)];
const first = at(0);
const worst = states[states.length - 1];

// 2. the effect
check(worst.spread.ml > 8 * worst.spread.ridge, `at ρ=${worst.rho} the ML spread (${worst.spread.ml}) should dwarf ridge (${worst.spread.ridge})`);
check(worst.vif > 100, `at ρ=${worst.rho} VIF should exceed 100, got ${worst.vif}`);

// 3. the caveat
check(first.spread.ridge >= 0.5 * first.spread.ml, 'at ρ=0 ridge must not look magically better than ML');

// 4. thresholds quoted in the copy
check(first.vif < 1.5, `ρ=0 should have VIF near 1, got ${first.vif}`);
const mid = at(0.6);
check(mid.vif >= 2 && mid.vif <= 5, `ρ=0.6 should sit below the VIF 5 line, got ${mid.vif}`);
check(at(0.8).vif > 5, `ρ=0.8 should cross VIF 5, got ${at(0.8).vif}`);
check(at(0.9).vif > 10, `ρ=0.9 should cross VIF 10, got ${at(0.9).vif}`);

// the ridge path must differ from ML once collinearity bites
check(Math.abs(worst.ridge.beta[1] - worst.ml.beta[1]) > 0.1, 'ridge and ML should disagree at high collinearity');

if (errors.length) {
  console.error(`✗ lab verification failed (${errors.length}):`);
  for (const e of errors) console.error('  -', e);
  process.exit(1);
}
console.log(`✓ lab verified: ${states.length} states, ML spread x${(worst.spread.ml / worst.spread.ridge).toFixed(1)} ridge at ρ=${worst.rho}, VIF ${worst.vif.toFixed(0)}`);
