// Sydney's Plumbing Specialists in 8 seconds, cut to a 120 BPM grid (a beat
// is 0.5 s). Three movements, each given room to land and hold:
//   A 0.0-2.5  the pipe draws Sydney (the Harbour Bridge and the Opera House)
//   B 1.8-5.0  the camera follows it down to a manifold that fills the
//              site's three promise cards like tanks
//   C 4.6-8.0  the cards drain into one drop, which lands and fills the logo
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 8.0;
export const b = (n) => n * BEAT;

export const T = {
  // A — Sydney, drawn by the water main
  grid: [0, 0.6],
  draw: [0.05, 2.4], // the pipe, from the right edge to the manifold's end cap
  corner: 1.3, // the water has drawn the skyline and turns down
  riser: 1.6, // ... and reaches the manifold
  head: b(0.75), // "Plumber Sydney"
  sub: b(1.5), // "20 Dedicated Years ..."
  reflect: [0.5, 1.4],
  pan1: [1.65, 2.3], // the camera follows the water down

  // B — the manifold and the three promises
  outline: [1.85, 2.3],
  tees: [1.72, 1.94, 2.16], // the water passes each outlet
  fill: [1.84, 2.06, 2.28], // ... and each card fills (0.75 s)
  content: [2.34, 2.56, 2.78], // each card's mark, ribbon and promise
  out: [4.4, 4.7], // the promises lift off
  drain: [4.55, 5.0],
  pan2: [4.7, 5.35],

  // C — one drop, the logo
  line: [5.0, 5.45], // a waterline for the drop to land on
  drop: [5.2, b(11)], // the drop swells at the tap, then lets go
  impact: b(11.5), // 5.75: it lands on the waterline
  logo: [b(11.5) + 0.05, 6.55], // the red rises inside the letters
  tagline: b(12),
  stars: b(12.5),
  call: b(13),
  book: b(13.2),
  shine: b(14),
  end: DURATION,
};
