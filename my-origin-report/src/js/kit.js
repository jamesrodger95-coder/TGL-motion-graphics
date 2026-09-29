// Toolkit for the My Origin Report film. Reuses the reel engine's core
// (easing, DOM helpers, hash) and adds curves, colour mixing, keyframes and a
// camera for this film.
import { clamp, lerp, prog, E, ease, bezier, css, tf, el, hash } from '../../../src/js/core.js';

export { clamp, lerp, prog, E, ease, bezier, css, tf, el, hash };

export const K = {
  settle: bezier(0.16, 1, 0.3, 1), // fast arrival, long glide
  inOut: bezier(0.65, 0, 0.35, 1),
  swoop: bezier(0.83, 0, 0.17, 1), // strong in-out for whips and pushes
  site: bezier(0.25, 0.1, 0.25, 1), // CSS `ease`, the site's own keyframe curve
  inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outExpo: (x) => (x >= 1 ? 1 : 1 - 2 ** (-10 * x)),
  outBack: (x, s = 1.9) => 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2,
  /** Damped spring from 0 to 1: overshoots and rings out. */
  spring: (x, freq = 3.2, damp = 5.5) =>
    x <= 0
      ? 0
      : x >= 1
        ? 1
        : 1 - Math.exp(-damp * x) * Math.cos(freq * Math.PI * 2 * x) * (1 - x ** 6),
};

/** Squash and stretch for a pop from the ground: returns [sx, sy] around 1. */
export function squash(p) {
  if (p <= 0) return [0.001, 0.001];
  if (p >= 1) return [1, 1];
  const s = K.spring(p, 2.4, 6);
  const wob = Math.sin(p * Math.PI * 4.8) * Math.exp(-p * 5) * 0.22;
  return [Math.max(0.001, s * (1 + wob)), Math.max(0.001, s * (1 - wob))];
}

// ------------------------------------------------------------------ colour
const hexRgb = (h) => {
  if (h.startsWith('rgb'))
    return h
      .match(/[\d.]+/g)
      .slice(0, 3)
      .map(Number);
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
/** Mix two colours (hex or rgb()) in linear light, returns rgb(). */
export function mix(a, b, t) {
  const A = hexRgb(a),
    B = hexRgb(b);
  const lin = (c) => (c / 255) ** 2.2,
    gam = (c) => 255 * c ** (1 / 2.2);
  const o = A.map((c, i) => gam(lerp(lin(c), lin(B[i]), clamp(t))));
  return `rgb(${o.map((c) => c.toFixed(1)).join(',')})`;
}

// --------------------------------------------------------------- keyframes
/**
 * Piecewise keyframes: [[t, value], ...] with per-segment easing (the ease of
 * the *arriving* key, default inOut). Values may be numbers or arrays.
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

/** A camera over world space: screen = (world - focus) * zoom + centre + offset. */
export class Camera {
  set(fx, fy, z, ox = 0, oy = 0) {
    Object.assign(this, { fx, fy, z, ox, oy });
    return this;
  }
  /** World point -> screen point. */
  map(x, y) {
    return [(x - this.fx) * this.z + 960 + this.ox, (y - this.fy) * this.z + 540 + this.oy];
  }
  /** CSS transform for a 1920x1080 world container (transform-origin 0 0). */
  css() {
    const tx = 960 + this.ox - this.fx * this.z,
      ty = 540 + this.oy - this.fy * this.z;
    return `translate3d(${tx.toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${this.z.toFixed(5)})`;
  }
  /** Screen position of a sky object at depth k (0 = infinitely far, 1 = world). */
  parallax(x, y, k) {
    const z = 1 + (this.z - 1) * k;
    return [
      (x - (960 + (this.fx - 960) * k)) * z + 960 + this.ox * k,
      (y - (540 + (this.fy - 540) * k)) * z + 540 + this.oy * k,
      z,
    ];
  }
}

/** Splits text into masked lines of words (and optionally letters). */
export function typeset(
  parent,
  lines,
  { cls = '', size, letters = false, x = 0, y = 0, lh = 1.02 }
) {
  const root = el('div', `line ${cls}`, parent);
  css(root, { left: `${x}px`, top: `${y}px`, fontSize: `${size}px`, lineHeight: `${lh}` });
  const rows = lines.map((text) => {
    const mask = el('span', 'mask', root);
    const words = text.split(' ').map((w, i, all) => {
      const span = el('span', 'w', mask);
      const chars = letters
        ? [...w].map((c) => el('span', 'ch', span, c === ' ' ? '&nbsp;' : c))
        : ((span.textContent = w), []);
      if (i < all.length - 1) mask.appendChild(document.createTextNode(' '));
      return { el: span, chars };
    });
    return { mask, words };
  });
  return { root, rows };
}
