/**
 * Build-time Monte Carlo for the shrinkage lab.
 *
 * The question the lab asks is a property of an estimator, not of one dataset:
 * how much would the estimate move if the study were run again? So, at EVERY
 * collinearity level the dial can show, the three estimators are refitted to
 * MC_REPS redrawn samples and summarised:
 *
 *   mean_j, sd_j        mean and standard deviation (n − 1) of β̂_j across replicates
 *   rmse_j              √ mean (β̂_j − β_j)², i.e. accuracy against the truth
 *   spread              2 × √(mean_j sd_j²)  — "± 2 SD", averaged over the 4 slopes
 *   rmseAll             √(mean_j rmse_j²)
 *
 * Design: replicate r redraws z2..z4 and e (x1 is held fixed, see model.ts).
 * The ridge λ is the cross-validated λ of the displayed dataset at that ρ and
 * is held fixed across replicates; the norm-scaled λ is recomputed in every
 * replicate from that replicate's ridge fit.
 *
 * Everything is seeded: identical numbers on every build and in both languages.
 */
import { TRUE_BETA, datasetAt, fit, nsLambda, type EstimatorId } from './model';

export const MC_REPS = 100;

export interface McStats {
  mean: number[];
  sd: number[];
  rmse: number[];
  spread: number;
  rmseAll: number;
}

export interface McPoint {
  rho: number;
  lambda: number;
  vifMean: number;
  est: Record<EstimatorId, McStats>;
}

function summarise(runs: number[][]): McStats {
  const R = runs.length;
  const mean = [0, 1, 2, 3].map((j) => runs.reduce((s, v) => s + v[j], 0) / R);
  const sd = [0, 1, 2, 3].map((j) => Math.sqrt(runs.reduce((s, v) => s + (v[j] - mean[j]) ** 2, 0) / (R - 1)));
  const rmse = [0, 1, 2, 3].map((j) => Math.sqrt(runs.reduce((s, v) => s + (v[j] - TRUE_BETA[j + 1]) ** 2, 0) / R));
  const rms = (v: number[]) => Math.sqrt(v.reduce((s, x) => s + x * x, 0) / v.length);
  return { mean, sd, rmse, spread: 2 * rms(sd), rmseAll: rms(rmse) };
}

/** Monte Carlo summary at one collinearity level, given the cross-validated λ. */
export function monteCarlo(rho: number, lambda: number, reps = MC_REPS): McPoint {
  const runs: Record<EstimatorId, number[][]> = { ml: [], ridge: [], ns: [] };
  let vifSum = 0;
  for (let r = 1; r <= reps; r += 1) {
    const ds = datasetAt(rho, r);
    vifSum += Math.max(...ds.vif);
    const ridge = fit(ds.x, ds.y, lambda).slice(1);
    runs.ml.push(fit(ds.x, ds.y, 0).slice(1));
    runs.ridge.push(ridge);
    runs.ns.push(fit(ds.x, ds.y, nsLambda(lambda, ridge)).slice(1));
  }
  return {
    rho,
    lambda,
    vifMean: vifSum / reps,
    est: { ml: summarise(runs.ml), ridge: summarise(runs.ridge), ns: summarise(runs.ns) },
  };
}
