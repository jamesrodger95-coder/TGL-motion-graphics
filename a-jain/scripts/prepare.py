"""Prepares A.Jain's product photographs for the film.

Reads the store's catalogue (its Shopify products.json), takes the pieces
listed below by handle, and writes:
  - src/img/rings/<stone>.jpg: the 18k Gold Urban Chic Ring with Diamonds in
    each of its thirteen stones. The studio shot every stone the same way,
    so the crops line up and one ring can change its stone in place.
  - src/img/tiles/<handle>.jpg: square, centred crops of the mosaic pieces (a
    long-chain pendant is framed close, on the pendant).
  - src/data/catalog.json: each piece's name, stone, price and collection,
    and its stone's colour, measured from the photograph.

    python3 -I a-jain/scripts/prepare.py products.json a-jain/src
"""

import io
import json
import sys
import urllib.request

import numpy as np
from PIL import Image

cat = {p["handle"]: p for p in json.load(open(sys.argv[1]))["products"]}
OUT = sys.argv[2]
UA = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"}

RING = "18k-gold-urban-chic-rings-with-diamonds-"
RINGS = ["madeira-citrine", "rubellite", "peridot", "london-blue-topaz", "amethyst", "green-tourmaline", "aquamarine", "rhodolite", "swiss-blue-topaz", "indicolite", "garnet", "iolite", "black-onyx"]
TILES = [
    "urban-chic-18k-gold-studs-with-diamonds-rubellite",
    "urban-chic-18k-gold-studs-with-diamonds-aquamarine",
    "urban-chic-pendants-with-18k-gold-diamonds-double-chain-necklace-london-blue-topaz",
    "urban-chic-18k-gold-studs-with-diamonds-peridot",
    "urban-chic-bracelets-with-18k-gold-diamonds-iolite",
    "urban-chic-pendants-with-18k-gold-diamonds-double-chain-necklace-madeira-citrine",
    "urban-chic-18k-gold-studs-with-diamonds-green-tourmaline-1",
    "urban-chic-18k-gold-studs-with-diamonds-london-blue-topaz",
    "urban-chic-rings-accented-with-18k-gold-swiss-blue-topaz-with-pink-tourmaline",
    "urban-chic-18k-gold-studs-with-diamonds-madeira-citrine",
    "urban-chic-studs-citrine",
    "urban-chic-pendants-with-18k-gold-diamonds-double-chain-necklace-peridot",
    "urban-chic-18k-gold-studs-with-diamonds-amethyst",
    "urban-chic-rings-accented-with-18k-gold-peridot-with-citrine",
    "urban-chic-studs-swiss-blue-topaz",
    "timeless-ring-with-18k-gold-diamonds-amethyst",
    "timeless-pendant-with-18k-gold-diamonds-swiss-blue-topaz",
    "timeless-bracelet-with-18k-gold-diamonds-swiss-blue-topaz",
    "timeless-studs-sky-blue-topaz-with-pink-tourmaline",
    "timeless-ring-with-18k-gold-diamonds-citrine",
    "timeless-pendant-with-18k-gold-diamonds-amethyst",
    "timeless-bracelet-accented-with-18k-gold-swiss-blue-topaz-with-pink-tourmaline",
    "timeless-studs-rose-lavender-amethyst-with-peridot",
    "timeless-ring-with-18k-gold-diamonds-garnet",
    "timeless-pendant-with-18k-gold-diamonds-citrine",
    "timeless-bracelet-with-18k-gold-diamonds-amethyst",
    "timeless-studs-with-18k-gold-and-diamonds-london-blue-topaz",
]


def fetch(p):
    req = urllib.request.Request(p["images"][0]["src"], headers=UA)
    im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=120).read()))
    im.load()
    return im


def flatten(im):
    """On white, whatever the photograph's background."""
    im = im.convert("RGBA")
    bg = Image.new("RGBA", im.size, (255, 255, 255, 255))
    bg.alpha_composite(im)
    return bg.convert("RGB")


def stone_colour(rgb):
    """The mean of the photograph's most saturated pixels: its stones, not its gold or diamonds."""
    a = np.asarray(rgb.resize((300, 300))).reshape(-1, 3).astype(float)
    mx, mn = a.max(1), a.min(1)
    sat = (mx - mn) / (mx + 1)
    gold = (a[:, 0] > a[:, 2] + 40) & (a[:, 1] > a[:, 2] + 15) & (mx > 150)  # yellow metal
    pick = (sat > 0.3) & ~gold & (mx < 245)
    if pick.sum() < 50:  # an onyx: the darkest pixels instead
        pick = mx < np.percentile(mx, 3)
    return [int(v) for v in a[pick].mean(0)]


def entry(p, file):
    title, _, stone = p["title"].partition("|")
    return {
        "file": file,
        "name": title.strip(),
        "stone": stone.strip(),
        "price": float(p["variants"][0]["price"]),
        "collection": "Timeless" if "Timeless" in title else "Urban Chic",
    }


out = {"rings": [], "tiles": []}
for s in RINGS:
    p = cat[RING + s]
    rgb = flatten(fetch(p))
    rgb.crop((90, 330, 1110, 900)).save(f"{OUT}/img/rings/{s}.jpg", quality=93, subsampling=0)
    e = entry(p, f"img/rings/{s}.jpg")
    e["rgb"] = stone_colour(rgb.crop((440, 440, 760, 780)))
    out["rings"].append(e)
    print("ring", s, e["rgb"])
for h in TILES:
    p = cat[h]
    rgb = flatten(fetch(p))
    a = np.asarray(rgb).min(2) < 242
    ys, xs = np.where(a)
    x0, x1, y0, y1 = xs.min(), xs.max(), ys.min(), ys.max()
    if "double-chain-necklace" in h:
        # a long double chain: frame the pendant and the chain's last stretch
        sat = np.asarray(rgb).astype(int)
        sat = (sat.max(2) - sat.min(2)) > 60
        sy, sx = np.where(sat)
        cx, side = int(np.median(sx)), int((y1 - y0) * 0.5)
        cy = y1 - side // 2 + int(side * 0.06)
    else:
        side = int(max(x1 - x0, y1 - y0) * 1.14)
        cx, cy = (x0 + x1) // 2, (y0 + y1) // 2
    sq = Image.new("RGB", (side, side), "white")  # white beyond the photograph's edges
    sq.paste(rgb, (side // 2 - cx, side // 2 - cy))
    sq.resize((560, 560), Image.LANCZOS).save(f"{OUT}/img/tiles/{h}.jpg", quality=90, subsampling=0)
    e = entry(p, f"img/tiles/{h}.jpg")
    e["rgb"] = stone_colour(rgb)
    out["tiles"].append(e)
    print("tile", h[:50], e["rgb"])
json.dump(out, open(f"{OUT}/data/catalog.json", "w"), indent=1)
