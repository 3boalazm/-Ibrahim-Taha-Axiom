// The home-page normal-density figure computes real values (src/lib/normal.mjs).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRAME, Z_MAX, Z_MIN, areaPath, cdf, clampZ, densityPath, erf, pdf, xOf, zOf } from '../src/lib/normal.mjs';

test('Φ matches reference values to the accuracy of A&S 7.1.26 (|ε| < 1.5e-7)', () => {
  // reference values from Python's math.erf (double precision)
  const ref = { 0: 0.5, 1: 0.8413447460685429, 1.96: 0.9750021048517796, 2.5758: 0.9949995762622212, '-1.6449': 0.04999521746834634 };
  for (const [z, p] of Object.entries(ref)) assert.ok(Math.abs(cdf(Number(z)) - p) < 2e-7, `Φ(${z}) = ${cdf(Number(z))}, want ${p}`);
  assert.ok(Math.abs(erf(0.5) - 0.5204998778130465) < 1.5e-7);
});

test('symmetry and the density', () => {
  for (const z of [0.3, 1, 2.2, 3.1]) assert.ok(Math.abs(cdf(z) + cdf(-z) - 1) < 3e-7);
  assert.ok(Math.abs(pdf(0) - 1 / Math.sqrt(2 * Math.PI)) < 1e-15);
  // ∫ pdf over [-3.5, 3.5] by Simpson ≈ Φ(3.5) − Φ(−3.5)
  const n = 700;
  const h = (Z_MAX - Z_MIN) / n;
  let s = pdf(Z_MIN) + pdf(Z_MAX);
  for (let i = 1; i < n; i++) s += (i % 2 ? 4 : 2) * pdf(Z_MIN + i * h);
  assert.ok(Math.abs((s * h) / 3 - (cdf(Z_MAX) - cdf(Z_MIN))) < 1e-6);
});

test('geometry maps z to the frame and back; slider values are clamped to 0.01', () => {
  assert.equal(xOf(Z_MIN), FRAME.left);
  assert.equal(xOf(Z_MAX), FRAME.right);
  for (const z of [-2, 0, 1.96]) assert.ok(Math.abs(zOf(xOf(z)) - z) < 1e-12);
  assert.equal(clampZ(9), Z_MAX);
  assert.equal(clampZ(-9), Z_MIN);
  assert.equal(clampZ(1.234), 1.23);
});

test('SVG paths are well formed and the shaded area ends at z', () => {
  assert.match(densityPath(), /^M[\d.]+ [\d.]+(L[\d.]+ [\d.]+)+$/);
  const a = areaPath(1.96);
  assert.match(a, /^M/);
  assert.match(a, /Z$/);
  const xs = [...a.matchAll(/[ML]([\d.]+) /g)].map((m) => Number(m[1]));
  assert.ok(Math.max(...xs) <= xOf(1.96) + 0.01, 'area must not extend past z');
});
