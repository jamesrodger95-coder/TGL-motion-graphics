#!/usr/bin/env bash
# Re-downloads EDGE®'s artwork from edgespray.com (its Shopify CDN) into
# edge-spray/src/: the transparent product shots (Grip Spray, Grip Wipes,
# Advanced Grip System), the court photograph from its hero, and the EDGE®
# wordmark, traced to a vector by trace-logo.py.
# Also Saira and JetBrains Mono (SIL Open Font License, from Google Fonts'
# GitHub), stand-ins for the site's own licensed faces (Industry and PP
# Fraktion Mono). Everything is committed; this only refreshes it.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 120 -A "$UA" -o "$2" "$1"; }
CDN=https://www.edgespray.com/cdn/shop/files
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

get https://www.edgespray.com/ "$TMP/home.html"
python3 -I scripts/trace-logo.py "$TMP/home.html" src/brand/edge-logo.svg

get "$CDN/EDGE_SPRAY_2OZ_HR.png" src/img/grip-spray.png
get "$CDN/30_CT_HR.png" src/img/grip-wipes.png
get "$CDN/GRIP_SYSTEM_HR.png" src/img/grip-system.png
get "$CDN/Hero_Photo_Main_1.webp" "$TMP/court.webp"
python3 -I - "$TMP" <<'PY'
import sys
from PIL import Image
tmp = sys.argv[1]
Image.open(f"{tmp}/court.webp").convert("RGB").save("src/img/court.jpg", quality=94, subsampling=0)
PY

G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/saira/Saira%5Bwdth,wght%5D.ttf" src/fonts/Saira-VF.ttf
get "$G/saira/OFL.txt" src/fonts/OFL-Saira.txt
get "$G/jetbrainsmono/JetBrainsMono%5Bwght%5D.ttf" src/fonts/JetBrainsMono-VF.ttf
get "$G/jetbrainsmono/OFL.txt" src/fonts/OFL-JetBrainsMono.txt
