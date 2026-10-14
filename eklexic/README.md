# Eklexic — 10-second motion reel

**Film:** [`out/eklexic-reel.mp4`](out/eklexic-reel.mp4) · 1920×1080 · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/eklexic-reel-poster.png`](out/eklexic-reel-poster.png)

A showreel-grade brand film for Eklexic, the sustainable jewelry brand
handcrafted in the USA, built from its site, https://www.eklexic.com/, and its
own product photography.

## The idea: bold, edgy, glamorous

The site describes the brand in one breath: _"eklexic jewelry is bold, edgy,
glamorous, over the top, and fabulous."_ The film takes three of those words
and gives each a piece. Each word is set huge in the site's uppercase Open
Sans, with the piece standing in front of it. Each piece is labelled as on the
site's product cards (name, price, colour swatches) and held long enough to
look at.

The camera moves from piece to piece like a carousel, with parallax: the word
slower, the piece faster. More of the collection rushes past on every move. It
ends on the site's own hero. The picture is timed on a 120 BPM grid (`src/js/timeline.js`).

| Time      | Shot          | What happens                                                                                                                                                                                                                                                                                                 |
| --------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 – 2.3   | **Bold**      | The **Thick Flat Ring** ($110.00 USD, gold · silver) lands with a turn in front of BOLD, its O hidden behind the ring. A sheen runs across the metal and the card arrives.                                                                                                                                   |
| 2.3 – 4.8 | **Edgy**      | The camera moves on as the 9.5mm Domed and Hammered Wide rings rush past. The **Esmé Bracelet** (from $95.00 USD) settles around the D of EDGY.                                                                                                                                                              |
| 4.8 – 7   | **Glamorous** | The Thin Luciana Bracelet, Elongated Link Chain and Hammered Domed Ring rush past. Then the **Triple Bloom Drop Earrings** ($495.00 USD) hang through GLAMOROUS.                                                                                                                                             |
| 7 – 10    | **Her**       | The Odessa and Bennett earrings and the Essential Letters rush past into the site's hero: the woman wearing the layered pearls, chains and coin pendant. _This Isn't Jewelry You Wear. It's Who You Become._ _Bold, handcrafted pieces made in the USA. For the woman who doesn't blend in._ **Become Her**. |

## What comes from the site

- **Products.** Eleven pieces from the site's own studio shots. `scripts/matte.py`
  cuts each from its white background into a transparent PNG:
  - Large white regions become clear, including a ring's hole.
  - The floor shadow is kept as a soft, translucent shadow.
  - The metal stays solid, highlights included.
- **Type.** The site's own fonts: Open Sans for its uppercase headings and
  Jost for its text (both SIL Open Font License). Lora sets the serif of its
  hero line.
- **Look.** Black type on warm neutrals, with gold and silver swatches. The
  logo is the site's SVG.
- **Hero.** The right side of the site's hero banner (its headline is baked
  into the left side, so it is set live here instead). The panel behind it
  continues the photograph's own wall colour, top to bottom.
- **Copy.** Every word, product name and price is the site's own.

`scripts/fetch-assets.sh` re-downloads all of it and re-cuts the products
(everything is committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run eklexic:build                           # soundtrack -> frames -> MP4
npm run stills -- --film eklexic 1.9 4.2 9.8    # review frames
npm run preview -- --film eklexic               # live preview in a browser
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root.

## Music

Unlike the other films, this one is cut to a real piece of music rather than
a synthesised cue. `audio/strut.mp3` is an instrumental generated with Google's
Lyria 3.5 from a written brief (quoted in `scripts/audio.py`). The brief asks
for a sultry, confident runway strut for a bold, edgy, glamorous jewelry brand:
a punchy kick, finger snaps, a sliding 808 bass, Rhodes chords, a wah-guitar
lick, strings and harp. It came back as a minute-long piece in F minor, ending
at 96 BPM.

At 96 BPM one bar lasts 2.5 s, exactly one product panel. The film plays the
track's last ten seconds as one continuous cut, with no edits:

- three bars of the groove, one for each piece, with each bar line (kick,
  snap, crash) landing in the middle of a move;
- the track's one-beat stop while the Triple Bloom earrings hold, and its
  fill into the last move;
- the final hit at 7.5 s as the hero slides in, ringing out under the
  headline and **Become Her**.

`scripts/audio.py` finds the bar lines in the track itself and lays the sound
design over it from the picture's cue sheet (`scripts/cues.mjs`): a glint,
tuned to the key, as each sheen runs; a swish for every move, with the
collection rushing past; a last glint on the button.
