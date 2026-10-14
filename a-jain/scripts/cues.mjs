// Prints the A.Jain cue sheet as JSON for scripts/audio.py, from the same
// timeline the picture is rendered from.
import { T, BEAT, FPS, DURATION, DOWN } from '../src/js/timeline.js';

process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, DOWN, T }, null, 1));
