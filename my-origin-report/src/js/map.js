// SHOT D — origins and routes, on the site's own world outline (its
// /maps/world-outline.svg, traced to hairlines so it holds up close). The
// timeline's seal becomes County Cork; gold routes arc out to where the
// Sullivan report says the name travelled.
import { css, el, prog, lerp, clamp, K, keys, typeset } from './kit.js';
import { T, b } from './timeline.js';

// Places, in the outline's own coordinates (its 7400x4230 viewBox, halved).
export const CORK = [1643, 840];
export const CITIES = [
  ['Boston', [1112, 968], [14, -18], 'left'],
  ['New York', [1080, 992], [-16, -6], 'right'],
  ['Philadelphia', [1066, 1004], [-14, 22], 'right'],
  ['London', [1738, 850], [16, -14], 'left'],
  ['Chicago', [960, 978], [-12, -26], 'right'],
  ['San Francisco', [612, 990], [-14, -8], 'right'],
  ['Sydney', [3100, 1690], [16, 10], 'left'],
];

export function mapCamera(t) {
  return keys(
    [
      [T.iris[0], [CORK[0], CORK[1], 3.0]],
      [b(12.1), [1610, 850, 2.45], (x) => x],
      [b(13.1), [1380, 905, 1.55], K.inOut],
      [b(14), [1520, 1010, 0.92], K.inOut],
      [T.toPage[0], [1850, 1150, 0.64], K.inOut],
      [T.toPage[1], [1850, 1150, 0.6], (x) => x],
    ],
    t
  );
}

export class MapShot {
  constructor(view, textRoot) {
    this.view = view;
    this.lines = el('canvas', 'abs', view);
    this.lines.width = 1920;
    this.lines.height = 1080;
    this.lg = this.lines.getContext('2d');
    this.canvas = el('canvas', 'abs', view);
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    this.ctx = this.canvas.getContext('2d');
    this.labels = CITIES.map(([name, , off, align]) => {
      const d = el('div', 'city', view, name);
      return { d, off, align, w: 0 };
    });
    this.cork = el('div', 'city', view, 'County Cork');

    // The name's origin, from page 1 of the Sullivan report.
    this.text = el('div', 'fill', textRoot);
    this.over = el('div', 'over', this.text, 'Surname origins');
    css(this.over, { left: '150px', top: '716px' });
    this.title = typeset(this.text, ['Sullivan'], {
      cls: 'big cream',
      size: 124,
      x: 144,
      y: 756,
      lh: 1.05,
    });
    css(this.title.root, { fontStyle: 'italic', fontWeight: '600' });
    this.quote = el('div', 'big', this.text, '“descendant of the dark-eyed one”');
    css(this.quote, {
      left: '152px',
      top: '900px',
      fontSize: '50px',
      fontStyle: 'italic',
      fontWeight: '500',
      color: '#e8c56d',
    });
    this.first = el('div', 'abs', this.text, 'First recorded in County Cork, Ireland');
    css(this.first, {
      left: '154px',
      top: '972px',
      fontSize: '26px',
      color: 'rgba(245,237,224,0.7)',
      whiteSpace: 'nowrap',
    });
  }

  /** Loads the traced outline (7400x4230: two image pixels per map unit). */
  async ready() {
    this.img = new Image();
    this.img.src = 'img/map-lines.png';
    await new Promise((res, rej) => {
      this.img.onload = res;
      this.img.onerror = rej;
    });
  }

  update(t, hide) {
    const on = t >= T.iris[0] && t < T.dissolve[0];
    css(this.view, { visibility: on ? 'visible' : 'hidden' });
    css(this.text, { visibility: on && t < T.originOut + 0.6 ? 'visible' : 'hidden' });
    if (!on) return;
    const [fx, fy, z] = mapCamera(t);
    this.cam = { fx, fy, z };
    const M = (p) => [(p[0] - fx) * z + 960, (p[1] - fy) * z + 540];

    // The outline, revealed outward from Cork: draw only the visible part of
    // the traced map, tint it gold, then cut the reveal with a radial gradient.
    const R = lerp(60, 4200, K.inOut(prog(t, T.origin - 0.2, b(14))));
    const lg = this.lg;
    lg.globalCompositeOperation = 'source-over';
    lg.clearRect(0, 0, 1920, 1080);
    const x0 = fx - 960 / z,
      y0 = fy - 540 / z; // map units at the frame's top left
    const sx = Math.max(0, x0),
      sy = Math.max(0, y0);
    const ex = Math.min(3700, fx + 960 / z),
      ey = Math.min(2115, fy + 540 / z);
    if (ex > sx && ey > sy) {
      lg.imageSmoothingQuality = 'high';
      lg.drawImage(
        this.img,
        sx * 2,
        sy * 2,
        (ex - sx) * 2,
        (ey - sy) * 2,
        (sx - x0) * z,
        (sy - y0) * z,
        (ex - sx) * z,
        (ey - sy) * z
      );
    }
    lg.globalCompositeOperation = 'source-in';
    lg.fillStyle = '#c9973f';
    lg.fillRect(0, 0, 1920, 1080);
    lg.globalCompositeOperation = 'destination-in';
    const [rcx, rcy] = M(CORK);
    const rg = lg.createRadialGradient(rcx, rcy, R * z, rcx, rcy, (R + 520) * z);
    rg.addColorStop(0, 'rgba(0,0,0,0.62)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    lg.fillStyle = rg;
    lg.fillRect(0, 0, 1920, 1080);
    lg.globalCompositeOperation = 'source-over';

    const g = this.ctx;
    g.clearRect(0, 0, 1920, 1080);
    const [cx, cy] = M(CORK);
    const dz = Math.min(1.6, Math.sqrt(z));

    // Routes: each arc draws on with a comet head, then its city lights.
    CITIES.forEach(([name, p], i) => {
      const t0 = T.arcs[i];
      const [ex, ey] = M(p);
      const dist = Math.hypot(p[0] - CORK[0], p[1] - CORK[1]);
      const dur = 0.42 + dist / 2600;
      const d = K.inOut(prog(t, t0, t0 + dur));
      const L = this.labels[i];
      if (d <= 0) {
        css(L.d, { opacity: '0' });
        return;
      }
      const mx = (CORK[0] + p[0]) / 2,
        my = (CORK[1] + p[1]) / 2 - dist * 0.24;
      const [qx, qy] = M([mx, my]);
      const pt = (u) => [
        (1 - u) * (1 - u) * cx + 2 * u * (1 - u) * qx + u * u * ex,
        (1 - u) * (1 - u) * cy + 2 * u * (1 - u) * qy + u * u * ey,
      ];
      g.save();
      g.lineCap = 'round';
      for (const [w, a] of [
        [7 * dz, 0.12],
        [2.4 * dz, 0.95],
      ]) {
        g.beginPath();
        g.moveTo(cx, cy);
        const N = 48;
        for (let k = 1; k <= N; k++) {
          const [x, y] = pt((k / N) * d);
          g.lineTo(x, y);
        }
        g.strokeStyle = `rgba(232,197,109,${a})`;
        g.lineWidth = w;
        g.stroke();
      }
      if (d < 1) {
        const [hx, hy] = pt(d);
        const gr = g.createRadialGradient(hx, hy, 0, hx, hy, 26 * dz);
        gr.addColorStop(0, 'rgba(255,240,200,0.95)');
        gr.addColorStop(0.25, 'rgba(232,197,109,0.55)');
        gr.addColorStop(1, 'rgba(232,197,109,0)');
        g.fillStyle = gr;
        g.fillRect(hx - 30 * dz, hy - 30 * dz, 60 * dz, 60 * dz);
      }
      // the city
      const a = prog(t, t0 + dur - 0.05, t0 + dur + 0.25);
      if (a > 0) {
        const pop = K.spring(a, 2, 6);
        g.fillStyle = '#e8c56d';
        g.beginPath();
        g.arc(ex, ey, 4.5 * dz * pop, 0, Math.PI * 2);
        g.fill();
        const rr = prog(t, t0 + dur, t0 + dur + 0.8);
        if (rr > 0 && rr < 1) {
          g.strokeStyle = `rgba(232,197,109,${(0.7 * (1 - rr)).toFixed(3)})`;
          g.lineWidth = 2;
          g.beginPath();
          g.arc(ex, ey, (5 + 26 * K.outExpo(rr)) * dz, 0, Math.PI * 2);
          g.stroke();
        }
      }
      g.restore();
      if (!L.w) L.w = L.d.getBoundingClientRect().width;
      const lx = L.align === 'right' ? ex + L.off[0] - L.w : ex + L.off[0];
      css(L.d, {
        left: `${lx.toFixed(1)}px`,
        top: `${(ey + L.off[1] - 11).toFixed(1)}px`,
        opacity: (clamp(a * 1.5) * (1 - hide)).toFixed(3),
      });
    });

    // Cork: the origin beats like a heart.
    g.save();
    const beat = (((t - T.origin) % 0.5) + 0.5) % 0.5;
    for (let k = 0; k < 2; k++) {
      const ph = (beat + k * 0.25) / 0.5;
      g.strokeStyle = `rgba(232,197,109,${(0.6 * (1 - ph)).toFixed(3)})`;
      g.lineWidth = 2.5;
      g.beginPath();
      g.arc(cx, cy, (10 + 40 * ph) * dz, 0, Math.PI * 2);
      g.stroke();
    }
    const glow = g.createRadialGradient(cx, cy, 0, cx, cy, 70 * dz);
    glow.addColorStop(0, 'rgba(255,236,180,0.9)');
    glow.addColorStop(0.2, 'rgba(232,197,109,0.45)');
    glow.addColorStop(1, 'rgba(232,197,109,0)');
    g.fillStyle = glow;
    g.fillRect(cx - 80 * dz, cy - 80 * dz, 160 * dz, 160 * dz);
    g.fillStyle = '#fff3d0';
    g.beginPath();
    g.arc(cx, cy, 7 * dz, 0, Math.PI * 2);
    g.fill();
    g.restore();
    const cl = prog(t, T.origin + 0.15, T.origin + 0.5);
    if (!this.corkW) this.corkW = this.cork.getBoundingClientRect().width;
    css(this.cork, {
      left: `${(cx - 22 * dz - this.corkW).toFixed(1)}px`,
      top: `${(cy - 11).toFixed(1)}px`,
      opacity: (cl * (1 - hide)).toFixed(3),
    });

    // The origin text, bottom left, clear of the routes.
    const out = K.inExpo(prog(t, T.originOut, T.originOut + 0.4));
    const o1 = K.settle(prog(t, T.originText, T.originText + 0.5));
    css(this.over, {
      clipPath: `inset(0 ${((1 - o1) * 100).toFixed(2)}% 0 0)`,
      opacity: (1 - out).toFixed(3),
      transform: `translate3d(0,${(-out * 30).toFixed(2)}px,0)`,
    });
    this.title.rows[0].words.forEach((w, i) => {
      const p = K.settle(prog(t, T.originText + 0.18 + i * 0.08, T.originText + 0.8 + i * 0.08));
      css(w.el, {
        transform: `translate3d(0,${((1 - p) * 130 - out * 60).toFixed(2)}px,0)`,
        opacity: (1 - out).toFixed(3),
      });
    });
    const q = K.settle(prog(t, b(12.1), b(12.1) + 0.6));
    css(this.quote, {
      opacity: (q * (1 - out)).toFixed(3),
      transform: `translate3d(0,${((1 - q) * 20 - out * 50).toFixed(2)}px,0)`,
      filter: q < 1 ? `blur(${((1 - q) * 8).toFixed(2)}px)` : 'none',
    });
    const f = K.settle(prog(t, b(12.4), b(12.4) + 0.6));
    css(this.first, {
      opacity: (f * (1 - out)).toFixed(3),
      transform: `translate3d(0,${((1 - f) * 16 - out * 40).toFixed(2)}px,0)`,
    });
  }
}
