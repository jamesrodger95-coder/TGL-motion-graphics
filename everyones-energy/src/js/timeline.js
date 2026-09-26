// One day of Everyone's Energy in 15 seconds, cut to a 128 BPM grid:
// 32 beats, 8 bars. Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 128;
export const BEAT = 60 / BPM; // 0.46875 s
export const DURATION = 32 * BEAT; // 15.0 s
export const b = (n) => n * BEAT;

export const T = {
  // A — sunrise. The sun comes up behind the site's line.
  dawn: [0, b(4)], // navy -> amber sky
  sunrise: [b(0.25), b(3.5)],
  head: [b(1), b(2), b(3)], // THE ENERGY / REVOLUTION / HAS BEGUN!
  headOut: b(5),

  // B — the camera cranes down and the home assembles on the beat.
  crane: [b(5), b(7.25)],
  trees: b(6),
  house: b(6.5),
  roof: [b(7), b(7.25), b(7.5), b(7.75)],
  panel: b(7.5),
  batteries: b(8),
  car: [b(8.25), b(9)], // drives in, parks

  // C — produce, then store.
  toRoof: [b(8.75), b(9.75)],
  produce: b(9.25), // label in
  beams: [b(9.25), b(14.5)],
  flowRoof: b(10),
  toBatt: [b(11.5), b(12.25)],
  produceOut: b(11.25),
  store: b(12),
  fill: [b(12.5), b(14.25)], // battery bars charge
  storeOut: b(14.5),

  // D — sunset, night, and the car charges on cheaper rates.
  pullBack: [b(14.75), b(16)],
  sunset: [b(14.75), b(16.25)],
  night: [b(14.75), b(17.25)],
  moonrise: [b(16), b(17.5)],
  windows: [b(16.5), b(17.5)],
  headlights: b(17.25),
  toCar: [b(17.75), b(18.75)],
  charge: b(18), // label in
  flowNight: b(18),
  chargeOut: b(19.75),

  // E — the saving. A bolt from the charger opens onto it.
  bolt: [b(20), b(21)], // zoom into the charger's bolt
  reveal: [b(20.45), b(21)], // the bolt opens onto the saving
  reduce: b(21),
  count: [b(21.5), b(23)], // lands on the beat
  cards: [b(23.5), b(24), b(24.5)],
  saveOut: [b(26), b(26.5)],

  // F — the site's own loading screen: flash, logo, line. Then the ask.
  flash: [b(26.5), b(27.75)],
  mark: b(27), // bolt strikes
  bars: b(27.25),
  word1: b(27.5), // EVERYONE'S
  word2: b(28), // ENERGY
  tagline: b(28.5),
  line: [b(29), b(29.75)],
  cta: b(29.5),
  contact: b(30),
};
