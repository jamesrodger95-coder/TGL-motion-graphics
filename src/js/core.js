// Core motion toolkit: easing (including the website's house curve), a
// stateless hash, brand colours and small DOM helpers. Everything downstream is
// a pure function of time, so any frame can be rendered in any order.

export const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
export const lerp = (a, b, t) => a + (b - a) * t;
/** 0→1 progress of t across [a, b], clamped. Safe for an open-ended (Infinity) window. */
export const prog = (t, a, b) => (b > a ? clamp((t - a) / (b - a)) : t >= a ? 1 : 0);

// ---------------------------------------------------------------- easing
export const ease = {
  inQuad: (x) => x * x,
  inOutSine: (x) => -(Math.cos(Math.PI * x) - 1) / 2,
};

/** CSS-style cubic-bezier(x1, y1, x2, y2) easing. */
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1,
    bx = 3 * (x2 - x1) - cx,
    ax = 1 - cx - bx;
  const cy = 3 * y1,
    by = 3 * (y2 - y1) - cy,
    ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t;
  const sy = (t) => ((ay * t + by) * t + cy) * t;
  const dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const e = sx(t) - x;
      if (Math.abs(e) < 1e-6) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= e / d;
    }
    t = clamp(t);
    // bisection polish for robustness
    let lo = 0,
      hi = 1;
    for (let i = 0; i < 12 && Math.abs(sx(t) - x) > 1e-5; i++) {
      if (sx(t) < x) lo = t;
      else hi = t;
      t = (lo + hi) / 2;
    }
    return sy(t);
  };
}

// Curves. `house` and `exit` are lifted verbatim from the website's tokens.css
// (--gl-ease, --gl-ease-exit) so the film moves the way the site moves.
// `camera` is the one addition: a symmetric move for travelling between shots.
export const E = {
  house: bezier(0.2, 0.62, 0.2, 1), // --gl-ease: leaves fast, long settled tail
  exit: bezier(0.55, 0.06, 0.7, 0.19), // --gl-ease-exit: the only accelerating curve
  camera: bezier(0.72, 0, 0.18, 1), // dolly between shots, decisive in and out
};

// ---------------------------------------------------------------- random
/** Stateless hash → [0,1). */
export function hash(...n) {
  let h = 2166136261;
  for (const v of n) {
    h ^= Math.floor(v * 1000003) | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

// Brand tokens (src/brand/tokens.css, copied from the website repository).
export const C = {
  white: '#fbfaf8',
  paper: '#f4f3f0',
  mist: '#eae8e3',
  edge: '#dedbd5',
  ink: '#0c0c0e',
  graphite: '#33333a',
  graphiteDeep: '#17171b',
  slate: '#5a5a62',
  slateSoft: '#66666e',
  purple: '#4a3ac4',
  purple50: '#f3f1fd',
  purple200: '#cdc6f4',
  purple300: '#ab9fee',
  purple400: '#7f70e2',
  purple600: '#3e2fac',
  markPurple: '#5c58af', // the logo artwork's own fill
  markNavy: '#0f1e3c', // the logo artwork's outline
};

// ---------------------------------------------------------------- DOM
const cache = new WeakMap();
/** Set inline styles, skipping unchanged values. */
export function css(el, props) {
  let c = cache.get(el);
  if (!c) cache.set(el, (c = {}));
  for (const k in props) {
    const v = props[k];
    if (c[k] !== v) {
      c[k] = v;
      if (k.startsWith('--')) el.style.setProperty(k, v);
      else el.style[k] = v;
    }
  }
}

export function tf({ x = 0, y = 0, z = 0, s = 1, sx, sy, r = 0, rx = 0, ry = 0, skx = 0 } = {}) {
  let out = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px)`;
  if (rx) out += ` rotateX(${rx.toFixed(3)}deg)`;
  if (ry) out += ` rotateY(${ry.toFixed(3)}deg)`;
  if (r) out += ` rotate(${r.toFixed(3)}deg)`;
  if (skx) out += ` skewX(${skx.toFixed(3)}deg)`;
  const X = sx ?? s,
    Y = sy ?? s;
  if (X !== 1 || Y !== 1) out += ` scale(${X.toFixed(4)},${Y.toFixed(4)})`;
  return out;
}

export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  if (parent) parent.appendChild(e);
  return e;
}
