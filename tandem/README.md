# Tandem — 8-second motion reel

**Film:** [`out/tandem-reel.mp4`](out/tandem-reel.mp4) · 1920×1080 · 60 fps · 8.0 s · stereo AAC  
**Poster:** [`out/tandem-reel-poster.png`](out/tandem-reel-poster.png)

A showreel-grade brand film for Tandem, the Chicago real estate developer,
builder and manager, built from its site, https://www.thetandemco.com/.

## The idea: two parties, one direction

Tandem's site is about partnership: _Building Common Ground_, _Built
Together_. Its own graphics already say it: four lines meet at a circle, and
its symbol is a T drawn like a pair of handlebars. The film takes those and
moves them. It is cut to a 120 BPM grid (`src/js/timeline.js`) in three
movements, each given room to land and hold.

| Time  | Shot               | What happens                                                                                                                                                                                                                                                                                                                                                        |
| ----- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 2 | **Common ground**  | The site's hero, on its off-white: _Real estate developers, builders and managers_ and _Doing **right** by those who trust us._ Its "lines" graphic draws in from the four corners and meets at a circle, where the handlebar T pops in turned and steers straight. The site's footer row sits beneath: Chicago, IL · Tandem © Since 1997 · Tampa, FL.              |
| 2 – 5 | **Built together** | The camera pushes through the circle onto a concrete pour beside Willis Tower. **BUILT** arrives from the left and **TOGETHER** from the right, and they lock into one edge-to-edge line, as the site sets its headlines. The site's ramp of bars rises and grows the finished building out of the site: Avra West Loop's roof deck at dusk, tagged as on the site. |
| 5 – 8 | **The mark**       | The words part the way they came. The site's arrow of lines sweeps the page clean. The lockup is built from its own parts: the tile opens from a line, the T steers straight, and the logotype writes on. Then _Building **Common** Ground._, the three capabilities, and the footer row again, with the lines returning to frame it.                               |

## What comes from the site

- **Artwork.** The symbol, logotype and lockup (`src/brand/`) and the "lines"
  graphic are the site's own SVGs. The ramp of bars and the arrow of lines are
  its "How we differ" motifs, rebuilt as animated masks.
- **Photography.** Two images from the site's project marquee
  (`src/img/`): a pour on site, and Avra West Loop's roof deck.
- **Colour.** Its tokens: white-0 #F7F7F0, black-100 #1E1E1C, secondary text
  #555551 and petrol-dark #8C8C85.
- **Type.** Its Söhne and Season Serif are commercial faces, so Inter Tight
  and Newsreader (both SIL Open Font License, in `src/fonts/`) stand in. The
  headline is fitted edge to edge with tight tracking, as on the site, and the
  serif carries the italic emphasis the site's hero uses.
- **Copy.** Every line is the site's own.

`scripts/fetch-assets.sh` re-downloads all of it (it is committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run tandem:build                           # soundtrack -> frames -> MP4
npm run stills -- --film tandem 1.7 3.3 7.9    # review frames
npm run preview -- --film tandem               # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. The
soundtrack (`scripts/audio.py`) is synthesised from the same cue sheet as the
picture (`scripts/cues.mjs`):

- a felt piano in D;
- pencil strokes as the lines draw;
- a bicycle freewheel as the handlebar T steers straight;
- a push through the circle and two weighted hits as the words lock;
- a rising arpeggio up the ramp of bars;
- a sweep for the arrow, and the lockup landing on a full chord.
