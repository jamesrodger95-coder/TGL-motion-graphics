// The Bryant Dental film's clock: one source of truth for picture and sound.
// 128 BPM. Cuts, clicks and magnification steps sit on the beat grid.

export const FPS = 60;
export const DURATION = 12;
export const BEAT = 60 / 128;
export const b = (n) => n * BEAT;

// The MagTech render: source seconds 6.4 onward, played at 1.7x so the two
// barrels click on exactly on beats 7 and 7.5 (source 7.9 s and 8.3 s).
const VIDEO_SPEED = 1.7;
const VIDEO_T0 = b(7) - (7.9 - 6.4) / VIDEO_SPEED;

export const T = {
  // 1. Constellations — the Ignis light ignites; the hero line comes into focus.
  ignite: 0.3,
  head: 0.55,
  links: [1.05, 2.0],
  iris: [b(4.2), b(5.2)],

  // 2a. MagniFlex — the barrels fly in and click on.
  video: { t0: VIDEO_T0, speed: VIDEO_SPEED, fps: 23.976 },
  clicks: [b(7), b(7.5)],
  title: b(5.25),
  pills: [b(6.1), b(6.3), b(6.5)],

  // 2b. Magnify — the barrel's glass becomes a loupe reading the micro-copy.
  intoLens: [b(7.85), b(8.6)],
  steps: [b(8.5), b(9.25), b(10)],
  split: [b(10.55), b(11.3)],

  // 3. Binocular — technology first, handcrafted in the UK.
  cuts: [b(11), b(12), b(13), b(14), b(15)],
  labels: b(11.4),
  merge: [b(15.3), b(16.15)],

  // 4. World — chosen by the best in the world.
  world: b(16),
  worldHead: b(16.35),
  stats: b(17),
  flare: b(17.2),
  lift: [b(19.35), b(20.35)],

  // 5. The mark — the stars connect into the bd; humanity, augmented.
  constellation: [b(20), b(21.3)],
  draw: [b(21.1), b(22.3)],
  word: b(22.1),
  tagline: b(22.8),
  cta: b(23.45),
  url: b(23.7),
  sweep: b(24.1),
};
