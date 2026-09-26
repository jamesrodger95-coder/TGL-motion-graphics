// Toolkit for the Bryant Dental film. Reuses the reel engine's core (easing,
// DOM helpers, hash) and adds the pieces this film needs: focus-pull type,
// image-sequence playback and a few extra curves.
import { clamp, lerp, prog, E, ease, bezier, css, tf, el, hash } from '../../../src/js/core.js';

export { clamp, lerp, prog, E, ease, bezier, css, tf, el, hash };

export const K = {
  settle: bezier(0.16, 1, 0.3, 1), // fast arrival, long glide
  inOut: bezier(0.65, 0, 0.35, 1),
  swoop: bezier(0.83, 0, 0.17, 1), // strong in-out for irises and pushes
  inExpo: (x) => (x <= 0 ? 0 : 2 ** (10 * x - 10)),
  outBack: (x) => {
    const s = 1.9;
    return 1 + (s + 1) * (x - 1) ** 3 + s * (x - 1) ** 2;
  },
};

/**
 * Words that arrive the way a loupe comes into focus: from soft and slightly
 * large to sharp. `lines` is an array of arrays of [text, className?].
 */
export class FocusWords {
  constructor(parent, lines, { x, y, size, align = 'left', lineGap = 1.02 }) {
    this.root = el('div', 'head', parent);
    this.size = size;
    css(this.root, {
      left: `${x}px`,
      top: `${y}px`,
      fontSize: `${size}px`,
      textAlign: align,
      lineHeight: `${lineGap}`,
    });
    if (align === 'center') css(this.root, { transform: 'translateX(-50%)' });
    this.words = [];
    lines.forEach((line, li) => {
      const row = el('div', '', this.root);
      line.forEach(([text, cls], wi) => {
        const w = el('span', `w ${cls || ''}`, row, text);
        this.words.push(w);
        if (wi < line.length - 1) row.appendChild(document.createTextNode(' '));
      });
      if (li < lines.length - 1) row.style.display = 'block';
    });
  }

  update(t, tIn, { stagger = 0.065, dur = 0.9, tOut = Infinity, outDur = 0.45, blur = 22 } = {}) {
    const on = t >= tIn - 0.01 && t <= tOut + outDur + 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    this.words.forEach((w, i) => {
      const p = K.settle(prog(t, tIn + i * stagger, tIn + i * stagger + dur));
      const q = ease.inQuad(prog(t, tOut + i * 0.03, tOut + i * 0.03 + outDur));
      const b = blur * (1 - p) + blur * 0.8 * q;
      css(w, {
        opacity: (Math.min(1, p * 1.4) * (1 - q)).toFixed(3),
        filter: b > 0.05 ? `blur(${b.toFixed(2)}px)` : 'none',
        transform: tf({
          y: (1 - p) * this.size * 0.22 - q * this.size * 0.2,
          s: 1 + 0.06 * (1 - p),
        }),
      });
    });
  }
}

/** Preloads a numbered JPEG sequence and draws any (fractional) frame to a canvas. */
export class Seq {
  constructor(parent, dir, count, { w, h, cls = 'seq' }) {
    this.canvas = el('canvas', cls, parent);
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d');
    this.frames = Array.from({ length: count }, (_, i) => {
      const img = new Image();
      img.src = `${dir}/f${String(i + 1).padStart(3, '0')}.jpg`;
      return img;
    });
    this.last = -1;
  }

  /** Resolves once every frame has loaded. (Hundreds of concurrent decode()
   *  calls can be rejected by the browser; drawImage decodes on demand.) */
  ready() {
    return Promise.all(
      this.frames.map((f) =>
        f.complete && f.naturalWidth
          ? null
          : new Promise((resolve, reject) => {
              f.onload = resolve;
              f.onerror = () => reject(new Error(`failed to load ${f.src}`));
            })
      )
    );
  }

  /** f is a fractional frame index; neighbouring frames are blended. */
  show(f) {
    const n = this.frames.length;
    f = clamp(f, 0, n - 1);
    const key = Math.round(f * 100);
    if (key === this.last) return;
    this.last = key;
    const a = Math.floor(f),
      b = Math.min(n - 1, a + 1),
      k = f - a;
    const { ctx, canvas } = this;
    ctx.globalAlpha = 1;
    ctx.drawImage(this.frames[a], 0, 0, canvas.width, canvas.height);
    if (k > 0.01 && b !== a) {
      ctx.globalAlpha = k;
      ctx.drawImage(this.frames[b], 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
    }
  }
}

/** Measures the rendered box of a substring inside a text node's element. */
export function measureSubstring(node, sub) {
  const text = node.firstChild;
  const i = text.textContent.indexOf(sub);
  const r = document.createRange();
  r.setStart(text, i);
  r.setEnd(text, i + sub.length);
  const b = r.getBoundingClientRect();
  return { x: b.left + b.width / 2, y: b.top + b.height / 2, w: b.width, h: b.height };
}
