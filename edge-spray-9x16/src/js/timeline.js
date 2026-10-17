// EDGE® in 10 seconds, vertical (1080x1920), to the brief: three beats, bold
// and punchy but every message readable. Snappy, controlled entrances with a
// small bounce at most; every piece of text holds at least 2 s.
//   0.0-3.0   SPRAY / TO / PLAY. (the bottle's own line), word by word
//   3.0-7.0   the 2 oz Grip Spray with the site's number: +25% grip, lab-proven
//   7.0-10.0  the wordmark, the site and the call to action: Shop now
// The music is the landscape film's track (../edge-spray/audio/bounce.mp3),
// cut so its 808 slams back in at 3.0 s as the bottle lands. Every cue in the
// picture and the soundtrack reads from here.
export const FPS = 60;
export const DURATION = 10.0;

export const T = {
  words: [0.06, 0.3, 0.56], // the last on the music's first slam
  headOut: [2.78, 0.22],
  bottle: 3.0, // the slam
  num: 3.18,
  grip: 3.36,
  tag: 3.56,
  heroOut: [6.78, 0.22],
  logo: 7.0,
  site: 7.24,
  cta: 7.7, // on the track's last hit
  end: DURATION,
};
