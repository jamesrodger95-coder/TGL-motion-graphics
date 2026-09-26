# Bryant Dental — 12-second motion reel

**Film:** [`out/bryant-dental-reel.mp4`](out/bryant-dental-reel.mp4) · 1920×1080 · 60 fps · 12.0 s · stereo AAC  
**Poster:** [`out/bryant-dental-reel-poster.png`](out/bryant-dental-reel-poster.png)

A showreel-grade brand film for Bryant Dental. It is built from the live site,
https://bryant.dental/: its copy, palette and product renders, its MagTech,
AI-fitting and workshop footage, and its own vector logo. The line it lands
on is theirs: _Humanity, augmented._

## The idea

The **bd** monogram is two lenses side by side, a pair of loupes. So the whole
film is shot through lenses, and ends by drawing the monogram out of them.

| Time       | Shot               | What happens                                                                                                                                                                                                                           |
| ---------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 – 2.3  | **Constellations** | A starfield. The Ignis light ignites (anamorphic flare), and the site's hero line comes into focus the way a loupe does: _Loupes that unlock new constellations of possibility._ Stars join into a constellation.                      |
| 2.3 – 3.7  | **MagniFlex**      | The light opens as an iris onto Bryant Dental's own MagTech render. Two barrels fly in and click home, retimed so each click lands on a beat with a glint. _MagniFlex_ appears with the site's 3.8x · 5.7x · 7.8x pills.               |
| 3.7 – 5.0  | **Magnify**        | The camera dives into the left barrel's glass, which becomes a loupe. It moves along the site's micro-copy at the three magnifications, reading _so clear… feel like… magic._ Each step snaps into focus with its pill lit.            |
| 5.0 – 7.5  | **Binocular**      | The loupe divides into a pair. Left lens: the AI fitting face scan ("We're technology first."). Right lens: the UK workshop, cut on the beat ("Handcrafted in the UK.").                                                               |
| 7.5 – 9.4  | **World**          | The pair merges and opens onto the Earth render from the site's stats panel. _Chosen by the best in the world._ The published figures (1bn teeth, 18k+ clinicians, 1.2k 5★ reviews, 69 countries) count up as the sun breaks the limb. |
| 9.4 – 12.0 | **The mark**       | The camera lifts into space. Stars glide into a constellation shaped like the **bd**, the monogram draws on over it with the site's blue glow, then _Bryant Dental._, _Humanity, augmented._ and the site's **Book demo** button.      |

## What comes from the site

- **Copy:** every line on screen is the site's own: the hero line, MagniFlex's
  three magnifications, "We're technology first", "AI fitting tool for a 99%
  first time loupe fit", "Handcrafted in the UK", "Chosen by the best in the
  world", the four stats, "Humanity, augmented." and the "Book demo" CTA.
- **Palette:** black ground, white type with grey (#868686) second clauses, the
  CTA blue #0071E3 and electric-blue light, all measured from computed styles.
- **Logo:** `src/brand/bd-logo.svg` is the inline SVG from the site
  (`.bd-icon-full`), copied verbatim. The monogram's stroked draw-on is built
  from its measured geometry, then hands over to the exact path. The full stop
  in "Bryant Dental." follows the lockup you supplied
  (`src/brand/logo-provided.png`).
- **Media:** `scripts/fetch-assets.sh` downloads the MagTech render, the
  face-scan and workshop films, and the Earth render from the site's own CDN,
  and cuts the exact frames used into `assets/`.

**Type:** the site sets Neue Haas Grotesk Display through an Adobe Fonts kit
licensed to bryant.dental, so it is not copied here. The film uses TeX Gyre
Heros, a free Helvetica-lineage face, instead. Drop the licensed font into
`src/fonts/` to match exactly (see `src/fonts/README.md`).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
bash bryant-dental/scripts/fetch-assets.sh    # only to re-fetch media; assets/ is committed
npm run bryant:build                          # soundtrack -> frames -> MP4
npm run stills -- --film bryant-dental 3.3 9.9 --out out/stills
```

The renderer, motion blur (16 sub-frames per frame, 180° shutter) and encoder
are shared with the Grow Label film at the repository root. This folder holds
the film itself (`src/`), its media (`assets/`) and its soundtrack
(`scripts/audio.py`, which reads the same cue sheet as the picture).
