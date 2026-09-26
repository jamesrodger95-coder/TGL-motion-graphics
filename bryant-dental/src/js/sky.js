// The sky: a parallax starfield the camera drifts through, and the light
// (anamorphic flares for the Ignis headlight, click glints and the sunrise).
import { prog, hash, lerp, E } from './kit.js';
import { K } from './kit.js';
import { T } from './timeline.js';

const N = 760;
const F = 720; // focal length, px

export class Sky {
  constructor(canvas) {
    this.ctx = canvas.getContext('2d');
    this.stars = Array.from({ length: N }, (_, i) => ({
      x: (hash(i, 1) * 2 - 1) * 1.9,
      y: (hash(i, 2) * 2 - 1) * 1.15,
      z: 0.25 + hash(i, 3) * 1.1,
      r: 0.55 + hash(i, 4) ** 3 * 1.9,
      a: 0.35 + hash(i, 5) * 0.65,
      blue: hash(i, 6) < 0.28,
      tw: 2 + hash(i, 7) * 5,
      ph: hash(i, 8) * 6.28,
    }));
  }

  /** Camera travel into the field. Slow drift, a warp through the first iris. */
  static travel(t) {
    const warp = K.inExpo(prog(t, T.iris[0] - 0.25, T.iris[1] + 0.05));
    return 0.035 * t + 0.9 * warp;
  }

  /** Vertical tilt as the camera lifts off the Earth. */
  static tilt(t) {
    return 520 * K.swoop(prog(t, T.lift[0], T.lift[1] + 0.2));
  }

  /** Screen position of star i at time t, or null when behind the camera. */
  project(s, t) {
    const range = 1.1;
    let z = s.z - Sky.travel(t);
    z = ((((z - 0.25) % range) + range) % range) + 0.25;
    const sx = 960 + (s.x / z) * F;
    const sy = 540 + ((s.y + Sky.tilt(t) / F) / z) * F;
    const fadeFar = prog(1.35 - z, 0, 0.25); // stars fade in from the distance
    return { sx, sy, z, fade: fadeFar };
  }

  /** hide(x, y) may veto a star, e.g. one that would sit on the planet. */
  draw(t, alpha, hide) {
    const { ctx } = this;
    ctx.clearRect(0, 0, 1920, 1080);
    if (alpha <= 0) return;
    for (let i = 0; i < N; i++) {
      const s = this.stars[i];
      const p = this.project(s, t);
      if (p.sx < -20 || p.sx > 1940 || p.sy < -20 || p.sy > 1100) continue;
      if (hide && hide(p.sx, p.sy)) continue;
      const tw = 0.72 + 0.28 * Math.sin(t * s.tw + s.ph);
      const a = s.a * tw * p.fade * alpha;
      if (a < 0.01) continue;
      const r = Math.min(3.2, s.r / p.z);
      ctx.fillStyle = s.blue
        ? `rgba(150,195,255,${a.toFixed(3)})`
        : `rgba(255,255,255,${a.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.sx, p.sy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Stars used for the constellation lines in the opening shot. */
  linkStars(t) {
    const picked = [];
    for (let i = 0; i < N && picked.length < 7; i++) {
      const p = this.project(this.stars[i], 1.2);
      if (p.sx > 1180 && p.sx < 1780 && p.sy > 110 && p.sy < 430 && this.stars[i].r > 1.1)
        picked.push(i);
    }
    return picked
      .map((i) => ({ i, ...this.project(this.stars[i], t) }))
      .sort((a, b) => a.sx - b.sx);
  }
}

/** Draws an anamorphic flare: hot core, blue halo, long horizontal streak. */
export function flare(ctx, x, y, k, { halo = 260, streak = 900, core = 22 } = {}) {
  if (k <= 0.002) return;
  ctx.save();
  const hr = halo * k; // the fill must cover the whole gradient, or its edge shows as a square
  let g = ctx.createRadialGradient(x, y, 0, x, y, hr);
  g.addColorStop(0, `rgba(90,160,255,${0.55 * Math.min(k, 1.2)})`);
  g.addColorStop(0.35, `rgba(0,113,227,${0.22 * Math.min(k, 1.2)})`);
  g.addColorStop(1, 'rgba(0,60,160,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - hr, y - hr, hr * 2, hr * 2);

  ctx.translate(x, y);
  ctx.scale(1, 0.016);
  g = ctx.createRadialGradient(0, 0, 0, 0, 0, streak * k);
  g.addColorStop(0, `rgba(200,225,255,${0.95 * k})`);
  g.addColorStop(0.25, `rgba(60,150,255,${0.5 * k})`);
  g.addColorStop(1, 'rgba(0,80,200,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, streak * k, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  g = ctx.createRadialGradient(x, y, 0, x, y, core * (0.6 + 0.4 * k));
  g.addColorStop(0, `rgba(255,255,255,${Math.min(1, 1.2 * k)})`);
  g.addColorStop(0.5, `rgba(210,232,255,${0.7 * k})`);
  g.addColorStop(1, 'rgba(120,180,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, core * 1.4, 0, Math.PI * 2);
  ctx.fill();
}

/** Intensity envelope of a flash: quick attack, exponential decay. */
export const flash = (t, t0, attack = 0.05, decay = 0.35) =>
  t < t0 ? 0 : t < t0 + attack ? (t - t0) / attack : Math.exp(-(t - t0 - attack) / decay);

export { lerp, E };
