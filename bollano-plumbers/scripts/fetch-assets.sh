#!/usr/bin/env bash
# Re-downloads Bollano Plumbers' own artwork from bollanoplumbers.co.uk into
# bollano-plumbers/src/ (it is committed, so this is only needed to refresh it),
# and cuts the reversed logo into the parts the end card animates. Needs network
# access to www.bollanoplumbers.co.uk and GitHub (for the two OFL fonts), and
# Python with numpy, scipy and Pillow.
set -euo pipefail
cd "$(dirname "$0")/../src"
UP=https://www.bollanoplumbers.co.uk/wp-content/uploads
get() { curl -sSfL --retry 3 --max-time 120 -A "Mozilla/5.0" -o "$2" "$1"; }

# The home hero's illustration (the plumber at the bath, a Slider Revolution
# layer), the reversed logo, and the Gas Safe registration badge.
get "$UP/2020/05/plumber.svg" art/plumber.svg
get "$UP/2026/07/bollano-plumber-tr.png" brand/logo-reverse.png
get "$UP/2020/06/BOLLANO-PLUMBERS-GAS-SAFE-REGISTER-1.png" brand/gas-safe.png

# Fonts: DM Serif Display and Poppins, the site's two faces (SIL Open Font License).
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/dmserifdisplay/DMSerifDisplay-Regular.ttf" fonts/DMSerifDisplay-Regular.ttf
get "$G/dmserifdisplay/OFL.txt" fonts/OFL-dmserifdisplay.txt
for w in Regular Medium SemiBold Bold; do get "$G/poppins/Poppins-$w.ttf" "fonts/Poppins-$w.ttf"; done
get "$G/poppins/OFL.txt" fonts/OFL-poppins.txt

# Cut the reversed logo (2167x725) into its parts: the frame, the seven letters
# of BOLLANO, the A's white peak and its two red stripes, and the eight letters
# of PLUMBERS. Every visible pixel goes to its nearest part, so anti-aliased
# edges stay with their glyph. Writes brand/logo/<part>.png and brand/logo.json
# (each part's box in the logo's own pixels).
python3 -I - brand/logo-reverse.png brand <<'EOF'
import json, os, sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, outdir = sys.argv[1], sys.argv[2]
im = np.asarray(Image.open(src).convert("RGBA"))
a = im[..., 3].astype(int)
r, g = im[..., 0].astype(int), im[..., 1].astype(int)
red = (a > 40) & (r > 150) & (g < 120)
white = (a > 40) & ~red

parts = []  # (name, mask) of the solid cores
lab, n = ndi.label(white, structure=np.ones((3, 3)))
for i, sl in enumerate(ndi.find_objects(lab)):
    core = lab == i + 1
    if core.sum() < 2000:
        continue
    parts.append((sl, core))
labr, nr = ndi.label(red, structure=np.ones((3, 3)))
reds = [labr == i + 1 for i in range(nr) if (labr == i + 1).sum() > 2000]

# Name them by position: the frame is the widest; letters by row, then x.
parts.sort(key=lambda p: -(p[0][1].stop - p[0][1].start))
named = {"frame": parts[0][1]}
big = sorted((p for p in parts[1:] if p[0][0].start < 450), key=lambda p: p[0][1].start)
small = sorted((p for p in parts[1:] if p[0][0].start >= 450), key=lambda p: p[0][1].start)
for nm, p in zip(["B", "O1", "L1", "L2", "A", "N", "O2"], big):
    named[nm] = p[1]
for nm, p in zip(["P", "L", "U", "M", "B2", "E", "R", "S"], small):
    named["p" + nm] = p[1]
reds.sort(key=lambda m: np.nonzero(m)[0].min())
named["red1"], named["red2"] = reds  # upper stripe, lower stripe

names = list(named)
cores = np.zeros(a.shape, int)
for k, nm in enumerate(names):
    cores[named[nm]] = k + 1
_, (iy, ix) = ndi.distance_transform_edt(cores == 0, return_indices=True)
owner = cores[iy, ix]
os.makedirs(f"{outdir}/logo", exist_ok=True)
boxes = {}
for k, nm in enumerate(names):
    m = (owner == k + 1) & (a > 0)
    ys, xs = np.nonzero(m)
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    crop = im[y0:y1, x0:x1].copy()
    crop[..., 3] = np.where(m[y0:y1, x0:x1], crop[..., 3], 0)
    Image.fromarray(crop, "RGBA").save(f"{outdir}/logo/{nm}.png", optimize=True)
    boxes[nm] = [int(x0), int(y0), int(x1 - x0), int(y1 - y0)]
json.dump({"size": [im.shape[1], im.shape[0]], "parts": boxes}, open(f"{outdir}/logo.json", "w"), indent=1)
print("logo parts:", ", ".join(names))
EOF
echo done
