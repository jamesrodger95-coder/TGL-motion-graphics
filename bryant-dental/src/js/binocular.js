// SHOT 3 — Binocular. The loupe divides into a pair, the way a pair of loupes
// (and the two bowls of the bd) sit side by side. Left: the AI fitting scan.
// Right: the workshop in the UK, cut on the beat.
import { css, el, prog, lerp, K, E, Seq } from './kit.js';
import { makeLens, placeLens, LENS_R } from './magniflex.js';
import { T } from './timeline.js';

const R = 318;
const C = [
  [560, 470],
  [1360, 470],
];
const MID = [960, 540];

class Label {
  constructor(parent, x, head, sub) {
    this.root = el('div', 'label', parent, `<b>${head}</b><span>${sub}</span>`);
    css(this.root, { left: `${x - 350}px`, top: '838px' });
    this.parts = [...this.root.children];
  }
  update(t, t0, tOut) {
    this.parts.forEach((p, i) => {
      const a = K.settle(prog(t, t0 + i * 0.1, t0 + i * 0.1 + 0.8));
      const o = prog(t, tOut, tOut + 0.3);
      const blur = 16 * (1 - a) + 10 * o;
      css(p, {
        opacity: (Math.min(1, a * 1.4) * (1 - o)).toFixed(3),
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
        transform: `translateY(${((1 - a) * 18 - o * 16).toFixed(2)}px)`,
      });
    });
  }
}

export class Binocular {
  constructor(root) {
    this.root = root;
    css(root, { background: '#000' });
    this.bridge = el('div', 'abs', root);
    css(this.bridge, {
      height: '2px',
      background: 'rgba(255,255,255,0.35)',
      transformOrigin: '50% 50%',
    });
    this.L = makeLens(root, R);
    this.R = makeLens(root, R);
    this.face = new Seq(this.L.view, '../assets/seq/face', 90, { w: 720, h: 720 });
    this.craft = [1, 2, 3, 4, 5].map(
      (k) =>
        new Seq(this.R.view, `../assets/seq/craft${k}`, k === 2 || k === 4 ? 16 : 15, {
          w: 720,
          h: 720,
        })
    );
    for (const s of [this.face, ...this.craft])
      css(s.canvas, { position: 'absolute', left: '0', top: '0', width: '100%', height: '100%' });
    this.cutFlash = el('div', 'abs', this.R.view);
    css(this.cutFlash, { inset: '0', background: '#fff', borderRadius: '50%' });
    this.labels = [
      new Label(
        root,
        C[0][0],
        'We’re technology first.',
        'AI fitting for a 99% first-time loupe fit.'
      ),
      new Label(
        root,
        C[1][0],
        'Handcrafted in the UK.',
        'Painstakingly manufactured and assembled.'
      ),
    ];
  }

  /** Centres and radius of the pair at time t (from shot 2's loupe, back to the middle). */
  pair(t, from) {
    const a = K.swoop(prog(t, T.split[0], T.split[1] + 0.12));
    const m = K.swoop(prog(t, T.merge[0], T.merge[1]));
    return [0, 1]
      .map((i) => {
        let x = lerp(from.cx, C[i][0], a),
          y = lerp(from.cy, C[i][1], a);
        x = lerp(x, MID[0], m);
        y = lerp(y, MID[1], m);
        return [x, y];
      })
      .concat([lerp(lerp(LENS_R, R, a), 330, m)]);
  }

  /** Radius of the circle the world opens through, once the pair has merged. */
  static hole(t) {
    return lerp(330, 1500, K.inExpo(prog(t, T.merge[1] - 0.2, T.merge[1] + 0.3)));
  }

  update(t, from) {
    const on = t >= T.split[0] && t < T.merge[1] + 0.35;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    const [[lx, ly], [rx, ry], r] = this.pair(t, from);
    placeLens(this.L, lx, ly, r, t * 16);
    placeLens(this.R, rx, ry, r, -t * 16);

    // Contents fade up as the pair separates.
    const inA = prog(t, T.split[0], T.split[0] + 0.2);
    const outA = prog(t, T.merge[1] - 0.18, T.merge[1] + 0.2);
    css(this.L.root, { opacity: (1 - outA).toFixed(3) });
    css(this.R.root, { opacity: (1 - outA).toFixed(3) });
    css(this.L.view, { opacity: inA.toFixed(3) });
    css(this.R.view, { opacity: inA.toFixed(3) });
    this.face.show((t - T.split[0]) * 29.74);

    let k = 0;
    T.cuts.forEach((c, i) => {
      if (t >= c) k = i;
    });
    this.craft.forEach((s, i) => css(s.canvas, { visibility: i === k ? 'visible' : 'hidden' }));
    this.craft[k].show((t - Math.max(T.split[0], T.cuts[k] - (k ? 0 : 0.2))) * 24);
    const since = t - T.cuts[k];
    css(this.cutFlash, {
      opacity: (k > 0 && since >= 0 ? 0.35 * Math.exp(-since / 0.05) : 0).toFixed(3),
    });
    css(this.craft[k].canvas, {
      transform: `scale(${(1 + 0.07 * Math.exp(-Math.max(0, since) / 0.12)).toFixed(4)})`,
    });

    // The bridge between the pair, like the frame between two loupes.
    const bIn =
      K.settle(prog(t, T.labels, T.labels + 0.6)) * (1 - prog(t, T.merge[0], T.merge[0] + 0.15));
    const gap0 = lx + r + 44,
      gap1 = rx - r - 44;
    css(this.bridge, {
      left: `${gap0}px`,
      top: `${ly}px`,
      width: `${Math.max(0, gap1 - gap0)}px`,
      transform: `scaleX(${bIn.toFixed(3)})`,
    });

    this.labels.forEach((l, i) => l.update(t, T.labels + i * 0.12, T.merge[0] - 0.1));
  }
}

export { E };
