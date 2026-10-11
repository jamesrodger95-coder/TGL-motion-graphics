// The site's hero line, set the way the site sets it (uppercase, bottom left
// over the sequence), letter by letter: "ANDERS DENKEN," over the opening
// bars, "SLIMMER REALISEREN." as the flight begins, and both lifting away as
// the camera dives through the window.
import { T } from './timeline.js';
import { K, css, el, prog } from './kit.js';

const LEFT = 112;
const SIZE = 156;
const TOP = 552;

function letters(parent, text) {
  const row = el('span', 'row', parent);
  return [...text].map((c) => el('span', 'ch', row, c === ' ' ? '&nbsp;' : c));
}

export class Title {
  constructor(root) {
    this.block = el('div', 'title', root);
    css(this.block, { left: `${LEFT}px`, top: `${TOP}px`, fontSize: `${SIZE}px` });
    this.l1 = letters(this.block, 'Anders denken,');
    this.l2 = letters(this.block, 'Slimmer realiseren.');
    // The site's hero subline, condensed to its three project types.
    this.kicker = el('div', 'mono', root, 'Transformatie · Renovatie · Nieuwbouw');
    css(this.kicker, {
      left: `${LEFT + 6}px`,
      top: `${TOP - 44}px`,
      fontSize: '21px',
      color: '#ffa574',
    });
  }

  update(t) {
    const out = (i) => K.inOut(prog(t, T.titleOut + i * 0.012, T.titleOut + i * 0.012 + 0.42));
    const set = (chars, t0, row) =>
      chars.forEach((c, i) => {
        const q = K.settle(prog(t, t0 + i * 0.022, t0 + i * 0.022 + 0.75));
        const o = out(i + row * 6);
        css(c, { transform: `translate3d(0,${((1 - q) * 110 - o * 112).toFixed(2)}%,0)` });
      });
    set(this.l1, T.title[0], 0);
    set(this.l2, T.line2, 1);
    // The kicker types on, then clears with the title.
    const k = prog(t, T.kicker, T.kicker + 0.6);
    const n = Math.round(k * 37);
    const ko = 1 - prog(t, T.titleOut, T.titleOut + 0.3);
    css(this.kicker, {
      clipPath: `inset(0 ${(100 - (n / 37) * 100).toFixed(2)}% 0 0)`,
      opacity: ko.toFixed(3),
    });
  }
}
