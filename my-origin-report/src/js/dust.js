// SHOT F — the site's hero canvas, ported line for line and driven by the
// film's clock instead of the scroll: the same seeded particle set (mulberry32,
// seed 1897), the two strands and rungs of its DNA helix, its speed-up and
// jitter, the cubic paths each particle flies along, the three arcs and centre
// dot of the logo it lands in, its blue-grey to gold ramp and its glow. The
// film adds one thing before it: the report turns to dust and the dust
// becomes the helix.
import { clamp, lerp, prog, K, css, el } from './kit.js';
import { T, b } from './timeline.js';
import { MX, fit } from './layout.js';
import { COVER_RECT } from './report.js';

const TAU = 2 * Math.PI;
const ARCS = [
  { r: 44, sweep: 304.5 },
  { r: 34, sweep: 302.7 },
  { r: 22, sweep: 299 },
];
const u = (e) => {
  const t = clamp(e);
  return t * t * (3 - 2 * t);
};
// The site's "dark" palette (for its navy sections).
const PAL = { from: [212, 42, 64], to: [44, 84, 56], glow: '226,190,90' };
// The logo (centre y, radius scale) and the end card's rows under it; x is
// the left edge of the lines before the morph.
const ROW = fit(
  { x: 150, mark: [392, 150], word: 590, tag: 700, btn: 792, chip: 924 },
  { x: 100, mark: [760, 165], word: 973, tag: 1083, btn: 1175, chip: 1307 }
);

/** The site's particle generator (f() in its bundle), unchanged. */
function generate(n) {
  let s = 1897;
  const rnd = () => {
    s |= 0;
    let e = Math.imul((s = (s + 1831565813) | 0) ^ (s >>> 15), 1 | s);
    return (((e = (e + Math.imul(e ^ (e >>> 7), 61 | e)) ^ e) ^ (e >>> 14)) >>> 0) / 4294967296;
  };
  const P = {
    n,
    t: new Float32Array(n),
    kind: new Uint8Array(n),
    u: new Float32Array(n),
    tx: new Float32Array(n),
    ty: new Float32Array(n),
    c1x: new Float32Array(n),
    c1y: new Float32Array(n),
    c1m: new Float32Array(n),
    c2x: new Float32Array(n),
    c2y: new Float32Array(n),
    start: new Float32Array(n),
    end: new Float32Array(n),
    phase: new Float32Array(n),
    seed: new Float32Array(n),
    size: new Float32Array(n),
  };
  for (let i = 0; i < n; i++) {
    const e = rnd();
    P.kind[i] = e < 0.34 ? 0 : e < 0.68 ? 1 : 2;
    P.t[i] = rnd();
    P.u[i] = 0.12 + 0.76 * rnd();
    P.phase[i] = rnd() * TAU;
    P.seed[i] = 100 * rnd();
    P.size[i] = P.kind[i] === 2 ? 1.1 + 0.8 * rnd() : 1.5 + 1.1 * rnd();
    const r = (1 - P.t[i]) * 0.2 + 0.05 * rnd();
    P.start[i] = 0.3 + r;
    P.end[i] = Math.min(1, P.start[i] + 0.48 + 0.08 * rnd());
  }
  const dot = Math.round(0.06 * n),
    arcN = n - dot;
  const w = ARCS.map((a) => a.r * a.sweep),
    W = w.reduce((a, c) => a + c, 0);
  let o = 0;
  ARCS.forEach((a, k) => {
    const cnt = k === ARCS.length - 1 ? arcN - o : Math.round((w[k] / W) * arcN);
    for (let i = 0; i < cnt && o < arcN; i++, o++) {
      const f = (i + 0.5 + (rnd() - 0.5) * 0.9) / cnt;
      const ang = (-90 + a.sweep * f) * (Math.PI / 180);
      const rr = a.r + (rnd() - 0.5) * 3.2;
      P.tx[o] = (Math.cos(ang) * rr) / 50;
      P.ty[o] = (Math.sin(ang) * rr) / 50;
    }
  });
  for (let i = 0; i < dot; i++) {
    const k = arcN + i,
      ang = rnd() * TAU,
      rr = 5.5 * Math.sqrt(rnd());
    P.tx[k] = (Math.cos(ang) * rr) / 50;
    P.ty[k] = (Math.sin(ang) * rr) / 50;
  }
  for (let i = 0; i < n; i++) {
    const ang = rnd() * TAU;
    P.c1x[i] = Math.cos(ang);
    P.c1y[i] = Math.sin(ang);
    P.c1m[i] = 0.35 + 0.55 * rnd();
    P.c2x[i] = (rnd() - 0.5) * 0.5;
    P.c2y[i] = (rnd() - 0.5) * 0.5;
  }
  return P;
}

function ramp(pal) {
  const out = [];
  for (let a = 0; a <= 40; a++) {
    const s = a / 40;
    const h = pal.from[0] + (pal.to[0] - pal.from[0]) * s;
    const sat = (pal.from[1] + (pal.to[1] - pal.from[1]) * s) * (1 - 0.7 * Math.sin(Math.PI * s));
    const l = pal.from[2] + (pal.to[2] - pal.from[2]) * s + 6 * Math.sin(Math.PI * s);
    out.push(`hsl(${h.toFixed(1)},${sat.toFixed(1)}%,${l.toFixed(1)}%)`);
  }
  return out;
}

/** The site's scroll progress, as a function of film time. */
export function progressAt(t) {
  if (t < T.spin[0]) return 0;
  if (t < T.spin[1]) return 0.3 * K.inOut(prog(t, T.spin[0], T.spin[1]));
  return 0.3 + 0.7 * K.inOut(prog(t, T.morph[0], T.morph[1]));
}

export class Dust {
  constructor(canvas) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d');
    this.P = generate(1100);
    this.colors = ramp(PAL);
    // Helix on the right (as on the site's hero), logo lands centre stage. In
    // the tall frame the helix stands under the lines and the logo forms
    // above the wordmark.
    this.R = fit(1330, 540); // helix axis x
    this.F = fit(520, 1120); // helix centre y
    this.I = 150; // helix radius
    this.L = 0.74 * 1040; // helix height
    this.LX = MX; // logo centre
    [this.LY, this.H] = ROW.mark; // and radius scale (arc r 44 -> 132 px)
    this.W = 0.55 * 1080; // control-point reach
    this.SZ = 2.0; // particles are drawn at film scale
    // The helix spin angle integrates the site's speed-up: precompute on a fixed step.
    this.E = [];
    let ang = 0;
    const dt = 1 / 480;
    for (let t = 0; t <= 12.2; t += dt) {
      const s = u(progressAt(t) / 0.3);
      ang += 1.1 * (1 + 1.6 * s) * dt;
      this.E.push(ang);
    }
    // Where each particle comes from: a point on the report's cover.
    const P = this.P;
    this.ox = new Float32Array(P.n);
    this.oy = new Float32Array(P.n);
    let s2 = 7;
    const r2 = () => ((s2 = (s2 * 16807) % 2147483647) - 1) / 2147483646;
    const C = COVER_RECT;
    for (let i = 0; i < P.n; i++) {
      this.ox[i] = C.x + C.w * r2();
      this.oy[i] = C.y + C.h * r2();
    }
  }

  angle(t) {
    const i = Math.max(0, Math.min(this.E.length - 1, Math.round(t * 480)));
    return this.E[i];
  }

  draw(t) {
    const g = this.g;
    g.clearRect(0, 0, this.canvas.width, this.canvas.height);
    const on = t >= T.dissolve[0];
    css(this.canvas, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    const P = this.P,
      e = progressAt(t);
    const { R, F, I, L, LX, LY, H, W, SZ } = this;
    const sp = u(e / 0.3);
    const jit = 2.4 * 2 * sp * (1 - u((e - 0.32) / 0.2));
    const A = this.angle(t),
      ca = Math.cos(A),
      sa = Math.sin(A);
    const ms = t * 1000;

    // The site's glow behind the logo as it forms.
    const c = u(clamp((e - 0.62) / 0.38));
    if (c > 0.01) {
      const gr = g.createRadialGradient(LX, LY, 0.1 * H, LX, LY, 1.9 * H);
      gr.addColorStop(0, `rgba(${PAL.glow},${(0.22 * c).toFixed(3)})`);
      gr.addColorStop(0.55, `rgba(${PAL.glow},${(0.07 * c).toFixed(3)})`);
      gr.addColorStop(1, `rgba(${PAL.glow},0)`);
      g.fillStyle = gr;
      g.fillRect(LX - 2 * H, LY - 2 * H, 4 * H, 4 * H);
    }

    for (let i = 0; i < P.n; i++) {
      const tt = P.t[i],
        kind = P.kind[i],
        ang = tt * TAU * 2.4;
      let x, y;
      if (kind === 2) {
        const ax = Math.cos(ang) * I,
          ay = Math.sin(ang) * I;
        x = ax + (-ax - ax) * P.u[i];
        y = ay + (-ay - ay) * P.u[i];
      } else {
        const off = kind === 1 ? Math.PI : 0;
        x = Math.cos(ang + off) * I;
        y = Math.sin(ang + off) * I;
      }
      const hx = x * ca - y * sa,
        depth = x * sa + y * ca;
      const f = 900 / (900 - depth);
      let px = R + hx * f,
        py = F + (0.5 - tt) * L * f;
      const w = (depth / I + 1) * 0.5;
      if (jit > 0) {
        const sd = P.seed[i];
        px += jit * Math.sin(0.013 * ms + sd);
        py += jit * Math.cos(0.011 * ms + 1.7 * sd);
      }
      // Before the helix: the particle is still dust from the report.
      const born = T.dissolve[0] + 0.05 + (1 - tt) * 0.35 + P.seed[i] * 0.002;
      const gather = K.inOut(prog(t, born, born + 0.55));
      let alpha, size, col;
      const j = u((e - P.start[i]) / (P.end[i] - P.start[i]));
      let vx = px,
        vy = py;
      if (j <= 0) {
        alpha = 0.35 + 0.6 * w;
      } else {
        const k2 = 2 * j;
        const txp = LX + P.tx[i] * H + Math.sin(9e-4 * ms + P.phase[i]) * k2;
        const typ = LY + P.ty[i] * H + Math.cos(7e-4 * ms + P.phase[i]) * k2;
        if (j >= 1) {
          vx = txp;
          vy = typ;
        } else {
          const m = P.c1m[i] * W;
          const c1x = px + P.c1x[i] * m,
            c1y = py + P.c1y[i] * m;
          const c2x = txp + P.c2x[i] * H * 1.4,
            c2y = typ + P.c2y[i] * H * 1.4;
          const o = 1 - j;
          vx = o * o * o * px + 3 * o * o * j * c1x + 3 * o * j * j * c2x + j * j * j * txp;
          vy = o * o * o * py + 3 * o * o * j * c1y + 3 * o * j * j * c2y + j * j * j * typ;
        }
        alpha = (0.35 + 0.6 * w) * (1 - j) + 0.92 * j;
      }
      col = this.colors[Math.round(40 * j)];
      size = P.size[i] * (j <= 0 ? 0.7 + 0.5 * w : 0.85 + 0.35 * j) * SZ;
      if (gather < 1) {
        // dust: from the cover, warm cream, drifting as it's pulled in
        const sx = this.ox[i] + Math.sin(ms * 0.002 + P.phase[i]) * 18 * (1 - gather);
        const sy = this.oy[i] - 60 * K.inOut(prog(t, T.dissolve[0], born));
        vx = lerp(sx, vx, gather);
        vy = lerp(sy, vy, gather);
        alpha = lerp(0.9 * prog(t, T.dissolve[0], T.dissolve[0] + 0.25), alpha, gather);
        if (gather < 0.5) col = 'hsl(43,70%,78%)';
      }
      g.globalAlpha = alpha;
      g.fillStyle = col;
      g.beginPath();
      g.arc(vx, vy, size, 0, TAU);
      g.fill();
    }
    g.globalAlpha = 1;
  }
}

/** The end card: the lines either side of the morph, the wordmark and the ask. */
export class End {
  constructor(root) {
    this.root = root;
    this.l1 = el('div', 'big', root, 'No DNA sample.');
    css(this.l1, { left: `${ROW.x}px`, top: '360px', fontSize: '104px', color: '#fff' });
    this.l2 = el('div', 'big', root, 'Just your surname.');
    css(this.l2, {
      left: `${ROW.x}px`,
      top: '480px',
      fontSize: '104px',
      color: '#e8c56d',
      fontStyle: 'italic',
      fontWeight: '600',
    });
    this.mark = el('img', 'abs', root);
    this.mark.src = 'brand/logo-mark.svg';
    const [my, mr] = ROW.mark; // the logo's centre y and radius scale
    css(this.mark, {
      width: `${2 * mr}px`,
      height: `${2 * mr}px`,
      left: `${MX - mr}px`,
      top: `${my - mr}px`,
    });
    this.word = el('div', 'big', root, 'My Origin Report');
    css(this.word, { fontSize: '92px', color: '#fff', top: `${ROW.word}px` });
    this.tag = el('div', 'big', root, 'It’s time you knew their story.');
    css(this.tag, {
      fontSize: '50px',
      color: '#e8c56d',
      fontStyle: 'italic',
      fontWeight: '600',
      top: `${ROW.tag}px`,
    });
    this.btn = el('div', 'btn', root, 'Get My Report - $15');
    this.chip = el('div', 'chip', root, '$15 one-time · Digital PDF · No DNA required');
  }

  measure() {
    for (const n of [this.word, this.tag, this.btn, this.chip])
      n._w = n.getBoundingClientRect().width;
    css(this.btn, { left: `${MX - this.btn._w / 2}px`, top: `${ROW.btn}px` });
    css(this.chip, { left: `${MX - this.chip._w / 2}px`, top: `${ROW.chip}px` });
  }

  update(t) {
    const on = t >= T.noDna - 0.05;
    css(this.root, { visibility: on ? 'visible' : 'hidden' });
    if (!on) return;
    if (this.word._w === undefined) this.measure();
    const out = K.inOut(prog(t, T.morph[0] + 0.3, T.morph[0] + 0.62));
    const rise = (n, t0, blur = 10) => {
      const p = K.settle(prog(t, t0, t0 + 0.6));
      css(n, {
        opacity: (Math.min(1, p * 1.4) * (1 - out)).toFixed(3),
        transform: `translate3d(${(-out * 80).toFixed(2)}px,${((1 - p) * 40).toFixed(2)}px,0)`,
        filter: p < 1 || out > 0 ? `blur(${((1 - p) * blur + out * 8).toFixed(2)}px)` : 'none',
      });
    };
    rise(this.l1, T.noDna);
    rise(this.l2, T.surname);
    // The particles hand over to the site's vector mark once they have landed.
    const m = K.inOut(prog(t, T.morph[1] - 0.15, T.morph[1] + 0.3));
    css(this.mark, {
      opacity: m.toFixed(3),
      filter: `drop-shadow(0 0 ${(18 * m).toFixed(1)}px rgba(196,150,12,0.5))`,
    });
    const wp = K.settle(prog(t, T.wordmark, T.wordmark + 0.7));
    css(this.word, {
      opacity: wp.toFixed(3),
      transform: `translate3d(${(MX - this.word._w / 2).toFixed(2)}px,${((1 - wp) * 36).toFixed(2)}px,0)`,
      letterSpacing: `${(0.08 * (1 - wp)).toFixed(4)}em`,
    });
    const tp = K.settle(prog(t, T.tagline, T.tagline + 0.7));
    css(this.tag, {
      opacity: tp.toFixed(3),
      transform: `translate3d(${(MX - this.tag._w / 2).toFixed(2)}px,${((1 - tp) * 26).toFixed(2)}px,0)`,
      filter: tp < 1 ? `blur(${((1 - tp) * 8).toFixed(2)}px)` : 'none',
    });
    const bp = prog(t, T.cta, T.cta + 0.5);
    css(this.btn, {
      transform: `scale(${Math.max(0.001, 0.6 + 0.4 * K.spring(bp, 1.8, 6)).toFixed(4)})`,
      opacity: Math.min(1, bp * 3).toFixed(3),
    });
    const cp = K.settle(prog(t, T.cta + 0.25, T.cta + 0.8));
    css(this.chip, {
      opacity: cp.toFixed(3),
      transform: `translate3d(0,${((1 - cp) * 14).toFixed(2)}px,0)`,
    });
  }
}
