// Malarkey in 10 seconds, cut to a 120 BPM grid (a beat is 0.5 s). Three
// movements, each given room to land and hold:
//   A 0.0-3.5  the build: underlayment rolls out, architectural shingles go
//              down course by course (nailed in The Zone), ridge caps run
//   B 3.5-6.8  the storm: rain and hail hammer the finished roof; it holds
//   C 6.6-10   the sun: the sky clears and Malarkey's slanted green panel
//              brings the mark and what every roof keeps out of landfill
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 10.0;
export const b = (n) => n * BEAT;

export const COURSES = 22;
/** When course i starts landing (its tabs land left to right over 0.4 s). */
export const courseAt = (i) => 0.5 + 0.106 * i;

export const T = {
  // A — the build
  underlay: [0.05, 0.85],
  zone: [0.7, 1.45], // The Zone label, in the close-up
  pull: [1.15, 3.15], // the camera pulls back from the eave to the house
  caption: 2.5, // "Shingles Built To Do More.", once the camera has pulled back
  capOut: 3.5,
  ridge: [2.95, 3.4],

  // B — the storm
  sky: [3.3, 4.1],
  rain: [3.55, 6.9],
  hail: [3.9, 6.4],
  bolts: [b(9), b(11.5)], // lightning on the beat
  matters: b(8.25), // "When It Matters®"
  covered: b(8.5), // "We've Gotcha Covered"
  hero: b(10), // a big hailstone lands: Class 4
  chips: [b(10.25), b(10.75)],
  stormOut: [6.35, 6.7],

  // C — the sun, the mark
  clear: [6.5, 7.4],
  glint: [6.9, 7.8],
  panel: [b(14.25), b(15.25)], // the slanted green panel
  logo: b(15),
  tagline: b(15.5),
  stats: b(16),
  matters2: b(16.75),
  end: DURATION,
};
