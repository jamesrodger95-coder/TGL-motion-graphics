// Prints the Elaina Badro cue sheet as JSON for scripts/audio.py, from the
// same timeline the picture is rendered from.
import { T, FPS, DURATION } from '../src/js/timeline.js';

process.stdout.write(JSON.stringify({ FPS, DURATION, T }, null, 1));
