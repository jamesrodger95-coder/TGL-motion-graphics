// The roof, rendered in perspective on a canvas, as a pure function of time.
//
// One side of a gable roof (12 m wide, 30° pitch) over a house front, on a
// lawn under a sky. The deck is plywood; the underlayment rolls out across it;
// then 22 courses of architectural (laminated) shingles land course by
// course from the eave up, each tab dropping and slapping down, nailed in The
// Zone, the band the next course covers. Ridge caps run along the top. Then
// the storm: rain, hail that bounces off, lightning. Then the sun.
//
// Big surfaces are projected exactly (clipped at the near plane); each small
// part (a tab, a nail, a splash) is drawn in its own local metres through the
// affine map of its corners, which is exact at three corners and near enough
// at the fourth for parts this small.
import { T, COURSES, courseAt } from './timeline.js';
import { clamp, lerp, prog, K, keys, rng } from './kit.js';

const TH = (30 * Math.PI) / 180;
const SIN = Math.sin(TH),
  COS = Math.cos(TH);
export const HW = 6; // half the roof's width
export const E = 0.29; // exposure of a course
export const S = COURSES * E; // slope length, eave to ridge
const HS = 2.15 * E; // a shingle's height: exposure plus the part the next course covers
const WALL = { z: -0.45, top: -0.22, bottom: -3.1, x: 5.6 };

/** A point on the roof plane: across x, up the slope s, off the deck h. */
export const P = (x, s, h = 0) => [x, s * SIN + h * COS, -s * COS + h * SIN];

// ------------------------------------------------------------------ camera
export class Camera {
  set(pos, tgt, F = 2000, shake = [0, 0]) {
    const f = norm(sub(tgt, pos));
    const r = norm(cross(f, [0, 1, 0]));
    const u = cross(r, f);
    Object.assign(this, { pos, f, r, u, F, shake });
    return this;
  }
  /** World -> camera space (x right, y up, z forward). */
  cam(p) {
    const d = sub(p, this.pos);
    return [dot(d, this.r), dot(d, this.u), dot(d, this.f)];
  }
  /** Camera space -> screen. */
  scr([x, y, z]) {
    return [960 + (this.F * x) / z + this.shake[0], 540 - (this.F * y) / z + this.shake[1], z];
  }
  proj(p) {
    return this.scr(this.cam(p));
  }
}
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (a) => {
  const l = Math.hypot(...a);
  return [a[0] / l, a[1] / l, a[2] / l];
};
const NEAR = 0.15;

// ------------------------------------------------------------------ textures
/** Granules: speckle of light and dark grains, seen through the tab colour. */
function granules(seed) {
  const c = document.createElement('canvas');
  c.width = c.height = 160;
  const g = c.getContext('2d');
  const r = rng(seed);
  for (let i = 0; i < 2600; i++) {
    const v = r();
    g.fillStyle =
      v < 0.5 ? `rgba(0,0,0,${0.18 + 0.3 * r()})` : `rgba(255,248,235,${0.1 + 0.22 * r()})`;
    const s = 0.8 + r() * 1.6;
    g.fillRect(r() * 160, r() * 160, s, s);
  }
  return c;
}
/** Soft clouds: a few octaves of value noise, white on transparent. */
function clouds(seed) {
  const w = 480,
    h = 140;
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d');
  const img = g.createImageData(w, h);
  const r = rng(seed);
  const grid = (n) => Array.from({ length: (n + 2) * (n + 2) }, () => r());
  const oct = [6, 12, 24, 48].map((n) => ({ n, v: grid(n) }));
  const smooth = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let v = 0,
        a = 0.55;
      for (const { n, v: G } of oct) {
        const fx = (x / w) * n,
          fy = (y / h) * n * (h / w) * 3;
        const ix = Math.floor(fx),
          iy = Math.floor(fy);
        const tx = smooth(fx - ix),
          ty = smooth(fy - iy);
        const at = (i, j) => G[((j % (n + 1)) * (n + 2) + (i % (n + 1))) % G.length];
        v +=
          a *
          lerp(
            lerp(at(ix, iy), at(ix + 1, iy), tx),
            lerp(at(ix, iy + 1), at(ix + 1, iy + 1), tx),
            ty
          );
        a *= 0.5;
      }
      const fade = Math.sin((y / h) * Math.PI) ** 0.8;
      const d = clamp((v - 0.42) * 2.6) * fade;
      const k = (y * w + x) * 4;
      img.data[k] = img.data[k + 1] = img.data[k + 2] = 255;
      img.data[k + 3] = d * 255;
    }
  g.putImageData(img, 0, 0);
  return c;
}

// ------------------------------------------------------------------ the roof's parts
// Malarkey "Weathered Wood": a warm grey-brown blend.
const BLEND = ['#6d655d', '#5f5852', '#7a7066', '#544e49', '#837769', '#4b4642', '#686059'];
function layCourses() {
  const r = rng(1956); // Malarkey, founded 1956
  return Array.from({ length: COURSES }, (_, i) => {
    const tabs = [];
    let x = -HW - r() * 0.3;
    while (x < HW) {
      const w = 0.24 + r() * 0.3;
      const x0 = Math.max(-HW, x),
        x1 = Math.min(HW, x + w - 0.016);
      if (x1 - x0 > 0.04)
        tabs.push({
          x0,
          w: x1 - x0,
          col: BLEND[Math.floor(r() * BLEND.length)],
          shade: 0.82 + r() * 0.3,
          land: courseAt(i) + 0.42 * ((x0 + HW) / (2 * HW)) + r() * 0.025,
          spin: (r() - 0.5) * 0.25,
        });
      x += w;
    }
    return { i, s0: i * E, tabs };
  });
}

export class Roof {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
    this.cam = new Camera();
    this.grain = this.g.createPattern(granules(7), 'repeat');
    this.grain.setTransform(new DOMMatrix().scale(0.45 / 160)); // 160 px of grain to 0.45 m
    this.cloudTex = clouds(31);
    this.courses = layCourses();
    const r = rng(2026);
    // Hail: each stone has an impact time and place, and bounces off.
    this.hail = Array.from({ length: 190 }, () => ({
      t: lerp(T.hail[0], T.hail[1], r()),
      x: lerp(-HW + 0.4, HW - 0.4, r()),
      s: lerp(0.3, S - 0.3, r()),
      rad: 0.045 + r() * 0.045,
      side: (r() - 0.5) * 2.2,
      up: 1.6 + r() * 1.8,
    }));
    this.hail.push({ t: T.hero, x: -0.6, s: 2.1, rad: 0.11, side: 0.6, up: 2.6, hero: true });
    this.hail[this.hail.length - 1].rad = 0.16;
    this.rain = Array.from({ length: 900 }, () => ({
      x: r() * 2300 - 190,
      y: r() * 1400,
      v: 1900 + r() * 900,
      l: 30 + r() * 50,
      a: 0.15 + r() * 0.35,
    }));
    this.splash = Array.from({ length: 260 }, () => ({
      x: lerp(-HW, HW, r()),
      s: lerp(0.1, S - 0.1, r()),
      per: 0.22 + r() * 0.3,
      ph: r(),
    }));
    this.trees = [0, 1].map((layer) =>
      Array.from({ length: 60 }, (_, k) => ({
        x: -900 + k * 66 + r() * 50,
        h: (layer ? 34 : 56) + r() * (layer ? 50 : 90),
        w: 30 + r() * 46,
      }))
    );
  }

  // ---------------------------------------------------------------- drawing helpers
  /** Fills a world-space polygon, clipped at the near plane. */
  poly(pts, fill) {
    const cp = clip(pts.map((p) => this.cam.cam(p)));
    if (cp.length < 3) return false;
    const g = this.g;
    g.beginPath();
    cp.forEach((c, k) => {
      const [x, y] = this.cam.scr(c);
      k ? g.lineTo(x, y) : g.moveTo(x, y);
    });
    g.closePath();
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    return true;
  }
  line(a, b, stroke, width) {
    const [ca, cb] = clipSeg(this.cam.cam(a), this.cam.cam(b));
    if (!ca) return;
    const g = this.g;
    const [x0, y0] = this.cam.scr(ca),
      [x1, y1] = this.cam.scr(cb);
    g.beginPath();
    g.moveTo(x0, y0);
    g.lineTo(x1, y1);
    g.strokeStyle = stroke;
    g.lineWidth = width;
    g.stroke();
  }
  /** Sets the canvas transform so local metres (u across, v up the slope) at (x, s, h) map to the screen. */
  local(x, s, h = 0, du = 1, dv = 1, ht = h) {
    const o = this.cam.cam(P(x, s, h)),
      a = this.cam.cam(P(x + du, s, h)),
      b = this.cam.cam(P(x, s + dv, ht));
    if (o[2] < NEAR * 2 || a[2] < NEAR * 2 || b[2] < NEAR * 2) return false;
    const O = this.cam.scr(o),
      A = this.cam.scr(a),
      B = this.cam.scr(b);
    this.g.setTransform(
      (A[0] - O[0]) / du,
      (A[1] - O[1]) / du,
      (B[0] - O[0]) / dv,
      (B[1] - O[1]) / dv,
      O[0],
      O[1]
    );
    return true;
  }

  // ---------------------------------------------------------------- the frame
  draw(t, cam, light) {
    const g = this.g;
    this.cam = cam;
    g.setTransform(1, 0, 0, 1, 0, 0);
    this.sky(t, light);
    this.ground(light);
    this.house();
    this.deck(t);
    this.shingles(t, light);
    this.ridge(t);
    this.edges();
    this.weather(t, light);
    g.setTransform(1, 0, 0, 1, 0, 0);
    // Light: the storm's cool dusk, lightning, the sun's warmth.
    if (light.storm > 0) {
      g.globalCompositeOperation = 'multiply';
      g.fillStyle = `rgba(${Math.round(lerp(255, 120, light.storm))},${Math.round(lerp(255, 132, light.storm))},${Math.round(lerp(255, 152, light.storm))},1)`;
      g.fillRect(0, 0, 1920, 1080);
      g.globalCompositeOperation = 'source-over';
    }
    if (light.warm > 0) {
      g.globalCompositeOperation = 'soft-light';
      g.fillStyle = `rgba(255,190,110,${(0.35 * light.warm).toFixed(3)})`;
      g.fillRect(0, 0, 1920, 1080);
      g.globalCompositeOperation = 'source-over';
    }
    if (light.flash > 0) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = `rgba(200,215,255,${(0.55 * light.flash).toFixed(3)})`;
      g.fillRect(0, 0, 1920, 1080);
      g.globalCompositeOperation = 'source-over';
    }
  }

  sky(t, L) {
    const g = this.g;
    const hz = this.cam.proj([0, -3.1, -600])[1]; // the horizon
    const top = mixc(mixc('#7fb2dc', '#2b333c', L.storm), '#6fa6d6', L.clear);
    const low = mixc(mixc('#dcebf4', '#56606a', L.storm), '#f6d7a8', L.clear);
    const gr = g.createLinearGradient(0, 0, 0, hz);
    gr.addColorStop(0, top);
    gr.addColorStop(1, low);
    g.fillStyle = gr;
    g.fillRect(0, 0, 1920, 1080); // the whole frame: nothing from the last frame may show through
    // Clouds drift; in the storm they close in and darken.
    const ca = lerp(0.55, 0.95, L.storm) * (1 - 0.4 * L.clear);
    g.globalAlpha = ca;
    const drift = (t * lerp(14, 60, L.storm)) % 1920;
    for (const [k, y, h, sc] of [
      [0, hz - 520, 360, 1],
      [1, hz - 330, 260, 0.7],
    ]) {
      const w = 1920 * (1.4 - 0.3 * k);
      for (let x = -drift * (1 - 0.4 * k) - w; x < 1920; x += w)
        g.drawImage(this.cloudTex, x, y, w, h);
      void sc;
    }
    if (L.storm > 0) {
      g.globalAlpha = 0.75 * L.storm * (1 - L.clear);
      g.fillStyle = '#3a424b';
      g.fillRect(0, 0, 1920, Math.max(0, hz - 380));
    }
    g.globalAlpha = 1;
    this.hz = hz;
  }

  ground(L) {
    const g = this.g;
    // Trees on the horizon, then the lawn.
    const hz = this.hz;
    // The tree line pans a little with the camera (it is far, not infinitely far).
    const pan = -this.cam.pos[0] * 18;
    this.trees.forEach((row, layer) => {
      g.fillStyle = layer
        ? mixc('#6e8a6a', '#2b3a33', L.storm)
        : mixc('#3d5a3a', '#1b2620', L.storm);
      g.beginPath();
      for (const tr of row) {
        // each tree a cluster of crowns
        const x = tr.x + pan * (layer ? 0.6 : 1) + 960;
        g.moveTo(x, hz + 8);
        g.ellipse(x, hz + 8 - tr.h * 0.45, tr.w * 0.55, tr.h * 0.55, 0, 0, Math.PI * 2);
        g.moveTo(x + tr.w * 0.5, hz + 8);
        g.ellipse(x - tr.w * 0.3, hz + 8 - tr.h * 0.2, tr.w * 0.45, tr.h * 0.38, 0, 0, Math.PI * 2);
        g.moveTo(x + tr.w, hz + 8);
        g.ellipse(
          x + tr.w * 0.35,
          hz + 8 - tr.h * 0.25,
          tr.w * 0.42,
          tr.h * 0.42,
          0,
          0,
          Math.PI * 2
        );
      }
      g.rect(-10, hz + 4, 1940, 8);
      g.fill();
    });
    if (
      !this.poly([
        [-3000, -3.1, 20],
        [3000, -3.1, 20],
        [3000, -3.1, -4000],
        [-3000, -3.1, -4000],
      ])
    )
      return;
    const lg = g.createLinearGradient(0, hz, 0, 1080);
    lg.addColorStop(0, mixc('#7f9f62', '#33463a', L.storm));
    lg.addColorStop(1, mixc('#4f7d35', '#223024', L.storm));
    g.fillStyle = lg;
    g.fill();
  }

  house() {
    const { z, top, bottom, x } = WALL;
    // The wall, its lap siding, the soffit under the eave, windows and a green door.
    this.poly(
      [
        [-x, bottom, z],
        [x, bottom, z],
        [x, top, z],
        [-x, top, z],
      ],
      '#e7e2d8'
    );
    for (let y = bottom + 0.2; y < top; y += 0.2)
      this.line([-x, y, z], [x, y, z], 'rgba(120,110,95,0.35)', 1.2);
    this.poly(
      [
        [-HW, top, z],
        [HW, top, z],
        [HW, -0.18, 0.02],
        [-HW, -0.18, 0.02],
      ],
      '#b9b2a6'
    );
    const win = (cx, y0, w, h, fill) => {
      this.poly(
        [
          [cx - w / 2 - 0.08, y0 - 0.08, z + 0.01],
          [cx + w / 2 + 0.08, y0 - 0.08, z + 0.01],
          [cx + w / 2 + 0.08, y0 + h + 0.08, z + 0.01],
          [cx - w / 2 - 0.08, y0 + h + 0.08, z + 0.01],
        ],
        '#fbfaf6'
      );
      this.poly(
        [
          [cx - w / 2, y0, z + 0.02],
          [cx + w / 2, y0, z + 0.02],
          [cx + w / 2, y0 + h, z + 0.02],
          [cx - w / 2, y0 + h, z + 0.02],
        ],
        fill
      );
    };
    for (const cx of [-4.3, -2.2, 2.2, 4.3]) {
      win(cx, -2.25, 1.15, 1.35, '#4f6676');
      this.line([cx, -2.25, z + 0.03], [cx, -0.9, z + 0.03], '#fbfaf6', 2);
      this.line([cx - 0.575, -1.575, z + 0.03], [cx + 0.575, -1.575, z + 0.03], '#fbfaf6', 2);
    }
    win(0, bottom, 1.05, 2.15, '#009845'); // a Malarkey-green front door
  }

  deck(t) {
    // Plywood, then the underlayment rolling out across it in strips.
    this.poly([P(-HW, 0), P(HW, 0), P(HW, S), P(-HW, S)], '#c49a6c');
    for (let s = 1.22; s < S; s += 1.22) this.line(P(-HW, s), P(HW, s), 'rgba(90,60,30,0.45)', 1.2);
    for (let x = -HW + 2.44; x < HW; x += 2.44)
      this.line(P(x, 0), P(x, S), 'rgba(90,60,30,0.35)', 1);
    const g = this.g;
    const strip = 1.0;
    for (let k = 0; k * strip < S; k++) {
      const s0 = k * strip,
        s1 = Math.min(S, s0 + strip + 0.08);
      const p = K.inOut(prog(t, T.underlay[0] + k * 0.075, T.underlay[0] + k * 0.075 + 0.5));
      if (p <= 0) continue;
      const xe = -HW + 2 * HW * p;
      this.poly([P(-HW, s0), P(xe, s0), P(xe, s1), P(-HW, s1)], '#3b3f43');
      // Its printed guide lines, in Malarkey green.
      for (const sl of [s0 + 0.12, s1 - 0.12])
        this.line(P(-HW, sl, 0.001), P(xe, sl, 0.001), 'rgba(0,152,69,0.75)', 1.5);
      // The roll itself, still unwinding at the leading edge.
      if (p < 1 && this.local(xe, s0, 0.05, 1, s1 - s0)) {
        const gr = g.createLinearGradient(-0.02, 0, 0.16, 0);
        gr.addColorStop(0, '#2a2d30');
        gr.addColorStop(0.45, '#6a7076');
        gr.addColorStop(1, '#1c1e20');
        g.fillStyle = gr;
        g.fillRect(-0.02, 0, 0.18, s1 - s0);
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
  }

  shingles(t, L) {
    const g = this.g;
    const zoneA =
      K.inOut(prog(t, T.zone[0], T.zone[0] + 0.2)) *
      (1 - K.inOut(prog(t, T.zone[1] - 0.2, T.zone[1])));
    for (const c of this.courses) {
      if (t < courseAt(c.i) - 0.25) break;
      // The course's dark base layer (seen in the slots between tabs), as soon as its first tab lands.
      for (const tab of c.tabs) {
        const p = prog(t, tab.land - 0.2, tab.land);
        if (p <= 0) continue;
        const fall = 1 - p * p; // accelerating drop
        const q = prog(t, tab.land, tab.land + 0.14);
        const bounce = q > 0 && q < 1 ? 0.025 * Math.sin(Math.PI * q) * (1 - q) : 0;
        const h = 0.32 * fall + bounce;
        const ht = h + 0.22 * fall; // the top edge trails: the tab tips as it falls
        if (!this.local(tab.x0 + tab.spin * fall, c.s0, h, tab.w, HS, ht)) continue;
        g.globalAlpha = Math.min(1, p * 4);
        // its shadow on the course below, deepest as it lands
        const cs = g.createLinearGradient(0, 0, 0, -0.05);
        cs.addColorStop(0, `rgba(0,0,0,${(0.5 * (1 - fall * 0.6)).toFixed(3)})`);
        cs.addColorStop(1, 'rgba(0,0,0,0)');
        g.fillStyle = cs;
        g.fillRect(-0.01, -0.05 - h * 0.25, tab.w + 0.02, 0.05 + h * 0.25);
        // base layer under the tab, a little wider to fill the slot
        g.fillStyle = '#2b2724';
        g.fillRect(-0.012, 0, tab.w + 0.024, HS);
        g.fillStyle = tab.col;
        g.fillRect(0, 0.02, tab.w, HS - 0.02);
        g.fillStyle = this.grain;
        g.fillRect(0, 0.02, tab.w, HS - 0.02);
        // the laminate's shadow line along the bottom of the exposure
        const sh = g.createLinearGradient(0, 0, 0, E * 0.55);
        sh.addColorStop(0, 'rgba(15,12,10,0.55)');
        sh.addColorStop(1, 'rgba(15,12,10,0)');
        g.fillStyle = sh;
        g.fillRect(0, 0.02, tab.w, E * 0.55);
        // the cut edge catches the light
        g.fillStyle = 'rgba(255,240,220,0.22)';
        g.fillRect(0, 0.02, tab.w, 0.01);
        // per-tab tone
        if (tab.shade !== 1) {
          g.fillStyle =
            tab.shade < 1
              ? `rgba(0,0,0,${(1 - tab.shade).toFixed(3)})`
              : `rgba(255,245,225,${((tab.shade - 1) * 0.6).toFixed(3)})`;
          g.fillRect(0, 0.02, tab.w, HS - 0.02);
        }
        // the sealant strip: Malarkey's rubberized adhesive
        g.fillStyle = 'rgba(20,18,16,0.6)';
        g.fillRect(0, E * 1.02, tab.w, 0.025);
        // The Zone: its nailing band, lit in orange while the camera is close
        if (zoneA > 0) {
          g.fillStyle = `rgba(210,129,34,${(0.55 * zoneA).toFixed(3)})`;
          g.fillRect(0, E * 1.08, tab.w, E * 0.42);
        }
        // nails, once it's down
        const n = Math.max(1, Math.round(tab.w / 0.2));
        for (let k = 0; k < n; k++) {
          const tn = tab.land + 0.03 + k * 0.035;
          const np = prog(t, tn, tn + 0.05);
          if (np <= 0) continue;
          const nx = ((k + 0.5) / n) * tab.w;
          const r = 0.016 * (1 + 0.6 * (1 - np));
          g.fillStyle = '#9aa1a8';
          g.beginPath();
          g.ellipse(nx, E * 1.28, r, r, 0, 0, Math.PI * 2);
          g.fill();
          g.fillStyle = '#dfe4e8';
          g.beginPath();
          g.ellipse(nx - r * 0.25, E * 1.28 + r * 0.25, r * 0.45, r * 0.45, 0, 0, Math.PI * 2);
          g.fill();
        }
        g.globalAlpha = 1;
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Wet: a sheen slides over the roof in the rain; the sun's glint after.
    const wet = L.storm * prog(t, T.rain[0], T.rain[0] + 0.8);
    const glint = L.glint;
    if ((wet > 0 || glint > 0) && this.local(-HW, 0, 0, 2 * HW, S)) {
      const pos = wet > 0 ? ((t * 0.25) % 1.4) - 0.2 : glint;
      const gr = g.createLinearGradient(
        lerp(-2, 2 * HW + 2, pos) - 3,
        0,
        lerp(-2, 2 * HW + 2, pos) + 3,
        S
      );
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(
        0.5,
        `rgba(255,${glint > 0 ? 236 : 255},${glint > 0 ? 200 : 255},${(0.16 * wet + 0.32 * Math.sin(Math.PI * glint)).toFixed(3)})`
      );
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, 2 * HW, S);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  ridge(t) {
    const g = this.g;
    const n = 36;
    for (let k = 0; k < n; k++) {
      const x0 = -HW + (k / n) * 2 * HW;
      const tl = T.ridge[0] + (k / n) * (T.ridge[1] - T.ridge[0] - 0.1);
      const p = prog(t, tl - 0.12, tl);
      if (p <= 0) continue;
      const h = 0.4 * (1 - p * p);
      if (!this.local(x0, S - 0.24, h + 0.02, (2 * HW) / n + 0.01, 0.26)) continue;
      g.fillStyle = '#5e5750';
      g.fillRect(0, 0, (2 * HW) / n + 0.01, 0.26);
      g.fillStyle = this.grain;
      g.fillRect(0, 0, (2 * HW) / n + 0.01, 0.26);
      g.fillStyle = 'rgba(255,245,230,0.18)';
      g.fillRect(0, 0.18, (2 * HW) / n + 0.01, 0.08);
      g.fillStyle = 'rgba(10,8,6,0.5)';
      g.fillRect(0, 0, 0.012, 0.26);
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
  }

  edges() {
    // Drip edge along the eave and rakes.
    this.line(P(-HW, 0, 0.02), P(HW, 0, 0.02), '#f2efe8', 3);
    this.line(P(-HW, 0, 0.02), P(-HW, S, 0.02), '#f2efe8', 2.5);
    this.line(P(HW, 0, 0.02), P(HW, S, 0.02), '#f2efe8', 2.5);
  }

  weather(t, L) {
    const g = this.g;
    const rainA =
      K.inOut(prog(t, T.rain[0], T.rain[0] + 0.6)) *
      (1 - K.inOut(prog(t, T.rain[1] - 0.5, T.rain[1])));
    // Splashes on the roof.
    if (rainA > 0) {
      for (const sp of this.splash) {
        const ph = (((t / sp.per + sp.ph) % 1) + 1) % 1;
        if (ph > 0.45 || !this.local(sp.x, sp.s, 0.005, 1, 1)) continue;
        const r = 0.015 + 0.06 * (ph / 0.45);
        g.strokeStyle = `rgba(220,232,245,${(0.55 * rainA * (1 - ph / 0.45)).toFixed(3)})`;
        g.lineWidth = 0.008;
        g.beginPath();
        g.ellipse(0, 0, r, r, 0, 0, Math.PI * 2);
        g.stroke();
      }
      g.setTransform(1, 0, 0, 1, 0, 0);
    }
    // Hail: falls, strikes, bounces away.
    const n = [0, -1, 0]; // gravity direction
    void n;
    for (const h of this.hail) {
      const dt = t - h.t;
      if (dt < -0.45 || dt > 0.7) continue;
      const hit = P(h.x, h.s, h.rad);
      let p;
      if (dt < 0) {
        const v = [0.9, -16, 2.2];
        p = [hit[0] + v[0] * dt, hit[1] + v[1] * dt, hit[2] + v[2] * dt];
      } else {
        const v = [h.side, h.up * COS * 1.6, h.up * SIN * 1.6 + 0.6];
        p = [hit[0] + v[0] * dt, hit[1] + v[1] * dt - 4.9 * dt * dt, hit[2] + v[2] * dt];
      }
      const c = this.cam.cam(p);
      if (c[2] < NEAR * 3) continue;
      const [sx, sy] = this.cam.scr(c);
      const rr = Math.max(1.6, (this.cam.F * h.rad) / c[2]);
      const gr = g.createRadialGradient(sx - rr * 0.35, sy - rr * 0.35, rr * 0.1, sx, sy, rr);
      gr.addColorStop(0, '#ffffff');
      gr.addColorStop(0.7, '#dfe8f0');
      gr.addColorStop(1, '#9fb0c0');
      g.globalAlpha = dt > 0.45 ? 1 - prog(dt, 0.45, 0.7) : 1;
      g.fillStyle = gr;
      g.beginPath();
      g.arc(sx, sy, rr, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      // the strike: a ring and a few chips of ice
      if (dt > 0 && dt < 0.3 && this.local(h.x, h.s, 0.005, 1, 1)) {
        const q = dt / 0.3;
        g.strokeStyle = `rgba(255,255,255,${(0.8 * (1 - q)).toFixed(3)})`;
        g.lineWidth = h.hero ? 0.02 : 0.01;
        g.beginPath();
        const R = (h.hero ? 0.5 : 0.12) * K.out(q);
        g.ellipse(0, 0, R, R, 0, 0, Math.PI * 2);
        g.stroke();
        g.setTransform(1, 0, 0, 1, 0, 0);
      }
    }
    // Rain, in front of everything.
    if (rainA > 0) {
      g.lineCap = 'round';
      for (const d of this.rain) {
        const y = ((d.y + d.v * t) % 1400) - 160;
        const x = d.x + y * 0.18;
        g.strokeStyle = `rgba(210,222,235,${(d.a * rainA).toFixed(3)})`;
        g.lineWidth = 1.6;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(x + d.l * 0.18, y + d.l);
        g.stroke();
      }
    }
  }
}

// ------------------------------------------------------------------ clipping and colour
function clip(pts) {
  const out = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i],
      b = pts[(i + 1) % pts.length];
    const ia = a[2] >= NEAR,
      ib = b[2] >= NEAR;
    if (ia) out.push(a);
    if (ia !== ib) {
      const k = (NEAR - a[2]) / (b[2] - a[2]);
      out.push([a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, NEAR]);
    }
  }
  return out;
}
function clipSeg(a, b) {
  if (a[2] < NEAR && b[2] < NEAR) return [null, null];
  const cut = (p, q) => {
    const k = (NEAR - p[2]) / (q[2] - p[2]);
    return [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, NEAR];
  };
  if (a[2] < NEAR) a = cut(a, b);
  if (b[2] < NEAR) b = cut(b, a);
  return [a, b];
}
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function mixc(a, b, t) {
  const A = a.startsWith('#') ? hex(a) : a.match(/\d+/g).map(Number);
  const B = b.startsWith('#') ? hex(b) : b.match(/\d+/g).map(Number);
  t = clamp(t);
  return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`;
}
