/**
 * Shrinkage lab — the statistics behind /lab/.
 *
 * The experiment is deliberately *controlled*: the response y and the random
 * errors are drawn once from a fixed seed and then frozen. Only the correlation
 * between the four predictors changes as the visitor moves the collinearity
 * dial. So anything that moves on screen is caused by collinearity and by the
 * estimator — never by fresh noise. Every number on the page is computed from
 * this module; nothing is hard-coded for effect.
 *
 * Data-generating process
 *   z1..z4, e        ~ N(0,1), fixed                                          (seed 20261105)
 *   x1 = z1, x_j = ρ·z1 + √(1−ρ²)·z_j          for j = 2,3,4   (exact ρ)
 *   η  = 0.45 + 0.62·x1 + 0.44·x2 − 0.33·x3 + 0.15·x4
 *   y  = round(exp(η + 0.45·e))                                 (overdispersed counts)
 *
 * Estimators (all fitted to the same y, quasi-likelihood IRLS, intercept free)
 *   ml     maximum likelihood, no penalty
 *   ridge  ridge with λ chosen by k-fold cross-validation
 *   cw     correlation-weighted ridge, λ = λ*·(1/Σα²)  — the family the
 *          researcher develops for COM-Poisson regression (Taha et al., 2026)
 *
 * Working variance is negative-binomial: Var(y) = μ + μ²/φ, which is why the
 * standard errors below are not Poisson SEs.
 */
import { gauss, mulberry32 } from './rng';

export const N = 240;
export const SEED = 20261105;
export const TRUE_BETA = [0.45, 0.62, 0.44, -0.33, 0.15];
export const PHI = 6.5; // negative-binomial dispersion of the working model
export const BASE_RHO = 0.9;

export interface Dataset {
  rho: number;
  x: number[][]; // n × 4, standardised
  y: number[];
  gram: number[][]; // mean of [1, x][1, x]ᵀ
  vif: number[];
}

const rand = mulberry32(SEED);
const Z: number[][] = [];
const E: number[] = [];
for (let i = 0; i < N; i += 1) {
  Z.push([gauss(rand), gauss(rand), gauss(rand), gauss(rand)]);
  E.push(gauss(rand));
}

/** Build the design at a given collinearity level. y is identical for every ρ. */
export function datasetAt(rho: number, replicate = 0): Dataset {
  // replicate 0 is the published dataset; >0 is only used by the Monte-Carlo
  // script to measure the sampling spread of each estimator.
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
  const R = gram.slice(1).map((row) => row.slice(1));
  const vif = [];
  for (let j = 0; j < 4; j += 1) {
    const e = Array(4).fill(0);
    e[j] = 1;
    vif.push(solve(R, e)[j]);
  }
  return { rho: r, x, y, gram, vif };
}

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

/** NB2 working weights: w = μ / (1 + μ/φ). */
const w = (mu: number) => mu / (1 + mu / PHI);

/** Penalised quasi-likelihood IRLS. Returns coefficients (intercept first). */
export function fit(x: number[][], y: number[], lambda: number, maxIter = 50): number[] {
  const n = x.length;
  const beta = Array(5).fill(0);
  beta[0] = Math.log(Math.max(1e-3, y.reduce((s, v) => s + v, 0) / n));
  for (let iter = 0; iter < maxIter; iter += 1) {
    const g = Array(5).fill(0);
    const H: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
    for (let i = 0; i < n; i += 1) {
      const z = [1, ...x[i]];
      const eta = z.reduce((s, v, j) => s + v * beta[j], 0);
      const mu = Math.exp(Math.min(20, Math.max(-20, eta)));
      const wi = w(mu);
      const r = (y[i] - mu) / wi; // score, scaled by weight
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
    // step halving: without it the unpenalised fit can run away at ρ→1
    let scaled = 1;
    for (let a = 0; a < 5; a += 1) scaled = Math.min(scaled, 2 / Math.max(1e-9, Math.abs(step[a])));
    let move = 0;
    for (let a = 0; a < 5; a += 1) {
      beta[a] += Math.max(-2, Math.min(2, step[a] * scaled));
      move += Math.abs(step[a] * scaled);
    }
    if (move < 1e-10) break;
  }
  return beta;
}

/** Standard errors from the penalised information matrix. */
export function se(x: number[][], beta: number[], lambda: number): number[] {
  const n = x.length;
  const H: number[][] = Array.from({ length: 5 }, () => Array(5).fill(0));
  for (let i = 0; i < n; i += 1) {
    const z = [1, ...x[i]];
    const eta = z.reduce((s, v, j) => s + v * beta[j], 0);
    const mu = Math.exp(Math.min(20, Math.max(-20, eta)));
    const wi = w(mu);
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

/** K-fold CV on the NB deviance. */
export function cv(ds: Dataset, lambdas: number[], folds = 5): number[] {
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
        const z = [1, ...ds.x[i]];
        const eta = z.reduce((s, v, j) => s + v * beta[j], 0);
        const mu = Math.exp(Math.min(20, Math.max(-20, eta)));
        const yv = ds.y[i];
        dev += 2 * (yv * Math.log(Math.max(yv, 1e-9) / mu) - (yv - mu));
      }
    }
    return dev / n;
  });
}

export interface Estimate {
  id: 'ml' | 'ridge' | 'cw';
  beta: number[];
  se: number[];
  lambda: number;
}

export interface Snapshot {
  ds: Dataset;
  estimates: Estimate[];
  cv: number[];
  lambdas: number[];
  chosen: number;
  maxSe: number;
  maxDev: number; // largest absolute deviation from the true coefficient
}

export const LAMBDAS = [0, 0.01, 0.03, 0.1, 0.3, 1, 3, 10, 30, 100, 300];

export function snapshot(rho: number, lambdaOverride?: number): Snapshot {
  const ds = datasetAt(rho);
  const devs = cv(ds, LAMBDAS);
  let best = 0;
  for (let i = 1; i < devs.length; i += 1) if (devs[i] < devs[best]) best = i;
  const chosenLambda = lambdaOverride ?? LAMBDAS[best];
  const cwLambda = Math.min(400, chosenLambda * (1 / Math.max(1e-3, sumSq(fit(ds.x, ds.y, chosenLambda).slice(1)))));

  const mk = (id: Estimate['id'], lambda: number): Estimate => {
    const beta = fit(ds.x, ds.y, lambda);
    return { id, beta, se: se(ds.x, beta, lambda), lambda };
  };
  const estimates = [mk('ml', 0), mk('ridge', chosenLambda), mk('cw', cwLambda)];
  const maxSe = Math.max(...estimates.map((e) => Math.max(...e.se.slice(1))));
  const maxDev = Math.max(...estimates.map((e) => Math.max(...e.beta.slice(1).map((b, j) => Math.abs(b - TRUE_BETA[j + 1])))));
  return { ds, estimates, cv: devs, lambdas: LAMBDAS, chosen: chosenLambda, maxSe, maxDev };
}

const sumSq = (v: number[]) => v.reduce((s, x) => s + x * x, 0);
