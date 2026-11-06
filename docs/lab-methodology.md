# Shrinkage lab: methodology

The lab at [`/lab/`](https://ibrahim-taha-axiom.vercel.app/lab/) ([Arabic](https://ibrahim-taha-axiom.vercel.app/ar/lab/)) is an **illustrative controlled experiment**. It shows what multicollinearity does to coefficient estimates and how ridge-type shrinkage trades a little bias for much less variance.

**What it is not.** It does not implement the researcher's published estimators: the penalised COM-Poisson estimators, LASSO, or the correlation-weighted elastic net of Taha et al. (2026). Its numbers are not results from any publication. The page says so in English and Arabic, next to the experiment.

Source code: `site/src/lab/` (`rng.ts`, `model.ts`, `metrics.ts`, `snapshots.ts`). Verification: `site/scripts/lab-verify.mjs` (`npm run lab:verify`, run in CI).

## 1. Data-generating process

Fixed seed `20261105`, n = 240 observations, four predictors.

```
z1..z4, e ~ N(0, 1)                         drawn once from the seed
x1 = z1,  xj = ρ·z1 + √(1−ρ²)·zj  (j = 2,3,4), then standardised
        → corr(x1, xj) ≈ ρ,  corr(xj, xk) ≈ ρ²  in the population
η  = 0.45 + 0.62·x1 + 0.44·x2 − 0.33·x3 + 0.15·x4
y  = round(exp(η + 0.45·e))                 rounded log-normal counts (overdispersed)
```

Correlation levels: ρ ∈ {0, 0.2, 0.4, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.93, 0.95, 0.97, 0.98, 0.99, 0.995} (15 levels).

**What is held fixed.** The random draws are fixed, not the data rows. When the collinearity dial moves, the predictors are rebuilt from the same latent draws, and so are the counts y, because y depends on the predictors. Differences between dial positions therefore come from collinearity and the estimators, never from fresh noise. (An earlier version said the rows stayed "the same", which was not accurate.)

## 2. Working model and estimators

All three estimators share one working model: a log link and the NB2 mean–variance relation Var(y) = μ + μ²/φ, with φ = 6.5 held fixed. It is deliberately **not** the data-generating process, because real estimators are rarely fitted to the model that made the data. Under this misspecification, maximum likelihood converges to pseudo-true values close to, but not equal to, the coefficients in η. That is why ML shows a small bias even at ρ = 0.

Penalised likelihood, fitted by Fisher scoring, with the intercept never penalised:

```
β̂_λ = argmax_β (1/n)·Σ ℓ_i(β) − (λ/2)·Σ_{j=1..4} β_j²
```

| Estimator | Penalty |
| --- | --- |
| Maximum likelihood (ML) | λ = 0 |
| Ridge (λ by CV) | λ chosen by 5-fold cross-validation on held-out Poisson deviance, over a grid of 11 values from 0 to 300 |
| Norm-scaled ridge | λ_ns = min(400, λ_cv / ‖β̂_ridge‖²). A simple plug-in rule in the spirit of Hoerl–Kennard–Baldwin. It uses no correlation weights and is not the researcher's estimator |

**Standard errors** are approximate and model-based: the square roots of the diagonal of the inverse penalised Fisher information. They ignore shrinkage bias and the misspecified variance, so the page prints the Monte Carlo standard deviation next to them. Across states, the ML standard error is 1.08–1.53 times the Monte Carlo SD.

**VIF** is computed from the sample correlation matrix of the standardised predictors on the displayed dataset.

## 3. Monte Carlo design

- 100 replicates at each of the 15 correlation levels.
- Replicate 0 is the dataset the page displays.
- Replicates 1–99 keep z1, so x1 is fixed across replicates, and redraw z2..z4 and e from a replicate-specific seed.
- λ for ridge is fixed per correlation level (the cross-validated value on the displayed data). λ_ns is recomputed per replicate from that replicate's ridge fit.

Reported per estimator and level:

- **Spread** = 2 × √(mean_j sd_j²): "± 2 SD", averaged over the four slopes.
- **RMSE** = root-mean-square error against the coefficients in η, averaged over the four slopes. Low spread is not the same as accuracy.

## 4. Results the page quotes

All values come from the shipped payload (rounded as displayed). `lab:verify` recomputes each one.

| ρ | VIF (max) | Spread ML / ridge / NS | RMSE ML / ridge / NS |
| --- | --- | --- | --- |
| 0 | 1.0 | 0.076 / 0.074 / 0.075 | 0.040 / 0.037 / 0.038 |
| 0.9 | 12.5 | 0.207 / 0.165 / 0.167 | 0.105 / 0.098 / 0.116 |
| 0.95 | 25.8 | 0.290 / 0.196 / 0.187 | 0.146 / 0.139 / 0.171 |
| 0.98 | 65.7 | 0.466 / 0.119 / 0.056 | 0.234 / 0.265 / 0.323 |
| 0.995 | 264.5 | 0.930 / 0.082 / 0.030 | 0.465 / 0.326 / 0.351 |

- The ML/ridge spread ratio is 1.0 at ρ = 0, 1.3 at 0.9, 1.5 at 0.95 and 11.3 at 0.995. It first reaches 2 at ρ = 0.98.
- VIF passes 5 at ρ = 0.8 and 10 at ρ = 0.9.
- At ρ = 0.98 ridge has *higher* RMSE than ML (0.265 vs 0.234). Shrinkage lowers variance but adds bias, and here the bias wins. The page states this rather than hiding it.
- Ridge preserves the sum of the slopes only roughly (0.89 vs 0.88 in truth), and one slope changes sign at high ρ.
- λ_cv is 0.03 for ρ ≤ 0.95 and 0.1 for ρ ≥ 0.98. λ_ns rises from 0.048 to 0.646.

## 5. What the experiment shows, and what it does not prove

**It shows** that, for this design, collinearity inflates the sampling variability of unpenalised estimates sharply as ρ approaches 1. A cross-validated ridge penalty contains that variability, at the cost of bias that can outweigh the gain at some levels.

**It does not prove** anything about other designs, sample sizes, link functions or penalties. It also says nothing about the researcher's published estimators, which are not implemented here, or about real data. It is one seeded simulation with 100 replicates per level.

## 6. Reproducibility

- Every state is computed at build time (`snapshots.ts`). The browser receives a precomputed JSON payload (about 15 KB) and never fits a model. CI checks that no model code is present in client JavaScript.
- `npm run lab:verify` rebuilds every state from the seed and checks the following:
  - the fits converged (the maximum |score| is about 1e-13);
  - spread equals 2·RMS(sd);
  - every number quoted in the English and Arabic text matches the payload (25 claims);
  - retired wording appears only in the revision note.
- The Arabic page uses the same payload and Latin digits.

## 7. Revision history

**2026-11-06** (Phase 4 audit). The previous version was corrected as follows:

- **Scoring step:** the score was divided by the working weight twice. It is now the correct NB2 score, (y − μ)/(1 + μ/φ) per unit of the linear predictor.
- **Monte Carlo:** recomputed at every correlation level with 100 replicates (previously 20). λ is fixed per level and λ_ns is recomputed per replicate.
- **Retired claims:** "≈0.05 at ρ = 0", ">10× above 0.95", "ML collapses", "same rows", "correlation-weighted (ridge)" and "20 replicates". They were replaced by the computed values above.
- **Labelling:** the experiment is now presented as illustrative and explicitly not the COM-Poisson method.
