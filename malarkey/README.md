# Malarkey Roofing Products — 10-second motion reel

**Film:** [`out/malarkey-reel.mp4`](out/malarkey-reel.mp4) · 1920×1080 · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/malarkey-reel-poster.png`](out/malarkey-reel-poster.png)

A showreel-grade brand film for Malarkey Roofing Products, built from its
site, https://www.malarkeyroofing.com/. A roof goes on, a storm hits it, and
it holds: _When It Matters®_.

The roof is real geometry, not footage. `src/js/roof.js` renders one side of
a gable roof (12 m wide, 30° pitch) over a house, in perspective, as a pure
function of time:

- **The deck and underlayment.** Plywood, with the underlayment unrolling
  across it strip by strip.
- **The shingles.** 22 courses of architectural (laminated) shingles: random
  tab widths, a dark base layer in the slots, the laminate's shadow line, a
  granule texture mapped onto each tab, and a sealant strip.
- **The install.** Every tab drops, tips and slaps down with its own shadow.
  Each is then nailed in The Zone, the band the next course covers.
- **The ridge.** Ridge caps run along the top.
- **The storm.** Rain splashes on the roof, and about 190 hailstones strike it
  and bounce off, under lightning and a wet sheen. Then the sun breaks and
  sends a glint across it.

| Time      | Shot          | What happens                                                                                                                                                                                                                                                                                                                                                     |
| --------- | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 3.5   | **The build** | Low and raking along the eave: the underlayment rolls out over the deck, and the first courses land and are nailed. The Zone® is lit in Malarkey orange: _up to 2X wider nailing area_. The camera pulls back to the house as the courses climb, and the ridge caps run. _Made Better, Lasts Longer, More Sustainable · Shingles Built To Do More._              |
| 3.5 – 6.7 | **The storm** | The sky turns, and rain and hail hammer the finished roof under two bolts of lightning. A big hailstone strikes and bounces off. The site's own line: _When It Matters® · We've Gotcha Covered_. Then two of its numbers: up to **Class 4** hail impact rating, and **2X** the rain seals.                                                                       |
| 6.5 – 10  | **The sun**   | The storm clears to a warm evening, and a glint runs across the wet roof. The camera moves aside for the site's slanted panel in Malarkey green and black: the logo, _Sustainable, High-Performance Roofing Shingles_, and what every roof keeps out of landfill (about 5 tires, 3.2K plastic bags, and 2 trees' worth of cleaner air), then _When It Matters®_. |

## What comes from the site

- **Brand.** Its logo SVGs (`src/brand/`), green #009845, accent orange
  #D28122, black and white, and the slanted dividers its pages are cut with.
- **Type.** Its Geogrotesque is commercial, so Barlow and Barlow Condensed
  (SIL Open Font License, in `src/fonts/`) stand in.
- **Copy and claims.** Every line and number is the site's own:
  - When It Matters®, We've Gotcha Covered, and Shingles Built To Do More.
  - Up to Class 4 impact, 2X rain seals, and up to 2X wider nailing area.
  - The per-roof sustainability figures, with the site's footnote (a standard
    30-square roof of Vista shingles).
- **The house.** A Malarkey-green front door.

`scripts/fetch-assets.sh` re-downloads the logos and fonts (they are committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run malarkey:build                            # soundtrack -> frames -> MP4
npm run stills -- --film malarkey 1.1 5.0 9.8     # review frames
npm run preview -- --film malarkey                # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. The
soundtrack (`scripts/audio.py`) is synthesised from the same cue sheet as the
picture (`scripts/cues.mjs`):

- **The build:** a nail gun fires with every course, so the install is the
  groove, and the ridge caps run up a riff.
- **The storm:** rain, thunder on each bolt, and hail ticking off the roof.
- **The end:** the sun breaks on a C-major arpeggio, and the panel lands with
  the mark.
