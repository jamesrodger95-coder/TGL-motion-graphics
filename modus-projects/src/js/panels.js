// Shot D — "Drie M's. Één standaard." The site's three cards wipe up over the
// room, a third of the frame each, with their own striped graphics. Then they
// collapse into the logo's last three bars (the first two grow in beside
// them), turning white on the footer's dark grey: shot E's mark.
import { T } from './timeline.js';
import { C, K, clamp, lerp, prog, css, el, mix } from './kit.js';
import { barRect } from './end.js';

const CARDS = [
  { k: "Drie M's.", h: 'Meerwaarde', n: '01', bg: C.dark, fg: '#fff' },
  { k: 'Één', h: 'Momentum', n: '02', bg: C.mid, fg: '#fff' },
  { k: 'Standaard.', h: 'Maximale<br>zekerheid', n: '03', bg: C.orange, fg: C.black },
];

export class Panels {
  constructor(root) {
    this.root = root;
    this.back = el('div', 'layer', root);
    css(this.back, { background: C.dark });
    // The logo's first two bars, which have no card to come from.
    this.extra = [0, 1].map(() => {
      const d = el('div', 'panel', root);
      css(d, { background: '#fff' });
      return d;
    });
    this.cards = CARDS.map((c, i) => {
      const d = el('div', 'panel', root);
      css(d, { left: `${i * 640}px`, width: '640px', background: c.bg, color: c.fg });
      const img = el('img', '', d);
      img.src = `brand/m${i + 1}.svg`;
      const k = el('div', 'k', d, c.k);
      const h = el('div', 'h', d, c.h);
      const n = el('div', 'num', d, c.n);
      return { d, img, k, h, n, c };
    });
  }

  update(t) {
    const [c0, c1] = T.collapse;
    const col = K.inOut(prog(t, c0, c1));
    css(this.back, { visibility: col > 0 ? 'visible' : 'hidden' });
    this.cards.forEach((card, i) => {
      // The wipe up, then the content a beat behind it.
      const w = K.settle(prog(t, T.panels[i], T.panels[i] + 0.75));
      const inner = K.settle(prog(t, T.panels[i] + 0.12, T.panels[i] + 0.85));
      const fade = 1 - clamp(col * 4);
      css(card.k, {
        opacity: (inner * fade).toFixed(3),
        transform: `translate3d(0,${((1 - inner) * 40).toFixed(2)}px,0)`,
      });
      css(card.h, {
        opacity: (inner * fade).toFixed(3),
        transform: `translate3d(0,${((1 - inner) * 70).toFixed(2)}px,0)`,
      });
      css(card.n, {
        opacity: (inner * fade).toFixed(3),
        transform: `translate3d(0,${((1 - inner) * 90).toFixed(2)}px,0)`,
      });
      css(card.img, {
        opacity: fade.toFixed(3),
        transform: `translate3d(0,${((1 - inner) * 160).toFixed(2)}px,0)`,
      });
      // The collapse, in two moves: the full-height cards squeeze sideways
      // into stripes (turning white), then the stripes drop to the logo's
      // height and become its last three bars.
      const [bx, by, bw, bh] = barRect(i + 2);
      const qx = K.inOut(prog(t, c0 + (2 - i) * 0.05, c0 + 0.62 * (c1 - c0) + (2 - i) * 0.05));
      const qy = K.inOut(prog(t, c0 + 0.5 * (c1 - c0), c1));
      css(card.d, {
        visibility: w > 0 ? 'visible' : 'hidden',
        left: `${lerp(i * 640, bx, qx).toFixed(2)}px`,
        width: `${lerp(640, bw, qx).toFixed(2)}px`,
        top: `${lerp(1080 * (1 - w), by, qy).toFixed(2)}px`,
        height: `${lerp(1080, bh, qy).toFixed(2)}px`,
        background: mix(card.c.bg, '#ffffff', clamp(qx * 1.4)),
      });
    });
    // The first two bars grow up from the baseline as the cards land.
    this.extra.forEach((d, j) => {
      const [bx, by, bw, bh] = barRect(j);
      const g = K.settle(prog(t, c1 - 0.25 + (1 - j) * 0.06, c1 + 0.3));
      css(d, {
        visibility: g > 0 ? 'visible' : 'hidden',
        left: `${bx.toFixed(2)}px`,
        width: `${bw.toFixed(2)}px`,
        top: `${(by + bh * (1 - g)).toFixed(2)}px`,
        height: `${(bh * g).toFixed(2)}px`,
      });
    });
    return col;
  }
}
