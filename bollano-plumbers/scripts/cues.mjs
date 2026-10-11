// Prints the Bollano Plumbers cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION } from '../src/js/timeline.js';
import { CROWN, G, X } from '../src/js/drop.js';

const r = (v) => +v.toFixed(4);
const events = {
  // Each droplet of the crown lands when its parabola returns to the surface
  // (drop.js); the pan follows where it lands.
  droplets: CROWN.map((d) => ({
    t: r(T.impact + (-2 * d.vy) / G),
    pan: r((d.vx * (-2 * d.vy)) / G / 960),
  })),
  // The bead thrown off the jet: 150 + 760 tb - G/2 tb² = 0, from tb = 0.15 s.
  bead: r(T.impact + 0.15 + (760 + Math.sqrt(760 ** 2 + 2 * G * 150)) / G),
  dropX: X,
};
process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T, events }, null, 1));
