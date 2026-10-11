// Shot B — "plumbing". The site's hero, rebuilt from its parts: its pale curve
// sweeps in, the bath drops onto the circle the ripple became, the taps pop
// and turn, the three hoses pour down (cold, mains, hot), and the plumber
// slides in to work. The illustration's own idle loop (its `head` keyframe:
// 0 -> 1deg, 1 s, alternate) runs on the film's clock.
import { T } from './timeline.js';
import { C, K, clamp, lerp, prog, css, el, svg, attr, squash, waveClip } from './kit.js';

export const ILLO = { x: 1004, y: 312, w: 860 }; // the illustration's box in the world
const VB = [772, 501.6];
export const ILLO_SCALE = ILLO.w / VB[0];
/** Illustration (viewBox) point -> world point. */
export const illo = (x, y) => [ILLO.x + x * ILLO_SCALE, ILLO.y + y * ILLO_SCALE];

const shapes = (g) => [...g.children].filter((c) => ['g', 'path'].includes(c.tagName));
/** Wavy clip in px: everything below a water line across [x0, x1]. */
const pivotT = (px, py, inner) =>
  `translate(${px.toFixed(2)},${py.toFixed(2)}) ${inner} translate(${(-px).toFixed(2)},${(-py).toFixed(2)})`;

export class Hero {
  constructor(root, blob) {
    this.root = root;
    this.blob = blob;
    css(root, { left: `${ILLO.x}px`, top: `${ILLO.y}px`, width: `${ILLO.w}px` });
    // The site's big pale curve: a circle off the top right of the hero.
    this.B = { x: 2030, y: -330, r: 1330 };
    css(blob, {
      left: `${this.B.x - this.B.r}px`,
      top: `${this.B.y - this.B.r}px`,
      width: `${this.B.r * 2}px`,
      height: `${this.B.r * 2}px`,
    });
  }

  async ready() {
    const txt = await (await fetch('art/plumber.svg')).text();
    this.root.innerHTML = txt.replace(/<\?xml[^>]*>/, '');
    const s = this.root.querySelector('svg');
    const top = shapes(shapes(s)[0]);
    const [bath, man] = top;
    const p = shapes(bath);
    this.spout = p[0];
    this.taps = [p[2], p[1]]; // left, right
    this.body = [p[3], p[5], p[8]]; // bath, overflow fitting, rim
    this.hoses = [p[7], p[4], p[6]]; // cold (blue), mains (pale), hot (red)
    this.man = man;
    // Pivots and wipe boxes from the artwork's own geometry.
    const bb = (e) => e.getBBox();
    this.tapPivots = [this.taps[0], this.spout, this.taps[1]].map((e) => {
      const b = bb(e);
      return [b.x + b.width / 2, 151];
    });
    this.handles = this.taps.map((t) => {
      const h = shapes(t)[1];
      const b = bb(h);
      return { el: h, c: [b.x + b.width / 2, b.y + b.height / 2] };
    });
    const defs = svg('defs', {}, s);
    this.wipes = this.hoses.map((h, i) => {
      const b = bb(h);
      const cp = svg('clipPath', { id: `hose${i}` }, defs);
      const r = svg('rect', { x: b.x - 10, y: b.y - 4, width: b.width + 20, height: 0 }, cp);
      h.setAttribute('clip-path', `url(#hose${i})`);
      return { r, y: b.y - 4, h: b.height + 8 };
    });
    // The parts the site's `head` keyframe moves (everything on the man but .nomove).
    this.idle = [...man.querySelectorAll('.st6,.st12,.st8,.st10,.st11,.st13,.st14,.st15')].filter(
      (e) => !e.classList.contains('nomove')
    );
  }

  update(t) {
    // The site's pale curve sweeps in from the right.
    const bp = K.settle(prog(t, T.blob[0], T.blob[1]));
    css(this.blob, {
      transform: `translate3d(${lerp(1500, 0, bp).toFixed(2)}px,${lerp(-500, 0, bp).toFixed(2)}px,0)`,
      visibility: bp > 0 ? 'visible' : 'hidden',
    });

    // The bath falls onto its feet and squashes.
    const fall = prog(t, T.bath - 0.32, T.bath);
    const dy = lerp(-620, 0, fall * fall);
    const [sx, sy] = squash(prog(t, T.bath, T.bath + 0.6), 0.1);
    const bathT = `translate(0,${dy.toFixed(2)}) ${pivotT(400, 450, `scale(${sx.toFixed(4)},${sy.toFixed(4)})`)}`;
    for (const e of this.body)
      attr(e, { transform: bathT, visibility: fall > 0 ? 'visible' : 'hidden' });

    // The taps pop up from the rim, left, spout, right; the handles spin a turn.
    [this.taps[0], this.spout, this.taps[1]].forEach((e, i) => {
      const q = prog(t, T.taps[i], T.taps[i] + 0.7);
      const s = Math.max(0.001, K.spring(q, 2.2, 5.2));
      const [px, py] = this.tapPivots[i];
      attr(e, {
        visibility: q > 0 ? 'visible' : 'hidden',
        transform: pivotT(px, py, `scale(${s.toFixed(4)})`),
      });
    });
    this.handles.forEach(({ el: h, c }, i) => {
      const q = K.inOut(prog(t, T.taps[i === 0 ? 0 : 2] + 0.1, T.taps[i === 0 ? 0 : 2] + 0.55));
      const turn = Math.cos(q * Math.PI * 2);
      attr(h, {
        transform: pivotT(
          c[0],
          c[1],
          `scale(${(Math.sign(turn) * Math.max(0.12, Math.abs(turn))).toFixed(4)},1)`
        ),
      });
    });

    // The hoses pour down from the bath, one after another.
    this.wipes.forEach((w, i) => {
      const q = K.inOut(prog(t, T.hoses[i], T.hoses[i] + 0.55));
      attr(w.r, { height: (w.h * q).toFixed(2) });
    });

    // The plumber slides in on his knees and leans into the job.
    const mp = prog(t, T.plumber[0], T.plumber[1]);
    const mx = lerp(-820, 0, K.settle(mp));
    const lean = -7 + 7 * K.spring(mp, 1.4, 4.5);
    attr(this.man, {
      visibility: mp > 0 ? 'visible' : 'hidden',
      transform: `translate(${mx.toFixed(2)},0) ${pivotT(70, 470, `rotate(${lean.toFixed(3)})`)}`,
    });
    // The site's idle loop: 0 -> 1deg and back, a second each way.
    const ph = (t % 2) / 1;
    const ang = ph <= 1 ? ph : 2 - ph;
    const r = `rotate(${ang.toFixed(4)}deg)`;
    for (const e of this.idle) css(e, { transform: r });

    return bp;
  }
}

/** The headline: "When you think" (shot A, centred) moves into the hero's
 *  left column above "plumbing", which fills with water, then the site's red
 *  line, "Professional, Responsive, Trusted". */
export class Headline {
  constructor(root) {
    this.l1 = el('div', 'line l1', root);
    css(this.l1, { fontSize: '124px', lineHeight: '1.02', color: C.navy });
    this.words = ['When', 'you', 'think'].map((w, i) => {
      const m = el('span', 'mask', this.l1);
      const s = el('span', 'w', m, w);
      if (i < 2) this.l1.appendChild(document.createTextNode(' '));
      return s;
    });

    this.l2 = el('div', 'line l2', root);
    css(this.l2, { fontSize: '192px', lineHeight: '1.0', left: '146px', top: '400px' });
    const m2 = el('span', 'mask', this.l2);
    this.rise2 = el('span', 'w stack', m2);
    this.outline = el('span', 'outline', this.rise2, 'plumbing');
    this.crest = el('span', '', this.rise2, 'plumbing');
    this.fillEl = el('span', '', this.rise2, 'plumbing');
    css(this.crest, { color: C.drop });
    css(this.fillEl, { color: C.navy });

    this.l3 = el('div', 'line l3', root);
    css(this.l3, {
      fontSize: '52px',
      lineHeight: '1.1',
      left: '152px',
      top: '660px',
      color: C.red,
    });
    this.l3.textContent = 'Professional, Responsive, Trusted';
  }

  measure() {
    this.w1 = this.l1.offsetWidth;
    this.w2 = this.rise2.offsetWidth;
    this.h2 = this.rise2.offsetHeight;
    this.w3 = this.l3.offsetWidth;
  }

  update(t) {
    // "When you think": word by word, centred over the drop.
    this.words.forEach((w, i) => {
      const q = K.settle(prog(t, T.words[i], T.words[i] + 0.7));
      css(w, { transform: `translate3d(0,${((1 - q) * 112).toFixed(2)}%,0)` });
    });
    const mv = K.inOut(prog(t, T.tilt[0], T.tilt[1]));
    const s = lerp(1, 96 / 124, mv);
    const x = lerp(960 - this.w1 / 2, 150, mv);
    const y = lerp(300, 300, mv);
    css(this.l1, {
      transform: `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,0) scale(${s.toFixed(4)})`,
    });

    // "plumbing" rises as an outline, then fills with water.
    const r2 = K.settle(prog(t, T.plumbing, T.plumbing + 0.75));
    css(this.rise2, { transform: `translate3d(0,${((1 - r2) * 105).toFixed(2)}%,0)` });
    const f = K.inOut(prog(t, T.fill[0], T.fill[1]));
    const level = lerp(this.h2 + 30, -40, f);
    const amp = 11 * Math.sin(Math.PI * clamp(f * 1.1));
    css(this.fillEl, { clipPath: clipBelow(-30, this.w2 + 30, level, t, amp, 0) });
    css(this.crest, { clipPath: clipBelow(-30, this.w2 + 30, level - 16, t, amp, 1.7) });
    css(this.outline, { opacity: (1 - clamp((f - 0.85) / 0.15)).toFixed(3) });

    // The site's red line wipes on from the left.
    const q3 = K.inOut(prog(t, T.trusted, T.trusted + 0.7));
    css(this.l3, {
      clipPath: `inset(-20% ${((1 - q3) * 100).toFixed(2)}% -30% 0)`,
      transform: `translate3d(${((1 - K.settle(prog(t, T.trusted, T.trusted + 0.9))) * -40).toFixed(2)}px,0,0)`,
    });
  }
}

const clipBelow = (x0, x1, level, t, amp, seed) => waveClip(x0, x1, level, t, amp, seed, 'px', 40);
