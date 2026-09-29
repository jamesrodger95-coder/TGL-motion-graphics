// Prints the My Origin Report cue sheet as JSON for scripts/audio.py, derived
// from the same modules the picture is rendered from.
import { T as STORY_T, BEAT, FPS, DURATION, SLOW } from '../src/js/timeline.js';
import { CITIES, CORK } from '../src/js/map.js';

// The timeline is in story time; the soundtrack needs real time (half speed).
const real = (v) => (Array.isArray(v) ? v.map(real) : +(v * SLOW).toFixed(4));
const T = Object.fromEntries(Object.entries(STORY_T).map(([k, v]) => [k, real(v)]));

const events = {
  // "Sullivan" settles into the input as the box draws: a soft type-on flutter.
  typing: Array.from({ length: 8 }, (_, i) => real(STORY_T.toInput[0] + 0.3 + i * 0.045)),
  // Each route lands after its flight time (map.js: 0.42 s + distance / 2600).
  arrivals: CITIES.map(([, p], i) => {
    const dist = Math.hypot(p[0] - CORK[0], p[1] - CORK[1]);
    return real(STORY_T.arcs[i] + 0.42 + dist / 2600);
  }),
};
// BEAT here is one story beat in real seconds; the music keeps 120 BPM (MUSIC).
process.stdout.write(
  JSON.stringify({ FPS, DURATION, BEAT: BEAT * SLOW, MUSIC: BEAT, T, events }, null, 1)
);
