/**
 * Every state the lab can show, computed once at build time.
 *
 * The browser never fits a model. It picks one of these precomputed states, so
 * the slider is instant, the numbers on screen are the numbers verified at
 * build (scripts/lab-verify.mjs), and no statistics code ships to the client.
 *
 * `claims` holds every number the page's prose quotes. The copy is written from
 * these values and lab-verify recomputes each one from the states, so a sentence
 * on the page cannot drift away from the computation behind it.
 */
import {
  ESTIMATORS,
  FOLDS,
  LAMBDAS,
  N,
  NS_CAP,
  PHI,
  SEED,
  TRUE_BETA,
  argmin,
  cv,
  datasetAt,
  fit,
  nsLambda,
  scoreResidual,
  se,
  type EstimatorId,
} from './model';
import { MC_REPS, monteCarlo, type McStats } from './metrics';

export const RHO_STEPS = [0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995];
/** Regime boundaries used by the prose (narrative bands; the numbers inside them are computed). */
export const REGIMES = { moderate: 0.6, high: 0.95 } as const;
/** Presets offered next to the dial. Each must be one of RHO_STEPS. */
export const PRESETS = [0, 0.8, 0.9, 0.98, 0.995] as const;
export const DEFAULT_RHO = 0.9;

export interface EstimateState {
  beta: number[];
  se: number[];
  lambda: number;
  score: number;
}

export interface SnapshotState {
  rho: number;
  vif: number;
  vifs: number[];
  corr: { x1: number; others: number };
  lambda: number;
  cvBest: number;
  cv: number[];
  est: Record<EstimatorId, EstimateState>;
  mc: { vifMean: number; est: Record<EstimatorId, McStats> };
}

function stateAt(rho: number): SnapshotState {
  const ds = datasetAt(rho);
  const dev = cv(ds, LAMBDAS);
  const cvBest = argmin(dev);
  const lambda = LAMBDAS[cvBest];
  const ml = fit(ds.x, ds.y, 0);
  const ridge = fit(ds.x, ds.y, lambda);
  const lambdaNs = nsLambda(lambda, ridge.slice(1));
  const ns = fit(ds.x, ds.y, lambdaNs);
  const mk = (beta: number[], l: number): EstimateState => ({
    beta: beta.slice(1),
    se: se(ds.x, beta, l).slice(1),
    lambda: l,
    score: scoreResidual(ds.x, ds.y, beta, l),
  });
  const mc = monteCarlo(rho, lambda);
  return {
    rho,
    vif: Math.max(...ds.vif),
    vifs: ds.vif,
    corr: ds.corr,
    lambda,
    cvBest,
    cv: dev,
    est: { ml: mk(ml, 0), ridge: mk(ridge, lambda), ns: mk(ns, lambdaNs) },
    mc: { vifMean: mc.vifMean, est: mc.est },
  };
}

export const STATES: SnapshotState[] = RHO_STEPS.map(stateAt);
export const TRUTH = TRUE_BETA.slice(1);
export const LAMBDA_GRID = LAMBDAS;

// ----------------------------------------------------------------- payload
/**
 * A compact island payload: plain numbers only, no functions or model code.
 * Coefficient-scale values are rounded to 3 dp (the page prints 2–3 dp).
 */
const round = (v: number) => Math.round(v * 1000) / 1000;
const sci = (v: number) => Number(v.toPrecision(2));
const trimEst = (e: EstimateState) => ({ beta: e.beta.map(round), se: e.se.map(round), lambda: round(e.lambda), score: sci(e.score) });
const trimMc = (m: McStats) => ({ mean: m.mean.map(round), sd: m.sd.map(round), rmse: m.rmse.map(round), spread: round(m.spread), rmseAll: round(m.rmseAll) });
const each = <T, U>(rec: Record<EstimatorId, T>, f: (v: T) => U) => Object.fromEntries(ESTIMATORS.map((k) => [k, f(rec[k])])) as Record<EstimatorId, U>;

const PAYLOAD_STATES = STATES.map((s) => ({
  rho: s.rho,
  vif: round(s.vif),
  vifs: s.vifs.map(round),
  corr: { x1: round(s.corr.x1), others: round(s.corr.others) },
  lambda: s.lambda,
  cvBest: s.cvBest,
  cv: s.cv.map(round),
  est: each(s.est, trimEst),
  mc: { vifMean: round(s.mc.vifMean), est: each(s.mc.est, trimMc) },
}));
type PayloadState = (typeof PAYLOAD_STATES)[number];

// ------------------------------------------------------------------ claims
/**
 * Numbers quoted in the prose. They are computed from the rounded values the
 * page displays (not the full-precision states), so a visitor who recomputes a
 * ratio from the on-page readouts gets the same figure the text quotes.
 */
const r1 = (v: number) => Math.round(v * 10) / 10;
const r2 = (v: number) => Math.round(v * 100) / 100;
const at = (rho: number) => {
  const s = PAYLOAD_STATES.find((x) => Math.abs(x.rho - rho) < 1e-9);
  if (!s) throw new Error(`[lab] no state at ρ=${rho}`);
  return s;
};
const ratio = (s: PayloadState) => s.mc.est.ml.spread / s.mc.est.ridge.spread;
const last = PAYLOAD_STATES[PAYLOAD_STATES.length - 1];
const first = PAYLOAD_STATES[0];
const firstRho = (pred: (s: PayloadState) => boolean) => PAYLOAD_STATES.find(pred)?.rho ?? null;
const seOverSd = PAYLOAD_STATES.flatMap((s) => s.est.ml.se.map((v, j) => v / s.mc.est.ml.sd[j]));

export const CLAIMS = {
  rhoMax: last.rho,
  ratioAt0: r1(ratio(first)),
  ratioAt09: r1(ratio(at(0.9))),
  ratioAt095: r1(ratio(at(0.95))),
  ratioMax: r1(ratio(last)),
  firstRhoRatio2: firstRho((s) => ratio(s) >= 2),
  vifAt06: r1(at(0.6).vif),
  vifAt08: r1(at(0.8).vif),
  vifAt09: r1(at(0.9).vif),
  vifMax: r1(last.vif),
  firstRhoVif5: firstRho((s) => s.vif > 5),
  firstRhoVif10: firstRho((s) => s.vif > 10),
  maxDiffAt0: r2(Math.max(...first.est.ml.beta.map((b, j) => Math.abs(b - first.est.ridge.beta[j])))),
  mlBiasAt0: r2(Math.max(...first.mc.est.ml.mean.map((m, j) => Math.abs(m - TRUTH[j])))),
  rmseMlMax: r2(last.mc.est.ml.rmseAll),
  rmseRidgeMax: r2(last.mc.est.ridge.rmseAll),
  ridgeMeansMax: last.mc.est.ridge.mean.map(r2),
  ridgeSignFlips: last.mc.est.ridge.mean.map((m, j) => Math.sign(m) !== Math.sign(TRUTH[j])).filter(Boolean).length,
  truthSum: r2(TRUTH.reduce((s, v) => s + v, 0)),
  ridgeMeanSumMax: r2(last.mc.est.ridge.mean.reduce((s, v) => s + v, 0)),
  mlSeOverSdMin: r2(Math.min(...seOverSd)),
  mlSeOverSdMax: r2(Math.max(...seOverSd)),
  lambdaLow: first.lambda,
  lambdaMax: last.lambda,
  lambdaJumpRho: firstRho((s) => s.lambda !== first.lambda),
};

export const LAB_PAYLOAD = {
  version: 2,
  meta: {
    seed: SEED,
    n: N,
    reps: MC_REPS,
    phi: PHI,
    folds: FOLDS,
    nsCap: NS_CAP,
    lambdas: LAMBDAS,
    estimators: ESTIMATORS,
    regimes: REGIMES,
    presets: PRESETS,
    defaultRho: DEFAULT_RHO,
  },
  truth: TRUTH.map(round),
  rho: RHO_STEPS,
  states: PAYLOAD_STATES,
  claims: CLAIMS,
};
export type LabPayload = typeof LAB_PAYLOAD;
