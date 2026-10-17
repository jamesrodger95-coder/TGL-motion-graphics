#!/usr/bin/env bash
# Re-downloads Human Improvement's artwork from buyhi.co (its Shopify CDN)
# into human-improvement/src/: the MSM Cellular Detox pouch (the front of its
# 1-Week pack, the site's one transparent front shot of the pouch) and the
# logo. Also Schibsted Grotesk (SIL Open Font License, from Google Fonts'
# GitHub), a stand-in for the site's own licensed Sharp Grotesk.
# Everything is committed; this only refreshes it.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 180 -A "$UA" -o "$2" "$1"; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

get https://buyhi.co/cdn/shop/files/logo.png src/brand/logo.png
get "https://buyhi.co/products/msm-cellular-detox-1-week-trial-pack.json" "$TMP/pouch.json"
python3 -I - "$TMP" <<'PY'
import io, json, sys, urllib.request
import numpy as np
from PIL import Image
src = json.load(open(f"{sys.argv[1]}/pouch.json"))["product"]["images"][0]["src"]
req = urllib.request.Request(src, headers={"User-Agent": "Mozilla/5.0"})
im = Image.open(io.BytesIO(urllib.request.urlopen(req, timeout=120).read())).convert("RGBA")
ys, xs = np.where(np.asarray(im)[..., 3] > 8)
im.crop((xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)).save("src/img/msm-pouch.png", optimize=True)
print("pouch", im.size, (xs.min(), ys.min(), xs.max(), ys.max()))
PY
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/schibstedgrotesk/SchibstedGrotesk%5Bwght%5D.ttf" src/fonts/SchibstedGrotesk-VF.ttf
get "$G/schibstedgrotesk/OFL.txt" src/fonts/OFL-SchibstedGrotesk.txt
