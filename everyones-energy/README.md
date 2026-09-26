# Everyone's Energy — 15-second motion reel

**Film:** [`out/everyones-energy-reel.mp4`](out/everyones-energy-reel.mp4) · 1920×1080 · 60 fps · 15.0 s · stereo AAC  
**Poster:** [`out/everyones-energy-reel-poster.png`](out/everyones-energy-reel-poster.png)

A showreel-grade brand film for Everyone's Energy, built from the live site,
https://everyonesenergy.co.uk/. It uses the site's copy, its hero illustration
(part for part), its palette and type, and its own motion: the sunrise, sunset
and moonrise keyframes, the service pages' switch from day to night, and the
flash-and-logo loading screen.

## The idea

The site's service pages already tell a story in two seconds: the sun sets,
the moon rises, the house lights come on and the car's headlights glow. The
film stretches that into **one day of Everyone's Energy**. The sun makes the
power, the battery stores it, and the car charges at night on cheaper rates.
It is one continuous camera move across the site's own illustration, cut to a
128 BPM grid (32 beats).

| Time        | Shot        | What happens                                                                                                                                                                                                                                                                                                                                                                                             |
| ----------- | ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0.0 – 2.6   | **Sunrise** | A navy pre-dawn sky with the site's stars turns purple, then orange, then the hero's amber, as the site's sun rises with its rays turning. The site's line lands on the beat: _THE ENERGY / REVOLUTION / HAS BEGUN!_. Each letter of REVOLUTION revolves into place.                                                                                                                                     |
| 2.3 – 4.4   | **Build**   | The camera cranes down and the hero illustration assembles on the beat: the trees grow, the house pops up, four solar panels drop onto the roof in sixteenths, the ground-mount panel and batteries land, and the EV glides in to its charger.                                                                                                                                                           |
| 4.1 – 6.9   | **Day**     | A push to the roof (_SOLAR PV — PRODUCE YOUR OWN ENERGY._). Sunbeams strike the panels, which shimmer, and energy streams in the style of the site's squiggle lines carry it away. A whip pan to the batteries (_BATTERY STORAGE — STORE YOUR OWN ENERGY._): the site's green charge bars fill.                                                                                                          |
| 6.9 – 9.4   | **Night**   | The camera pulls back as the sun sets through a purple-orange dusk. The theme's `.night` rules take over fill by fill (navy walls, the dark trees and panels), the moon rises with its moonlight glow, the windows light up one by one, and the headlights come on. The batteries power the house, then the charger, and the car's charge meter fills (_EV CHARGING — FASTER CHARGING. CHEAPER RATES._). |
| 9.4 – 12.2  | **Saving**  | The camera dives into the charger's bolt, which opens as a bolt-shaped window onto the site's quote section. _REDUCE ELECTRICITY BILLS BY UP TO_ **80%\*** rolls up like a meter and lands on the beat, underlined with the site's hand-drawn stroke. The site's three featured cards (Save money / Earn income / Take control) pop in the way the site pops them.                                       |
| 12.2 – 15.0 | **Logo**    | The site's own loading screen, directed: the flash bolt pops and then flies into the logo's bolt. The logo builds from its own SVG parts (the bolt strikes, the E's three bars slide home, EVERYONE'S, then ENERGY, then _Taking the future by the hand_), the yellow loading line fills, and the site's button asks: **Get your free no-obligation quote**.                                             |

## What comes from the site

- **Illustration.** `src/art/` holds the home hero's inline SVGs (house,
  solar panel, batteries, car and charger, trees, three clouds), cut from the
  page as served. The film keys its animation off the site's own
  `data-name`s: `wall`, `building`, `windows`, `door`, `window-frame`,
  `solar`, `solar-panel`, `panel-bg`, `panel-color`, `headlight`, and the
  battery bars `#Rectangle_26…29`.
- **Day and night.** The night palette is the theme's `.night` rules
  (`custom.css`), applied fill by fill: walls `#141937`, lit windows
  `#DAD1AE`, headlights `#F3B112`, and the dark trees and panels
  `rgb(6.4 8 17.6)`. The night sky is the service pages' navy with
  `waves-bg.jpg` and `stars.svg`.
- **Motion.** The sun is the theme's `.the-sun`: a `#FFF69C` disc over
  `rays.png`, with the `sunshine` glow pulse, the `sunrise` and `sunset`
  keyframes and the moon's `moonrise`/`moonlight`. The clouds use its
  `cloudone` drift and its night rule (opacity 0.1, 35% to the left). The
  cards use the featured cards' scale-0 pop. The end card is the site's
  `.loading-screen`: its `flash` (scale 0 → 1 → 0), its `logo` overshoot and
  its yellow `loading-screen__line`.
- **Copy.** Every line is the site's: "The energy revolution has begun!",
  the service labels, "Produce/Store your own energy", "Faster charging" and
  "cheaper rates" (the EV page), "Reduce electricity bills by up to 80%\*"
  with the site's own footnote, the three cards, the strapline and the CTA,
  plus the phone number and URL.
- **Brand.** Poppins (the site's face, SIL Open Font License, in
  `src/fonts/`), sun yellow `#F3B112`, navy `#141937`, and the logo
  (`src/brand/ee-logo.svg`) exactly as the site serves it.

`scripts/fetch-assets.sh` re-downloads all of it. The artwork is committed,
so the script is only needed to refresh it.

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run energy:build                                # soundtrack -> frames -> MP4
npm run stills -- --film everyones-energy 4.9 13.5  # review frames
npm run preview -- --film everyones-energy          # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root. This folder
holds the film itself (`src/`) and its soundtrack (`scripts/audio.py`). The
soundtrack is synthesised from the same cue sheet (`scripts/cues.mjs`) as the
picture, so the headline hits, the pops, the light switches, the counter's
ratchet and the logo's zap each land on their frame.
