// Light and energy, drawn over the world in screen space through the camera:
// sunbeams onto the roof, energy streams drawn like the site's hand-drawn
// squiggle lines with a comet running along them, lit windows, headlights,
// the charger's glow and the car's charge meter.
import { prog, lerp, clamp, K, hash } from './kit.js';
import { T, b } from './timeline.js';

// Streams in world space: cubic Bézier [p0, c1, c2, p3], active window and colour.
const STREAMS = [
  // Day: roof panels over the house to the right battery; ground panel to the left one.
  {
    p: [
      [1080, 690],
      [990, 380],
      [720, 470],
      [706, 842],
    ],
    t: [b(10), T.storeOut + 0.2],
    day: 1,
    seed: 1,
  },
  {
    p: [
      [905, 905],
      [830, 700],
      [560, 690],
      [486, 842],
    ],
    t: [b(12.25), T.storeOut + 0.2],
    day: 1,
    seed: 2,
  },
  // Night: the batteries power the house, then the charger and the car.
  {
    p: [
      [700, 842],
      [740, 640],
      [880, 600],
      [952, 712],
    ],
    t: [T.windows[0] - 0.1, b(21)],
    day: 0,
    seed: 3,
  },
  {
    p: [
      [722, 842],
      [960, 520],
      [1470, 540],
      [1632, 884],
    ],
    t: [T.flowNight, b(21)],
    day: 0,
    seed: 4,
  },
  {
    p: [
      [1618, 968],
      [1600, 1016],
      [1540, 1010],
      [1508, 972],
    ],
    t: [T.flowNight + 0.55, b(21)],
    day: 0,
    seed: 5,
  },
];

const bez = (P, u) => {
  const v = 1 - u;
  return [0, 1].map(
    (k) =>
      v * v * v * P[0][k] + 3 * v * v * u * P[1][k] + 3 * v * u * u * P[2][k] + u * u * u * P[3][k]
  );
};

/** Samples a stream as a wavy polyline in world space (the site's squiggle feel). */
function sampleStream(s, n = 90) {
  const pts = [];
  for (let i = 0; i <= n; i++) {
    const u = i / n;
    const [x, y] = bez(s.p, u);
    const [x2, y2] = bez(s.p, Math.min(1, u + 0.01));
    const [x0, y0] = bez(s.p, Math.max(0, u - 0.01));
    let dx = x2 - x0,
      dy = y2 - y0;
    const l = Math.hypot(dx, dy) || 1;
    dx /= l;
    dy /= l;
    const amp = 7 * Math.sin(Math.PI * u) * (0.7 + 0.3 * Math.sin(s.seed * 3.1));
    const w = amp * Math.sin(u * Math.PI * 2 * (3.5 + s.seed * 0.3) + s.seed);
    pts.push([x - dy * w, y + dx * w]);
  }
  // cumulative length
  const L = [0];
  for (let i = 1; i < pts.length; i++)
    L.push(L[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  return { pts, L, len: L[L.length - 1] };
}

function at(S, d) {
  d = clamp(d, 0, S.len);
  let i = 1;
  while (i < S.L.length - 1 && S.L[i] < d) i++;
  const k = (d - S.L[i - 1]) / (S.L[i] - S.L[i - 1] || 1);
  return [lerp(S.pts[i - 1][0], S.pts[i][0], k), lerp(S.pts[i - 1][1], S.pts[i][1], k)];
}

export class Fx {
  constructor(flowCanvas, glowCanvas) {
    this.f = flowCanvas.getContext('2d');
    this.g = glowCanvas.getContext('2d');
    this.streams = STREAMS.map((s) => ({ ...s, S: sampleStream(s) }));
  }

  draw(t, cam, world, sky, n) {
    const f = this.f,
      g = this.g;
    f.clearRect(0, 0, 1920, 1080);
    g.clearRect(0, 0, 1920, 1080);
    if (t > b(21.5)) return;
    const z = cam.z;
    const M = (p) => cam.map(p[0], p[1]);

    // ---- sunbeams onto the roof while the panels produce
    const beam =
      prog(t, T.beams[0], T.beams[0] + 0.5) * (1 - prog(t, T.beams[1] - 0.4, T.beams[1]));
    if (beam > 0 && sky.sunScreen) {
      const [sx, sy] = sky.sunScreen;
      g.save();
      g.globalCompositeOperation = 'lighter';
      world.roof.forEach((r, i) => {
        const [wx, wy] = world.toWorld('house', (r.bb.x + r.bb.x2) / 2, (r.bb.y + r.bb.y2) / 2);
        const [px, py] = M([wx, wy]);
        const flick = 0.75 + 0.25 * Math.sin(t * 5 + i * 1.7);
        const ang = Math.atan2(py - sy, px - sx);
        const len = Math.hypot(px - sx, py - sy);
        g.save();
        g.translate(sx, sy);
        g.rotate(ang);
        const grad = g.createLinearGradient(0, 0, len, 0);
        grad.addColorStop(0, `rgba(255,246,156,${(0.0 * beam).toFixed(3)})`);
        grad.addColorStop(0.35, `rgba(255,246,156,${(0.16 * beam * flick).toFixed(3)})`);
        grad.addColorStop(1, `rgba(255,255,230,${(0.34 * beam * flick).toFixed(3)})`);
        g.fillStyle = grad;
        const w0 = 30,
          w1 = 70 * z;
        g.beginPath();
        g.moveTo(0, -w0);
        g.lineTo(len, -w1);
        g.lineTo(len, w1);
        g.lineTo(0, w0);
        g.closePath();
        g.fill();
        g.restore();
      });
      g.restore();
    }

    // ---- energy streams
    for (const s of this.streams) {
      const [t0, t1] = s.t;
      if (t < t0 || t > t1 + 0.3) continue;
      const S = s.S;
      const draw = K.inOut(prog(t, t0, t0 + 0.7));
      const fade = 1 - prog(t, t1 - 0.2, t1 + 0.3);
      if (fade <= 0) continue;
      const head = draw * S.len;
      const day = s.day;
      // the line
      f.save();
      f.lineCap = 'round';
      f.lineJoin = 'round';
      f.beginPath();
      let started = false;
      for (let i = 0; i < S.pts.length; i++) {
        if (S.L[i] > head) break;
        const [x, y] = M(S.pts[i]);
        if (!started) {
          f.moveTo(x, y);
          started = true;
        } else f.lineTo(x, y);
      }
      if (started) {
        const [hx, hy] = M(at(S, head));
        f.lineTo(hx, hy);
      }
      f.globalAlpha = fade * (day ? 0.95 : 0.9);
      f.strokeStyle = day ? '#ffffff' : '#f3b112';
      f.lineWidth = 2.6 * Math.sqrt(z);
      f.setLineDash([]);
      f.stroke();
      f.restore();

      // comets: a train of pulses running source -> target once the line is drawn
      const speed = S.len / (day ? 0.85 : 0.7);
      const period = day ? 0.36 : 0.3;
      const count = 6;
      for (let k = 0; k < count; k++) {
        const born = t0 + 0.35 + k * period;
        const age = t - born;
        if (age < 0) continue;
        const cycle = age % (period * count);
        const d = cycle * speed;
        if (d > S.len || d > head) continue;
        const [cx, cy] = M(at(S, d));
        const r = (day ? 6.5 : 5.5) * Math.sqrt(z);
        // trail
        for (let j = 1; j <= 6; j++) {
          const [tx, ty] = M(at(S, d - j * 9));
          f.globalAlpha = fade * (1 - j / 7) * 0.5;
          f.fillStyle = day ? '#ffffff' : '#fff69c';
          f.beginPath();
          f.arc(tx, ty, r * (1 - j / 8), 0, Math.PI * 2);
          f.fill();
        }
        f.globalAlpha = fade;
        f.fillStyle = day ? '#141937' : '#fff69c';
        f.beginPath();
        f.arc(cx, cy, r + 2.2, 0, Math.PI * 2);
        f.fill();
        f.fillStyle = day ? '#ffffff' : '#ffffff';
        f.beginPath();
        f.arc(cx, cy, r, 0, Math.PI * 2);
        f.fill();
        // glow
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 7);
        const col = day ? '255,250,215' : '243,177,18';
        gr.addColorStop(0, `rgba(${col},${(0.8 * fade).toFixed(3)})`);
        gr.addColorStop(1, `rgba(${col},0)`);
        g.fillStyle = gr;
        g.fillRect(cx - r * 7, cy - r * 7, r * 14, r * 14);
      }
      // arrival ring where the stream lands
      if (draw >= 1) {
        const [ex, ey] = M(S.pts[S.pts.length - 1]);
        const ph = ((t - t0 - 0.35) % period) / period;
        f.globalAlpha = fade * (1 - ph) * 0.8;
        f.strokeStyle = day ? '#ffffff' : '#f3b112';
        f.lineWidth = 2;
        f.beginPath();
        f.arc(ex, ey, (8 + ph * 26) * Math.sqrt(z), 0, Math.PI * 2);
        f.stroke();
        f.globalAlpha = 1;
      }
    }

    // ---- night: lit windows, headlights, charger
    if (n > 0.02) {
      g.save();
      g.globalCompositeOperation = 'lighter';
      world.win.forEach((w, i) => {
        const lit = world.winLit ? world.winLit[i] : 0;
        if (lit <= 0) return;
        const [wx, wy] = world.toWorld('house', (w.bb.x + w.bb.x2) / 2, (w.bb.y + w.bb.y2) / 2);
        const [px, py] = M([wx, wy]);
        const flash = 1 + 0.6 * Math.exp(-(t - (T.windows[0] + i * 0.1)) * 8);
        const R = 95 * z;
        const gr = g.createRadialGradient(px, py, 0, px, py, R);
        gr.addColorStop(0, `rgba(218,209,174,${(0.42 * lit * flash).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(218,209,174,0)');
        g.fillStyle = gr;
        g.fillRect(px - R, py - R, R * 2, R * 2);
      });
      const hl = prog(t, T.headlights, T.headlights + 0.15);
      if (hl > 0) {
        world.headlightWorld.forEach(([hx0, hy0], i) => {
          const [hx, hy] = M([hx0 + world.carX, hy0]);
          // cone to the left: the car faces left
          g.save();
          g.translate(hx, hy);
          const len = 520 * z;
          const grad = g.createLinearGradient(0, 0, -len, 0);
          grad.addColorStop(0, `rgba(243,177,18,${(0.34 * hl).toFixed(3)})`);
          grad.addColorStop(1, 'rgba(243,177,18,0)');
          g.fillStyle = grad;
          g.beginPath();
          g.moveTo(0, -4 * z);
          g.lineTo(-len, -95 * z + i * 10 * z);
          g.lineTo(-len, 60 * z + i * 10 * z);
          g.lineTo(0, 6 * z);
          g.closePath();
          g.fill();
          const R = 36 * z;
          const gr = g.createRadialGradient(0, 0, 0, 0, 0, R);
          gr.addColorStop(0, `rgba(255,246,156,${(0.9 * hl).toFixed(3)})`);
          gr.addColorStop(1, 'rgba(243,177,18,0)');
          g.fillStyle = gr;
          g.fillRect(-R, -R, R * 2, R * 2);
          g.restore();
        });
      }
      // charger bolt breathes once the car is on charge
      const ch = prog(t, T.flowNight + 0.5, T.flowNight + 0.8);
      if (ch > 0) {
        const [bx, by] = M(world.boltWorld);
        const R = (70 + 14 * Math.sin(t * 9)) * z;
        const gr = g.createRadialGradient(bx, by, 0, bx, by, R);
        gr.addColorStop(0, `rgba(243,177,18,${(0.8 * ch).toFixed(3)})`);
        gr.addColorStop(1, 'rgba(243,177,18,0)');
        g.fillStyle = gr;
        g.fillRect(bx - R, by - R, R * 2, R * 2);
      }
      g.restore();
    }

    // ---- the car's charge meter, above its roof
    const cm = prog(t, T.flowNight + 0.6, T.flowNight + 1.0);
    const cmOut = prog(t, b(20.4), b(20.8));
    if (cm > 0 && cmOut < 1) {
      const level = lerp(0.18, 1, K.inOut(prog(t, T.flowNight + 0.8, b(20.3))));
      const [mx, my] = M([1425 + world.carX, 812]);
      const s = K.spring(cm, 2, 6) * (1 - K.inExpo(cmOut)) * z;
      if (s > 0.01) {
        f.save();
        f.translate(mx, my);
        f.scale(s, s);
        const W = 132,
          H = 56,
          r = 14;
        const rr = (x, y, w, h, rad) => {
          f.beginPath();
          f.moveTo(x + rad, y);
          f.arcTo(x + w, y, x + w, y + h, rad);
          f.arcTo(x + w, y + h, x, y + h, rad);
          f.arcTo(x, y + h, x, y, rad);
          f.arcTo(x, y, x + w, y, rad);
          f.closePath();
        };
        f.globalAlpha = 1;
        f.fillStyle = 'rgba(20,25,55,0.92)';
        rr(-W / 2 - 8, -H / 2 - 8, W + 16, H + 16, r + 6);
        f.fill();
        f.strokeStyle = '#ffffff';
        f.lineWidth = 3.5;
        rr(-W / 2, -H / 2, W, H, r);
        f.stroke();
        f.fillStyle = '#ffffff';
        f.fillRect(W / 2 + 3, -10, 7, 20);
        f.fillStyle = level > 0.98 ? '#00b67a' : '#f3b112';
        rr(-W / 2 + 6, -H / 2 + 6, (W - 12) * level, H - 12, 9);
        f.fill();
        // bolt glyph
        f.fillStyle = '#141937';
        f.beginPath();
        f.moveTo(4, -20);
        f.lineTo(-12, 3);
        f.lineTo(-1, 3);
        f.lineTo(-5, 20);
        f.lineTo(12, -4);
        f.lineTo(1, -4);
        f.closePath();
        f.fill();
        f.restore();
      }
    }
  }
}
