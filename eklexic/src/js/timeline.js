// Eklexic in 10 seconds, cut to a 120 BPM grid (a beat is 0.5 s). A carousel
// of three hero pieces, each set in front of a word from the site's own copy
// ("bold, edgy, glamorous") and held long enough to look at, with more of the
// collection flying through on every move; then the site's hero, held.
//   BOLD       0.0-2.3  Thick Flat Ring
//   EDGY       2.3-4.8  Esmé Bracelet
//   GLAMOROUS  4.8-7.0  Triple Bloom Drop Earrings
//   HER        7.0-10   "This Isn't Jewelry You Wear. It's Who You Become."
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const DURATION = 10.0;
export const b = (n) => n * BEAT;

export const T = {
  // each panel: when its piece lands, its word rises, its card arrives
  land: [b(0.25), b(5.5), b(10.5)],
  word: [b(0.4), b(5.3), b(10.3)],
  card: [b(1.6), b(6.4), b(11.4)],
  // the camera moves on: one panel to the next
  pans: [
    [b(4.5), b(5.9)],
    [b(9.5), b(10.9)],
    [b(14), b(15.4)],
  ],
  // the site's hero
  logo: b(15.2),
  head: b(15.5),
  sub: b(16.25),
  cta: b(16.75),
  end: DURATION,
};
