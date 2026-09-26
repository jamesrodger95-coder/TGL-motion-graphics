// Prints the film's cue sheet as JSON for the soundtrack (scripts/audio.py).
// Everything comes from the same modules the picture is rendered from.
import { T, BEAT, FPS, DURATION, arrive, panelWindow } from '../src/js/timeline.js';
import { detections } from '../src/js/hook.js';

const panels = [0, 1, 2, 3].map((k) => ({
  arrive: arrive(k),
  p0: panelWindow(k)[0],
  p1: panelWindow(k)[1],
}));
process.stdout.write(
  JSON.stringify({ FPS, DURATION, BEAT, T, panels, detections: detections() }, null, 1)
);
