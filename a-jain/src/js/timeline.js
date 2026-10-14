// A.Jain in 10 seconds, vertical (1080x1920), cut to its music
// (audio/radiant.mp3, 120.05 BPM; a beat is 0.5 s, a bar 2 s). The cut is
// five bars of the track's ending: a bar of groove, a bar's break (no drums),
// the hit, two bars of groove, and the final chord ringing out.
//   REVEAL    0-2   a Madeira Citrine pulls back into its ring; the mark, the name
//   SPECTRUM  2-4   the break: the stone turns through the colours, faster and faster
//   MOSAIC    4-8   the hit: the ring becomes one tile of both collections
//                   (Urban Chic, then Timeless), counter-scrolling
//   SIGNATURE 8-10  the final chord: three generations of gemstone craftsmanship
// Every cue in the picture and the soundtrack reads from here. The times are
// measured from the music: its downbeat lands at film 0.02 s.
export const FPS = 60;
export const BPM = 120.05;
export const BEAT = 60 / BPM;
export const DURATION = 10.0;
export const DOWN = 0.02;
/** Film time of beat n (0 = the first downbeat; bars start at 0, 4, 8, 12, 16). */
export const b = (n) => DOWN + n * BEAT;

export const T = {
  bars: [b(0), b(4), b(8), b(12), b(16)],
  // the reveal: the macro pulls back; the two flames, the name, the city
  flames: [b(1), b(1.5)],
  name: b(2),
  city: b(2.5),
  info: b(3),
  // the break: a new stone on each beat, then each eighth, then each sixteenth
  swaps: [b(4), b(5), b(6), b(6.5), b(7), b(7.25), b(7.5), b(7.75)],
  // the hit: the ring shrinks into the mosaic, the card arrives, its title turns
  hit: b(8),
  card: b(9),
  turn: b(12),
  // the card opens to fill the frame for the final chord
  open: b(15.25),
  final: b(16),
  line: b(16.5),
  craft: b(17),
  url: b(17.5),
  end: DURATION,
};
