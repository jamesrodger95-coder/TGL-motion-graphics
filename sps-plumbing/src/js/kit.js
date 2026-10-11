// Toolkit for the SPS film: the reel engine's core (easing, DOM helpers), plus
// curves, keyframes, a monotone spline and SVG helpers.
import { clamp, lerp, prog, bezier, css, el } from '../../../src/js/core.js';

export { clamp, lerp, prog, bezier, css, el };

export const K = {
  inOut: bezier(0.65, 0, 0.35, 1),
  out: bezier(0.16, 1, 0.3, 1), // fast arrival, long glide
  swoop: bezier(0.76, 0, 0.24, 1), // camera moves
  site: bezier(0.25, 0.1, 0.25, 1), // CSS `ease`
  fill: bezier(0.3, 0.12, 0.3, 1), // a level rising: steady, then settling
  back: (x, s = 1.7) => (x <= 0 ? 0 : x >= 1 ? 1 : 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2),
  /** Damped spring 0 -> 1. */
  spring: (x, freq = 2.2, damp = 6) =>
    x <= 0
      ? 0
      : x >= 1
        ? 1
        : 1 - Math.exp(-damp * x) * Math.cos(freq * Math.PI * 2 * x) * (1 - x ** 8),
};

/** Piecewise keyframes [[t, v, ease?], ...] (ease of the arriving key, default inOut). */
export function keys(list, t) {
  if (t <= list[0][0]) return list[0][1];
  for (let i = 1; i < list.length; i++) {
    const [t1, v1, e = K.inOut] = list[i];
    const [t0, v0] = list[i - 1];
    if (t <= t1) {
      const p = e(prog(t, t0, t1));
      return Array.isArray(v0) ? v0.map((v, j) => lerp(v, v1[j], p)) : lerp(v0, v1, p);
    }
  }
  return list[list.length - 1][1];
}

/** Monotone cubic (Fritsch–Carlson) through [t, v] points: smooth, no overshoot. */
export function monotone(pts) {
  const n = pts.length;
  const d = [],
    m = new Array(n).fill(0);
  for (let i = 0; i < n - 1; i++) d.push((pts[i + 1][1] - pts[i][1]) / (pts[i + 1][0] - pts[i][0]));
  m[0] = d[0];
  m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i++) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (d[i] === 0) {
      m[i] = m[i + 1] = 0;
      continue;
    }
    const a = m[i] / d[i],
      c = m[i + 1] / d[i],
      s = a * a + c * c;
    if (s > 9) {
      const tau = 3 / Math.sqrt(s);
      m[i] = tau * a * d[i];
      m[i + 1] = tau * c * d[i];
    }
  }
  return (t) => {
    if (t <= pts[0][0]) return pts[0][1];
    if (t >= pts[n - 1][0]) return pts[n - 1][1];
    let i = 0;
    while (t > pts[i + 1][0]) i++;
    const h = pts[i + 1][0] - pts[i][0],
      u = (t - pts[i][0]) / h;
    return (
      (2 * u ** 3 - 3 * u ** 2 + 1) * pts[i][1] +
      (u ** 3 - 2 * u ** 2 + u) * h * m[i] +
      (-2 * u ** 3 + 3 * u ** 2) * pts[i + 1][1] +
      (u ** 3 - u ** 2) * h * m[i + 1]
    );
  };
}

// ------------------------------------------------------------------ SVG
export const NS = 'http://www.w3.org/2000/svg';
/** Creates an SVG element with attributes. */
export function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const attrCache = new WeakMap();
/** Sets attributes, skipping unchanged values. */
export function attr(e, attrs) {
  let c = attrCache.get(e);
  if (!c) attrCache.set(e, (c = {}));
  for (const k in attrs) {
    const v = String(attrs[k]);
    if (c[k] !== v) {
      c[k] = v;
      e.setAttribute(k, v);
    }
  }
}

/** Deterministic pseudo-random sequence (mulberry32). */
export function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
