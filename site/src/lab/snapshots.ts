/**
 * Every state the lab can show, computed once at build time.
 *
 * The browser never fits a model. It picks one of these precomputed states, so
 * the slider is instant, the numbers on screen are the numbers that were
 * verified at build, and the page ships no statistics code to the client.
 */
import { LAMBDAS, TRUE_BETA, cv, datasetAt, fit, se } from './model';
import { SPREAD } from './metrics';

export const RHO_STEPS = [0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995];

export interface EstimateState {
  beta: number[];
  se: number[];
  lambda: number;
}

export interface SnapshotState {
  rho: number;
  vif: number;
  lambda: number;
  cv: number[];
  ml: EstimateState;
  ridge: EstimateState;
  cw: EstimateState;
  spread: { ml: number; ridge: number; cw: number };
}

function nearestSpread(rho: number) {
  let best = SPREAD[0];
  for (const point of SPREAD) if (Math.abs(point.rho - rho) < Math.abs(best.rho - rho)) best = point;
  return best.sd;
}

function stateAt(rho: number): SnapshotState {
  const ds = datasetAt(rho);
  const dev = cv(ds, LAMBDAS);
  let best = 0;
  for (let i = 1; i < dev.length; i += 1) if (dev[i] < dev[best]) best = i;
  const lambda = LAMBDAS[best];
  const ml = fit(ds.x, ds.y, 0);
  const ridge = fit(ds.x, ds.y, lambda);
  const sumSq = ridge.slice(1).reduce((s, v) => s + v * v, 0);
  const cwLambda = Math.min(400, lambda * (1 / Math.max(1e-3, sumSq)));
  const cw = fit(ds.x, ds.y, cwLambda);
  return {
    rho,
    vif: Math.max(...ds.vif),
    lambda,
    cv: dev.map((v) => Math.round(v * 100) / 100),
    ml: { beta: ml.slice(1), se: se(ds.x, ml, 0).slice(1), lambda: 0 },
    ridge: { beta: ridge.slice(1), se: se(ds.x, ridge, lambda).slice(1), lambda },
    cw: { beta: cw.slice(1), se: se(ds.x, cw, cwLambda).slice(1), lambda: Math.round(cwLambda * 1000) / 1000 },
    spread: nearestSpread(rho),
  };
}

export const SNAPSHOTS: SnapshotState[] = RHO_STEPS.map(stateAt);
export const TRUTH = TRUE_BETA.slice(1);
export const LAMBDA_GRID = LAMBDAS;

/**
 * A compact island payload: no functions, no classes, no model code.
 * Coefficients are rounded to what the page prints (3 dp) so a 15-state payload
 * stays ~6 KB of JSON instead of ~12 KB.
 */
const round = (v: number) => Math.round(v * 1000) / 1000;
const trim = (e: EstimateState) => ({
  beta: e.beta.map(round),
  se: e.se.map(round),
  lambda: round(e.lambda),
});

export const LAB_PAYLOAD = {
  truth: TRUTH.map(round),
  rho: RHO_STEPS,
  states: SNAPSHOTS.map((s) => ({
    rho: s.rho,
    vif: round(s.vif),
    lambda: s.lambda,
    cv: s.cv,
    ml: trim(s.ml),
    ridge: trim(s.ridge),
    cw: trim(s.cw),
    spread: { ml: round(s.spread.ml), ridge: round(s.spread.ridge), cw: round(s.spread.cw) },
  })),
};
