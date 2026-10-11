// Prints the Modus Projects cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION } from '../src/js/timeline.js';
import { Sequence } from '../src/js/seq.js';

const r = (v) => +v.toFixed(4);
const frameAt = (t) => Sequence.prototype.frameAt.call(null, t);
// The moment the flight passes through the window (sequence frame 89): the
// soundtrack's biggest whoosh peaks there.
let punch = T.flight[0];
while (frameAt(punch) < 89 && punch < T.flight[1]) punch += 1 / FPS;
const events = {
  punch: r(punch),
  // The opening bars land one per 32nd (seq.js).
  bars: Array.from({ length: 10 }, (_, i) => r(T.bars[0] + i * 0.0625 + 0.12)),
};
process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T, events }, null, 1));
