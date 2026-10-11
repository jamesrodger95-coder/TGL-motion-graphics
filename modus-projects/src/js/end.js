// Shot E — the mark. The logo is the site's own footer SVG (viewBox 1344x238):
// five bars that widen into the M's stem, then M O D U S. The bars arrive from
// shot D's cards (panels.js); here the letters print out of them one by one,
// the site's hero line settles underneath, its "Bespreek jouw project" button
// pops, and the site's striped deco rises at the edge, as in its footer.
import { T } from './timeline.js';
import { K, clamp, lerp, prog, css, el, svg, attr } from './kit.js';

const VB = [1344, 238];
const LOGO_W = 1180;
const k = LOGO_W / VB[0];
const LOGO = { x: 960 - LOGO_W / 2, y: 470 - (VB[1] * k) / 2, w: LOGO_W, h: VB[1] * k };
// The logo's bars, from its paths: x, width (y 5.764 -> 232.191 for all).
const BARS = [
  [0, 3.60265],
  [10.8079, 7.2053],
  [25.2185, 10.808],
  [43.2318, 14.4106],
  [64.8476, 18.0133],
];
const Y0 = 5.76423,
  Y1 = 232.191;
/** Screen rect [x, y, w, h] of the logo's bar i. */
export const barRect = (i) => [
  LOGO.x + BARS[i][0] * k,
  LOGO.y + Y0 * k,
  BARS[i][1] * k,
  (Y1 - Y0) * k,
];

export class End {
  constructor(root) {
    this.root = root;
  }

  async ready() {
    const txt = await (await fetch('brand/logo.svg')).text();
    const ds = [...txt.matchAll(/<path d="([^"]+)"/g)].map((m) => m[1]).slice(0, 5); // M O D U S
    const s = svg('svg', { viewBox: `0 0 ${VB[0]} ${VB[1]}` }, this.root);
    css(s, {
      left: `${LOGO.x}px`,
      top: `${LOGO.y}px`,
      width: `${LOGO.w}px`,
      height: `${LOGO.h}px`,
    });
    const defs = svg('defs', {}, s);
    this.letters = ds.map((d, i) => {
      const cp = svg('clipPath', { id: `lt${i}`, clipPathUnits: 'userSpaceOnUse' }, defs);
      const r = svg('rect', { x: 0, y: -20, width: 0, height: VB[1] + 40 }, cp);
      const g = svg('g', { 'clip-path': `url(#lt${i})` }, s);
      const p = svg('path', { d, fill: '#fff' }, g);
      const b = p.getBBox();
      return { r, p, x0: b.x, x1: b.x + b.width };
    });

    this.tag = el('div', 'title', this.root, 'Anders denken, slimmer realiseren.');
    css(this.tag, { fontSize: '44px', letterSpacing: '0.04em', color: '#dbe2e5' });
    this.btn = el('div', 'btn', this.root, 'Bespreek jouw project');
    this.url = el('div', 'mono', this.root, 'modusprojects.nl');
    css(this.url, { fontSize: '22px', color: '#b4bcbf' });
    this.deco = el('img', 'deco', this.root);
    this.deco.src = 'brand/stripes.svg';
    await this.deco.decode();
  }

  measure() {
    const tw = this.tag.offsetWidth;
    css(this.tag, { left: `${960 - tw / 2}px`, top: `${LOGO.y + LOGO.h + 58}px` });
    const bw = this.btn.offsetWidth;
    const uw = this.url.offsetWidth;
    const gap = 36;
    const x0 = 960 - (bw + gap + uw) / 2;
    const by = LOGO.y + LOGO.h + 170;
    css(this.btn, { left: `${x0}px`, top: `${by}px` });
    css(this.url, { left: `${x0 + bw + gap}px`, top: `${by + 24}px` });
  }

  update(t) {
    const on = t >= T.collapse[0];
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    // A slow push across the card.
    const push = lerp(1, 1.03, K.inOut(prog(t, T.collapse[1], 10)));
    css(this.root, { transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 45%' });

    // M O D U S print out of the bars, left to right, each sliding in from its left.
    const [w0, w1] = T.word;
    this.letters.forEach((L, i) => {
      const s = w0 + i * 0.09;
      const q = K.settle(prog(t, s, s + (w1 - w0)));
      const reveal = lerp(L.x0 - 4, L.x1 + 4, q);
      attr(L.r, { x: (L.x0 - 4).toFixed(2), width: Math.max(0, reveal - L.x0 + 4).toFixed(2) });
      attr(L.p, { transform: `translate(${((1 - q) * -70).toFixed(2)},0)` });
    });

    // The line, then the button and the address.
    const tq = K.settle(prog(t, T.tagline, T.tagline + 0.8));
    css(this.tag, {
      opacity: tq.toFixed(3),
      transform: `translate3d(0,${((1 - tq) * 28).toFixed(2)}px,0)`,
      letterSpacing: `${lerp(0.16, 0.04, tq).toFixed(4)}em`,
    });
    const bq = prog(t, T.cta, T.cta + 0.7);
    const bs = Math.max(0.001, K.spring(bq, 1.8, 5.5));
    css(this.btn, {
      visibility: bq > 0 ? 'visible' : 'hidden',
      transform: `scale(${bs.toFixed(4)})`,
    });
    const uq = K.settle(prog(t, T.url, T.url + 0.7));
    css(this.url, {
      opacity: uq.toFixed(3),
      transform: `translate3d(${((1 - uq) * -20).toFixed(2)}px,0,0)`,
    });

    // The site's deco rises at the right edge, as in its footer.
    const dq = K.settle(prog(t, T.deco, T.deco + 1.1));
    css(this.deco, {
      transform: `translate3d(0,${((1 - dq) * 1080).toFixed(1)}px,0)`,
      opacity: clamp(dq * 3).toFixed(3),
    });
  }
}
