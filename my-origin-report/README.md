# My Origin Report — 24-second motion reel

**Film:** [`out/my-origin-report-reel.mp4`](out/my-origin-report-reel.mp4) · 1920×1080 · 60 fps · 24.0 s · stereo AAC  
**Vertical cut:** [`out/my-origin-report-reel-9x16.mp4`](out/my-origin-report-reel-9x16.mp4) · 1080×1920 (9:16, for Reels) · 60 fps · 24.0 s · the same soundtrack  
**Posters:** [`out/my-origin-report-reel-poster.png`](out/my-origin-report-reel-poster.png) · [`out/my-origin-report-reel-9x16-poster.png`](out/my-origin-report-reel-9x16-poster.png)

A showreel-grade brand film for My Origin Report, built from the live site,
https://www.myoriginreport.com/. It uses the site's copy, type, palette and
components, its own sample report (Sullivan), and its hero's particle
animation, ported from the site's bundle.

## The idea

The site sells one thing: the story behind a surname, from nothing but the
name. So the film follows one surname, Sullivan (the site's sample report),
from the moment it is typed to the finished report. It ends on the site's own
hero animation, where a DNA helix turns into the My Origin Report mark: _No DNA
sample. Just your surname._ The story is cut to a 24-beat grid and played at
half speed (`SLOW = 2` in `src/js/timeline.js`), so every move has room to
breathe. The score runs at 120 BPM, so each picture beat spans two beats of
music and every cue still lands on the grid.

| Time        | Shot              | What happens                                                                                                                                                                                                                                                                                                                              |
| ----------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 5       | **The name**      | The site's hero line, _Explore the History Behind_, with its gold _Your Surname_ slot. The slot rolls through the names the site's input cycles (Smith, Patel, O'Brien, Garcia, Nguyen) on sixteenths and lands on _Sullivan_ with a gold pen stroke. The name drops into the site's input, and a pointer clicks **Get My Report - $15**. |
| 5 – 6.6     | **Researching**   | The input grows into the site's "See It In Action" demo: its tabs (✓ Enter Surname · 2. Researching · 3. Your Report), _Researching heritage for "Sullivan"..._ and its gold progress bar.                                                                                                                                                |
| 6.2 – 11    | **The centuries** | The page tips back in 3D into the site's "What We Research" timeline. The camera runs down it through the site's six record collections (1500s Parish & Church Records to Present), faster as it nears the present. Its nodes pop and ring as on the site, and it lands flat on the timeline's seal.                                      |
| 10.2 – 14.6 | **The origin**    | The seal opens as an iris onto a navy world: the site's own world outline, traced in gold and revealed outward from County Cork. The origin (_Sullivan, "descendant of the dark-eyed one"_, first recorded in County Cork) beats like a heart. Routes arc to Boston, New York, Philadelphia, London, Chicago, San Francisco and Sydney.   |
| 14.6 – 18.6 | **The report**    | The map shrinks into page 2 of the site's _Illustrative Report Preview_. Its five pages fan out, then gather under a cover with the site's decorative heraldic art rising on it.                                                                                                                                                          |
| 18.6 – 24   | **The mark**      | The report turns to dust, the dust becomes the site's particle DNA helix (_No DNA sample._ / _Just your surname._), and the helix flies into the logo exactly as it does on the site. Then _My Origin Report_, _It's time you knew their story._ and **Get My Report - $15**.                                                             |

## The vertical cut (9:16)

[`out/my-origin-report-reel-9x16.mp4`](out/my-origin-report-reel-9x16.mp4) is
the same film composed for a 1080×1920 frame, for Instagram Reels, YouTube
Shorts and TikTok. Every cue, curve and sound is shared with the 16:9 film;
only the layout changes. Each shot reads its frame from `src/js/layout.js`
(`?format=9x16`), and the 16:9 film still renders pixel for pixel as before.

| Shot              | In 9:16                                                                                                                                                                                                                                                    |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The name**      | The hero line sets on two lines (_Explore the / History Behind_) over the gold slot, which sits at the centre of the frame. The form stacks as it does on a phone, with the button under the input.                                                        |
| **Researching**   | The demo card narrows to 920 px and grows from the input, as in 16:9.                                                                                                                                                                                      |
| **The centuries** | The same zig-zag road down the centre. Its text columns narrow to 400 px, so the record titles wrap. The taller frame can see the first node from the start, so it comes in with the line.                                                                 |
| **The origin**    | The frame sees 9/16 as much map across, so the camera pulls out further. It lands on the same 16:9 view, which becomes page 2's picture as a crop closes onto it. The origin text sits in the lower third.                                                 |
| **The report**    | The pages and the cover are 1.2× larger, and the fan is pitched closer, so page 2's neighbours stay in view either side.                                                                                                                                   |
| **The mark**      | The helix stands under _No DNA sample. / Just your surname._, and the logo forms above the wordmark, line, button and chip, stacked. The end card and the origin text sit clear of the bottom of the frame, where Reels lays its caption over the picture. |

## What comes from the site

- **Particles.** `src/js/dust.js` ports the hero canvas from the site's
  bundle with the same code: its seeded generator (mulberry32, seed 1897),
  helix strands and rungs, perspective, spin-up and jitter, the cubic path each
  particle flies, the logo's three arcs (r 44/34/22, sweeps 304.5°/302.7°/299°)
  and centre dot, its blue-grey to gold colour ramp (the navy "dark" variant)
  and its glow. The only changes: film time drives it instead of scroll
  progress, it uses 1,100 particles instead of 520, and a dust-to-helix lead-in
  is added.
- **Components.** The hero line and its gold surname slot, the input
  (#D4C5A9 border, gold on focus) and gradient button (#C9973F to #B8860B), the
  "See It In Action" demo (tabs, bar, caption), the "What We Research"
  timeline (its copy, its inline icons, its node, ring and route motion) and
  the report page cards (paper texture, gold rules, copy) are rebuilt from the
  site's markup and styles.
- **Motion.** The site's own curves from its stylesheet: the node and chip
  overshoot `cubic-bezier(.34,1.56,.64,1)`, the route `cubic-bezier(.45,0,.2,1)`,
  the rise `cubic-bezier(.2,.8,.2,1)`, the 1 s step-end cursor, the ring
  pulse (scale 2.1, fading from 0.55), and the crest's float.
- **Brand.** Cormorant Garamond and Plus Jakarta Sans (both SIL Open Font
  License, in `src/fonts/`), parchment #FDFBF7, navy #1A2744, the gold ramp,
  and the logo mark (`src/brand/logo-mark.svg`, the site's nav SVG).
- **Copy.** Every line is the site's own, including its sample Sullivan report
  (page 1 names the Gaelic original by its meaning rather than its spelling)
  and its labels "Illustrative Report Preview", "Illustrative surname-history
  preview" and "Decorative heraldic art". The routes follow that sample
  report's migration text. Like the site, the film shows them as a surname's
  historical context, not one family's verified journey.
- **Map.** `src/brand/world-outline.svg` is the site's map (its `.map-bg`
  texture at 5% navy on the parchment). For the navy scenes it is traced to
  hairlines in `src/img/map-lines.png`, so it stays fine when the camera is
  close.

`scripts/fetch-assets.sh` re-downloads all of it and rebuilds the traced map.
The artwork is committed, so the script is only needed to refresh it.

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run origin:build                                 # soundtrack -> frames -> MP4
npm run origin:build:9x16                            # the vertical cut (frames-9x16 -> MP4)
npm run stills -- --film my-origin-report 3.2 23.8   # review frames (real seconds)
npm run stills -- --film my-origin-report --format 9x16 3.2 23.8
npm run preview -- --film my-origin-report           # live preview (add ?format=9x16)
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. The soundtrack
(`scripts/audio.py`) is synthesised from the same cue sheet as the picture
(`scripts/cues.mjs`), so the reel's ticks, the typing, the click, the drum
under each century, the heartbeat at the origin, each route's landing, the
page riffle and the final chord each land on their frame.
