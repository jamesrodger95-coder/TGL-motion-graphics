// Typographic components, modelled on the website's motion vocabulary:
//   RevealLines (M02) — each authored line in its own mask, rising 106%.
//   Rise (M03)        — a short rise plus opacity, for prose and controls.
import { el, css, tf, prog, E } from './core.js';

/**
 * A display headline authored as lines. `lines` is an array of HTML strings;
 * wrap the accent in <em>, exactly as the site does.
 */
export class Lines {
  constructor(parent, lines, { x, y, size, cls = 'display', accent } = {}) {
    this.size = size;
    this.root = el('div', cls, parent);
    css(this.root, { left: `${x}px`, top: `${y}px`, fontSize: `${size}px` });
    if (accent) css(this.root, { '--accent': accent });
    this.lines = lines.map((html) => {
      const mask = el('span', 'line-mask', this.root);
      return el('span', 'line-inner', mask, html);
    });
  }

  /** tIn: first line starts rising. tOut: first line starts leaving (optional). */
  update(
    t,
    tIn,
    tOut = Infinity,
    { stagger = 0.1, dur = 0.9, outStagger = 0.06, outDur = 0.42 } = {}
  ) {
    const h = this.size * 1.06;
    this.lines.forEach((ln, i) => {
      const pi = E.house(prog(t, tIn + i * stagger, tIn + i * stagger + dur));
      const po = E.exit(prog(t, tOut + i * outStagger, tOut + i * outStagger + outDur));
      css(ln, { transform: tf({ y: (1 - pi) * h * 1.06 - po * h * 1.06 }) });
    });
  }
}

/** M03 rise: translate a short distance and fade, on the house curve. */
export function rise(node, t, tIn, { dist = 22, dur = 0.7, tOut = Infinity, outDur = 0.35 } = {}) {
  const pi = E.house(prog(t, tIn, tIn + dur));
  const po = E.exit(prog(t, tOut, tOut + outDur));
  css(node, {
    opacity: (pi * (1 - po)).toFixed(3),
    transform: tf({ y: (1 - pi) * dist - po * dist * 0.6 }),
  });
}

/** M05 wipe: reveal left to right with a clip on the node itself. */
export function wipe(node, t, tIn, dur = 0.6) {
  const p = E.house(prog(t, tIn, tIn + dur));
  css(node, { clipPath: `inset(-20% ${((1 - p) * 100).toFixed(2)}% -20% -2%)` });
}
