// Prints the Everyone's Energy cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION, b } from '../src/js/timeline.js';
import { batteryLevel } from '../src/js/world.js';

// When each battery bar lights (bar i is full at level (i + 2/3) / 4).
const bars = [];
for (let i = 1; i < 4; i++) {
  const target = (i + 2 / 3) / 4;
  for (let t = T.fill[0]; t < T.fill[1] + 0.2; t += 0.002) {
    if (batteryLevel(t) >= target) {
      bars.push(+t.toFixed(3));
      break;
    }
  }
}
// The counter's ones digit crosses 30 integers on an expo-out roll.
const [c0, c1] = T.count;
const ticks = Array.from({ length: 30 }, (_, k) => {
  const p = -Math.log2(1 - (k + 1) / 30.0001) / 10;
  return +(c0 + p * (c1 - c0)).toFixed(3);
}).filter((t) => t < c1);
const events = {
  revolve: Array.from({ length: 10 }, (_, i) => T.head[1] + i * 0.03),
  trees: Array.from({ length: 3 }, (_, i) => T.trees + i * 0.07),
  windows: Array.from({ length: 5 }, (_, i) => T.windows[0] + i * 0.1),
  logoBars: Array.from({ length: 4 }, (_, i) => T.bars + i * 0.05),
  every: Array.from({ length: 10 }, (_, i) => T.word1 + i * 0.028),
  energy: Array.from({ length: 6 }, (_, i) => T.word2 + i * 0.04),
  meter: T.flowNight + 0.6,
  bars,
  ticks,
};
process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T, events, b0: b(0) }, null, 1));
