/**
 * Build-time precomputation for the shrinkage lab.
 *
 * The Monte-Carlo panel is the argument the lab makes: how much does each
 * estimator's estimate *move* when the sample is redrawn at a given level of
 * collinearity? That is a property of the estimator, not of one dataset, so it
 * is measured here, once, at build time — 20 replicates × 9 collinearity levels
 * × 3 estimators — and shipped as static numbers. The visitor's slider then
 * costs only three fits.
 *
 * Everything is seeded: the same figures appear on every build and in both
 * languages.
 */
import { datasetAt, fit, cv, LAMBDAS, TRUE_BETA } from './model';

export interface SpreadPoint {
  rho: number;
  vif: number;
  sd: { ml: number; ridge: number; cw: number };
}

const RHOS = [0, 0.3, 0.6, 0.8, 0.9, 0.95, 0.98, 0.99, 0.995];
const REPS = 20;

/** λ* for each ρ on the grid, so the client can look it up instead of re-running CV. */
export interface LambdaPoint {
  rho: number;
  lambda: number;
}

function cvLambda(rho: number) {
  const ds = datasetAt(rho);
  const dev = cv(ds, LAMBDAS);
  let best = 0;
  for (let i = 1; i < dev.length; i += 1) if (dev[i] < dev[best]) best = i;
  return LAMBDAS[best];
}

function spread(rho: number): SpreadPoint {
  const runs: Record<'ml' | 'ridge' | 'cw', number[][]> = { ml: [], ridge: [], cw: [] };
  const lambda = cvLambda(rho);
  let vifSum = 0;
  for (let r = 0; r < REPS; r += 1) {
    const ds = datasetAt(rho, r + 1);
    vifSum += Math.max(...ds.vif);
    const ml = fit(ds.x, ds.y, 0).slice(1);
    const ridge = fit(ds.x, ds.y, lambda).slice(1);
    const sumSq = ridge.reduce((s, v) => s + v * v, 0);
    const cw = fit(ds.x, ds.y, Math.min(400, lambda * (1 / Math.max(1e-3, sumSq)))).slice(1);
    runs.ml.push(ml);
    runs.ridge.push(ridge);
    runs.cw.push(cw);
  }
  const sdOf = (m: number[][]) =>
    2 *
    (Math.sqrt(
      m[0].reduce((acc, _, j) => {
        const mu = m.reduce((s, v) => s + v[j], 0) / m.length;
        return acc + m.reduce((s, v) => s + (v[j] - mu) ** 2, 0) / m.length;
      }, 0) / m[0].length,
    ));
  return { rho, vif: vifSum / REPS, sd: { ml: sdOf(runs.ml), ridge: sdOf(runs.ridge), cw: sdOf(runs.cw) } };
}

export const SPREAD: SpreadPoint[] = RHOS.map(spread);
export const LAMBDAS_BY_RHO: LambdaPoint[] = RHOS.map((rho) => ({ rho, lambda: cvLambda(rho) }));
export const RHO_GRID = RHOS;
export const TRUE = TRUE_BETA;
