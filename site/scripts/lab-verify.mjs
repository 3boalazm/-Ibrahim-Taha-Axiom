#!/usr/bin/env node
/**
 * Verifies the numbers behind /lab/ (run after a build: npm run lab:verify).
 *
 * The lab makes statistical claims, so it is tested like one:
 *   1. the shipped payload is complete and internally consistent;
 *   2. the fitted estimates solve their estimating equations (score ≈ 0);
 *   3. the effect the page demonstrates holds (ML spread ≫ ridge at high ρ),
 *      and so does the honest caveat (no gain at ρ = 0);
 *   4. every number quoted in the prose (data-claim) equals the payload claim,
 *      and every claim can be recomputed from the per-state values;
 *   5. the disclaimer is present and retired wording is gone.
 * Fails loudly if any of that stops being true.
 */
import { readFileSync } from 'node:fs';

const errors = [];
const check = (ok, message) => {
  if (!ok) errors.push(message);
};
const read = (rel) => {
  try {
    return readFileSync(new URL(`../dist/${rel}`, import.meta.url), 'utf8');
  } catch {
    console.error(`✗ dist/${rel} not found — run \`npm run build\` first`);
    process.exit(1);
  }
};
const decode = (s) =>
  s
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&amp;', '&');

const pages = { en: read('lab/index.html'), ar: read('ar/lab/index.html') };
const raw = pages.en.match(/<script type="application\/json" id="lab-payload">([\s\S]*?)<\/script>/)?.[1];
if (!raw) {
  console.error('✗ lab payload is missing from the built page');
  process.exit(1);
}
const cfg = JSON.parse(decode(raw));
const rawAr = pages.ar.match(/<script type="application\/json" id="lab-payload">([\s\S]*?)<\/script>/)?.[1];
check(rawAr !== undefined && decode(rawAr) === decode(raw), 'the Arabic page must ship the same payload as the English page');

const KEYS = ['ml', 'ridge', 'ns'];
const { states, truth, rho, meta, claims } = cfg;

// ------------------------------------------------------------ 1. structure
check(cfg.version === 2, `expected payload version 2, got ${cfg.version}`);
check(Array.isArray(states) && states.length === 15, `expected 15 states, got ${states?.length}`);
check(Array.isArray(truth) && truth.length === 4, 'expected 4 true coefficients');
check(meta.reps === 100, `expected 100 Monte Carlo replicates per level, got ${meta.reps}`);
check(JSON.stringify(meta.estimators) === JSON.stringify(KEYS), `expected estimators ${KEYS}, got ${meta.estimators}`);
check(rho.length === states.length && rho.every((r, i) => r === states[i].rho), 'rho list must match the states');
check(
  states.every((s, i) => i === 0 || s.rho > states[i - 1].rho),
  'collinearity levels must increase',
);
check(states.every((s) => s.cv.length === 11 && s.cv.length === meta.lambdas.length), 'every state needs an 11-point CV curve over the λ grid');
for (const s of states) {
  for (const k of KEYS) {
    const e = s.est?.[k];
    const m = s.mc?.est?.[k];
    check(e && e.beta.length === 4 && e.se.length === 4, `ρ=${s.rho}: ${k} needs 4 coefficients and 4 standard errors`);
    check(m && m.mean.length === 4 && m.sd.length === 4 && m.rmse.length === 4, `ρ=${s.rho}: ${k} needs Monte Carlo mean, sd and rmse for 4 slopes`);
    check(Number.isFinite(m?.spread) && Number.isFinite(m?.rmseAll), `ρ=${s.rho}: ${k} needs a finite spread and RMSE`);
  }
  // The payload rounds deviances to 3 dp, so near-flat minima can tie; the
  // full-precision arg-min may sit on any tied point (≤ 0.001 apart).
  check(s.cv[s.cvBest] - Math.min(...s.cv) <= 0.001 + 1e-12, `ρ=${s.rho}: cvBest must be the arg-min of the CV curve`);
  check(s.lambda === meta.lambdas[s.cvBest], `ρ=${s.rho}: ridge λ must be the CV choice`);
  check(s.est.ridge.lambda === s.lambda && s.est.ml.lambda === 0, `ρ=${s.rho}: ML must be unpenalised and ridge must use the CV λ`);
  check(s.est.ns.lambda <= meta.nsCap + 1e-9, `ρ=${s.rho}: norm-scaled λ exceeds its cap`);
}

// ------------------------------------------------------- 2. score equations
for (const s of states) for (const k of KEYS) check(Math.abs(s.est[k].score) < 1e-6, `ρ=${s.rho}: ${k} score residual ${s.est[k].score} ≥ 1e-6`);

// ---------------------------------------------- spread = 2 × RMS of the SDs
for (const s of states)
  for (const k of KEYS) {
    const m = s.mc.est[k];
    const rms = Math.sqrt(m.sd.reduce((a, v) => a + v * v, 0) / m.sd.length);
    check(Math.abs(m.spread - 2 * rms) <= 0.002, `ρ=${s.rho}: ${k} spread ${m.spread} ≠ 2·RMS(sd) ${(2 * rms).toFixed(4)}`);
  }

// ------------------------------------------------------------- 3. effects
const first = states[0];
const last = states[states.length - 1];
const ratio = (s) => s.mc.est.ml.spread / s.mc.est.ridge.spread;
check(last.rho === 0.995, `the last level should be ρ = 0.995, got ${last.rho}`);
check(ratio(last) > 8, `at ρ=${last.rho} ML spread should be > 8× ridge, got ${ratio(last).toFixed(1)}×`);
check(last.vif > 100, `at ρ=${last.rho} VIF should exceed 100, got ${last.vif}`);
check(first.mc.est.ridge.spread >= 0.5 * first.mc.est.ml.spread, 'at ρ=0 ridge must not be dramatically more stable than ML (the copy says shrinkage buys nothing there)');
const mlBias0 = Math.max(...first.mc.est.ml.mean.map((m, j) => Math.abs(m - truth[j])));
check(mlBias0 < 0.05, `ML should be close to unbiased at ρ=0, max |bias| ${mlBias0.toFixed(3)}`);
const maxSlopeGap = Math.max(...last.est.ml.beta.map((b, j) => Math.abs(b - last.est.ridge.beta[j])));
check(maxSlopeGap > 0.1, `at ρ=${last.rho} ML and ridge should visibly disagree on the displayed sample, max gap ${maxSlopeGap.toFixed(3)}`);
const at = (r) => states.find((s) => Math.abs(s.rho - r) < 1e-9);
check(at(0.6).vif < 5 && at(0.8).vif > 5 && at(0.9).vif > 10, 'VIF should cross 5 at ρ = 0.8 and 10 at ρ = 0.9');

// ------------------------------------------- 4a. claims recomputed from data
// Claims are computed from the same rounded values the page displays, so the
// recomputation must match exactly.
const r1 = (v) => Math.round(v * 10) / 10;
const r2 = (v) => Math.round(v * 100) / 100;
const firstRho = (pred) => states.find(pred)?.rho ?? null;
const seOverSd = states.flatMap((s) => s.est.ml.se.map((v, j) => v / s.mc.est.ml.sd[j]));
const recomputed = {
  rhoMax: [last.rho, 0],
  ratioAt0: [r1(ratio(first)), 1e-9],
  ratioAt09: [r1(ratio(at(0.9))), 1e-9],
  ratioAt095: [r1(ratio(at(0.95))), 1e-9],
  ratioMax: [r1(ratio(last)), 1e-9],
  firstRhoRatio2: [firstRho((s) => ratio(s) >= 2), 0],
  vifAt06: [r1(at(0.6).vif), 1e-9],
  vifAt08: [r1(at(0.8).vif), 1e-9],
  vifAt09: [r1(at(0.9).vif), 1e-9],
  vifMax: [r1(last.vif), 1e-9],
  firstRhoVif5: [firstRho((s) => s.vif > 5), 0],
  firstRhoVif10: [firstRho((s) => s.vif > 10), 0],
  maxDiffAt0: [r2(Math.max(...first.est.ml.beta.map((b, j) => Math.abs(b - first.est.ridge.beta[j])))), 1e-9],
  mlBiasAt0: [r2(mlBias0), 1e-9],
  rmseMlMax: [r2(last.mc.est.ml.rmseAll), 1e-9],
  rmseRidgeMax: [r2(last.mc.est.ridge.rmseAll), 1e-9],
  ridgeMeansMax: [last.mc.est.ridge.mean.map(r2), 1e-9],
  ridgeSignFlips: [last.mc.est.ridge.mean.filter((m, j) => Math.sign(m) !== Math.sign(truth[j])).length, 0],
  truthSum: [r2(truth.reduce((a, v) => a + v, 0)), 1e-9],
  ridgeMeanSumMax: [r2(last.mc.est.ridge.mean.reduce((a, v) => a + v, 0)), 1e-9],
  mlSeOverSdMin: [r2(Math.min(...seOverSd)), 1e-9],
  mlSeOverSdMax: [r2(Math.max(...seOverSd)), 1e-9],
  lambdaLow: [first.lambda, 0],
  lambdaMax: [last.lambda, 0],
  lambdaJumpRho: [firstRho((s) => s.lambda !== first.lambda), 0],
};
const close = (a, b, tol) =>
  Array.isArray(a) ? Array.isArray(b) && a.length === b.length && a.every((v, i) => close(v, b[i], tol)) : a === b || Math.abs(a - b) <= tol + 1e-12;
for (const [key, [value, tol]] of Object.entries(recomputed)) {
  check(key in claims, `claim ${key} is missing from the payload`);
  if (key in claims) check(close(claims[key], value, tol), `claim ${key}=${JSON.stringify(claims[key])} does not match the states (${JSON.stringify(value)})`);
}
for (const key of Object.keys(claims)) check(key in recomputed, `claim ${key} has no recomputation in lab-verify`);
check(claims.ridgeSignFlips === 1, `the copy says ridge flips one sign at ρ=${last.rho}; payload says ${claims.ridgeSignFlips}`);

// -------------------------------- 4b. every number in the prose is a claim
const claimText = (v) => (Array.isArray(v) ? v.join(',') : String(v));
for (const [lang, html] of Object.entries(pages)) {
  const found = [...html.matchAll(/<span data-claim="([A-Za-z0-9]+)" data-value="([^"]*)">([\s\S]*?)<\/span>/g)];
  check(found.length >= 15, `${lang}: expected at least 15 data-claim numbers in the prose, found ${found.length}`);
  const used = new Set();
  for (const [, key, value, text] of found) {
    used.add(key);
    if (!(key in claims)) {
      check(false, `${lang}: data-claim="${key}" is not a payload claim`);
      continue;
    }
    check(value === claimText(claims[key]), `${lang}: data-claim="${key}" carries ${value}, payload says ${claimText(claims[key])}`);
    const shown = (text.match(/-?\d+(?:\.\d+)?/g) ?? []).map(Number);
    const expected = Array.isArray(claims[key]) ? claims[key] : [claims[key]];
    check(
      shown.length === expected.length && shown.every((n, i) => Math.abs(n - expected[i]) <= 0.051),
      `${lang}: data-claim="${key}" shows "${text}" but the claim is ${claimText(claims[key])}`,
    );
  }
  for (const key of ['ratioMax', 'vifMax', 'firstRhoVif5', 'firstRhoVif10', 'rmseMlMax', 'rmseRidgeMax', 'lambdaJumpRho'])
    check(used.has(key), `${lang}: the prose should quote claim ${key}`);

  // ------------------------------------------------------- 5. honesty checks
  check(/data-lab-disclaimer/.test(html), `${lang}: the lab disclaimer is missing`);
  // The revision note may name what changed; everything else must not use retired wording.
  const body = html.replace(/<aside class="lab__revision[\s\S]*?<\/aside>/, '');
  check(!/correlation-weighted ridge/i.test(body), `${lang}: retired label "Correlation-weighted ridge" is still on the page`);
  const retired = body.match(/20 replicates|٢٠ عيّنة|ينهار|تتشاجر|falls apart|collapses/i);
  check(!retired, `${lang}: retired wording "${retired?.[0]}" is still on the page`);
  check(/id="lab-payload"/.test(html) && /data-lab-range/.test(html), `${lang}: payload or range control missing`);
}

if (errors.length) {
  console.error(`✗ lab verification failed (${errors.length}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(
  `✓ lab verified: ${states.length} states × ${meta.reps} replicates, ML spread ${ratio(last).toFixed(1)}× ridge at ρ=${last.rho}, VIF ${last.vif.toFixed(1)}, ` +
    `max |score| ${Math.max(...states.flatMap((s) => KEYS.map((k) => Math.abs(s.est[k].score)))).toExponential(1)}, ${Object.keys(claims).length} claims checked`,
);
