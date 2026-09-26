// Type in the site's hero system: a small letter-spaced H1 over a heavy
// uppercase H2 (Poppins 700 / 800), navy by day and, as on its night pages,
// a yellow H1 over a white H2.
import { css, el, prog, lerp, clamp, K, E, mix, typeset } from './kit.js';
import { T } from './timeline.js';

const NAVY = '#141937';

/** "The energy revolution has begun!" — the sun comes up behind it. */
export class Headline {
  constructor(parent) {
    this.root = el('div', 'fill', parent);
    const size = 150;
    this.size = size;
    const L = ['THE ENERGY', 'REVOLUTION', 'HAS BEGUN!'];
    this.lines = L.map((text, i) => {
      const t = typeset(this.root, [text], {
        cls: 'h2',
        size,
        letters: i === 1,
        x: 960,
        y: 300 + i * size * 1.0,
        lh: 1,
      });
      css(t.root, { transform: 'translateX(-50%)', textAlign: 'center' });
      return t;
    });
    this.rev = this.lines[1].rows[0].words[0].chars;
    css(this.lines[1].rows[0].mask, { perspective: '900px' });
  }

  update(t, crane, day) {
    const on = t < T.crane[1] + 0.2;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    const lift = -(1150 - crane) * 0.82;
    const ink = K.inOut(prog(day, 0.3, 0.62));
    css(this.root, {
      transform: `translate3d(0,${lift.toFixed(2)}px,0)`,
      color: mix('#ffffff', NAVY, ink),
    });
    const rise = (words, t0, stagger = 0.07) =>
      words.forEach((w, i) => {
        const p = K.settle(prog(t, t0 + i * stagger, t0 + i * stagger + 0.6));
        css(w.el, {
          transform: `translate3d(0,${((1 - p) * this.size * 1.05).toFixed(2)}px,0)`,
        });
      });
    rise(this.lines[0].rows[0].words, T.head[0]);
    // REVOLUTION: every letter revolves into place.
    this.rev.forEach((c, i) => {
      const t0 = T.head[1] + i * 0.03;
      const p = prog(t, t0, t0 + 0.55);
      const r = 1 - K.spring(p, 1.4, 5.5);
      css(c, {
        transform: `rotateX(${(r * 110).toFixed(2)}deg)`,
        transformOrigin: `50% 50% -${(this.size * 0.3).toFixed(1)}px`,
        opacity: p > 0 ? '1' : '0',
      });
    });
    const w3 = this.lines[2].rows[0].words;
    rise(w3, T.head[2], 0.09);
    // "BEGUN!" lands with a punch.
    const pb = prog(t, T.head[2] + 0.09, T.head[2] + 0.6);
    const s = 1 + 0.08 * Math.sin(pb * Math.PI) * (1 - pb);
    css(this.lines[2].root, { transform: `translateX(-50%) scale(${s.toFixed(4)})` });
  }
}

/** Overline + two-line H2, the layout of the site's hero and service cards. */
export class Label {
  constructor(parent, { over, lines, x, y, align = 'left', size = 92, icon }) {
    this.root = el('div', 'fill', parent);
    this.align = align;
    this.size = size;
    this.over = el('div', 'line h1', this.root, over);
    css(this.over, { fontSize: '30px', top: `${y}px` });
    this.icon = icon ? el('div', 'icon', this.root, icon) : null;
    this.h2 = typeset(this.root, lines, { cls: 'h2', size, x, y: y + 56, lh: 1.02 });
    if (align === 'right') {
      css(this.h2.root, { left: 'auto', right: `${1920 - x}px`, textAlign: 'right' });
      css(this.over, { right: `${1920 - x}px`, textAlign: 'right' });
    } else {
      css(this.over, { left: `${x + (icon ? 72 : 0)}px` });
    }
    if (this.icon) {
      css(this.icon, { width: '56px', height: '56px', top: `${y - 14}px` });
      if (align === 'right') {
        const w = this.over.getBoundingClientRect().width;
        css(this.icon, { left: `${x - w - 72}px` });
      } else css(this.icon, { left: `${x}px` });
    }
    this.words = this.h2.rows.flatMap((r) => r.words);
  }

  update(t, tIn, tOut, { over = NAVY, color = NAVY } = {}) {
    const on = t >= tIn - 0.02 && t <= tOut + 0.8;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    css(this.h2.root, { color });
    css(this.over, { color: over });
    if (this.icon) css(this.icon, { color: over });
    // Overline wipes on from its icon side; icon pops.
    const a = K.settle(prog(t, tIn, tIn + 0.55));
    const out = K.swoop(prog(t, tOut, tOut + 0.4));
    const clipIn = (1 - a) * 100,
      clipOut = out * 100;
    css(this.over, {
      clipPath:
        this.align === 'right'
          ? `inset(0 ${clipOut.toFixed(2)}% 0 ${clipIn.toFixed(2)}%)`
          : `inset(0 ${clipIn.toFixed(2)}% 0 ${clipOut.toFixed(2)}%)`,
      transform: `translate3d(${((this.align === 'right' ? 1 : -1) * (1 - a) * 40).toFixed(2)}px,0,0)`,
    });
    if (this.icon) {
      const ip = prog(t, tIn - 0.05, tIn + 0.5);
      const s = K.spring(ip, 2.2, 6) * (1 - out);
      css(this.icon, {
        transform: `scale(${Math.max(0.001, s).toFixed(4)}) rotate(${((1 - K.settle(ip)) * -30).toFixed(2)}deg)`,
      });
    }
    this.words.forEach((w, i) => {
      const t0 = tIn + 0.08 + i * 0.055;
      const p = K.settle(prog(t, t0, t0 + 0.6));
      const q = K.inExpo(prog(t, tOut + i * 0.025, tOut + i * 0.025 + 0.3));
      css(w.el, {
        transform: `translate3d(0,${((1 - p - q) * this.size * 1.1).toFixed(2)}px,0)`,
      });
    });
  }
}
