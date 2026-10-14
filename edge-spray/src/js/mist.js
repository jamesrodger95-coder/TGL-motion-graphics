// A burst of spray from a nozzle that thickens until it floods the frame.
// Every particle's state is a closed-form function of time (no stepping), so
// any frame, and any motion-blur sub-frame, can be drawn in any order.
//
// Two populations: fine droplets drawn at full resolution (fast, streaking
// under motion blur), and soft clouds drawn at quarter resolution (they are
// all blur anyway) that bloom and merge. In the last moments before the slam
// a fill of the next scene's colour comes up, so the frame lands on it
// exactly.
import { rng, clamp, prog, K } from './kit.js';

const CLOUD_SCALE = 0.25;

function sprite(rgb, size, core) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  const r = size / 2;
  const grd = g.createRadialGradient(r, r, 0, r, r, r);
  grd.addColorStop(0, `rgba(${rgb},1)`);
  grd.addColorStop(core, `rgba(${rgb},0.55)`);
  grd.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grd;
  g.fillRect(0, 0, size, size);
  return c;
}

/** Approximately normal (sum of uniforms). */
const gauss = (r) => (r() + r() + r() + r() - 2) / 0.58;

export class Spray {
  /**
   * @param {object} o
   * @param {number} o.seed
   * @param {(t:number)=>[number,number,number]} o.nozzle  nozzle x, y and aim (radians) at time t
   * @param {number} o.t0     the shot
   * @param {number} o.slam   the frame is flooded by now
   * @param {string} o.rgb    droplet / cloud colour "r,g,b"
   * @param {string} o.flood  the next scene's colour (CSS)
   * @param {string} o.after  droplet colour once the next scene is up ("r,g,b")
   * @param {string} o.blend  canvas composite for the droplets
   */
  constructor(o) {
    Object.assign(this, { n: 1100, clouds: 90, ...o });
    const r = rng(o.seed);
    this.drops = Array.from({ length: this.n }, () => {
      const u = r();
      return {
        tb: this.t0 + 0.24 * u ** 1.4,
        ang: gauss(r) * 0.1,
        v0: 2400 + 3400 * r(),
        k: 2.4 + 2.4 * r(),
        life: 0.45 + 0.75 * r(),
        r0: 1.2 + 2.2 * r(),
        r1: 6 + 46 * r() ** 2,
        wob: 18 + 70 * r(),
        wf: 3 + 6 * r(),
        ph: 6.283 * r(),
        a: 0.25 + 0.45 * r(),
      };
    });
    this.puffs = Array.from({ length: this.clouds }, () => {
      const back = r() < 0.18; // some mist rolls back past the bottle
      return {
        tb: this.t0 + 0.05 + 0.2 * r(),
        ang: back ? Math.PI + gauss(r) * 0.9 : gauss(r) * 0.34,
        v0: back ? 300 + 500 * r() : 1500 + 2600 * r(),
        k: 1.8 + 1.4 * r(),
        r0: 20 + 30 * r(),
        r1: 300 + 600 * r(),
        wob: 40 + 120 * r(),
        wf: 1.5 + 2.5 * r(),
        ph: 6.283 * r(),
        a: 0.16 + 0.22 * r(),
      };
    });
    this.dropSprite = sprite(o.rgb, 64, 0.3);
    this.afterSprite = sprite(o.after, 64, 0.3);
    this.cloudSprite = sprite(o.rgb, 128, 0.15);
    this.cloud = document.createElement('canvas');
    this.cloud.width = 1920 * CLOUD_SCALE;
    this.cloud.height = 1080 * CLOUD_SCALE;
  }

  /** Where a particle is at age a, relative to a nozzle at (x, y) aiming `aim`. */
  static at(p, a, x, y, aim) {
    const d = (p.v0 / p.k) * (1 - Math.exp(-p.k * a));
    const side = p.wob * (1 - Math.exp(-1.8 * a)) * Math.sin(p.wf * a + p.ph);
    const th = aim + p.ang;
    return [
      x + Math.cos(th) * d - Math.sin(th) * side,
      y + Math.sin(th) * d + Math.cos(th) * side + 40 * a * a,
    ];
  }

  /** Draws the spray at time t; returns false when there is nothing to draw. */
  draw(ctx, t) {
    const { t0, slam } = this;
    if (t < t0 || t > slam + 0.4) return false;
    const [nx, ny, aim] = this.nozzle(Math.min(t, slam));
    const settle = 1 - K.out(prog(t, slam, slam + 0.4)); // after the slam the mist thins away
    const pre = t < slam;

    // clouds, at quarter resolution
    const cg = this.cloud.getContext('2d');
    cg.setTransform(1, 0, 0, 1, 0, 0);
    cg.clearRect(0, 0, this.cloud.width, this.cloud.height);
    if (pre) {
      cg.setTransform(CLOUD_SCALE, 0, 0, CLOUD_SCALE, 0, 0);
      for (const p of this.puffs) {
        const a = t - p.tb;
        if (a <= 0) continue;
        const [x, y] = Spray.at(p, a, nx, ny, aim);
        const g = K.out(clamp(a / (slam - p.tb)));
        const rad = p.r0 + (p.r1 - p.r0) * g;
        cg.globalAlpha = p.a * clamp(a / 0.06);
        cg.drawImage(this.cloudSprite, x - rad, y - rad, rad * 2, rad * 2);
      }
      ctx.save();
      ctx.globalCompositeOperation = this.blend;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(this.cloud, 0, 0, 1920, 1080);
      ctx.restore();
    }

    // droplets
    ctx.save();
    ctx.globalCompositeOperation = pre ? this.blend : 'source-over';
    const spr = pre ? this.dropSprite : this.afterSprite;
    for (const p of this.drops) {
      const a = t - p.tb;
      if (a <= 0 || a >= p.life) continue;
      const [x, y] = Spray.at(p, a, nx, ny, aim);
      const g = a / p.life;
      const rad = p.r0 + (p.r1 - p.r0) * (1 - Math.exp(-3 * g));
      const al = p.a * clamp(a / 0.03) * (1 - g) ** 1.3 * (pre ? 1 : 0.55 * settle);
      if (al < 0.004) continue;
      ctx.globalAlpha = al;
      ctx.drawImage(spr, x - rad, y - rad, rad * 2, rad * 2);
    }
    ctx.restore();

    // the flood: the next scene's colour comes up under the last of the mist
    if (pre) {
      const f = K.inOut(prog(t, slam - 0.13, slam));
      if (f > 0) {
        ctx.save();
        ctx.globalAlpha = f;
        ctx.fillStyle = this.flood;
        ctx.fillRect(0, 0, 1920, 1080);
        ctx.restore();
      }
    }
    return true;
  }
}
