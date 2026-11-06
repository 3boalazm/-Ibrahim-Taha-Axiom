/**
 * SVG renderers for the shrinkage lab.
 *
 * Pure functions from precomputed payload values to SVG markup. The same code
 * draws the first state on the server (so the figures exist without
 * JavaScript) and redraws in the browser when the dial moves. Nothing here
 * fits, simulates or estimates anything: it only places numbers that were
 * computed at build time. Keep it free of imports from model.ts.
 */

export type EstimatorKey = 'ml' | 'ridge' | 'ns';
export const SERIES: EstimatorKey[] = ['ml', 'ridge', 'ns'];

export interface DrawEstimate {
  beta: number[];
}
export interface DrawMc {
  mean: number[];
  sd: number[];
  rmse: number[];
  spread: number;
  rmseAll: number;
}
export interface DrawState {
  rho: number;
  lambda: number;
  cvBest: number;
  cv: number[];
  est: Record<EstimatorKey, DrawEstimate>;
  mc: { est: Record<EstimatorKey, DrawMc> };
}

const f = (v: number, d = 1) => Number(v.toFixed(d));
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
export const fmtRho = (r: number) => (r === 0 ? '0' : r.toFixed(3).replace(/0+$/, '').replace(/\.$/, '').replace(/^0/, ''));

/** Symmetric axis limit that contains every estimate and every MC mean ± 2 SD. */
export function coefDomain(states: DrawState[]): number {
  let m = 0;
  for (const s of states)
    for (const k of SERIES) {
      for (const b of s.est[k].beta) m = Math.max(m, Math.abs(b));
      s.mc.est[k].mean.forEach((mu, j) => (m = Math.max(m, Math.abs(mu) + 2 * s.mc.est[k].sd[j])));
    }
  return Math.min(2.5, Math.ceil(m * 10) / 10 + 0.1);
}

/*
 * Motion keys: data-k gives chart elements an identity across redraws so the lab can
 * move them from the previous precomputed state to the selected one (FLIP, see
 * lib/motion.mjs). data-ghost marks lines whose shape changes: those cross-fade, so
 * no curve that was never computed is ever drawn. Keys change nothing in the values.
 */

/**
 * Coefficient panel: for each slope, one row per estimator showing the estimate
 * on the displayed dataset (dot) and the Monte Carlo mean ± 2 SD (whisker),
 * against the true value (dashed line) and zero.
 */
export function coefSvg(s: DrawState, truth: number[], domain: number, labels: { truth: string; zero: string }): string {
  const W = 640;
  const left = 46;
  const right = 16;
  const rowH = 15;
  const groupGap = 20;
  const top = 26;
  const groupH = SERIES.length * rowH;
  const H = top + truth.length * groupH + (truth.length - 1) * groupGap + 30;
  const x = (v: number) => left + ((Math.max(-domain, Math.min(domain, v)) + domain) / (2 * domain)) * (W - left - right);
  const out: string[] = [];
  out.push(`<svg viewBox="0 0 ${W} ${H}" class="labfig" role="presentation" focusable="false">`);
  // grid: ticks every 0.5
  for (let t = -Math.floor(domain * 2) / 2; t <= domain + 1e-9; t += 0.5) {
    const tx = f(x(t));
    out.push(`<line class="labfig__grid${Math.abs(t) < 1e-9 ? ' is-zero' : ''}" x1="${tx}" x2="${tx}" y1="${top - 8}" y2="${H - 24}"/>`);
    out.push(`<text class="labfig__tick" x="${tx}" y="${H - 8}" text-anchor="middle">${Math.abs(t) < 1e-9 ? '0' : t.toFixed(1)}</text>`);
  }
  truth.forEach((tv, j) => {
    const g0 = top + j * (groupH + groupGap);
    out.push(`<text class="labfig__name" x="6" y="${f(g0 + groupH / 2 + 4)}">x${j + 1}</text>`);
    const tx = f(x(tv));
    out.push(`<line class="labfig__truth" x1="${tx}" x2="${tx}" y1="${g0 - 6}" y2="${g0 + groupH + 2}"/>`);
    if (j === 0) out.push(`<text class="labfig__truthlabel" x="${tx}" y="${g0 - 10}" text-anchor="middle">${esc(labels.truth)} ${tv.toFixed(2)}</text>`);
    SERIES.forEach((k, i) => {
      const cy = f(g0 + i * rowH + rowH / 2);
      const mc = s.mc.est[k];
      const lo = mc.mean[j] - 2 * mc.sd[j];
      const hi = mc.mean[j] + 2 * mc.sd[j];
      const clipL = lo < -domain;
      const clipR = hi > domain;
      out.push(`<line class="labfig__whisker is-${k}" data-k="c-wh-${k}-${j}" x1="${f(x(lo))}" x2="${f(x(hi))}" y1="${cy}" y2="${cy}"/>`);
      if (!clipL) out.push(`<line class="labfig__cap is-${k}" data-k="c-capl-${k}-${j}" x1="${f(x(lo))}" x2="${f(x(lo))}" y1="${cy - 3}" y2="${cy + 3}"/>`);
      if (!clipR) out.push(`<line class="labfig__cap is-${k}" data-k="c-capr-${k}-${j}" x1="${f(x(hi))}" x2="${f(x(hi))}" y1="${cy - 3}" y2="${cy + 3}"/>`);
      out.push(`<rect class="labfig__mean is-${k}" data-k="c-mean-${k}-${j}" x="${f(x(mc.mean[j]) - 1)}" y="${cy - 4}" width="2" height="8"/>`);
      out.push(`<circle class="labfig__dot is-${k}" data-k="c-dot-${k}-${j}" cx="${f(x(s.est[k].beta[j]))}" cy="${cy}" r="4.2"/>`);
    });
  });
  out.push('</svg>');
  return out.join('');
}

/** Cross-validation curve over the λ grid (grid points equally spaced, not to scale). */
export function cvSvg(s: DrawState, lambdas: number[], labels: { axis: string }): string {
  const W = 360;
  const H = 170;
  const padL = 14;
  const padR = 14;
  const padT = 16;
  const padB = 40;
  const dev = s.cv;
  const min = Math.min(...dev);
  const max = Math.max(...dev);
  const x = (i: number) => padL + (i * (W - padL - padR)) / (dev.length - 1);
  const y = (v: number) => padT + (1 - (v - min) / Math.max(1e-9, max - min)) * (H - padT - padB);
  const out: string[] = [`<svg viewBox="0 0 ${W} ${H}" class="labfig" role="presentation" focusable="false">`];
  out.push(`<line class="labfig__grid" x1="${padL}" x2="${W - padR}" y1="${H - padB}" y2="${H - padB}"/>`);
  out.push(`<polyline class="labfig__cv" data-k="v-line" data-ghost points="${dev.map((v, i) => `${f(x(i))},${f(y(v))}`).join(' ')}"/>`);
  dev.forEach((v, i) => {
    const chosen = i === s.cvBest;
    out.push(`<circle class="labfig__cvdot${chosen ? ' is-chosen' : ''}" data-k="v-dot-${i}" cx="${f(x(i))}" cy="${f(y(v))}" r="${chosen ? 5 : 2.6}"/>`);
  });
  lambdas.forEach((l, i) => {
    if (i % 2 === 0 || i === s.cvBest)
      out.push(`<text class="labfig__tick${i === s.cvBest ? ' is-chosen' : ''}" x="${f(x(i))}" y="${H - padB + 14}" text-anchor="middle">${l}</text>`);
  });
  out.push(`<text class="labfig__axis" x="${W / 2}" y="${H - 6}" text-anchor="middle">${esc(labels.axis)}</text>`);
  out.push('</svg>');
  return out.join('');
}

/** Monte Carlo panel: spread (± 2 SD) or RMSE of each estimator at every dial position. */
export function mcSvg(states: DrawState[], metric: 'spread' | 'rmse', current: number, labels: { axis: string }): string {
  const W = 360;
  const H = 190;
  const padL = 34;
  const padR = 12;
  const padT = 14;
  const padB = 40;
  const val = (st: DrawState, k: EstimatorKey) => (metric === 'spread' ? st.mc.est[k].spread : st.mc.est[k].rmseAll);
  const maxV = Math.max(...states.flatMap((st) => SERIES.map((k) => val(st, k)))) * 1.06;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (states.length - 1);
  const y = (v: number) => padT + (1 - v / maxV) * (H - padT - padB);
  const out: string[] = [`<svg viewBox="0 0 ${W} ${H}" class="labfig" role="presentation" focusable="false">`];
  const step = maxV > 0.6 ? 0.2 : 0.1;
  for (let t = 0; t <= maxV + 1e-9; t += step) {
    out.push(`<line class="labfig__grid${t === 0 ? ' is-zero' : ''}" x1="${padL}" x2="${W - padR}" y1="${f(y(t))}" y2="${f(y(t))}"/>`);
    out.push(`<text class="labfig__tick" x="${padL - 6}" y="${f(y(t) + 3)}" text-anchor="end">${t.toFixed(1)}</text>`);
  }
  out.push(`<line class="labfig__marker" data-k="m-marker" x1="${f(x(current))}" x2="${f(x(current))}" y1="${padT - 4}" y2="${H - padB}"/>`);
  for (const k of SERIES) {
    out.push(`<polyline class="labfig__line is-${k}" data-k="m-line-${k}" data-ghost points="${states.map((st, i) => `${f(x(i))},${f(y(val(st, k)))}`).join(' ')}"/>`);
    out.push(`<circle class="labfig__dot is-${k}" data-k="m-dot-${k}" cx="${f(x(current))}" cy="${f(y(val(states[current], k)))}" r="3.6"/>`);
  }
  const fixed = states.map((st, i) => (i === 0 || i === states.length - 1 || [0.6, 0.9].includes(st.rho) ? i : -1)).filter((i) => i >= 0);
  const show = new Set(fixed);
  if (!fixed.some((i) => Math.abs(i - current) <= 1)) show.add(current);
  states.forEach((st, i) => {
    if (show.has(i))
      out.push(`<text class="labfig__tick${i === current ? ' is-chosen' : ''}" x="${f(x(i))}" y="${H - padB + 14}" text-anchor="middle">${fmtRho(st.rho)}</text>`);
  });
  out.push(`<text class="labfig__axis" x="${(W + padL) / 2}" y="${H - 6}" text-anchor="middle">${esc(labels.axis)}</text>`);
  out.push('</svg>');
  return out.join('');
}
