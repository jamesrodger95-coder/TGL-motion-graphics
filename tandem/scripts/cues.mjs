// Prints the Tandem cue sheet as JSON for scripts/audio.py, from the same
// timeline the picture is rendered from.
import { T, BEAT, FPS, DURATION } from '../src/js/timeline.js';

process.stdout.write(JSON.stringify({ FPS, DURATION, BEAT, T }, null, 1));
