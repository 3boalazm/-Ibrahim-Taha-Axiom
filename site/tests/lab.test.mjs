// The lab ships a precomputed, reproducible payload; nothing is fitted in the browser.
// (`npm run lab:verify` re-derives every number; this suite checks what is shipped.)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DIST, jsonScript, page } from './helpers.mjs';

const payload = jsonScript(page('/lab/'), 'id="lab-payload"');

test('the payload is versioned, seeded and identical in both languages', () => {
  assert.equal(payload.v ?? payload.version, 2);
  assert.ok(Number.isInteger(payload.meta.seed));
  assert.equal(payload.meta.reps, 100);
  assert.deepEqual(jsonScript(page('/ar/lab/'), 'id="lab-payload"'), payload);
});

test('every correlation level has finite estimates and Monte Carlo summaries', () => {
  assert.equal(payload.states.length, payload.rho.length);
  for (const s of payload.states) {
    assert.ok(s.vif >= 1 && Number.isFinite(s.vif));
    for (const k of payload.meta.estimators) {
      const m = s.mc.est[k];
      assert.ok(Number.isFinite(m.spread) && Number.isFinite(m.rmseAll), `ρ=${s.rho} ${k}`);
    }
  }
});

test('the effect the page describes is in the data: ML spreads far more than ridge at the top', () => {
  const top = payload.states.at(-1);
  const low = payload.states[0];
  assert.ok(top.mc.est.ml.spread / top.mc.est.ridge.spread > 5);
  assert.ok(Math.abs(low.mc.est.ml.spread / low.mc.est.ridge.spread - 1) < 0.2);
});

test('the shipped JavaScript contains no model-fitting code', () => {
  const dir = join(DIST, '_astro');
  const js = readdirSync(dir).filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(dir, f), 'utf8')).join('\n');
  for (const name of ['mulberry32', 'ridgeFit', 'datasetAt', 'sumSq']) assert.ok(!js.includes(name), `${name} found in client JS`);
});

test('the lab says what it is and what it is not', () => {
  const lab = page('/lab/');
  assert.match(lab, /Illustrative controlled experiment/);
  assert.match(lab, /does not implement the researcher’s published COM-Poisson/);
  assert.match(page('/'), /Not the published COM-Poisson method/);
  assert.match(page('/ar/lab/'), /المنشورة للباحث \(مقدِّرات COM-Poisson/);
});
