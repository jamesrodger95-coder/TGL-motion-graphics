// The film's clock. One source of truth for picture and sound: scripts/audio.py
// imports these same cues (via scripts/cues.mjs), so every hit lands on its frame.
//
// Tempo is chosen so that one module is exactly three beats: 138.46 BPM, a
// beat of 0.4333 s. Camera moves peak mid-travel on a downbeat.

export const FPS = 60;
export const DURATION = 12;
export const BEAT = 60 / 138.4615;
export const b = (n) => n * BEAT;

const HALF_MOVE = 0.26; // a camera move is 0.52 s, centred on its beat
const moveOn = (beat) => [b(beat) - HALF_MOVE, b(beat) + HALF_MOVE];

export const T = {
  // 1 — Hook: "Recover the revenue you already earned."
  eyebrow: 0.1,
  head: 0.2,
  marquee: 0.32,
  fieldIn: 0.12,
  sweep: [b(2), b(4)],

  // 2 — The four modules, one shot each. moves[k] brings panel k to centre.
  moves: [moveOn(5), moveOn(8), moveOn(11), moveOn(14)],

  // 3 — Pull back to the system, then the dark section rises over it.
  pullback: [b(15.8), b(17)],
  darkRise: [b(17.4), b(18.6)],
  accHead: b(18.15),
  bars: [b(19), b(19.5), b(20), b(20.5)],
  barDur: 0.78,
  hold: b(21),

  // 4 — The account closes into the mark; the lockup builds.
  aperture: [b(22), b(23.6)], // closes to the mark; then on to a point by irisEnd
  irisEnd: b(24.05),
  cubes: [b(23.7), b(23.95), b(24.2)],
  word: b(24.6),
  tagline: b(25.15),
  modrow: b(25.5),
  cta: b(25.85),
  url: b(26.1),
};

/** Arrival time of panel k (camera settled on it). */
export const arrive = (k) => T.moves[k][1];

/** The window over which panel k's drawing plays, 0 -> 1. It starts while the
 *  camera is still travelling in, so the module's decisive beat lands on the hold. */
export const panelWindow = (k) => [arrive(k) - 0.46, arrive(k) + 0.84];
