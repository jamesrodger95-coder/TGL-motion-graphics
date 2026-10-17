// Prints the Human Improvement cue sheet as JSON for scripts/audio.py, from
// the same timeline the picture is rendered from.
import { T, FPS, DURATION, BPM } from '../src/js/timeline.js';

process.stdout.write(JSON.stringify({ FPS, DURATION, BPM, T }, null, 1));
