// Shot E — "think Bollano Plumbers". On the flood's navy, the logo builds from
// its own parts (cut from the site's reversed logo by scripts/fetch-assets.sh):
// the A's white peak rises from a water line, its two red stripes sweep in,
// BOLL and NO rise outwards from the A, the frame draws round from the top,
// and PLUMBERS tracks in. Then the site's red call button, with its number.
import { T } from './timeline.js';
import { K, clamp, lerp, prog, css, el, svg, attr, squash } from './kit.js';

const LOGO_W = 1000; // on screen
const LOGO_CY = 532;
const BASE = 430; // the top row's baseline, in the logo's pixels
// Rise order: outwards from the A.
const ROW = { L2: 0, N: 0, L1: 1, O2: 1, O1: 2, B: 3 };
const PLUMBERS = ['pP', 'pL', 'pU', 'pM', 'pB2', 'pE', 'pR', 'pS'];
const PHONE =
  'M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1L6.6 10.8z';

export class End {
  constructor(root) {
    this.root = root;
    el('div', 'glow', root);
    this.think = el('div', 'line', root);
    css(this.think, { fontSize: '132px', lineHeight: '1.05', color: '#fff' });
    const m = el('span', 'mask', this.think);
    this.thinkW = el('span', 'w', m, 'think');
  }

  async ready() {
    const J = await (await fetch('brand/logo.json')).json();
    const [LW, LH] = J.size;
    this.k = LOGO_W / LW;
    const h = LH * this.k;
    this.box = { x: 960 - LOGO_W / 2, y: LOGO_CY - h / 2, w: LOGO_W, h };
    const s = svg('svg', { class: 'logo', viewBox: `0 0 ${LW} ${LH}` }, this.root);
    css(s, {
      left: `${this.box.x}px`,
      top: `${this.box.y}px`,
      width: `${LOGO_W}px`,
      height: `${h}px`,
    });
    this.svg = s;
    const defs = svg('defs', {}, s);
    // Everything in the top row rises from behind one water line.
    const row = svg('clipPath', { id: 'row', clipPathUnits: 'userSpaceOnUse' }, defs);
    svg('rect', { x: -100, y: -400, width: LW + 200, height: BASE + 400 }, row);
    const stripe = (id) => {
      const cp = svg('clipPath', { id, clipPathUnits: 'userSpaceOnUse' }, defs);
      return svg('rect', { x: 1090, y: 200, width: 0, height: 260 }, cp);
    };
    this.stripeClip = [stripe('s1'), stripe('s2')];
    // The frame draws on through a mask: two strokes along its centre line,
    // from the top centre out and down to the gap PLUMBERS sits in.
    const mk = svg('mask', { id: 'framemask', maskUnits: 'userSpaceOnUse' }, defs);
    const [x0, y0, x1, y1, rc] = [63, 118, 2100, 548, 150];
    const mid = (x0 + x1) / 2;
    const half = (dir) => {
      const sx = dir < 0 ? x0 : x1;
      const sw = dir < 0 ? 0 : 1;
      const gap = dir < 0 ? 400 : 1755;
      return `M${mid},${y0} H${sx - dir * rc} A${rc},${rc} 0 0 ${sw} ${sx},${y0 + rc} V${y1 - rc} A${rc},${rc} 0 0 ${sw} ${sx - dir * rc},${y1} H${gap}`;
    };
    this.frameStrokes = [-1, 1].map((d) =>
      svg(
        'path',
        { d: half(d), fill: 'none', stroke: '#fff', 'stroke-width': 70, 'stroke-linecap': 'butt' },
        mk
      )
    );
    this.frameLen = this.frameStrokes[0].getTotalLength();

    const img = (name, parent, extra = {}) => {
      const [x, y, w, hh] = J.parts[name];
      return svg(
        'image',
        { href: `brand/logo/${name}.png`, x, y, width: w, height: hh, ...extra },
        parent
      );
    };
    img('frame', s, { mask: 'url(#framemask)' });
    const top = svg('g', { 'clip-path': 'url(#row)' }, s);
    this.letters = Object.keys(ROW).map((n) => ({
      n,
      g: img(n, svg('g', {}, top)),
      box: J.parts[n],
    }));
    this.peak = img('A', svg('g', {}, top));
    this.stripes = ['red1', 'red2'].map((n, i) =>
      img(n, svg('g', { 'clip-path': `url(#s${i + 1})` }, s))
    );
    this.plumbers = PLUMBERS.map((n) => ({ g: img(n, s), box: J.parts[n] }));
    // The water line the top row rises from.
    this.line = svg('rect', { x: 0, y: BASE - 3, width: 0, height: 6, rx: 3, fill: '#fff' }, s);
    this.LW = LW;

    // A sheen across the finished mark.
    this.shine = el('div', 'shine', this.root);
    css(this.shine, {
      left: `${this.box.x}px`,
      top: `${this.box.y}px`,
      width: `${LOGO_W}px`,
      height: `${h}px`,
    });
    this.band = el('i', '', this.shine);

    // The site's red call button, and its address.
    this.pill = el(
      'div',
      'pill',
      this.root,
      `<svg viewBox="0 0 24 24"><path fill="#fff" d="${PHONE}"/></svg><span>020 8402 3959</span>`
    );
    this.url = el('div', 'url', this.root, 'BOLLANOPLUMBERS.CO.UK');
    await Promise.all(
      [...s.querySelectorAll('image')].map(
        (i) => new Promise((r) => (i.complete ? r() : (i.onload = i.onerror = r)))
      )
    );
  }

  measure() {
    this.pw = this.pill.offsetWidth;
    this.tw = this.think.offsetWidth;
    css(this.pill, { left: `${960 - this.pw / 2}px`, top: `${this.box.y + this.box.h + 64}px` });
    css(this.url, { left: '960px', top: `${this.box.y + this.box.h + 186}px` });
  }

  update(t) {
    const on = t >= T.think - 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    // A slow push across the whole card.
    const push = lerp(1.0, 1.035, K.inOut(prog(t, T.think, 10)));
    css(this.root, { transform: `scale(${push.toFixed(5)})`, transformOrigin: '50% 50%' });

    // "think" rises out of the water at the centre, then lifts to sit over the logo.
    const r = K.settle(prog(t, T.think, T.think + 0.7));
    css(this.thinkW, { transform: `translate3d(0,${((1 - r) * 115).toFixed(2)}%,0)` });
    const up = K.inOut(prog(t, T.peak[0] - 0.1, T.peak[0] + 0.55));
    const ty = lerp(540 - 70, this.box.y - 128, up);
    const ts = lerp(1, 0.72, up);
    css(this.think, {
      transform: `translate3d(${(960 - (this.tw * ts) / 2).toFixed(2)}px,${ty.toFixed(2)}px,0) scale(${ts.toFixed(4)})`,
    });

    // The water line opens from the centre, then drains as the frame arrives.
    const lo = K.settle(prog(t, T.peak[0] - 0.1, T.letters[1]));
    const lc = K.inOut(prog(t, T.frame[0], T.frame[0] + 0.45));
    const lw = 1820 * lo * (1 - lc);
    attr(this.line, {
      x: (1083 - lw / 2).toFixed(1),
      width: lw.toFixed(1),
      opacity: lo > 0 ? 1 : 0,
    });

    // The A's peak rises like a mountain from the line.
    const pk = prog(t, T.peak[0], T.peak[1]);
    const [psx, psy] = squash(prog(t, T.peak[1] - 0.12, T.peak[1] + 0.45), 0.08);
    attr(this.peak.parentNode, {
      transform: `translate(0,${((1 - K.settle(pk)) * 200).toFixed(2)}) translate(1259,388) scale(${psx.toFixed(4)},${psy.toFixed(4)}) translate(-1259,-388)`,
    });
    // Its red stripes sweep in from the left, like the waves they are.
    this.stripes.forEach((im, i) => {
      const q = K.settle(prog(t, T.stripes[0] + i * 0.1, T.stripes[1] + i * 0.1));
      attr(this.stripeClip[i], { width: (340 * q).toFixed(1) });
      attr(im, {
        transform: `translate(${((1 - q) * -140).toFixed(2)},${((1 - q) * 18).toFixed(2)})`,
      });
    });
    // BOLL and NO rise outwards from the A.
    for (const { n, g, box } of this.letters) {
      const st = T.letters[0] + ROW[n] * 0.085;
      const q = prog(t, st, st + 0.55);
      const [sx, sy] = squash(prog(t, st + 0.2, st + 0.75), 0.1);
      const px = box[0] + box[2] / 2;
      attr(g, {
        transform: `translate(0,${((1 - K.settle(q)) * 210).toFixed(2)}) translate(${px},${BASE}) scale(${sx.toFixed(4)},${sy.toFixed(4)}) translate(${-px},${-BASE})`,
      });
    }
    // The frame draws round from the top centre.
    const fq = K.inOut(prog(t, T.frame[0], T.frame[1]));
    for (const p of this.frameStrokes)
      attr(p, {
        'stroke-dasharray': `${(fq * this.frameLen + 0.01).toFixed(1)} ${this.frameLen + 100}`,
      });
    // PLUMBERS tracks in from wide.
    this.plumbers.forEach(({ g, box }, i) => {
      const q = K.settle(prog(t, T.plumbers[0] + Math.abs(i - 3.5) * 0.03, T.plumbers[1]));
      const cxp = box[0] + box[2] / 2;
      attr(g, {
        opacity: clamp(q * 1.6).toFixed(3),
        transform: `translate(${((cxp - 1083) * 0.55 * (1 - q)).toFixed(2)},0)`,
      });
    });

    // The call button pops, then the address fades up.
    const c = prog(t, T.cta, T.cta + 0.8);
    const cs = Math.max(0.001, K.spring(c, 1.8, 5.5));
    css(this.pill, {
      visibility: c > 0 ? 'visible' : 'hidden',
      transform: `scale(${cs.toFixed(4)})`,
    });
    const u = K.settle(prog(t, T.url, T.url + 0.8));
    css(this.url, {
      opacity: u.toFixed(3),
      transform: `translate3d(-50%,${((1 - u) * 24).toFixed(2)}px,0)`,
      letterSpacing: `${lerp(0.3, 0.14, u).toFixed(4)}em`,
    });

    // The sheen.
    const sp = K.inOut(prog(t, T.shine[0], T.shine[1]));
    css(this.band, {
      left: `${lerp(-300, LOGO_W + 60, sp).toFixed(1)}px`,
      visibility: sp > 0 && sp < 1 ? 'visible' : 'hidden',
    });
  }
}
