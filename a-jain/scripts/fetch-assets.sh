#!/usr/bin/env bash
# Re-downloads A.Jain's artwork from a-jain.com (its Shopify store) into
# a-jain/src/: the official logo and, through prepare.py, the product
# photographs (the Urban Chic ring in thirteen stones, and the mosaic's
# pieces from both collections) with the catalogue's names and prices.
# Also the site's own fonts: Noto Serif JP (its headings, at weight 200),
# subset to Latin, and Maven Pro (its text), both SIL Open Font License, from
# Google Fonts' GitHub. Everything is committed; this only refreshes it.
set -euo pipefail
cd "$(dirname "$0")/.."
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 180 -A "$UA" -o "$2" "$1"; }
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

get https://a-jain.com/cdn/shop/files/AJain-logo-official.svg src/brand/ajain-logo.svg
get "https://a-jain.com/products.json?limit=250" "$TMP/products.json"
python3 -I scripts/prepare.py "$TMP/products.json" src

G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/notoserifjp/NotoSerifJP%5Bwght%5D.ttf" "$TMP/NotoSerifJP.ttf"
python3 -I -m fontTools.subset "$TMP/NotoSerifJP.ttf" --output-file=src/fonts/NotoSerifJP-Latin-VF.ttf \
  --unicodes="U+0020-007E,U+00A0-00FF,U+2013-2014,U+2018-201D,U+2022,U+2026" --layout-features='*' --no-hinting
get "$G/notoserifjp/OFL.txt" src/fonts/OFL-NotoSerifJP.txt
get "$G/mavenpro/MavenPro%5Bwght%5D.ttf" src/fonts/MavenPro-VF.ttf
get "$G/mavenpro/OFL.txt" src/fonts/OFL-MavenPro.txt
