// One sentence from the site, cut to a 120 BPM grid of 20 beats (10 s):
// "When you think plumbing & heating, think Bollano Plumbers."
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const DURATION = 20 * BEAT; // 10.0 s
export const b = (n) => n * BEAT;

export const T = {
  // A — "When you think": one drop of water falls, splashes and ripples.
  fall: [b(0.2), b(1.5)],
  impact: b(1.5),
  ripples: [b(1.5), b(1.7), b(1.95), b(2.25)],
  words: [b(2), b(2.25), b(2.5)], // When · you · think
  tilt: [b(3.5), b(4.75)], // the ripple stands up into the hero's circle

  // B — "plumbing": the site's hero, assembled from its own illustration.
  blob: [b(4), b(6)], // the site's pale curve sweeps in
  plumbing: b(4.5),
  fill: [b(4.75), b(6.25)], // the word fills with water
  bath: b(5),
  taps: [b(5.5), b(5.75), b(6)],
  hoses: [b(5.75), b(6.25), b(6.5)], // cold, mains, hot: each pours down
  plumber: [b(6.25), b(7.25)],
  trusted: b(7), // Professional, Responsive, Trusted
  pipe: [b(7.25), b(10)], // the hot pipe runs off to the right…

  // C — "& heating,": …and the camera whips after it to a radiator.
  whip: [b(8.5), b(9.5)],
  heating: b(9.25),
  inlet: b(9.75), // the hot water reaches the radiator
  fins: [b(9.75), b(11.25)],
  shimmer: b(10.5),
  card: b(11.5), // Gas Safe

  // D — "think": the brand's waves flood the frame navy.
  flood: [b(13), b(14.5)],
  think: b(14.25),

  // E — Bollano Plumbers: the logo builds from its own parts.
  peak: [b(15), b(15.75)],
  stripes: [b(15.5), b(16.25)],
  letters: [b(15.875), b(16.75)],
  frame: [b(16.25), b(17.25)],
  plumbers: [b(16.75), b(17.5)],
  cta: b(17.5),
  url: b(17.875),
  shine: [b(18.25), b(19.25)],
};
