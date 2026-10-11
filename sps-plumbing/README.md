# Sydney's Plumbing Specialists — 8-second motion reel

**Film:** [`out/sps-plumbing-reel.mp4`](out/sps-plumbing-reel.mp4) · 1920×1080 · 60 fps · 8.0 s · stereo AAC  
**Poster:** [`out/sps-plumbing-reel-poster.png`](out/sps-plumbing-reel-poster.png)

A showreel-grade brand film for Sydney's Plumbing Specialists (SPS), built
from the live site, https://spsplumbers.com.au/: its hero line, its three
promise cards, its rating, its phone number and its colours.

## The idea: follow the water

One water main runs through the whole film, and the camera follows it down.
It is cut to a 120 BPM grid (`src/js/timeline.js`) with three movements, each
given room to land and hold.

| Time      | Shot         | What happens                                                                                                                                                                                                                                                                                                                                           |
| --------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 – 1.7   | **Sydney**   | The site's hero line, _Plumber Sydney_ and _20 Dedicated Years of Plumbing Industry Knowledge_. A water main enters from the right and draws the skyline as it runs: Sydney Tower, the Opera House's shells and the Harbour Bridge's arch, with deck, hangers and pylons sketched in behind it like a blueprint, and the harbour reflecting it all.    |
| 1.7 – 4.6 | **Promises** | The main turns down, and the camera follows it to a manifold. Valves open over the site's three promise cards, which fill like tanks in the site's colours. Each card's SPS mark gets its ribbon (Express, Finance, Promise), with _100% Same Day Guarantee_, _0% Interest Plans_ and _$100 Cashback_.                                                 |
| 4.6 – 8   | **The drop** | The cards drain into one riser. A single drop forms at a tap, falls and lands on a waterline. The SPS letters appear as empty glass and fill up red, with a crown splash and ripples. Then _Sydney's Plumbing Specialists_, the rating (4.8 on Google, 400+ reviews, 24/7) and the site's two calls to action: **(02) 9072 0760** and **Book Online**. |

## What comes from the site

- **Colour.** The site's navy (#111622 / #161E30), SPS red (#FE5455 to
  #A3211B, the logo's gradient), blue (#1D88D0) and the Finance ribbon's
  green (#00A87B), from its stylesheets.
- **Type.** El Messiri, the site's hero serif (SIL Open Font License). The
  site's sans, Articulat CF, and its Helvetica Neue body are commercial, so
  Montserrat (OFL) stands in. Its Black weight matches the SPS wordmark, which
  is rebuilt as type so it stays sharp at full size.
- **Cards.** The site's Express / Finance / Promise cards: the white SPS mark
  with its angled ribbon, the spaced label, the promise and its line of copy.
- **Copy and claims.** Every claim is the site's own: 20 dedicated years, same
  day service when you call before 10:30am, 0% interest plans with 5–7 minute
  approval, $100 cashback, 4.8 Google rating, 400+ reviews, 24/7, the phone
  number. The bridge's 503 m arch span is the real one.

`scripts/fetch-assets.sh` re-downloads the fonts (they are committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run sps:build                                 # soundtrack -> frames -> MP4
npm run stills -- --film sps-plumbing 1.4 3.9 7.9  # review frames
npm run preview -- --film sps-plumbing            # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. The
soundtrack (`scripts/audio.py`) is synthesised from the same cue sheet as the
picture (`scripts/cues.mjs`): marimba and pad in E, running water panned with
the pipe, valve clanks, bubbling fills, the drain's gurgle, the drop's plop,
and the chord the logo fills on.
