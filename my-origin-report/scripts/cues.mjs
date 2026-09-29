// Prints the My Origin Report cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION } from '../src/js/timeline.js';
import { CITIES, CORK } from '../src/js/map.js';

const events = {
  // "Sullivan" settles into the input as the box draws: a soft type-on flutter.
  typing: Array.from({ length: 8 }, (_, i) => +(T.toInput[0] + 0.3 + i * 0.045).toFixed(3)),
  // Each route lands after its flight time (map.js: 0.42 s + distance / 2600).
  arrivals: CITIES.map(([, p], i) => {
    const dist = Math.hypot(p[0] - CORK[0], p[1] - CORK[1]);
    return +(T.arcs[i] + 0.42 + dist / 2600).toFixed(3);
  }),
};
process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T, events }, null, 1));
