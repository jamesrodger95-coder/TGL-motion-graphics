# Motion reels

Three 1080p60 brand films, each rendered frame by frame from deterministic HTML/SVG with true motion blur and a procedurally synthesised soundtrack:

| Film                                              | Folder                                            | Output                                                                                             |
| ------------------------------------------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| **Grow Label**, AI revenue operations for clinics | repository root                                   | [`out/grow-label-reel.mp4`](out/grow-label-reel.mp4)                                               |
| **Bryant Dental**, "Humanity, augmented."         | [`bryant-dental/`](bryant-dental/README.md)       | [`bryant-dental/out/bryant-dental-reel.mp4`](bryant-dental/out/bryant-dental-reel.mp4)             |
| **Everyone's Energy**, one day of solar in 15 s   | [`everyones-energy/`](everyones-energy/README.md) | [`everyones-energy/out/everyones-energy-reel.mp4`](everyones-energy/out/everyones-energy-reel.mp4) |

The renderer (`scripts/render.mjs`, `--film <folder>`), stills, preview and encoder are shared.

---

## Grow Label — 12-second motion reel

**Film:** [`out/grow-label-reel.mp4`](out/grow-label-reel.mp4) · 1920×1080 · 60 fps · 12.0 s · stereo AAC  
**Poster:** [`out/grow-label-reel-poster.png`](out/grow-label-reel-poster.png)

A showreel-grade brand film for Grow Label: AI revenue operations for clinics,
told through the four modules. Every frame is built from the website's own
design system. That means its tokens, its typeface, its curves, its module
scene components and its logo, pulled from
[`the-grow-label-website-v2`](https://github.com/jamesrodger95-coder/the-grow-label-website-v2)
at `b4a6f4c`.

## The film, shot by shot

| Time        | Shot        | What happens                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 – 1.9   | **Hook**    | The site's hero line, _Recover the revenue / you already earned._, rises line by line. Below it, a week of practice events fills in. A sweep crosses the field (**Detect**), and 38 missed events turn purple.                                                                                                                                                                                                                                                                                 |
| 1.9 – 7.4   | **Modules** | One continuous camera move across four panels built from the site's `SceneFrame`. Each panel runs that module's real drawing: **Answer** (calls beyond the desk are caught), **Respond** (the five-minute window), **Retain** (at-risk slots confirm, a cancellation is backfilled) and **Reactivate** (records lift out of the back book). As the camera leaves the hook, the detected marks **Consolidate** onto the module rail. The camera then pulls back to show all four as one system. |
| 7.4 – 10.2  | **Account** | The site's dark punctuation section rises: _One number is a claim. Four numbers are an account._ The four value stages **Settle**, one hue at four densities. A dashed rule drops from Collected: _Money in the account_. The camera then pushes in on it.                                                                                                                                                                                                                                     |
| 10.2 – 12.0 | **Mark**    | The dark section closes as a hexagonal iris onto the logo's own outline, then shrinks to a point. The three cubes dock through the hexagon's edges along their isometric axes. The lockup, line, module row, primary action and URL build beneath.                                                                                                                                                                                                                                             |

The three verbs from `docs/MOTION_SYSTEM.md` (Detect, Consolidate, Settle)
are the film's structure, not decoration.

## Brand fidelity

- **Tokens.** `src/brand/tokens.css` is a verbatim copy of the site's
  `src/styles/tokens.css`. Colours, radii, shadows and type scale are read
  from it.
- **One typeface.** Schibsted Grotesk, variable 400–900 (self-hosted via
  `@fontsource-variable`).
- **One curve.** Element motion uses `--gl-ease` and `--gl-ease-exit`,
  lifted verbatim into `src/js/core.js`. The only addition is a symmetric
  camera curve for travel between shots.
- **Components.** The four module drawings in `src/js/modules.js` are ports
  of `src/components/modules/scene/*Scene.tsx`, with the same geometry, data
  and beat structure. Only the driver changes: the film's clock instead of
  scroll position. The `.mplot` styles are copied from `sections.css`.
- **The mark** is rebuilt as vector geometry from `public/logo-mark.png`: an
  isometric 2×2×2 block, a hexagon of circumradius R holding three cubes of
  edge R/2. The outline is 0.06R and the inner edges 0.041R, measured from
  the artwork, in the artwork's own purple and navy.
- **Restraint.** No gradients, no glow, no glassmorphism, per the design
  system's "Deliberately not" list. Purple appears only where value is
  detected, recovered or verified.

## Claims

Checked against `docs/CLAIMS_REGISTER.md`:

- Every data drawing carries the site's own caption ("Illustrative of the
  shape of …, not a measurement"), and every module panel is tagged
  _Illustrative_.
- The stage proportions (100 / 74 / 61 / 52) are the site's illustrative
  index values from `RecoveryField.tsx`. They are not currency and not a
  benchmark.
- No client names, client figures, logos, integrations or percentages appear.

## Build

Requirements: Node 20+, Python 3.11+, and Chromium via Playwright (set
`CHROMIUM_PATH` if it is not on Playwright's default path).

```bash
npm install
pip install -r requirements.txt
npm run build        # soundtrack -> frames -> MP4
```

| Script            | What it does                                                                                     |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| `npm run preview` | Serves the film. Open `…/src/index.html?play` to watch it live, or `?t=10.8` to freeze a moment. |
| `npm run stills`  | `npm run stills -- 2.4 7.5 11.9` renders review frames to `out/stills/`.                         |
| `npm run audio`   | Exports the cue sheet and synthesises `out/soundtrack.wav`.                                      |
| `npm run frames`  | Renders 720 frames with 16-sample motion blur to `out/frames/` (≈15 min on 4 cores).             |
| `npm run encode`  | Two-pass EBU R128 loudness (−16 LUFS, −1.5 dBTP), then H.264 High, BT.709, CRF 14, faststart.    |

## How it works

- **Deterministic frames.** `window.renderFrame(t)` puts the stage into the
  exact state for time `t`, from any previous state. Nothing reads the wall
  clock, so any frame can be rendered in any order, on any number of
  workers.
- **Real motion blur.** Each output frame averages up to 16 sub-frames
  across a 180° shutter, like a film camera. Held frames are detected and
  not over-sampled.
- **One clock for picture and sound.** `src/js/timeline.js` sets the cut
  points on a 138.46 BPM grid, so each module is exactly three beats.
  `scripts/cues.mjs` exports those cues, plus every detection event in the
  hook, to `scripts/audio.py`.
- **Procedural soundtrack.** Every sound is synthesised, with no samples: an
  F-major pad that ducks against a soft kick, a plucked eighth-note pulse, and
  sound design locked to picture. That includes detection ticks panned by
  position, whooshes peaking mid-move, a mallet per value stage, an iris
  riser, three cube landings and a resolving bell arpeggio on the wordmark.

## Layout

```
src/
  index.html, styles.css      stage and film-scale component styles
  brand/                      tokens.css and the logo artwork, from the website
  js/core.js                  easing (house curve), springs, keyframes, DOM helpers
  js/timeline.js              the clock: every cue, on the beat grid
  js/hook.js · track.js · modules.js · account.js · endcard.js   the four shots
scripts/
  render.mjs                  frames with motion blur (Playwright + sharp)
  audio.py                    procedural soundtrack
  encode.py                   loudness + H.264 mux
  stills.mjs · preview.mjs · cues.mjs
out/                          the film, its poster and the soundtrack
```
