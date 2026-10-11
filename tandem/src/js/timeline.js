// Tandem in 8 seconds, cut to a 120 BPM grid (a beat is 0.5 s). Three
// movements, each given room to land and hold:
//   A 0.0-2.0  common ground: four lines meet at a circle, the T steers straight
//   B 2.0-5.0  built together: through the circle onto a pour on site, the two
//              words meet, and a ramp of bars grows into the finished building
//   C 5.0-8.0  the mark: the arrow of lines clears the page for the lockup
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 8.0;
export const b = (n) => n * BEAT;

export const T = {
  // A — common ground
  lines: [0.1, 1.0], // the four lines, from the corners in
  circle: [0.75, 1.25],
  mark: [1.0, 1.75], // the T pops in tilted and steers straight
  eyebrow: 0.3,
  hero: 0.5, // the site's hero line
  foot: 0.7,
  push: [b(4), b(5.4)], // through the circle

  // B — built together
  built: b(5), // "BUILT" from the left ...
  together: b(5.2), // ... "TOGETHER" from the right
  label: 2.9,
  bars: [b(7), b(8.8)], // the ramp of bars grows into the finished building
  label2: 4.15,
  out: [b(9.5), b(10.3)], // the words part the way they came
  wipe: [4.85, 5.5], // the arrow of lines clears the page

  // C — the mark
  tile: [b(11), b(11.9)],
  tee: [5.6, 6.15],
  word: [5.75, 6.35],
  frame: [5.5, 6.5], // the lines return
  tagline: b(12),
  services: b(12.5),
  foot2: b(13),
  end: DURATION,
};
