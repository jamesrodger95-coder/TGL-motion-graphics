// Shot D — the flood. The brand's own waves (the logo's A: a navy peak over a
// white gap and two red stripes) rise from the bottom of the frame as water
// and fill it navy, ready for the end card.
import { T } from './timeline.js';
import { C, K, lerp, prog, wave } from './kit.js';

// Bands from the leading edge back: the drop's blue, white, red, white, navy.
const BANDS = [
  { lead: 150, color: C.drop, seed: 0.0, amp: 1.0 },
  { lead: 118, color: '#ffffff', seed: 0.6, amp: 1.0 },
  { lead: 96, color: C.red, seed: 1.1, amp: 0.95 },
  { lead: 62, color: '#ffffff', seed: 1.6, amp: 0.9 },
  { lead: 40, color: C.logoRed, seed: 2.0, amp: 0.9 },
  { lead: 0, color: C.navy, seed: 2.4, amp: 0.85 },
];

export class Flood {
  constructor(canvas) {
    this.c = canvas;
    this.g = canvas.getContext('2d');
  }

  /** Returns how far the flood has risen (0..1). */
  draw(t) {
    const { g } = this;
    const W = 1920,
      H = 1080;
    g.clearRect(0, 0, W, H);
    const p = prog(t, T.flood[0], T.flood[1]);
    if (p <= 0) return 0;
    if (p >= 1) {
      g.fillStyle = C.navy;
      g.fillRect(0, 0, W, H);
      return 1;
    }
    // The surface surges up, steepest mid-way, with the chop at its biggest.
    const e = K.inOut(p);
    const level = lerp(H + 230, -360, e);
    const amp = 58 * Math.sin(Math.PI * Math.min(1, p * 1.15)) + 6;
    // A slight tilt, so the water rolls in from the left.
    const tilt = 120 * Math.sin(Math.PI * p);
    for (const band of BANDS) {
      g.beginPath();
      g.moveTo(0, H + 10);
      for (let x = 0; x <= W; x += 16) {
        const y =
          level -
          band.lead * (0.6 + 0.4 * Math.sin(Math.PI * p)) +
          wave(x, t, amp * band.amp, band.seed) +
          tilt * (x / W - 0.5);
        g.lineTo(x, y);
      }
      g.lineTo(W, H + 10);
      g.closePath();
      g.fillStyle = band.color;
      g.fill();
    }
    return e;
  }
}
