/**
 * Standard normal density and distribution function for the home-page
 * figure (server render + browser + tests). Real values, no decoration:
 * Φ uses the Abramowitz–Stegun 7.1.26 erf approximation (|error| < 1.5e-7).
 */
export const Z_MIN = -3.5;
export const Z_MAX = 3.5;

export const pdf = (z) => Math.exp(-0.5 * z * z) / Math.sqrt(2 * Math.PI);

export function erf(x) {
  const s = Math.sign(x);
  const a = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * a);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a);
  return s * y;
}

export const cdf = (z) => 0.5 * (1 + erf(z / Math.SQRT2));

/** Figure geometry: viewBox width/height and the plot frame inside it. */
export const FRAME = { w: 480, h: 220, left: 16, right: 464, top: 18, base: 186 };

export const xOf = (z) => FRAME.left + ((z - Z_MIN) / (Z_MAX - Z_MIN)) * (FRAME.right - FRAME.left);
export const zOf = (x) => Z_MIN + ((x - FRAME.left) / (FRAME.right - FRAME.left)) * (Z_MAX - Z_MIN);
const PEAK = pdf(0);
export const yOf = (d) => FRAME.base - (d / PEAK) * (FRAME.base - FRAME.top);

const STEP = 0.05;
const pts = (a, b) => {
  const out = [];
  for (let z = a; z < b - 1e-9; z += STEP) out.push(z);
  out.push(b);
  return out;
};
const f = (v) => v.toFixed(1);

/** The density curve as an SVG path. */
export const densityPath = () => pts(Z_MIN, Z_MAX).map((z, i) => `${i ? 'L' : 'M'}${f(xOf(z))} ${f(yOf(pdf(z)))}`).join('');

/** The area under the curve from Z_MIN to z (closed path). */
export function areaPath(z) {
  const zz = Math.max(Z_MIN, Math.min(Z_MAX, z));
  const line = pts(Z_MIN, zz).map((v) => `L${f(xOf(v))} ${f(yOf(pdf(v)))}`).join('');
  return `M${f(xOf(Z_MIN))} ${FRAME.base}${line}L${f(xOf(zz))} ${FRAME.base}Z`;
}

/** Clamp and round z to two decimals (the precision shown). */
export const clampZ = (z) => Math.round(Math.max(Z_MIN, Math.min(Z_MAX, z)) * 100) / 100;
