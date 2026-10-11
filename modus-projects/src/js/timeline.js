// The site's own hero line, then what it delivers, cut to a 120 BPM grid of
// 20 beats (10 s). Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM; // 0.5 s
export const DURATION = 20 * BEAT; // 10.0 s
export const b = (n) => n * BEAT;

export const T = {
  // A — "ANDERS DENKEN,": the site's striped deco sweeps in on black, then
  // its bars open like blinds onto the hero's sunset tower.
  bars: [b(0.1), b(1.5)], // bars land, one per 32nd
  title: [b(1), b(1.5)], // ANDERS · DENKEN,
  blinds: [b(2), b(3.25)],
  kicker: b(2.5), // transformatie · renovatie · nieuwbouw

  // B — "SLIMMER REALISEREN.": the hero's drone flight, on the film's clock,
  // from the tower, through a window, into a finished apartment.
  line2: b(3.5),
  flight: [b(3), b(8.5)],
  titleOut: b(6),

  // C — "Waar we goed in zijn.": the four services, pinned to the room.
  pins: [b(8.75), b(9.25), b(9.75), b(10.25)], // Sanitair · Tegels · Keukens · Vloeren
  pinsOut: b(12),

  // D — "Drie M's.": three panels wipe up over the room.
  panels: [b(12.25), b(12.75), b(13.25)],

  // E — the panels collapse into the logo's bars; MODUS; the line; the button.
  collapse: [b(15.5), b(16.5)],
  word: [b(16.25), b(17.25)],
  deco: b(16.75),
  tagline: b(17.25),
  cta: b(17.75),
  url: b(18),
};
