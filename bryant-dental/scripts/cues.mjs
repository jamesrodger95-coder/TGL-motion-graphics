// Prints the Bryant Dental cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION } from '../src/js/timeline.js';
import { hash } from '../../src/js/core.js';

const stars = Array.from(
  { length: 19 },
  (_, i) => T.constellation[0] + hash(i, 13) * 0.3 + 0.3
).sort((a, b) => a - b);
const links = Array.from(
  { length: 6 },
  (_, i) => T.links[0] + ((i + 1) / 6) * (T.links[1] - T.links[0])
);
process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T, stars, links }, null, 1));
