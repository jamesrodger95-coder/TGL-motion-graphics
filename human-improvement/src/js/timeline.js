// Human Improvement in 10 seconds, vertical (1080x1920), to the brief: three
// beats, clean and confident, at a medium pace. Every move is a smooth
// ease-in-out of about 0.8 s; nothing pops or springs.
//   0.0-3.0   "Unlock Cellular Health" (the site's own), sliding gently up
//   3.0-7.0   the MSM Cellular Detox pouch, large, pushing slowly in, with
//             one benefit: "Detox your cells with just one scoop."
//   7.0-10.0  the logo, the guarantee and the website, centred
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const DURATION = 10.0;
export const BPM = 120; // the score's tempo: the beats change on its beats

export const T = {
  head: [0.2, 0.8], // in: slide up and fade; fully readable from 1.0 s
  headOut: [2.3, 0.8], // out: on screen 2.9 s in all
  pouch: [3.0, 0.8],
  benefit: [3.2, 0.8], // fully readable from 4.0 s ...
  pouchOut: [6.5, 0.6], // ... to 6.5 s (2.5 s); gone as the logo begins
  logo: [7.0, 0.8],
  trust: [7.2, 0.8],
  site: [7.35, 0.8], // all held from 8.15 s to the end
  end: DURATION,
};
