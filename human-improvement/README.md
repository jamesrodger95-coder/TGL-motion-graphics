# Human Improvement — 10-second reel (9:16)

**Film:** [`out/human-improvement-reel-9x16.mp4`](out/human-improvement-reel-9x16.mp4) · 1080×1920 · 60 fps · 10.0 s · stereo AAC

Made to the "Premium lifestyle" brief: a clean, confident and trustworthy
film at a medium pace for Human Improvement's supplements
(https://buyhi.co/). It has one idea and one product, and is built only
from the site's own assets, colours and copy.

| Time     | Beat     | What happens                                                                                                                                                                                                |
| -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 0 – 3.0  | Headline | _Unlock **Cellular** Health_ (the site's own) slides gently up on the brand's cream (`#efebe6`), with _Cellular_ in its orange (`#f2591e`). It is readable from 1.0 s to 2.3 s, and on screen 2.9 s in all. |
| 3.0 – 7  | Product  | The **MSM Cellular Detox** pouch, large, rises into place and pushes slowly in. Under it: _Detox your cells with just one scoop._ It is fully readable from 4.0 s to 6.5 s.                                 |
| 7.0 – 10 | Trust    | The logo, _100% money-back guarantee_ and buyhi.co, centred, held from 8.15 s to the end.                                                                                                                   |

**Motion.** Every move is a smooth ease-in-out of about 0.8 s, with no
bounce, spring or pop. There are no particles, overlays, diagrams or stats.
Sixteen words are on screen in all, counting the logo's three.

**Assets.** The pouch is the site's transparent front shot, from the MSM
Cellular Detox 1-Week pack. The logo is the site's PNG. The site's type is
Sharp Grotesk, which is licensed, so the film uses Schibsted Grotesk (SIL
Open Font License). `scripts/fetch-assets.sh` re-downloads all of it.

**Sound.** `scripts/audio.py` builds a 120 BPM groove: a soft kick, light
hats, and warm electric-piano chords in D major. It rests under the headline,
comes in with the pouch, and resolves on an open chord under the logo.
Everything is synthesised, with no samples.

```bash
npm run human-improvement:build   # soundtrack -> frames -> MP4
```
