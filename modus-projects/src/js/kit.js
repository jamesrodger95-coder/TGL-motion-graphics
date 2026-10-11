// Toolkit for the Modus Projects film. Reuses the reel engine's core
// (easing, DOM helpers, hash) and adds curves, springs, keyframes, the brand's
// colours and small SVG helpers.
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

// Brand colours: the site's Webflow tokens (--_colors---*), plus its near
// black from the deco gradients.
export const C = {
  orange: '#ffa574',
  dark: '#3b3940', // dark-grey: footer, cards
  mid: '#848c8f', // mid-grey
  light: '#dbe2e5', // light-grey
  black: '#0e0a0a',
  white: '#ffffff',
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
