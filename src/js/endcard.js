// SHOT 4 — the mark. The dark account section closes as a hexagonal iris onto
// the logo's own outline; the three cubes dock along their isometric axes
// (Settle), and the lockup, line, rail of modules and the site's primary action
// build beneath it.
//
// The mark is rebuilt as vector geometry from public/logo-mark.png: an
// isometric 2x2x2 block (a hexagon of circumradius R) holding three cubes of
// edge R/2. Outline 0.06R, inner edges 0.041R, measured from the artwork.
import { el, css, tf, prog, lerp, E, C, ease } from './core.js';
import { rise, wipe } from './text.js';
import { T } from './timeline.js';

const NS = 'http://www.w3.org/2000/svg';
const c30 = Math.cos(Math.PI / 6);
const q = (100 * c30) / 2; // 43.30: half a cube's width, with R = 100
const P = (pts) => 'M' + pts.map(([x, y]) => `${x.toFixed(3)} ${y.toFixed(3)}`).join('L') + 'Z';
const HEX = [
  [0, -100],
  [2 * q, -50],
  [2 * q, 50],
  [0, 100],
  [-2 * q, 50],
  [-2 * q, -50],
];
const CUBES = [
  {
    // top, docks straight down
    faces: [
      [
        [0, -100],
        [q, -75],
        [0, -50],
        [-q, -75],
      ],
      [
        [-q, -75],
        [0, -50],
        [0, 0],
        [-q, -25],
      ],
      [
        [0, -50],
        [q, -75],
        [q, -25],
        [0, 0],
      ],
    ],
    from: [0, -1],
  },
  {
    // front left, docks along the isometric x axis
    faces: [
      [
        [-q, -25],
        [0, 0],
        [-q, 25],
        [-2 * q, 0],
      ],
      [
        [-2 * q, 0],
        [-q, 25],
        [-q, 75],
        [-2 * q, 50],
      ],
      [
        [-q, 25],
        [0, 0],
        [0, 50],
        [-q, 75],
      ],
    ],
    from: [-c30, 0.5],
  },
  {
    // front right
    faces: [
      [
        [q, -25],
        [2 * q, 0],
        [q, 25],
        [0, 0],
      ],
      [
        [0, 0],
        [q, 25],
        [q, 75],
        [0, 50],
      ],
      [
        [q, 25],
        [2 * q, 0],
        [2 * q, 50],
        [q, 75],
      ],
    ],
    from: [c30, 0.5],
  },
];

export const hexClip = (cx, cy, R) =>
  `polygon(${HEX.map(([x, y]) => `${(cx + (x * R) / 100).toFixed(2)}px ${(cy + (y * R) / 100).toFixed(2)}px`).join(',')})`;

const R_OPEN = 1180; // circumradius that covers the whole frame
const R_IRIS = 150; // where the iris stops: the mark, full size
const R_LOCK = 100; // the mark in the lockup
const LOCK_Y = 330;

export class EndCard {
  constructor(root) {
    this.root = root;
    // Wordmark first, so the lockup can be measured and centred.
    this.word = el('div', 'wordmark', root);
    this.chars = [...'Grow Label'].map((ch) => {
      const m = el('span', 'ch-mask', this.word);
      return el('span', 'ch', m, ch === ' ' ? '&nbsp;' : ch);
    });
    const wordW = this.word.getBoundingClientRect().width;
    const markW = 4 * q * (R_LOCK / 100) + 8; // hex width is 2 x 86.6 units
    const gap = 0.5 * R_LOCK;
    const left = 960 - (markW + gap + wordW) / 2;
    this.lockMark = [left + markW / 2, LOCK_Y];
    css(this.word, { left: `${left + markW + gap}px`, top: `${LOCK_Y - 160 * 0.56}px` });

    this.svg = document.createElementNS(NS, 'svg');
    this.svg.setAttribute('class', 'mark');
    this.svg.setAttribute('width', '1920');
    this.svg.setAttribute('height', '1080');
    css(this.svg, { left: '0px', top: '0px' });
    root.appendChild(this.svg);
    this.g = document.createElementNS(NS, 'g');
    this.svg.appendChild(this.g);
    const S = (tag, attrs, parent) => {
      const n = document.createElementNS(NS, tag);
      for (const k in attrs) n.setAttribute(k, attrs[k]);
      parent.appendChild(n);
      return n;
    };
    // Cubes dock through the hexagon's own edges, so they are clipped to it.
    const defs = S('defs', {}, this.svg);
    const clip = S('clipPath', { id: 'hexclip' }, defs);
    S('path', { d: P(HEX) }, clip);
    const dock = S('g', { 'clip-path': 'url(#hexclip)' }, this.g);
    this.cubes = CUBES.map((cube) => {
      const g = S('g', { opacity: 0 }, dock);
      for (const f of cube.faces) S('path', { d: P(f), fill: C.markPurple }, g);
      for (const f of cube.faces)
        S(
          'path',
          {
            d: P(f),
            fill: 'none',
            stroke: C.markNavy,
            'stroke-width': 4.1,
            'stroke-linejoin': 'miter',
          },
          g
        );
      return { g, from: cube.from };
    });
    this.hex = S(
      'path',
      {
        d: P(HEX),
        fill: 'none',
        stroke: C.markNavy,
        'stroke-width': 6,
        'stroke-linejoin': 'miter',
        opacity: 0,
      },
      this.g
    );

    this.tagline = el('div', 'tagline', root, 'AI revenue operations for clinics.');
    this.modrow = el(
      'div',
      'modrow',
      root,
      ['Answer', 'Respond', 'Retain', 'Reactivate']
        .map((m, i) => `<span><i>0${i + 1}</i>${m}</span>`)
        .join('')
    );
    this.btn = el(
      'div',
      'btn',
      root,
      'Request an assessment <span class="btn__arrow">&rarr;</span>'
    );
    this.arrow = this.btn.querySelector('.btn__arrow');
    this.url = el('div', 'url', root, 'thegrowlabel.com');
    const centre = (n, top) => {
      const w = n.getBoundingClientRect().width;
      css(n, { left: `${960 - w / 2}px`, top: `${top}px` });
    };
    centre(this.tagline, 500);
    centre(this.modrow, 600);
    centre(this.btn, 704);
    centre(this.url, 852);
  }

  /** Radius of the iris on the dark section, or null when it is fully open. */
  iris(t) {
    if (t < T.aperture[0]) return null;
    if (t < T.aperture[1])
      return lerp(R_OPEN, R_IRIS, E.camera(prog(t, T.aperture[0], T.aperture[1])));
    // Having left the mark's outline behind, the dark closes on to a point.
    return R_IRIS * (1 - ease.inQuad(prog(t, T.aperture[1], T.irisEnd)));
  }

  update(t) {
    const on = t >= T.aperture[0];
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;

    // The mark: sits under the iris, then glides into the lockup.
    const glide = E.camera(prog(t, T.word - 0.14, T.word + 0.42));
    const R = lerp(R_IRIS, R_LOCK, glide);
    const cx = lerp(960, this.lockMark[0], glide),
      cy = lerp(540, this.lockMark[1], glide);
    this.g.setAttribute(
      'transform',
      `translate(${cx.toFixed(3)} ${cy.toFixed(3)}) scale(${(R / 100).toFixed(5)})`
    );
    this.hex.setAttribute('opacity', t >= T.aperture[1] - 0.03 ? '1' : '0');
    this.cubes.forEach((cube, i) => {
      const t0 = T.cubes[i];
      const d = E.house(prog(t, t0, t0 + 0.55));
      const off = 102 * (1 - d);
      cube.g.setAttribute(
        'transform',
        `translate(${(cube.from[0] * off).toFixed(3)} ${(cube.from[1] * off).toFixed(3)})`
      );
      cube.g.setAttribute('opacity', t >= t0 ? '1' : '0');
    });

    this.chars.forEach((ch, i) => {
      const t0 = T.word + 0.22 + i * 0.03;
      const p = E.house(prog(t, t0, t0 + 0.8));
      css(ch, { transform: tf({ y: (1 - p) * 160 * 1.1 }) });
    });
    rise(this.tagline, t, T.tagline, { dist: 22, dur: 0.8 });
    wipe(this.modrow, t, T.modrow, 0.7);
    rise(this.modrow, t, T.modrow, { dist: 10, dur: 0.6 });
    // M04 card settle for the action: arrives at scale .985 and settles.
    const b = E.house(prog(t, T.cta, T.cta + 0.7));
    css(this.btn, {
      opacity: b.toFixed(3),
      transform: tf({ y: (1 - b) * 18, s: lerp(0.985, 1, b) }),
    });
    const nudge = Math.sin(Math.PI * prog(t, T.cta + 0.45, T.cta + 0.95));
    css(this.arrow, { transform: tf({ x: 7 * nudge }) });
    rise(this.url, t, T.url, { dist: 14 });
  }
}
