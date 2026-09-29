// One surname's story, cut to a 120 BPM grid of 24 beats. The cues below are
// in story time (12 s); the film plays the story at half speed, so it runs
// 24 s and every story beat lasts two beats of the 120 BPM soundtrack.
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s of story time
export const STORY = 24 * BEAT; // 12.0 s of story time
export const SLOW = 2; // real seconds per story second
export const DURATION = STORY * SLOW; // 24.0 s: the film's length
export const b = (n) => n * BEAT;

export const T = {
  // A — the name. The site's hero line, its gold slot rolling through the
  // surnames its input cycles, landing on its sample report's name.
  head: b(0.25),
  slotIn: b(0.75),
  roll: [b(1.5), b(1.75), b(2), b(2.25), b(2.5), b(3)], // Smith … Sullivan
  toInput: [b(3.5), b(4.25)],
  button: b(4),
  press: b(4.75),

  // B — the site's "See It In Action" demo: researching, with its gold bar.
  card: [b(5), b(5.6)],
  bar: [b(5.4), b(6.4)],

  // C — "What We Research": the page tips back into a road through history,
  // the centuries coming faster as it nears the present.
  tilt: [b(6.25), b(7.25)],
  nodes: [b(7), b(7.625), b(8.25), b(8.75), b(9.25), b(9.625)],
  seal: b(10),
  iris: [b(10.25), b(11)],

  // D — the origin and the migration routes, on the site's world map.
  origin: b(11),
  originText: b(11.5),
  originOut: b(13.75),
  arcs: [b(12.25), b(12.5), b(12.75), b(13), b(13.25), b(13.5), b(13.75)],

  // E — the report: the map becomes a page, the pages fan, the crest rises.
  toPage: [b(14.5), b(15.5)],
  fan: [b(15.25), b(16.5)],
  cover: [b(16.5), b(17.25)],
  crest: b(17),
  shine: b(17.75),

  // F — the site's hero particles: the report turns to dust, the dust to the
  // DNA helix, and the helix into the logo.
  dissolve: [b(18.5), b(19.5)],
  noDna: b(19.5),
  surname: b(20.5),
  spin: [b(19.75), b(20.5)], // the site's progress 0 -> 0.3
  morph: [b(20.5), b(22.25)], // 0.3 -> 1
  wordmark: b(22),
  tagline: b(22.5),
  cta: b(23),
};
