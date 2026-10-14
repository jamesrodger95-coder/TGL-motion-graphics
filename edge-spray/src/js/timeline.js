// EDGE® in 10 seconds, cut to its music (audio/bounce.mp3, 99.19 BPM; a beat
// is 0.605 s, a bar 2.42 s). The track's hook stops for the last beat of every
// bar (a clap, a stab, no bass) and the 808 slams back in on the downbeat.
// So every scene lands on a slam, and every stop beat is a wind-up into the
// next one.
//   pickup     0.0-0.62  the Grip Spray fires across the dark
//   SPRAY      0.62-3.04 "Spray to play." (the bottle's own line)
//   GRIP       3.04-5.46 the lab result: +25% friction, with EDGE
//   PRODUCTS   5.46-7.88 one grip formula, three ways: spray, wipes, mat
//   EDGE       7.88-10   the wordmark, the line, the sports it's for
// Every cue in the picture and the soundtrack reads from here. The times are
// measured from the music: the clap on the first stop beat is at film 0.02 s.
export const FPS = 60;
export const BPM = 99.19;
export const BEAT = 60 / BPM;
export const DURATION = 10.0;
export const DOWN = 0.02 + BEAT; // the first downbeat
/** Film time of beat n (0 = the first downbeat; bars start at 0, 4, 8, 12). */
export const b = (n) => DOWN + n * BEAT;

export const T = {
  // each bar's slam (808 back in) and its stop beat (clap, stab, no bass)
  slam: [b(0), b(4), b(8), b(12)],
  stop: [b(-1), b(3), b(7), b(11)],
  // the stab half a beat into each stop: the shot, the second shot, the bar swelling, the columns leaving
  stab: [b(-0.5), b(3.5), b(7.5), b(11.5)],
  // the pickup: the bottle appears on the clap, fires on the stab
  fire: b(-0.5),
  // SPRAY / TO / PLAY. on the first three beats
  words: [b(0), b(1), b(2)],
  // the result: the bar without EDGE, the bar with it, then +25% and its tags
  without: b(4),
  with: b(5),
  result: b(6),
  // the three products, one per beat
  products: [b(8), b(9), b(10)],
  // the end: wordmark, line, rating and site
  logo: b(12),
  line: b(12.5),
  foot: b(13),
  musicEnd: 8.96, // the track's last note (it rings out to about 9.6 s)
  end: DURATION,
};
