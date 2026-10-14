# EDGE® — 10-second motion reel

**Film:** [`out/edge-spray-reel.mp4`](out/edge-spray-reel.mp4) · 1920×1080 · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/edge-spray-reel-poster.png`](out/edge-spray-reel-poster.png)

A showreel-grade brand film for EDGE®, the grip spray for the soles of court
shoes, built from its site, https://www.edgespray.com/, and its own product
photography.

## The idea: spray to play

"Spray to play" is printed on EDGE®'s own bottle, and the film is built on
that line. The spray is the transition: each shot from the bottle floods the
frame with the next scene's colour. The music is a hip-hop beat whose hook
stops for one beat at the end of every bar (a clap and a stab, with no bass),
then the 808 slams back in on the downbeat. Every scene lands on a slam, and
every stop beat winds up into the next one.

| Time        | Scene      | What happens                                                                                                                                                                                                                                                                                                                                                         |
| ----------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 0.62    | **Pickup** | On the first clap, the 2 oz **Grip Spray** stands in the dark. On the stab it fires, and the mist blooms until it floods the frame neon.                                                                                                                                                                                                                             |
| 0.62 – 3.04 | **Spray**  | SPRAY / TO / PLAY. slams in, one word per beat. The bottle rises beside it. On the stop beat it turns and fires back across the type, and the mist floods the frame black.                                                                                                                                                                                           |
| 3.04 – 5.46 | **Grip**   | The site's lab chart, rebuilt: the friction coefficient without EDGE®, then with it. The neon bar passes the old level and keeps climbing to **+25%**. Beside it is the site's photograph of a player spraying his sole, in neon duotone, with the claims tagged: lab-proven, self-drying, no residue, non-toxic & bio-based. The bar then swells to fill the frame. |
| 5.46 – 7.88 | **Range**  | One grip formula, three ways, one per beat. **Grip Spray** drops in on paper grey, **Grip Wipes** rises in on black, and the **Advanced Grip System** lands on neon, each with its use in a line. The columns then leave, up and down.                                                                                                                               |
| 7.88 – 10   | **EDGE®**  | The wordmark slams in with a shockwave. Its line decodes: _Non-slip traction spray for shoes_. Then the rating and the site appear, with a ticker of the sports it is made for.                                                                                                                                                                                      |

## What comes from the site

- **Products.** The site's transparent product shots: the 2 oz Grip Spray,
  the 30-count Grip Wipes and the Advanced Grip System (mat and travel bottle).
- **Photograph.** The court photograph from the site's hero: a player
  spraying the sole of his shoe.
- **Chart.** The site's own chart, rebuilt to animate: friction coefficient,
  without EDGE and with EDGE, +25%.
- **Wordmark.** The site's header logo is a bitmap wrapped in an SVG.
  `scripts/trace-logo.py` traces it into a vector, so it scales crisply.
- **Look.** Neon `#e2e319` on `#0a0a0a`, with mono capitals in ruled tags.
  The type is Saira and JetBrains Mono (SIL Open Font License). They stand in
  for the site's own licensed faces, Industry and PP Fraktion Mono.
- **Copy.** Every claim is the site's own: lab-proven to enhance shoe grip by
  up to 25%; self-drying; no stickiness or residue; 100% bio-based and
  non-toxic; the steps for each product; 4.8 out of 5 from 197 reviews; and
  the sports from its use-case list.

`scripts/fetch-assets.sh` re-downloads all of it and re-traces the logo
(everything is committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run edge-spray:build                           # soundtrack -> frames -> MP4
npm run stills -- --film edge-spray 1.9 4.4 6.9    # review frames
npm run preview -- --film edge-spray               # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. The spray
(`src/js/mist.js`) is a particle system written in closed form. Each droplet
and cloud's position is a function of time, so any frame or motion-blur
sub-frame can be drawn in any order.

## Music

`audio/bounce.mp3` is an instrumental generated with Google's Lyria 3.5 from a
written brief (quoted in `scripts/audio.py`): a bouncy, hard-knocking hip-hop
beat for a sneaker-grip brand, with street-basketball attitude. It came back as
a minute-long piece at 99.19 BPM, where a bar lasts 2.42 s. Its hook stops on
the last beat of every bar. The film plays the track's last ten seconds as one
continuous cut, with no edits:

- the clap of a stop beat opens the film;
- four bars carry the four scenes, each landing on the 808's return;
- the track's ending plays under the wordmark.

The picture's timeline (`src/js/timeline.js`) is measured from the music's
grid. `scripts/audio.py` finds the claps in the track and checks them against
it; they agree to within 2 ms.

Over the music, from the cue sheet (`scripts/cues.mjs`):

- the hiss of each shot from the bottle;
- a squeak on the court;
- a rush as the bar swells and as the columns leave;
- a thud as each product lands;
- a boom under the wordmark, with a high glow that holds after the music ends.
