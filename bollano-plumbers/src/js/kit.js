// Toolkit for the Bollano Plumbers film. Reuses the reel engine's core
// (easing, DOM helpers, hash) and adds curves, springs, keyframes, the brand's
// colours and a water-surface function shared by the drop, the lettering and
// the flood.
import { clamp, lerp, prog, bezier, css, el, hash } from '../../../src/js/core.js';

export { clamp, lerp, prog, bezier, css, el, hash };

export const K = {
  settle: bezier(0.16, 1, 0.3, 1), // fast arrival, long glide
  inOut: bezier(0.65, 0, 0.35, 1),
  swoop: bezier(0.83, 0, 0.17, 1), // strong in-out for the whip and the flood
  site: bezier(0.25, 0.1, 0.25, 1), // CSS `ease`
  inQuad: (x) => x * x,
  outQuad: (x) => 1 - (1 - x) ** 2,
  inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outBack: (x, s = 1.7) => (x >= 1 ? 1 : 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2),
  /** Damped spring from 0 to 1: overshoots and rings out. */
  spring: (x, freq = 2.6, damp = 6) =>
    x <= 0
      ? 0
      : x >= 1
        ? 1
        : 1 - Math.exp(-damp * x) * Math.cos(freq * Math.PI * 2 * x) * (1 - x ** 6),
};

/** Squash and stretch for a landing or a pop: returns [sx, sy] around 1. */
export function squash(p, amount = 0.22) {
  if (p <= 0) return [1, 1];
  if (p >= 1) return [1, 1];
  const wob = Math.sin(p * Math.PI * 4.4) * Math.exp(-p * 5.5) * amount;
  return [1 + wob, 1 - wob];
}

// Brand colours, measured from bollanoplumbers.co.uk (its stylesheet, its
// logo and the hero illustration's own fills).
export const C = {
  navy: '#003764', // headings, buttons, the logo
  navyDeep: '#002c5c',
  red: '#e2211c', // the subline and CALL US NOW
  logoRed: '#e0281f',
  pale: '#e6eef9', // the hero's curve (shapes.png)
  paler: '#eef6fb',
  drop: '#84dbff', // the site's drop icon
  hoseCold: '#3d5ba9',
  hoseMains: '#aadcf7',
  hoseHot: '#b11f24',
  steel: '#b4c1d1', // the bath
  steelDark: '#8495b0',
  grey: '#6b6f83',
};

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix two hex colours in linear light, returns rgb(). */
export function mix(a, b, t) {
  const A = hexRgb(a),
    B = hexRgb(b);
  const lin = (c) => (c / 255) ** 2.2,
    gam = (c) => 255 * c ** (1 / 2.2);
  const o = A.map((c, i) => gam(lerp(lin(c), lin(B[i]), clamp(t))));
  return `rgb(${o.map((c) => c.toFixed(1)).join(',')})`;
}

/**
 * Piecewise keyframes: [[t, value, ease?], ...]; the ease belongs to the
 * arriving key (default inOut). Values may be numbers or arrays.
 */
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

/** A water surface: height offset at x, time t, with a little chop. */
export function wave(x, t, amp = 1, seed = 0) {
  return (
    amp *
    (Math.sin(x * 0.0062 + t * 5.1 + seed) * 0.6 +
      Math.sin(x * 0.0141 - t * 3.7 + seed * 2.3) * 0.28 +
      Math.sin(x * 0.031 + t * 7.9 + seed * 4.1) * 0.12)
  );
}

/** `polygon()` for a clip filled below a wavy line across [x0, x1]. */
export function waveClip(x0, x1, level, t, amp, seed = 0, unit = 'px', steps = 48) {
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const x = lerp(x0, x1, i / steps);
    pts.push(`${x.toFixed(1)}${unit} ${(level + wave(x, t, amp, seed)).toFixed(1)}${unit}`);
  }
  pts.push(`${x1}${unit} 100000${unit}`, `${x0}${unit} 100000${unit}`);
  return `polygon(${pts.join(',')})`;
}

export const SVGNS = 'http://www.w3.org/2000/svg';
export function svg(tag, attrs = {}, parent) {
  const e = document.createElementNS(SVGNS, tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  if (parent) parent.appendChild(e);
  return e;
}
const acache = new WeakMap();
/** Set SVG attributes, skipping unchanged values. */
export function attr(e, props) {
  let c = acache.get(e);
  if (!c) acache.set(e, (c = {}));
  for (const k in props) {
    const v = props[k];
    if (c[k] !== v) {
      c[k] = v;
      e.setAttribute(k, v);
    }
  }
}
