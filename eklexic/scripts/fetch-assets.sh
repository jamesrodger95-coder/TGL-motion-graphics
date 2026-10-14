#!/usr/bin/env bash
# Re-downloads Eklexic's artwork from eklexic.com (its Shopify CDN) into
# eklexic/src/: the logo, the hero, and studio shots of the products, cut
# from their white backgrounds by scripts/matte.py. Also the site's own fonts,
# Open Sans and Jost, and Lora for its hero line (SIL Open Font License, from
# Google Fonts' GitHub). Everything is committed; this only refreshes it.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 120 -A "$UA" -o "$2" "$1"; }
CDN=https://www.eklexic.com/cdn/shop/files
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

get "$CDN/eklexic-logo.svg" src/brand/eklexic-logo.svg
get "$CDN/eklexic_hero_2500x900_1.jpg" "$TMP/hero.jpg"
# The hero's right side: the model and her layered pieces (its own headline is baked into the left).
python3 -I -c "from PIL import Image; Image.open('$TMP/hero.jpg').convert('RGB').crop((1180, 0, 2500, 900)).save('src/img/hero.jpg', quality=94, subsampling=0)"

while read -r file name; do
  get "$CDN/$file" "$TMP/$file"
  python3 -I scripts/matte.py "$TMP/$file" "src/img/$name.png" 1100
done <<'LIST'
Thick-Flat-Ring.jpg thick-flat-ring
Esme-Bracelet.jpg esme-bracelet
StudioSession-186.jpg triple-bloom-earrings
9_5MM-Domed-Ring.jpg domed-ring
Hammered-Wide-Ring.jpg hammered-wide-ring
Hammered-Domed-Ring.jpg hammered-domed-ring
Elongated-Link-Chain.jpg elongated-link-chain
ESSENTIAL-LETTERS.jpg essential-letters
StudioSession-129.jpg odessa-earrings
BENNETTEARRINGS_69a14a76-12e6-4623-8703-125bfa5ccf73.jpg bennett-earrings
Thin-Luciana-Bracelet.jpg luciana-bracelet
LIST

G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/opensans/OpenSans%5Bwdth,wght%5D.ttf" src/fonts/OpenSans-VF.ttf
get "$G/opensans/OFL.txt" src/fonts/OFL-OpenSans.txt
get "$G/jost/Jost%5Bwght%5D.ttf" src/fonts/Jost-VF.ttf
get "$G/jost/OFL.txt" src/fonts/OFL-Jost.txt
get "$G/lora/Lora%5Bwght%5D.ttf" src/fonts/Lora-VF.ttf
get "$G/lora/OFL.txt" src/fonts/OFL-Lora.txt
