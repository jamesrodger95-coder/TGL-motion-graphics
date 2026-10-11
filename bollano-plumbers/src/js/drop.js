// Shot A — one drop of water. It falls (stretching as it speeds up), lands,
// throws up a crown of droplets and a jet, and rings out in ripples. The
// outermost ripple then stands up and becomes the circle behind the hero
// illustration, so shot A hands its geometry straight to shot B.
import { T } from './timeline.js';
import { C, K, clamp, lerp, prog, hash, svg, attr, mix } from './kit.js';

export const X = 960; // where the drop lands
export const SURFACE = 712;
export const G = 3200; // gravity, px/s²
export const CIRCLE = { x: 1360, y: 582, r: 325 }; // the hero's circle (shot B)

// Teardrop, tip up, centred on its belly; the site's drop icon, redrawn.
const DROP =
  'M0,-66 C9,-44 40,-10 40,20 C40,42 22,58 0,58 C-22,58 -40,42 -40,20 C-40,-10 -9,-44 0,-66 Z';
const SHINE = 'M-22,18 C-22,32 -12,42 2,44';

// The crown: droplets thrown out on the impact, in a perspective fan.
export const CROWN = Array.from({ length: 14 }, (_, i) => {
  const a = lerp(-1.25, 1.25, (i + 0.5) / 14) + (hash(i, 3) - 0.5) * 0.16;
  const v = lerp(560, 900, hash(i, 7));
  return {
    vx: Math.sin(a) * v * 1.55,
    vy: -Math.cos(a) * v,
    r: lerp(5, 11, hash(i, 11)),
    depth: hash(i, 13) > 0.5 ? 1 : -1, // in front of / behind the jet
  };
});
const RIPPLE_R = [860, 620, 450, 300];

export class Drop {
  constructor(root) {
    const defs = svg('defs', {}, root);
    const grad = svg('linearGradient', { id: 'dropfill', x1: 0, y1: 0, x2: 0.35, y2: 1 }, defs);
    svg('stop', { offset: 0, 'stop-color': '#a6e6ff' }, grad);
    svg('stop', { offset: 1, 'stop-color': '#46b4ea' }, grad);
    const sh = svg('radialGradient', { id: 'dropshadow' }, defs);
    svg('stop', { offset: 0, 'stop-color': '#7aa6c9', 'stop-opacity': 0.45 }, sh);
    svg('stop', { offset: 1, 'stop-color': '#7aa6c9', 'stop-opacity': 0 }, sh);

    // Ripple 0 is drawn first: it becomes the hero's filled circle.
    this.ripples = RIPPLE_R.map(() =>
      svg(
        'ellipse',
        { fill: C.pale, 'fill-opacity': 0, stroke: '#5cc6f4', 'stroke-width': 4 },
        root
      )
    );
    this.shadow = svg('ellipse', { fill: 'url(#dropshadow)', cx: X, cy: SURFACE }, root);
    this.back = svg('g', {}, root);
    this.jet = svg('path', { fill: 'url(#dropfill)' }, root);
    this.bead = svg('circle', { fill: 'url(#dropfill)' }, root);
    this.front = svg('g', {}, root);
    this.crown = CROWN.map((d) =>
      svg('circle', { r: d.r, fill: 'url(#dropfill)' }, d.depth > 0 ? this.front : this.back)
    );
    this.drop = svg('g', {}, root);
    svg('path', { d: DROP, fill: 'url(#dropfill)' }, this.drop);
    svg(
      'path',
      { d: SHINE, fill: 'none', stroke: '#fff', 'stroke-width': 7, 'stroke-linecap': 'round' },
      this.drop
    );
  }

  update(t) {
    const [f0, f1] = T.fall;
    // The fall: gravity from just above frame, stretching with speed.
    const p = prog(t, f0, f1);
    const land = t - T.impact;
    if (t < f0 || land > 0.07) {
      attr(this.drop, { visibility: 'hidden' });
    } else {
      let y, sx, sy;
      if (land <= 0) {
        y = lerp(-140, SURFACE - 58, p * p);
        sy = 1 + 0.32 * p * p;
        sx = 1 - 0.12 * p * p;
      } else {
        // Two frames of squash into the surface.
        const q = land / 0.07;
        sy = lerp(1.32, 0.25, q);
        sx = lerp(0.88, 1.9, q);
        y = SURFACE - 58 * sy;
      }
      attr(this.drop, {
        visibility: 'visible',
        transform: `translate(${X},${y.toFixed(2)}) scale(${sx.toFixed(4)},${sy.toFixed(4)})`,
      });
    }
    // A soft contact shadow tightens as the drop arrives.
    const sp = clamp(p * 1.2);
    attr(this.shadow, {
      rx: (lerp(160, 46, sp) + Math.max(0, land) * 300).toFixed(2),
      ry: (lerp(26, 10, sp) + Math.max(0, land) * 50).toFixed(2),
      opacity: (t < f0 ? 0 : land > 0 ? Math.exp(-land * 5) : sp * 0.9).toFixed(3),
    });

    // The jet: a column that rises from the impact and throws off one bead.
    if (land > 0 && land < 0.5) {
      const h = 165 * Math.sin(Math.PI * clamp(land / 0.46));
      const w = 15 * (1 - land * 0.9);
      const top = SURFACE - h;
      attr(this.jet, {
        visibility: 'visible',
        d: `M${X - w * 1.9},${SURFACE} C${X - w * 0.7},${SURFACE - 10} ${X - w},${top + w} ${X},${top} C${X + w},${top + w} ${X + w * 0.7},${SURFACE - 10} ${X + w * 1.9},${SURFACE} Z`,
      });
    } else attr(this.jet, { visibility: 'hidden' });
    const tb = land - 0.15; // the bead pinches off the jet's tip
    const by = SURFACE - (150 + 760 * tb - 0.5 * G * tb * tb);
    if (tb > 0 && by < SURFACE) {
      attr(this.bead, { visibility: 'visible', cx: X, cy: by.toFixed(2), r: 12 });
    } else attr(this.bead, { visibility: 'hidden' });

    // The crown: each droplet flies a parabola and vanishes when it lands.
    CROWN.forEach((d, i) => {
      const c = this.crown[i];
      const y = SURFACE + d.vy * land + 0.5 * G * land * land;
      if (land <= 0 || y > SURFACE + 2) return attr(c, { visibility: 'hidden' });
      const shrink = clamp(1 - land * 0.9);
      attr(c, {
        visibility: 'visible',
        cx: (X + d.vx * land).toFixed(2),
        cy: y.toFixed(2),
        r: (d.r * shrink).toFixed(2),
      });
    });

    // Ripples ring out from the impact, flattened by the surface's perspective.
    const tilt = K.inOut(prog(t, T.tilt[0], T.tilt[1]));
    T.ripples.forEach((t0, i) => {
      const e = this.ripples[i];
      const age = t - t0;
      if (age <= 0) return attr(e, { visibility: 'hidden' });
      const rx = 18 + RIPPLE_R[i] * (1 - Math.exp(-age * 2.4));
      const fade = Math.exp(-age * (i === 0 ? 0.35 : 1.3));
      const sw = lerp(7, 2, clamp(age / 1.2));
      if (i > 0) {
        return attr(e, {
          visibility: fade * (1 - tilt) > 0.01 ? 'visible' : 'hidden',
          cx: X,
          cy: SURFACE,
          rx: rx.toFixed(2),
          ry: (rx * 0.16).toFixed(2),
          'stroke-width': sw.toFixed(2),
          'stroke-opacity': (fade * (1 - tilt)).toFixed(3),
        });
      }
      // The outer ripple stands up into the hero's circle.
      const R = lerp(rx, CIRCLE.r, tilt);
      attr(e, {
        visibility: 'visible',
        cx: lerp(X, CIRCLE.x, tilt).toFixed(2),
        cy: lerp(SURFACE, CIRCLE.y, tilt).toFixed(2),
        rx: R.toFixed(2),
        ry: lerp(rx * 0.16, CIRCLE.r, tilt).toFixed(2),
        'stroke-width': sw.toFixed(2),
        'stroke-opacity': (fade * (1 - tilt) ** 2).toFixed(3),
        'fill-opacity': clamp((tilt - 0.2) * 2).toFixed(3),
      });
    });
  }

  /** The hero circle's colour shifts lighter once the site's curve is behind it. */
  tint(k) {
    attr(this.ripples[0], { fill: mix(C.pale, C.paler, k) });
  }
}
