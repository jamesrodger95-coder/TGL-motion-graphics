# Bollano Plumbers — 10-second motion reel

**Film:** [`out/bollano-plumbers-reel.mp4`](out/bollano-plumbers-reel.mp4) · 1920×1080 · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/bollano-plumbers-reel-poster.png`](out/bollano-plumbers-reel-poster.png)

A showreel-grade brand film for Bollano Plumbers, built from the live site,
https://www.bollanoplumbers.co.uk/. It uses the site's own hero illustration
(part for part), its logo (cut into its parts), its Gas Safe badge, its
palette, its two typefaces and its copy.

## The idea

The site's about copy ends on one line: _"when you think plumbing and
heating, think Bollano Plumbers"_. The film is that sentence, one phrase per
shot, joined by a single drop of water that becomes everything else. It is
one camera move, cut to a 120 BPM grid (20 beats), with every move landing on
the beat and a hold at the end long enough to read the number.

| Time       | Shot                 | What happens                                                                                                                                                                                                                                                                                                                                                                       |
| ---------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 – 2.3  | **When you think**   | One drop (the site's drop icon, redrawn) falls, stretching as it speeds up, and lands on the beat: it squashes, throws up a crown of droplets and a jet that pinches off a bead, and rings out in ripples. _When you think_ rises word by word. The outer ripple then stands up into a circle and slides right.                                                                    |
| 2.3 – 4.3  | **plumbing**         | That circle is the one behind the site's hero. The site's pale curve sweeps in, _plumbing_ rises as an outline and fills with water, and the hero illustration assembles: the bath drops and squashes, the taps pop and turn, the three hoses pour down (cold, mains, hot), and the plumber slides in to work. The site's red line, _Professional, Responsive, Trusted_, wipes on. |
| 4.3 – 6.5  | **& heating,**       | The hot hose runs on as a pipe along the floor and the camera whips after its head to a radiator, drawn in the illustration's own greys. The hot water arrives (a burner lights), the fins heat one by one, the thermostat climbs, heat rises off the top, and the site's Gas Safe registration card springs up.                                                                   |
| 6.5 – 7.5  | **think**            | The logo's own waves (navy, white and two red stripes, the A of BOLLANO) rise as water and flood the frame navy. _think_ rises out of it.                                                                                                                                                                                                                                          |
| 7.5 – 10.0 | **Bollano Plumbers** | The logo builds from its parts: the A's peak rises from a water line, its red stripes sweep in, BOLL and NO rise outward from the A, the frame draws round from the top, PLUMBERS tracks in. The site's red call button pops with the number, then the address; a sheen crosses the mark, and the card holds.                                                                      |

## What comes from the site

- **Illustration.** `src/art/plumber.svg` is the home hero's Slider
  Revolution layer, exactly as served. The film animates its own groups (the
  bath, the spout and taps with their `.turn` handles, the three hoses and the
  plumber) and runs the illustration's own idle loop (its `head` keyframe:
  0 → 1°, 1 s, alternate, skipping `.nomove`) on the film's clock.
- **Logo.** `src/brand/logo-reverse.png` is the site's reversed logo
  (2167×725). `scripts/fetch-assets.sh` cuts it into 18 parts (the frame, the
  letters of BOLLANO and PLUMBERS, the A's white peak and its two red
  stripes) by connected components, so the end card builds the real artwork.
  The frame draws on through a mask along its centre line.
- **Badge.** `src/brand/gas-safe.png` is the site's Gas Safe registration
  image (Bollano Plumbers Ltd, registration 572050).
- **Palette.** Navy `#003764`, red `#e2211c`, the hero's pale curve
  `#e6eef9`/`#eef6fb`, the drop icon's `#84dbff`, and the illustration's
  fills (hoses `#3d5ba9`/`#aadcf7`/`#b11f24`, steel `#b4c1d1`/`#8495b0`).
- **Type.** DM Serif Display and Poppins, the site's two faces (SIL Open
  Font License, in `src/fonts/`).
- **Copy.** Every line is the site's: the sentence, _Professional,
  Responsive, Trusted_, the phone number `020 8402 3959` and the address.

`scripts/fetch-assets.sh` re-downloads all of it. The artwork is committed,
so the script is only needed to refresh it.

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run bollano:build                                # soundtrack -> frames -> MP4
npm run stills -- --film bollano-plumbers 3.6 9.9    # review frames
npm run preview -- --film bollano-plumbers           # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. This folder
holds the film itself (`src/`) and its soundtrack (`scripts/audio.py`).

## Soundtrack

Synthesised from the same cue sheet as the picture (`scripts/cues.mjs`), so
every hit lands on its frame. `cues.mjs` reads the splash's physics from
`src/js/drop.js`, so each droplet of the crown plinks when, and where, the
picture lands it. Over a 120 BPM groove in A major (a water-marimba figure,
soft kick and clap), the bath clanks, the taps pop and squeak, the hoses run,
the whip pan rips across the stereo field, the burner lights and the radiator
ticks fin by fin, the flood surges, and the logo resolves on a full chord with
a bell arpeggio and the call button's stab.

## Layout

```
src/
  index.html, styles.css   the stage and its styles
  art/plumber.svg          the site's hero illustration
  brand/                   the reversed logo, its parts (logo/, logo.json), the Gas Safe badge
  fonts/                   DM Serif Display, Poppins (OFL)
  js/timeline.js           the clock: every cue, on the beat grid
  js/drop.js · hero.js · heat.js · flood.js · end.js   the five shots
  js/main.js               the camera and the compositor
scripts/
  cues.mjs · audio.py      cue sheet and procedural soundtrack
  fetch-assets.sh          re-downloads the site's artwork and cuts the logo
out/                       the film, its poster and the soundtrack
```
