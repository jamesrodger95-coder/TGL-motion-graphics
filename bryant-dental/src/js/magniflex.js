// SHOT 2 — MagniFlex. The light opens into a lens and inside it is Bryant
// Dental's own MagTech render: two barrels fly in and click on, on the beat.
// The camera then dives into the left barrel's glass, which becomes a loupe
// reading the site's micro-copy at the three MagniFlex magnifications.
import { css, tf, el, prog, lerp, K, E, FocusWords, Seq, measureSubstring } from './kit.js';
import { flare, flash } from './sky.js';
import { T } from './timeline.js';
import { LIGHT } from './open.js';

const VID = { x: 240, y: 336, w: 1440, h: 740, k: 0.9 }; // 1600x822 source frames, at 0.9
const ORIGIN = [470 * VID.k, 555 * VID.k]; // left barrel's glass, inside the video box
const GLASS = [
  [VID.x + 470 * VID.k, VID.y + 555 * VID.k],
  [VID.x + 1115 * VID.k, VID.y + 555 * VID.k],
];
export const LENS_R = 300;
const LENS_Y = 548;
const MAGS = ['3.8x', '5.7x', '7.8x'];
const MICRO = 'Ultra lightweight ergonomic optics, so clear they feel like magic.';
const FOCUS = ['so clear', 'feel like', 'magic.'];

function ticks(parent, r, n = 90) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  const size = 2 * (r + 40);
  svg.setAttribute('width', size);
  svg.setAttribute('height', size);
  svg.setAttribute('viewBox', `${-size / 2} ${-size / 2} ${size} ${size}`);
  svg.setAttribute('class', 'lens__ticks');
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const long = i % 10 === 0;
    const r0 = r + 18,
      r1 = r + (long ? 34 : 26);
    const l = document.createElementNS(NS, 'line');
    l.setAttribute('x1', (Math.cos(a) * r0).toFixed(2));
    l.setAttribute('y1', (Math.sin(a) * r0).toFixed(2));
    l.setAttribute('x2', (Math.cos(a) * r1).toFixed(2));
    l.setAttribute('y2', (Math.sin(a) * r1).toFixed(2));
    l.setAttribute('stroke', long ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.32)');
    l.setAttribute('stroke-width', long ? '2' : '1.4');
    svg.appendChild(l);
  }
  parent.appendChild(svg);
  return svg;
}

/** A glass loupe: circular view, glass shading, metal rim, blue light, bezel ticks. */
export function makeLens(parent, r) {
  const root = el('div', 'lens', parent);
  const view = el('div', 'lens__view', root);
  el('div', 'lens__glass', root);
  el('div', 'lens__rim', root);
  const bezel = ticks(root, r);
  return { root, view, bezel };
}

export function placeLens(lens, cx, cy, r, rot = 0) {
  css(lens.root, {
    left: `${(cx - r).toFixed(2)}px`,
    top: `${(cy - r).toFixed(2)}px`,
    width: `${(2 * r).toFixed(2)}px`,
    height: `${(2 * r).toFixed(2)}px`,
  });
  css(lens.bezel, {
    left: '-40px',
    top: '-40px',
    width: `${(2 * r + 80).toFixed(2)}px`,
    height: `${(2 * r + 80).toFixed(2)}px`,
    transform: `rotate(${rot.toFixed(2)}deg)`,
  });
}

export class MagniFlex {
  constructor(root, pillsRoot, lensRoot) {
    this.root = root;
    this.pillsRoot = pillsRoot;
    this.lensRoot = lensRoot;
    css(root, { background: '#000' });

    this.glow = el('div', 'glow-blue', root);
    css(this.glow, {
      left: `${960 - 950}px`,
      top: `${690 - 470}px`,
      width: '1900px',
      height: '940px',
    });
    this.vid = el('div', 'abs', root);
    css(this.vid, {
      left: `${VID.x}px`,
      top: `${VID.y}px`,
      width: `${VID.w}px`,
      height: `${VID.h}px`,
      transformOrigin: `${ORIGIN[0]}px ${ORIGIN[1]}px`,
      maskImage:
        'linear-gradient(90deg, transparent 0, #000 9%, #000 91%, transparent 100%), linear-gradient(180deg, transparent 0, #000 12%)',
      maskComposite: 'intersect',
    });
    this.seq = new Seq(this.vid, '../assets/seq/magniflex', 61, { w: VID.w, h: VID.h });
    // The render's black lets the blue backlight through instead of boxing it in.
    css(this.seq.canvas, { mixBlendMode: 'lighten' });

    this.title = new FocusWords(root, [[['Magni'], ['Flex', 'grey']]], {
      x: 960,
      y: 40,
      size: 128,
      align: 'center',
    });
    // "MagniFlex" is one word: close the gap the word split leaves.
    this.title.root.querySelector('div').childNodes[1].textContent = '';
    this.sub = new FocusWords(
      root,
      [[['Three'], ['magnifications.'], ['One'], ['ultra-light'], ['loupe'], ['system.']]],
      {
        x: 960,
        y: 186,
        size: 32,
        align: 'center',
      }
    );
    css(this.sub.root, {
      fontWeight: '400',
      letterSpacing: '-0.005em',
      color: 'rgba(255,255,255,0.78)',
    });

    // The site's magnification pills, kept on screen through the magnify beat.
    this.pills = MAGS.map((m, i) => {
      const p = el('div', 'pill', pillsRoot, m.replace('x', 'x'));
      css(p, { left: `${960 - 39 + (i - 1) * 104}px`, top: '258px' });
      const ring = el('div', 'pill__ring', p);
      return { p, ring };
    });

    // The iris ring that opens out of the Ignis light.
    this.ring = el('div', 'abs', lensRoot);
    css(this.ring, {
      borderRadius: '50%',
      border: '3px solid rgba(220,236,255,0.95)',
      boxShadow: '0 0 50px 14px rgba(0,113,227,0.75), inset 0 0 40px 8px rgba(0,113,227,0.55)',
    });

    // The loupe.
    this.micro = el('div', 'micro', lensRoot, MICRO);
    css(this.micro, { left: '0px', top: `${LENS_Y - 14}px` });
    const mw = this.micro.getBoundingClientRect().width;
    this.mx = 830 - mw / 2;
    css(this.micro, { left: `${this.mx}px` });
    this.focus = FOCUS.map((w) => measureSubstring(this.micro, w));
    this.my = this.micro.getBoundingClientRect().top;
    this.num = el('div', 'abs', lensRoot);
    css(this.num, {
      left: '120px',
      top: `${LENS_Y - 84}px`,
      width: '440px',
      height: '170px',
      overflow: 'hidden',
    });
    this.nums = MAGS.map((m) => {
      const n = el('div', 'bignum', this.num, m.replace('x', '×'));
      css(n, { right: '0px', top: '8px' });
      return n;
    });
    this.lens = makeLens(lensRoot, LENS_R);
    this.mag = el('div', 'magtext', this.lens.view, MICRO);
  }

  /** Iris radius on shot 1's light, or null once fully open. */
  iris(t) {
    if (t >= T.iris[1]) return null;
    return 1500 * K.inExpo(prog(t, T.iris[0], T.iris[1]));
  }

  /** Where the loupe is and how strongly it magnifies, at time t. */
  loupe(t) {
    const F = this.focus;
    const arrive = K.swoop(prog(t, T.intoLens[0] + 0.02, T.steps[0] + 0.06));
    let cx = lerp(GLASS[0][0], F[0].x, arrive);
    let cy = lerp(GLASS[0][1], LENS_Y, arrive);
    const r = lerp(58, LENS_R, arrive);
    for (let i = 1; i < 3; i++)
      cx = lerp(cx, F[i].x, K.swoop(prog(t, T.steps[i] - 0.02, T.steps[i] + 0.24)));
    let m = lerp(2.4, 3.8, K.settle(prog(t, T.steps[0], T.steps[0] + 0.22)));
    m = lerp(m, 5.7, K.settle(prog(t, T.steps[1], T.steps[1] + 0.22)));
    m = lerp(m, 7.8, K.settle(prog(t, T.steps[2], T.steps[2] + 0.22)));
    let blur = 9 * (1 - prog(t, T.steps[0] - 0.1, T.steps[0] + 0.2));
    for (const s of T.steps) if (t >= s) blur = Math.max(blur, 6 * Math.exp(-(t - s) / 0.08));
    return { cx, cy, r, m, blur };
  }

  update(t) {
    const on = t >= T.iris[0] && t < T.split[1] + 0.05;
    css(this.root, { visibility: on && t < T.split[0] + 0.2 ? 'visible' : 'hidden' });
    css(this.pillsRoot, { visibility: on ? 'visible' : 'hidden' });
    css(this.lensRoot, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;

    // Iris out of the light.
    const R = this.iris(t);
    css(this.root, {
      clipPath: R == null ? 'none' : `circle(${R.toFixed(1)}px at ${LIGHT[0]}px ${LIGHT[1]}px)`,
    });
    css(this.ring, { visibility: R == null || R < 1 ? 'hidden' : 'visible' });
    if (R != null)
      css(this.ring, {
        left: `${LIGHT[0] - R}px`,
        top: `${LIGHT[1] - R}px`,
        width: `${2 * R}px`,
        height: `${2 * R}px`,
      });

    // The MagTech render, and the dive into the left barrel's glass.
    const src = Math.max(0, t - T.video.t0) * T.video.speed;
    this.seq.show(src * T.video.fps);
    const push = 1 + 0.045 * prog(t, T.iris[0], T.intoLens[0]);
    const dive = K.inExpo(prog(t, T.intoLens[0], T.intoLens[1]));
    const s = push * (1 + 8 * dive);
    css(this.vid, {
      transform: `scale(${s.toFixed(4)})`,
      opacity: (1 - prog(t, T.intoLens[0] + 0.12, T.intoLens[1])).toFixed(3),
    });
    css(this.glow, {
      opacity: (
        (0.85 + 0.08 * Math.sin(t * 6)) *
        (1 - prog(t, T.intoLens[0], T.intoLens[0] + 0.25))
      ).toFixed(3),
    });
    this.vidScale = s;

    this.title.update(t, T.title, {
      tOut: T.intoLens[0] - 0.05,
      outDur: 0.3,
      stagger: 0.09,
      dur: 0.8,
    });
    this.sub.update(t, T.title + 0.18, {
      tOut: T.intoLens[0] - 0.05,
      outDur: 0.3,
      stagger: 0.035,
      dur: 0.7,
      blur: 12,
    });

    // Pills: pop in, then light up with each magnification.
    this.pills.forEach(({ p, ring }, i) => {
      const a = K.outBack(prog(t, T.pills[i], T.pills[i] + 0.4));
      const out = prog(t, T.split[0], T.split[0] + 0.25);
      // They rise clear of the loupe as the title leaves.
      const up = -150 * K.swoop(prog(t, T.intoLens[0], T.intoLens[1] + 0.1));
      css(p, {
        opacity: (Math.min(1, a * 3) * (1 - out)).toFixed(3),
        transform: tf({ s: Math.max(0.001, a) * (1 - 0.2 * out), y: up - 30 * out }),
      });
      const lit =
        i === 2
          ? prog(t, T.steps[2], T.steps[2] + 0.12)
          : prog(t, T.steps[i], T.steps[i] + 0.12) *
            (1 - prog(t, T.steps[i + 1], T.steps[i + 1] + 0.12));
      css(ring, { opacity: lit.toFixed(3), transform: `scale(${(1.25 - 0.25 * lit).toFixed(3)})` });
    });

    // The loupe over the micro-copy.
    const lensOn = t >= T.intoLens[0] + 0.02;
    const L = this.loupe(t);
    const handoff = 1 - prog(t, T.split[0] + 0.06, T.split[0] + 0.24);
    css(this.lens.root, { visibility: lensOn ? 'visible' : 'hidden', opacity: handoff.toFixed(3) });
    placeLens(this.lens, L.cx, L.cy, L.r, t * 14);
    const fs = 20 * L.m; // .micro is 20px
    const ox = L.cx + (this.mx - L.cx) * L.m - (L.cx - L.r);
    const oy = L.cy + (this.my - L.cy) * L.m - (L.cy - L.r);
    css(this.mag, {
      fontSize: `${fs.toFixed(3)}px`,
      transform: `translate(${ox.toFixed(2)}px, ${oy.toFixed(2)}px)`,
      filter: L.blur > 0.05 ? `blur(${L.blur.toFixed(2)}px)` : 'none',
      opacity: prog(t, T.intoLens[0] + 0.1, T.intoLens[1]).toFixed(3),
    });
    const microIn =
      prog(t, T.intoLens[0] + 0.1, T.intoLens[1] + 0.1) *
      (1 - prog(t, T.split[0], T.split[0] + 0.2));
    css(this.micro, { opacity: microIn.toFixed(3) });

    // The magnification, rolling like a lens barrel's engraving.
    const step = [0, 1, 2].reduce(
      (acc, i) => acc + (i ? K.settle(prog(t, T.steps[i], T.steps[i] + 0.3)) : 0),
      0
    );
    const nIn =
      K.settle(prog(t, T.steps[0] - 0.1, T.steps[0] + 0.4)) *
      (1 - prog(t, T.split[0], T.split[0] + 0.2));
    this.nums.forEach((n, i) =>
      css(n, { transform: tf({ y: (i - step) * 170 }), opacity: nIn.toFixed(3) })
    );
  }

  fx(ctx, t) {
    if (t < T.clicks[0] - 0.05 || t > T.intoLens[1]) return;
    // A glint off each barrel's glass as it clicks home.
    const O = [VID.x + ORIGIN[0], VID.y + ORIGIN[1]];
    const s = this.vidScale || 1;
    T.clicks.forEach((tc, i) => {
      const k = flash(t, tc, 0.03, 0.16) * 0.95;
      const [gx, gy] = GLASS[i];
      flare(ctx, O[0] + (gx - O[0]) * s, O[1] + (gy - O[1]) * s, k, {
        halo: 200,
        streak: 620,
        core: 16,
      });
    });
  }

  /** Current loupe position, so shot 3 can take over from exactly here. */
  handoff(t) {
    return this.loupe(t);
  }
}

export { E };
