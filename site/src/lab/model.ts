/**
 * Shrinkage lab — the statistics behind /lab/.
 *
 * This is an ILLUSTRATIVE, CONTROLLED EXPERIMENT. It is not an implementation of
 * the researcher's published estimators (the correlation-weighted elastic net
 * and penalised COM-Poisson estimators of Taha et al., 2026), and its numbers
 * are not results from any publication.
 *
 * What is held fixed: every random draw. The latent normals z1..z4 and the
 * error e are drawn once from a fixed seed. Moving the collinearity dial
 * rebuilds the predictors from those same draws — and therefore the counts y,
 * which depend on the predictors. So differences between dial positions come
 * from collinearity and from the estimators, never from fresh noise.
 *
 * Data-generating process (seed 20261105, n = 240)
 *   z1..z4, e ~ N(0, 1), drawn once
 *   x1 = z1,  x_j = ρ·z1 + √(1−ρ²)·z_j  (j = 2, 3, 4), then standardised
 *     → corr(x1, x_j) ≈ ρ and corr(x_j, x_k) ≈ ρ² in the population
 *   η = 0.45 + 0.62·x1 + 0.44·x2 − 0.33·x3 + 0.15·x4
 *   y = round(exp(η + 0.45·e))      rounded log-normal counts (overdispersed)
 *
 * Working model shared by all three estimators
 *   log link and the NB2 mean–variance relation Var(y) = μ + μ²/φ, with φ = 6.5
 *   held fixed. It is a working model, not the data-generating process — on
 *   purpose: real estimators are rarely fitted to the model that made the data.
 *
 * Estimators — penalised likelihood under that working model, fitted by Fisher
 * scoring; the intercept is never penalised:
 *   β̂_λ = argmax_β  (1/n)·Σ ℓ_i(β) − (λ/2)·Σ_{j=1..4} β_j²
 *   ml     λ = 0 (maximum likelihood under the working model)
 *   ridge  λ chosen by 5-fold cross-validation on held-out Poisson deviance
 *   ns     "norm-scaled ridge": λ_ns = min(400, λ_cv / ‖β̂_ridge‖²) — a simple
 *          plug-in rule in the spirit of Hoerl–Kennard–Baldwin. It uses no
 *          correlation weights and is NOT the researcher's estimator.
 *
 * Standard errors are approximate and model-based: the square roots of the
 * diagonal of the inverse penalised Fisher information. They ignore shrinkage
 * bias and the misspecified variance, which is why the page prints the Monte
 * Carlo standard deviation next to them.
 *
 * Revision (2026-11-06): the score used in fitting was divided by the working
 * weight twice; it is now the correct NB2 score (y − μ)/(1 + μ/φ) per unit of
 * the linear predictor. See docs/lab-methodology.md.
 */
import { gauss, mulberry32 } from './rng';

export const N = 240;
export const SEED = 20261105;
export const TRUE_BETA = [0.45, 0.62, 0.44, -0.33, 0.15];
export const PHI = 6.5; // negative-binomial dispersion of the working model
export const BASE_RHO = 0.9;
export const FOLDS = 5;
export const NS_CAP = 400;

export interface Dataset {
  rho: number;
  x: number[][]; // n × 4, standardised
  y: number[];
  gram: number[][]; // mean of [1, x][1, x]ᵀ
  vif: number[];
  /** Sample correlations: mean corr(x1, x_j) and mean corr(x_j, x_k), j, k ≥ 2. */
  corr: { x1: number; others: number };
}

const rand = mulberry32(SEED);
const Z: number[][] = [];
const E: number[] = [];
for (let i = 0; i < N; i += 1) {
  Z.push([gauss(rand), gauss(rand), gauss(rand), gauss(rand)]);
  E.push(gauss(rand));
}

/**
 * Build the design at a given collinearity level.
 * Replicate 0 is the dataset the page displays. Replicates > 0 are used only by
 * the Monte Carlo panel: they keep z1 (so x1 is fixed across replicates) and
 * redraw z2..z4 and e from a replicate-specific seed.
 */
export function datasetAt(rho: number, replicate = 0): Dataset {
  const r = Math.min(0.9985, Math.max(0, rho));
  const s = Math.sqrt(Math.max(0, 1 - r * r));
  const gen = mulberry32(SEED + replicate * 7919);
  const eps = replicate === 0 ? E : E.map(() => gauss(gen));
  const noise = replicate === 0 ? null : Z.map(() => [gauss(gen), gauss(gen), gauss(gen)]);
  const raw = Z.map(([z1, z2, z3, z4], i) => {
    const [n2, n3, n4] = noise ? noise[i] : [z2, z3, z4];
    return [z1, r * z1 + s * n2, r * z1 + s * n3, r * z1 + s * n4];
  });
  const means = Array(4).fill(0);
  const sds = Array(4).fill(0);
  for (const row of raw) for (let j = 0; j < 4; j += 1) means[j] += row[j] / N;
  for (const row of raw) for (let j = 0; j < 4; j += 1) sds[j] += (row[j] - means[j]) ** 2 / N;
  for (let j = 0; j < 4; j += 1) sds[j] = Math.sqrt(sds[j]) || 1;
  const x = raw.map((row) => row.map((v, j) => (v - means[j]) / sds[j]));

  const y = x.map((row, i) => {
    const eta = TRUE_BETA[0] + row.reduce((acc, v, j) => acc + TRUE_BETA[j + 1] * v, 0) + 0.45 * eps[i];
    return Math.max(0, Math.round(Math.exp(eta)));
  });

  const gram: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (const row of x) {
    const z = [1, ...row];
    for (let a = 0; a < 5; a += 1) for (let b = 0; b < 5; b += 1) gram[a][b] += (z[a] * z[b]) / N;
  }
  // x is standardised, so the lower-right 4×4 block of the Gram matrix is the
  // sample correlation matrix R, and VIF_j is the j-th diagonal entry of R⁻¹.
  const R = gram.slice(1).map((row) => row.slice(1));
  const vif = [];
  for (let j = 0; j < 4; j += 1) {
    const e = Array(4).fill(0);
    e[j] = 1;
    vif.push(solve(R, e)[j]);
  }
  const x1 = (R[0][1] + R[0][2] + R[0][3]) / 3;
  const others = (R[1][2] + R[1][3] + R[2][3]) / 3;
  return { rho: r, x, y, gram, vif, corr: { x1, others } };
}

/** Gauss–Jordan elimination with partial pivoting (small dense systems only). */
export function solve(A: number[][], b: number[]): number[] {
  const m = A.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let col = 0; col < m; col += 1) {
    let piv = col;
    for (let r = col + 1; r < m; r += 1) if (Math.abs(M[r][col]) > Math.abs(M[piv][col])) piv = r;
    if (piv !== col) [M[col], M[piv]] = [M[piv], M[col]];
    const d = M[col][col] || 1e-12;
    for (let c = col; c <= m; c += 1) M[col][c] /= d;
    for (let r = 0; r < m; r += 1) {
      if (r === col) continue;
      const f = M[r][col];
      if (!f) continue;
      for (let c = col; c <= m; c += 1) M[r][c] -= f * M[col][c];
    }
  }
  return M.map((row) => row[m]);
}

/** NB2 working weight (Fisher information per unit of η²): w = μ / (1 + μ/φ). */
const w = (mu: number) => mu / (1 + mu / PHI);
const muOf = (z: number[], beta: number[]) => Math.exp(Math.min(20, Math.max(-20, z.reduce((s, v, j) => s + v * beta[j], 0))));

/**
 * Gradient of the penalised objective (1/n)·Σℓ_i − (λ/2)·Σβ_j² (intercept free).
 * For the NB2 log-link model the score contribution is z·(y − μ)/(1 + μ/φ).
 */
export function gradient(x: number[][], y: number[], beta: number[], lambda: number): number[] {
  const n = x.length;
  const g = Array(5).fill(0);
  for (let i = 0; i < n; i += 1) {
    const z = [1, ...x[i]];
    const mu = muOf(z, beta);
    const r = (y[i] - mu) / (1 + mu / PHI);
    for (let a = 0; a < 5; a += 1) g[a] += (z[a] * r) / n;
  }
  for (let a = 1; a < 5; a += 1) g[a] -= lambda * beta[a];
  return g;
}

/** Largest absolute component of the penalised gradient: ≈ 0 at a converged fit. */
export function scoreResidual(x: number[][], y: number[], beta: number[], lambda: number): number {
  return Math.max(...gradient(x, y, beta, lambda).map(Math.abs));
}

/** Penalised Fisher scoring. Returns coefficients (intercept first). */
export function fit(x: number[][], y: number[], lambda: number, maxIter = 100): number[] {
  const n = x.length;
  const beta = Array(5).fill(0);
  beta[0] = Math.log(Math.max(1e-3, y.reduce((s, v) => s + v, 0) / n));
  for (let iter = 0; iter < maxIter; iter += 1) {
    const g = Array(5).fill(0);
    const H: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (let i = 0; i < n; i += 1) {
      const z = [1, ...x[i]];
      const mu = muOf(z, beta);
      const wi = w(mu);
      const r = (y[i] - mu) / (1 + mu / PHI); // NB2 score per unit of η
      for (let a = 0; a < 5; a += 1) {
        g[a] += (z[a] * r) / n;
        for (let b = 0; b < 5; b += 1) H[a][b] += (z[a] * z[b] * wi) / n;
      }
    }
    for (let a = 1; a < 5; a += 1) {
      g[a] -= lambda * beta[a];
      H[a][a] += lambda;
    }
    const step = solve(H, g);
    // Step cap: the whole step is scaled so that no coefficient moves by more
    // than 2 in one iteration (guards early iterations at ρ → 1). Near the
    // optimum the cap is inactive and this is plain Fisher scoring.
    let scaled = 1;
    for (let a = 0; a < 5; a += 1) scaled = Math.min(scaled, 2 / Math.max(1e-9, Math.abs(step[a])));
    let move = 0;
    for (let a = 0; a < 5; a += 1) {
      beta[a] += step[a] * scaled;
      move += Math.abs(step[a] * scaled);
    }
    if (move < 1e-12) break;
  }
  return beta;
}

/** Approximate, model-based standard errors from the inverse penalised Fisher information. */
export function se(x: number[][], beta: number[], lambda: number): number[] {
  const n = x.length;
  const H: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let i = 0; i < n; i += 1) {
    const z = [1, ...x[i]];
    const wi = w(muOf(z, beta));
    for (let a = 0; a < 5; a += 1) for (let b = 0; b < 5; b += 1) H[a][b] += (z[a] * z[b] * wi) / n;
  }
  for (let a = 1; a < 5; a += 1) H[a][a] += lambda;
  const out: number[] = [];
  for (let c = 0; c < 5; c += 1) {
    const e = Array(5).fill(0);
    e[c] = 1;
    out.push(Math.sqrt(Math.max(0, solve(H, e)[c] / n)));
  }
  return out;
}

/**
 * K-fold cross-validation (interleaved folds: row i belongs to fold i mod K).
 * The loss is the held-out Poisson deviance 2·Σ[y·log(y/μ) − (y − μ)] per row,
 * a common dispersion-free loss for count predictions.
 */
export function cv(ds: Dataset, lambdas: number[], folds = FOLDS): number[] {
  const n = ds.y.length;
  return lambdas.map((lambda) => {
    let dev = 0;
    for (let k = 0; k < folds; k += 1) {
      const trainX: number[][] = [];
      const trainY: number[] = [];
      const testIdx: number[] = [];
      for (let i = 0; i < n; i += 1) {
        if (i % folds === k) testIdx.push(i);
        else {
          trainX.push(ds.x[i]);
          trainY.push(ds.y[i]);
        }
      }
      const beta = fit(trainX, trainY, lambda);
      for (const i of testIdx) {
        const mu = muOf([1, ...ds.x[i]], beta);
        const yv = ds.y[i];
        dev += 2 * (yv * Math.log(Math.max(yv, 1e-9) / mu) - (yv - mu));
      }
    }
    return dev / n;
  });
}

export const LAMBDAS = [0, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100, 300];

/** Index of the λ with the smallest cross-validated deviance (first one on ties). */
export function argmin(values: number[]): number {
  let best = 0;
  for (let i = 1; i < values.length; i += 1) if (values[i] < values[best]) best = i;
  return best;
}

const squaredNorm = (v: number[]) => v.reduce((s, x) => s + x * x, 0);

/** The norm-scaled ridge penalty, from the ridge slopes at the cross-validated λ. */
export function nsLambda(lambdaCv: number, ridgeSlopes: number[]): number {
  return Math.min(NS_CAP, lambdaCv / Math.max(1e-3, squaredNorm(ridgeSlopes)));
}

export type EstimatorId = 'ml' | 'ridge' | 'ns';
export const ESTIMATORS: EstimatorId[] = ['ml', 'ridge', 'ns'];
