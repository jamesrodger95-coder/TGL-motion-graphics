// Shots A and B, and the room for C. The site's hero is a 121-frame scroll
// sequence (a sunset drone flight from the tower, through a window, into a
// finished apartment). Here the film's clock drives it instead of the scroll,
// cross-fading between neighbouring frames so it plays smoothly at 60 fps.
// Shot A opens on the site's striped deco: peach bars sweep in on black and
// then widen like blinds until the sequence fills the frame.
import { T } from './timeline.js';
import { C, K, bezier, clamp, lerp, prog, keys } from './kit.js';

const N_FRAMES = 121;
const SRC = 1440; // source frames are 1440x1440
const COVER = 1920 / SRC; // fill the frame's width
const N_BARS = 10;
const TILE = 1920 / N_BARS;
// The deco's widths grow in steps, like the logo's bars.
const BAR0 = Array.from({ length: N_BARS }, (_, i) => ({ x: 940 + i * 96, w: 10 + i * 7.5 }));
const flightEase = bezier(0.42, 0, 0.22, 1); // ease into the dive, glide into the room

export class Sequence {
  constructor(canvas) {
    this.g = canvas.getContext('2d');
  }

  async ready() {
    this.cache = new Map(); // frame index -> decoded image, oldest first
    await this.prepare(0);
  }

  /** Decodes the two frames time t needs. Headless Chromium cannot hold all
   *  121 decoded frames at once, so only the last few are kept. */
  async prepare(t) {
    const i = Math.min(N_FRAMES - 1, Math.floor(this.frameAt(t)));
    for (const n of [i, Math.min(N_FRAMES - 1, i + 1)]) {
      if (this.cache.has(n)) {
        const im = this.cache.get(n);
        this.cache.delete(n);
        this.cache.set(n, im);
        continue;
      }
      const im = new Image();
      im.src = `seq/f${String(n).padStart(3, '0')}.jpg`;
      await im.decode();
      this.cache.set(n, im);
      while (this.cache.size > 8) this.cache.delete(this.cache.keys().next().value);
    }
  }

  /** Sequence position (0..120) at time t. */
  frameAt(t) {
    return keys(
      [
        [0, 0],
        [T.flight[0], 5, (x) => x],
        [T.flight[1], 120, flightEase],
      ],
      t
    );
  }

  /** The camera over the source frame: zoom, source centre, and a pan. */
  camera(t) {
    const f = this.frameAt(t);
    // Frame the tower a touch high, the room a touch low (more floor).
    const cy = lerp(700, 770, clamp((f - 70) / 50));
    const z =
      keys(
        [
          [0, 1.08],
          [T.flight[0], 1.03, K.settle],
          [T.flight[1], 1.0, K.inOut],
          [T.panels[0] + 0.6, 1.07, (x) => x],
        ],
        t
      ) +
      // A punch through the window, where the flight is fastest.
      0.05 * Math.sin(Math.PI * prog(f, 78, 100));
    const px = keys(
      [
        [T.flight[1], 0],
        [T.panels[0] + 0.6, -40, (x) => x],
      ],
      t
    );
    return { f, cy, z, px };
  }

  /** Source point -> screen point under the camera at time t. */
  project(sx, sy, t) {
    const { cy, z, px } = this.camera(t);
    const s = COVER * z;
    return [960 + (sx - SRC / 2) * s + px, 540 + (sy - cy) * s];
  }

  drawFrame(t) {
    const { g } = this;
    const { f, cy, z, px } = this.camera(t);
    const s = COVER * z;
    const i = Math.min(N_FRAMES - 1, Math.floor(f));
    const k = f - i;
    const put = (im, a) => {
      g.globalAlpha = a;
      g.drawImage(im, 960 - (SRC / 2) * s + px, 540 - cy * s, SRC * s, SRC * s);
    };
    put(this.cache.get(i), 1);
    if (k > 0.001 && i + 1 < N_FRAMES) put(this.cache.get(i + 1), k);
    g.globalAlpha = 1;
  }

  draw(t) {
    const { g } = this;
    g.fillStyle = C.black;
    g.fillRect(0, 0, 1920, 1080);
    const open = K.inOut(prog(t, T.blinds[0], T.blinds[1] + 0.25));
    if (open >= 1) return (this.drawFrame(t), 1);

    // The bars: they land from the right, one per 32nd, rising from the floor,
    // then widen (right to left) into tiles that show the sequence.
    const rects = BAR0.map((b0, i) => {
      const land = K.settle(prog(t, T.bars[0] + i * 0.0625, T.bars[0] + i * 0.0625 + 0.6));
      const rise = K.settle(prog(t, T.bars[0] + i * 0.0625, T.bars[0] + i * 0.0625 + 0.45));
      const q = K.inOut(prog(t, T.blinds[0] + (N_BARS - 1 - i) * 0.04, T.blinds[1]));
      const x = lerp(b0.x + (1 - land) * 1100, i * TILE, q);
      const w = lerp(b0.w, TILE + 1, q);
      const h = 1080 * rise;
      return { x, w, y: 1080 - h, h, q };
    });
    // Inside the bars: the sequence, under a peach wash that clears as they open.
    g.save();
    g.beginPath();
    for (const r of rects) g.rect(r.x, r.y, r.w, r.h);
    g.clip();
    this.drawFrame(t);
    for (const r of rects) {
      // Before the blinds open the bars are pure deco: no picture yet.
      if (r.q < 1) {
        g.fillStyle = `rgba(14,10,10,${(1 - Math.min(1, r.q * 1.6)).toFixed(3)})`;
        g.fillRect(r.x, r.y, r.w, r.h);
      }
      const grad = g.createLinearGradient(0, 0, 0, 1080);
      grad.addColorStop(0.15, 'rgba(255,165,116,0)');
      grad.addColorStop(1, `rgba(255,165,116,${(1 - r.q).toFixed(3)})`);
      g.fillStyle = grad;
      g.fillRect(r.x, r.y, r.w, r.h);
    }
    g.restore();
    return open;
  }
}
