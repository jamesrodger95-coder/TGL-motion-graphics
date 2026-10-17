// Elaina Badro in 10 seconds, vertical (1080x1920), to the brief: two beats,
// calm and slow, nothing rushed. Only slow fades and a slow push-in, on
// sine ease-in-out curves of 1.2 to 1.5 s.
//   0.0-5.0   the Best Dressed Luxury Lipstick, centred on the brand's blush,
//             pushing in 4% over the beat; the logo fades in at 1.0 s
//   5.0-10.0  a cross-fade to one line, "You deserve luxury." (the site's
//             own), over the logo and the website
// Every cue in the picture and the soundtrack reads from here.
export const FPS = 60;
export const DURATION = 10.0;

export const T = {
  product: [0.0, 1.2], // fades up from the blush; fully visible from 1.2 s to 5.0 s
  logo: [1.0, 1.5],
  out: [5.0, 1.4], // the product fades away...
  line: [5.5, 1.2], // ...as the line fades in over 1.2 s; it holds from 6.7 s to the end
  site: [5.9, 1.3],
  end: DURATION,
};
