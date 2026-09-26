// SHOT 1 — Constellations. A field of stars, the Ignis light ignites, and the
// site's hero line comes into focus the way a loupe does: soft, then sharp.
// The light then opens into a lens (the iris into shot 2).
import { css, prog, K, FocusWords } from './kit.js';
import { flare, flash } from './sky.js';
import { T } from './timeline.js';

export const LIGHT = [960, 360];

export class Open {
  constructor(root, sky) {
    this.root = root;
    this.sky = sky;
    this.head = new FocusWords(
      root,
      [
        [['Loupes'], ['that'], ['unlock'], ['new']],
        [
          ['constellations', 'grey'],
          ['of', 'grey'],
          ['possibility.', 'grey'],
        ],
      ],
      { x: 120, y: 690, size: 104, lineGap: 1.0 }
    );
    css(root, { transformOrigin: `${LIGHT[0]}px ${LIGHT[1]}px` });
  }

  update(t) {
    const on = t < T.iris[1] + 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    // The camera leans into the light as it opens.
    const push = K.inExpo(prog(t, T.iris[0] - 0.35, T.iris[1]));
    css(this.root, { transform: `scale(${(1 + 0.3 * push).toFixed(4)})` });
    this.head.update(t, T.head, { tOut: T.iris[0] - 0.12, outDur: 0.42, blur: 26 });
  }

  /** Light and constellation lines, drawn on the screen-blended fx canvas. */
  fx(ctx, t) {
    if (t > T.iris[1] + 0.1) return;
    // Constellation lines join a handful of stars, one segment after another.
    const stars = this.sky.linkStars(t);
    const links = prog(t, T.links[0], T.links[1]) * (stars.length - 1);
    const fade = 1 - prog(t, T.iris[0] - 0.2, T.iris[0] + 0.15);
    ctx.save();
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(160,200,255,${0.55 * fade})`;
    for (let i = 0; i < stars.length - 1 && i < links; i++) {
      const a = stars[i],
        b = stars[i + 1];
      const k = Math.min(1, links - i);
      ctx.beginPath();
      ctx.moveTo(a.sx, a.sy);
      ctx.lineTo(a.sx + (b.sx - a.sx) * k, a.sy + (b.sy - a.sy) * k);
      ctx.stroke();
    }
    ctx.fillStyle = `rgba(210,230,255,${0.9 * fade})`;
    stars.forEach((s, i) => {
      if (i > links + 1) return;
      ctx.beginPath();
      ctx.arc(s.sx, s.sy, 2.6, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.restore();

    // The Ignis light: ignition, a steady breathing glow, then a surge as it
    // opens into the lens.
    const ign = flash(t, T.ignite, 0.08, 0.5);
    const steady = prog(t, T.ignite, T.ignite + 0.6) * (0.42 + 0.04 * Math.sin(t * 9));
    const surge =
      K.inExpo(prog(t, T.iris[0] - 0.3, T.iris[0] + 0.12)) *
      (1 - prog(t, T.iris[0] + 0.12, T.iris[1]));
    const gone = 1 - prog(t, T.iris[0] + 0.2, T.iris[1]);
    const k = Math.min(1.6, Math.max(ign * 1.1, steady) + surge * 1.2) * gone;
    flare(ctx, LIGHT[0], LIGHT[1], k, { halo: 420, streak: 1100, core: 26 });
  }
}
