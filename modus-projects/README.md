# Modus Projects — 10-second motion reel

**Film:** [`out/modus-projects-reel.mp4`](out/modus-projects-reel.mp4) · 1920×1080 · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/modus-projects-reel-poster.png`](out/modus-projects-reel-poster.png)

A showreel-grade brand film for Modus Projects, built from the live site,
https://www.modusprojects.nl/. It uses the site's hero film (its 121-frame
scroll sequence), its logo, its striped deco and card graphics, its palette
and its copy.

## The idea

The site's hero says it in four words: _Anders denken, slimmer realiseren._
(Think differently, deliver smarter.) The film takes the hero's own drone
flight, from a sunset tower through a window into a finished apartment, and
drives it with the film's clock instead of the scroll. Around it, the site's
signature vertical stripes do the transitions: they open the film, they
become the three M's, and they close it as the bars of the logo's M. Every
move is cut to a 120 BPM grid (20 beats).

| Time       | Shot                     | What happens                                                                                                                                                                                                                                                                                               |
| ---------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 – 1.6  | **Anders denken,**       | On black, the site's peach stripes land one per 32nd, rising from the floor. _ANDERS DENKEN,_ rises letter by letter. The stripes then widen like blinds, right to left, into tiles of the sunset tower until it fills the frame.                                                                          |
| 1.5 – 4.4  | **Slimmer realiseren.**  | _SLIMMER REALISEREN._ follows, over a typed kicker (_Transformatie · Renovatie · Nieuwbouw_). The drone flight plays: towards the tower, along the façade, a punch-in through a window (where the flight is fastest), and a glide into the living room.                                                    |
| 4.4 – 6.1  | **Waar we goed in zijn** | The four services, in the site's order, are pinned to the room: **01 Sanitair** on the vanity, **02 Tegels** on the bathroom floor, **03 Keukens** on the island, **04 Vloeren** on the herringbone. Each dot lands, a ring pulses, a line draws and a label wipes on.                                     |
| 6.1 – 7.8  | **Drie M's**             | The site's three cards wipe up over the room, a third of the frame each, with their own graphics: **Meerwaarde**, **Momentum**, **Maximale zekerheid**. Their kickers read across: _Drie M's. Één standaard._                                                                                              |
| 7.8 – 10.0 | **MODUS**                | The cards squeeze sideways into white stripes, then drop to become the logo's last three bars, while the first two grow in. M O D U S print out of the bars, the hero line settles beneath, the site's _Bespreek jouw project_ button pops, and the peach deco rises at the edge, as in the site's footer. |

## What comes from the site

- **Hero film.** `src/seq/` is the home hero's image sequence
  (`cdn.overflow.nl/modus-sequence-v2`, 121 frames at 1440×1440), exactly as
  served. The site scrubs it with the scroll; the film plays it on its own
  clock, cross-fading between neighbouring frames, and pins the services to
  the last frame's real fittings.
- **Logo.** `src/brand/logo.svg` is the footer's inline SVG (five bars that
  widen into the M's stem, then M O D U S), as is the peach deco
  (`stripes.svg`) and the three M's cards' graphics (`m1.svg`–`m3.svg`).
- **Palette.** The site's Webflow tokens: orange `#ffa574`, dark grey
  `#3b3940`, mid grey `#848c8f`, light grey `#dbe2e5`, and its near black
  `#0e0a0a`.
- **Type.** The site sets headings in OT Jubilee Silver and labels in Aeonik
  Mono, both licensed. The film uses their closest open relatives, Jost
  (geometric, Futura-like caps) and DM Mono (SIL Open Font License, in
  `src/fonts/`).
- **Copy.** Every line is the site's: the hero line, its project types, the
  four services, the three M's and _Drie M's. Één standaard._, the button and
  the address.

`scripts/fetch-assets.sh` re-downloads all of it. The artwork is committed,
so the script is only needed to refresh it.

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run modus:build                                # soundtrack -> frames -> MP4
npm run stills -- --film modus-projects 2.8 9.9    # review frames
npm run preview -- --film modus-projects           # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. Headless
Chromium cannot hold all 121 decoded frames at once, so `window.renderFrame`
is async here: it decodes the two frames each moment needs, keeping a small
cache (`js/seq.js`).

## Soundtrack

Synthesised from the same cue sheet as the picture (`scripts/cues.mjs`),
which reads the flight's timing from `src/js/seq.js`, so the biggest whoosh
peaks on the exact frame the camera passes through the window. In D minor
resolving to F at 120 BPM: ten glass plucks climb as the stripes land, a riser
opens the blinds, a deep kick, ticking hat and sub bass carry the flight, each
service pin chimes a step higher, the three cards land as low hits on the
chord's tones, and the squeeze into the logo swells into a hit, with the
letters ticking out and the button landing on an open chord.

## Layout

```
src/
  index.html, styles.css   the stage and its styles
  seq/                     the site's hero sequence (121 frames)
  brand/                   logo, deco and card graphics, from the page's inline SVG
  fonts/                   Jost, DM Mono (OFL)
  js/timeline.js           the clock: every cue, on the beat grid
  js/seq.js                the sequence, the camera and the opening stripes
  js/type.js · pins.js · panels.js · end.js   the title, the services, the M's, the mark
  js/main.js               the compositor
scripts/
  cues.mjs · audio.py      cue sheet and procedural soundtrack
  fetch-assets.sh          re-downloads the site's artwork
out/                       the film, its poster and the soundtrack
```
