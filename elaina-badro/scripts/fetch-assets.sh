#!/usr/bin/env bash
# Re-downloads Elaina Badro's artwork from elainabadro.com (its Shopify CDN)
# into elaina-badro/src/: the Best Dressed Luxury Lipstick's studio shot,
# trimmed to the product, and the EB logo, traced from the site's bitmap to a
# vector. Also Jost (the site's own text face, its Futura stand-in) and
# Cormorant Garamond for the serif line (the site has no serif face of its
# own), both SIL Open Font License, from Google Fonts' GitHub. Everything is
# committed; this only refreshes it.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 180 -A "$UA" -o "$2" "$1"; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
CDN=https://elainabadro.com/cdn/shop

get "$CDN/files/Elaina-Badro-Cosmetics-Beauty-Tools-Makeup-Brushes-Celebrity-Makeup-Artist.jpg" "$TMP/logo.jpg"
get "https://elainabadro.com/products/best-dressed-luxury-lipstick.json" "$TMP/lipstick.json"
python3 -I - "$TMP" <<'PY'
import json, sys, urllib.request, io
import numpy as np
import potrace
from PIL import Image, ImageFilter
tmp = sys.argv[1]
# the lipstick: trim the studio white to the product with a margin, 1600 px tall
src = json.load(open(f"{tmp}/lipstick.json"))["product"]["images"][0]["src"]
req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"})
im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=120).read())).convert("RGB")
a = np.asarray(im).min(2) < 245
ys, xs = np.where(a)
pad = int(0.06 * (ys.max() - ys.min()))
box = (max(0, xs.min() - pad), max(0, ys.min() - pad), min(im.width, xs.max() + pad), min(im.height, ys.max() + pad))
im = im.crop(box)
im.resize((round(im.width * 1600 / im.height), 1600), Image.LANCZOS).save("src/img/lipstick.jpg", quality=93, subsampling=0)
# the logo: white on black in the site's bitmap; traced as ink
lg = Image.open(f"{tmp}/logo.jpg").convert("L")
W, H = lg.size
ink = np.asarray(lg.filter(ImageFilter.GaussianBlur(1.2))) / 255.0
path = potrace.Bitmap(ink < 0.5).trace(turdsize=20, alphamax=0.9, opticurve=True, opttolerance=0.2)  # potracer fills the False pixels
ys, xs = np.where(ink >= 0.5)
x0, y0, x1, y1 = xs.min() - 4, ys.min() - 4, xs.max() + 4, ys.max() + 4
p = lambda q: f"{q.x - x0:.1f} {q.y - y0:.1f}"
d = []
for c in path:
    d.append(f"M{p(c.start_point)}")
    for s in c:
        d.append(f"L{p(s.c)}L{p(s.end_point)}" if s.is_corner else f"C{p(s.c1)} {p(s.c2)} {p(s.end_point)}")
    d.append("Z")
open("src/brand/eb-logo.svg", "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {x1 - x0} {y1 - y0}"><path fill="#000" fill-rule="evenodd" d="{"".join(d)}"/></svg>\n'
)
print("lipstick", box, "logo", (x1 - x0, y1 - y0), len(path), "contours")
PY

G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/jost/Jost%5Bwght%5D.ttf" src/fonts/Jost-VF.ttf
get "$G/jost/OFL.txt" src/fonts/OFL-Jost.txt
get "$G/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf" src/fonts/CormorantGaramond-VF.ttf
get "$G/cormorantgaramond/OFL.txt" src/fonts/OFL-CormorantGaramond.txt
