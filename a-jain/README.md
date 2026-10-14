# A.Jain — 10-second motion reel (9:16)

**Film:** [`out/a-jain-reel-9x16.mp4`](out/a-jain-reel-9x16.mp4) · 1080×1920 (vertical, for Reels) · 60 fps · 10.0 s · stereo AAC  
**Poster:** [`out/a-jain-reel-9x16-poster.png`](out/a-jain-reel-9x16-poster.png)

A showreel-grade brand film for A.Jain, the New York fine-jewelry house with
three generations of gemstone craftsmanship. It is built from its store,
https://a-jain.com/, and its own studio photography.

## The idea: thirteen stones, one ring

The **18k Gold Urban Chic Ring with Diamonds** comes in thirteen stones, and
the studio shot every one of them the same way. Laid over each other, the
photographs line up to the pixel, so the film can keep the ring still and
change only its stone. That is the centre of the film. The camera never cuts:

| Time   | Scene         | What happens                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 2  | **Reveal**    | A Madeira Citrine fills the frame, its facets glinting, and pulls back into its ring. The two flames of the mark rise, then the name, then _New York City_. The stone's name and price ($6,250) settle under the ring, with a row of all thirteen stones.                                                                                                                                                                                |
| 2 – 4  | **Spectrum**  | On the music's break the stone changes in place: Rubellite, Peridot, London Blue Topaz on the beats, then Amethyst, Green Tourmaline, Aquamarine, Rhodolite and Swiss Blue Topaz, faster and faster. Its name rolls, its price and the palette follow, and the ground takes its colour.                                                                                                                                                  |
| 4 – 8  | **Mosaic**    | On the hit the ring and its colour shrink into one tile of a mosaic of 27 pieces from both collections: studs, pendants, rings and bracelets, each on a wash of its stone's colour, the columns counter-scrolling. A card names the collection in the site's own words: _Urban Chic_ ("Alive with the color, vibrancy and diversity of the urban jungle"), then _Timeless_ ("Fortitude, patience, timeless style and enduring quality"). |
| 8 – 10 | **Signature** | The card opens to fill the frame for the final chord. The mark (a band of gold crosses the flames), the name, _Three generations of gemstone craftsmanship._, _Handcrafted in the USA · Ethically sourced stones_, and a-jain.com.                                                                                                                                                                                                       |

The film is composed for 9:16 from the start, not cropped from a landscape
cut. Its type sits clear of the bands that Reels covers at the top and bottom.

## What comes from the site

- **Products.** `scripts/prepare.py` reads the store's catalogue
  (`products.json`) and fetches the pieces by handle: the ring in its thirteen
  stones, and 27 pieces for the mosaic. It squares and centres each piece,
  framing a long-chain pendant close on the pendant. It also records each
  piece's name, stone, price and collection, and measures its stone's colour
  from the photograph. A few stones read wrong (an orange citrine is taken for
  gold, an onyx for its shadow), so the film sets those by hand. The
  photographs keep their studio white, which multiplies away into each
  tile's colour.
- **Type.** The site's own fonts: Noto Serif JP at weight 200 for its headings
  (subset to Latin) and Maven Pro for its text, both SIL Open Font License.
- **Logo.** The official SVG, inline. Its two flames and its letters move
  separately.
- **Copy.** Every name, price and line is the store's own, from its catalogue,
  its collection pages and its designer's page.

`scripts/fetch-assets.sh` re-downloads all of it (everything is committed).

## Build

From the repository root (Node 20+, Python 3.11+, Chromium via Playwright):

```bash
npm run a-jain:build                                         # soundtrack -> frames -> MP4
npm run stills -- --film a-jain --format 9x16 1.9 3.3 5.0    # review frames
npm run preview -- --film a-jain                             # live preview (open with ?format=9x16)
```

The renderer, motion blur (up to 16 sub-frames per frame, 180° shutter) and
encoder are shared with the other films at the repository root.

## Music

`audio/radiant.mp3` is an instrumental generated with Google's Lyria 3.5 from
a written brief (quoted in `scripts/audio.py`): radiant, refined New York
elegance, with pizzicato strings, sparkling piano, celesta glints and a sleek
beat. It came back as a minute-long piece in F# major at 120.05 BPM. Its
ending makes a five-bar arc: groove, a break with no drums, a hit, groove,
and a final chord that rings out. The film plays those five bars as one
continuous cut, with no edits:

- the reveal on the groove;
- the stone changing on the break;
- the mosaic on the hit;
- the signature on the final chord.

The picture's timeline (`src/js/timeline.js`) is measured from the music's
grid. `scripts/audio.py` checks the hit against it; they agree to within
10 ms.

Over the music, from the cue sheet (`scripts/cues.mjs`):

- a glint for each new stone, climbing the F# major scale as the changes
  quicken;
- air as the macro pulls back, as the ring drops into the mosaic and as the
  card opens;
- a high chime of the final chord under the signature.
