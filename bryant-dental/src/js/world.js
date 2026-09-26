// SHOT 4 — World. The pair of lenses merges and opens onto the Earth render
// from the site's stats panel. Chosen by the best in the world: the four
// figures the site publishes count up while the sun comes over the limb.
import { css, el, prog, lerp, K, FocusWords } from './kit.js';
import { Sky, flare, flash } from './sky.js';
import { Binocular } from './binocular.js';
import { T } from './timeline.js';

const EARTH = { k: 1.55, apexX: 608, apexY: 590, R: 938 }; // source px, measured
const STATS = [
  { v: 1, d: 0, suf: 'bn', label: 'Teeth' },
  { v: 18, d: 0, suf: 'k+', label: 'Clinicians' },
  { v: 1.2, d: 1, suf: 'k', label: '5★ Reviews' },
  { v: 69, d: 0, suf: '', label: 'Countries' },
];

export class World {
  constructor(root) {
    this.root = root;
    css(root, { background: '#000' });
    this.earth = el('img', 'abs', root);
    // Stars sit above the planet (and are kept off it), so no blend mode is
    // needed: a blended child inside a circle-clipped layer clips coarsely.
    this.skyCanvas = el('canvas', 'abs', root);
    this.skyCanvas.width = 1920;
    this.skyCanvas.height = 1080;
    this.sky = new Sky(this.skyCanvas);
    this.earth.src = '../assets/img/globe.webp';
    css(this.earth, {
      width: `${1216 * EARTH.k}px`,
      height: `${1374 * EARTH.k}px`,
      clipPath: 'inset(5px)',
      // The render's own sky is cleared at build time (scripts/clean-globe.py).
      maskImage: 'linear-gradient(90deg, transparent 0, #000 7%, #000 93%, transparent 100%)',
    });
    this.head = new FocusWords(
      root,
      [
        [
          ['Chosen'],
          ['by'],
          ['the'],
          ['best'],
          ['in', 'grey'],
          ['the', 'grey'],
          ['world.', 'grey'],
        ],
      ],
      { x: 960, y: 118, size: 92, align: 'center' }
    );
    this.stats = el('div', 'stats', root);
    css(this.stats, { left: `${960 - 660}px`, top: '292px' });
    this.cells = STATS.map((s) => {
      const c = el('div', 'stat', this.stats, `<b>0</b><span>${s.label}</span>`);
      return { c, num: c.querySelector('b'), s };
    });
  }

  ready() {
    return this.earth.decode();
  }

  /** Apex of the limb on screen, and the Earth's screen radius. */
  limb(t) {
    const rise = K.settle(prog(t, T.world - 0.2, T.lift[0]));
    const drop = K.swoop(prog(t, T.lift[0], T.lift[1] + 0.15));
    const apexY = lerp(760, 650, rise) + 980 * drop;
    return { x: 960, y: apexY, R: EARTH.R * EARTH.k };
  }

  update(t) {
    const on = t >= T.merge[1] - 0.22;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    const H = Binocular.hole(t);
    css(this.root, { clipPath: H < 1450 ? `circle(${H.toFixed(1)}px at 960px 540px)` : 'none' });

    const L = this.limb(t);
    // Stars never show through the planet.
    this.sky.draw(
      t,
      1,
      (x, y) => y > L.y + L.R - Math.sqrt(Math.max(0, L.R * L.R - (x - L.x) ** 2)) - 6
    );
    css(this.earth, {
      left: `${L.x - EARTH.apexX * EARTH.k}px`,
      top: `${L.y - EARTH.apexY * EARTH.k}px`,
    });

    const liftOut = K.swoop(prog(t, T.lift[0], T.lift[1]));
    this.head.update(t, T.worldHead, { tOut: T.lift[0] - 0.05, outDur: 0.4, stagger: 0.055 });
    this.cells.forEach(({ c, num, s }, i) => {
      const t0 = T.stats + i * 0.1;
      const a = K.settle(prog(t, t0, t0 + 0.75));
      const n = K.settle(prog(t, t0, t0 + 1.0)) * s.v;
      const txt = (s.d ? n.toFixed(s.d) : Math.round(n).toString()) + s.suf;
      if (num.textContent !== txt) num.textContent = txt;
      const blur = 14 * (1 - a) + 12 * liftOut;
      css(c, {
        opacity: (Math.min(1, a * 1.5) * (1 - liftOut)).toFixed(3),
        filter: blur > 0.05 ? `blur(${blur.toFixed(2)}px)` : 'none',
        transform: `translateY(${((1 - a) * 26 - 260 * liftOut).toFixed(2)}px)`,
      });
    });
  }

  fx(ctx, t) {
    const on = t >= T.merge[1] - 0.22 && t < T.lift[1] + 0.3;
    if (!on) return;
    // The ring the world opens through.
    const H = Binocular.hole(t);
    if (H < 1450) {
      ctx.save();
      ctx.strokeStyle = 'rgba(200,225,255,0.9)';
      ctx.lineWidth = 3;
      ctx.shadowColor = 'rgba(0,113,227,1)';
      ctx.shadowBlur = 40;
      ctx.beginPath();
      ctx.arc(960, 540, H, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    // Sunrise over the limb.
    const L = this.limb(t);
    const x = 1270,
      dx = x - L.x;
    const y = L.y + L.R - Math.sqrt(L.R * L.R - dx * dx);
    const k =
      Math.max(flash(t, T.flare, 0.12, 0.35) * 1.2, 0.55 * prog(t, T.flare, T.flare + 0.3)) *
      (1 - prog(t, T.lift[0], T.lift[0] + 0.3));
    flare(ctx, x, y + 4, k, { halo: 360, streak: 1500, core: 22 });
  }
}
