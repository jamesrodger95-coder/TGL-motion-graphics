#!/usr/bin/env bash
# Re-downloads Tandem's own artwork from thetandemco.com (its Webflow CDN) into
# tandem/src/, plus the two OFL fonts that stand in for the site's commercial
# Söhne and Season Serif. Everything is committed, so this is only needed to
# refresh it. Needs network access, and Python with Pillow (AVIF decode).
set -euo pipefail
cd "$(dirname "$0")/../src"
get() { curl -sSfL --retry 3 --max-time 120 -o "$2" "$1"; }
CDN=https://cdn.prod.website-files.com/688b2b7f61d51fc0f60ed9e2

# The mark: the handlebar T, the logotype, the lockup, and the "common ground" lines.
get "$CDN/689c825cb06a2a88112451e3_tandem_symbol.svg" brand/tandem_symbol.svg
get "$CDN/689c83e0a9600b13a5bcbda0_tandem_logotype.svg" brand/tandem_logotype.svg
get "$CDN/688b3378a4dc696fbd4bbaa2_tandem_lockup.svg" brand/tandem_lockup.svg
get "$CDN/68930adb6d8cbf994383be27_lines.svg" brand/lines.svg

# Photography from the site's project marquee: a pour on site beside Willis
# Tower, and Avra West Loop's roof deck at dusk.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
get "$CDN/68d3bc57e49c83c3eb49b9d9_Marquee_New_1.avif" "$TMP/build.avif"
get "$CDN/688b79ad049ef9607b73a078_Marquee_Avra_2.avif" "$TMP/avra.avif"
for f in build avra; do
  python3 -I -c "from PIL import Image; Image.open('$TMP/$f.avif').convert('RGB').save('img/$f.jpg', quality=95, subsampling=0)"
done

# Fonts (SIL Open Font License): Inter Tight for Söhne, Newsreader for Season Serif.
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/intertight/InterTight%5Bwght%5D.ttf" fonts/InterTight-VF.ttf
get "$G/intertight/OFL.txt" fonts/OFL-InterTight.txt
get "$G/newsreader/Newsreader%5Bopsz,wght%5D.ttf" fonts/Newsreader-VF.ttf
get "$G/newsreader/Newsreader-Italic%5Bopsz,wght%5D.ttf" fonts/Newsreader-Italic-VF.ttf
get "$G/newsreader/OFL.txt" fonts/OFL-Newsreader.txt
