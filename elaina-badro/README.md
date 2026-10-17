# Elaina Badro — 10-second reel (9:16)

**Film:** [`out/elaina-badro-reel-9x16.mp4`](out/elaina-badro-reel-9x16.mp4) · 1080×1920 · 60 fps · 10.0 s · stereo AAC

Made to the "Luxury" brief: a calm, slow, elegant and expensive film for the
cosmetics brand of celebrity makeup artist Elaina Badro
(https://elainabadro.com/). It is built only from the site's own assets and
colours.

| Time     | Beat     | What happens                                                                                                                                                                                                       |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0 – 5.0  | Product  | The **Best Dressed Luxury Lipstick** (black and gold) fades up, centred on the brand's blush (`#f7a28d`), pushing in 4% across the beat. It is fully visible from 1.2 s to 5.0 s. The EB logo fades in from 1.0 s. |
| 5.0 – 10 | The line | The lipstick cross-fades away and _You deserve luxury._ (the site's own words) fades in over 1.2 s, over the logo and elainabadro.com. It holds from 6.7 s to the end.                                             |

**Motion.** There are only slow fades and slow push-ins, all on sine
ease-in-out curves of 1.2 to 1.5 s. There is no bounce, snap, slide,
sparkle or particle. Six words are on screen in all: the line, the logo's
name and the site.

**Assets.** The lipstick is the site's own studio shot. Its white
multiplies away into the blush, so the shadow stays and no cut-out edge
shows. The logo is traced to a vector from the site's bitmap
(`scripts/fetch-assets.sh`). The site's text face is Futura, carried as
Jost, which sets the website. The brief asks for the brand's serif, but the
site has none of its own; its only other face is a licensed Edwardian
script. So the line is set in Cormorant Garamond (SIL Open Font License),
and that is the one stand-in.

**Sound.** `scripts/audio.py` builds a warm pad in D-flat major that
breathes in, with a felt piano placing a few unhurried notes: one as the
logo appears, a chord as the line appears, and a last quiet note as the film
holds. Everything is synthesised, with no samples.

```bash
npm run elaina-badro:build   # soundtrack -> frames -> MP4
```
