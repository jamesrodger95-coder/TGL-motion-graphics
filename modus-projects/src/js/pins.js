// Shot C — "Waar we goed in zijn." The four services, in the site's order,
// pinned to the room the flight lands in: a dot lands on the fitting, a ring
// pulses out, a leader line draws, and a label (the site's numbered service
// row, with its round plus button) wipes on. The pins ride the camera.
import { T } from './timeline.js';
import { C, K, clamp, lerp, prog, css, el, svg, attr } from './kit.js';

// Anchors in the source frame (1440x1440) and where each label sits, relative
// to its anchor on screen; side: which way the label extends from the line.
const PINS = [
  { n: '01', t: 'Sanitair', at: [1185, 780], to: [-60, -250], side: 'left' }, // the vanity
  { n: '02', t: 'Tegels', at: [1255, 985], to: [-130, 120], side: 'left' }, // the bathroom floor
  { n: '03', t: 'Keukens', at: [470, 735], to: [40, -270], side: 'right' }, // the island
  { n: '04', t: 'Vloeren', at: [520, 1000], to: [110, -40], side: 'right' }, // the herringbone
];

export class Pins {
  constructor(svgRoot, labelRoot, seq) {
    this.seq = seq;
    this.items = PINS.map((p) => {
      const g = svg('g', {}, svgRoot);
      const ring = svg('circle', { fill: 'none', stroke: C.orange, 'stroke-width': 2.5 }, g);
      const line = svg('path', { fill: 'none', stroke: '#fff', 'stroke-width': 2 }, g);
      const halo = svg('circle', { fill: 'rgba(255,165,116,0.35)' }, g);
      const dot = svg('circle', { fill: C.orange }, g);
      const label = el(
        'div',
        'label',
        labelRoot,
        `<span class="n">${p.n}</span><span class="t">${p.t}</span><span class="plus"></span>`
      );
      return { p, g, ring, line, halo, dot, label };
    });
  }

  measure() {
    for (const it of this.items) {
      it.w = it.label.offsetWidth;
      it.h = it.label.offsetHeight;
    }
  }

  update(t) {
    const gone = K.inOut(prog(t, T.pinsOut, T.pinsOut + 0.3));
    this.items.forEach((it, i) => {
      const t0 = T.pins[i];
      const on = t >= t0;
      attr(it.g, { visibility: on && gone < 1 ? 'visible' : 'hidden' });
      css(it.label, { visibility: on && gone < 1 ? 'visible' : 'hidden' });
      if (!on || gone >= 1) return;
      const [ax, ay] = this.seq.project(it.p.at[0], it.p.at[1], t);
      // The dot lands with a spring; a ring pulses out from it.
      const d = Math.max(0, K.spring(prog(t, t0, t0 + 0.6), 2, 5.5)) * (1 - gone);
      attr(it.dot, { cx: ax.toFixed(2), cy: ay.toFixed(2), r: (9 * d).toFixed(2) });
      attr(it.halo, { cx: ax.toFixed(2), cy: ay.toFixed(2), r: (22 * d).toFixed(2) });
      const rp = prog(t, t0 + 0.05, t0 + 0.75);
      attr(it.ring, {
        cx: ax.toFixed(2),
        cy: ay.toFixed(2),
        r: lerp(10, 70, K.settle(rp)).toFixed(2),
        opacity: (rp > 0 && rp < 1 ? (1 - rp) ** 1.5 : 0).toFixed(3),
      });
      // The leader line, out to the label.
      const [dx, dy] = it.p.to;
      const ex = ax + dx,
        ey = ay + dy;
      const lq = K.inOut(prog(t, t0 + 0.1, t0 + 0.45)) * (1 - gone);
      const len = Math.hypot(dx, dy);
      attr(it.line, {
        d: `M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`,
        'stroke-dasharray': `${(len * lq).toFixed(1)} ${len + 10}`,
      });
      // The label wipes on from its line, then off as the panels arrive.
      const wq = K.settle(prog(t, t0 + 0.25, t0 + 0.7));
      const x = it.p.side === 'left' ? ex - it.w : ex;
      const y = ey - it.h / 2;
      const cut = (1 - wq) * 100;
      css(it.label, {
        left: `${x.toFixed(1)}px`,
        top: `${y.toFixed(1)}px`,
        clipPath:
          it.p.side === 'left'
            ? `inset(0 0 0 ${(cut + gone * 100).toFixed(2)}%)`
            : `inset(0 ${(cut + gone * 100).toFixed(2)}% 0 0)`,
        transform: `translate3d(${((it.p.side === 'left' ? 1 : -1) * (1 - wq) * 30).toFixed(2)}px,0,0)`,
      });
    });
    return clamp(1 - gone);
  }
}
