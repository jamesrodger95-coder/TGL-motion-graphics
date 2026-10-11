#!/usr/bin/env bash
# Re-downloads Malarkey's logo artwork from malarkeyroofing.com into
# malarkey/src/brand/, and the OFL fonts that stand in for its commercial
# Geogrotesque (Barlow and Barlow Condensed, from Google Fonts' GitHub). They
# are committed, so this is only needed to refresh them.
set -euo pipefail
cd "$(dirname "$0")/../src"
UA="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36"
get() { curl -sSfL --retry 3 --max-time 120 -A "$UA" -o "$2" "$1"; }
SITE=https://www.malarkeyroofing.com/app/themes/malarkey-roofing/src/images
get "$SITE/logo-horizontal-white.svg" brand/logo-horizontal-white.svg
get "$SITE/logo-horizontal-full-color.svg" brand/logo-horizontal-full-color.svg
get "$SITE/logo-shamrock.svg" brand/logo-shamrock.svg
G=https://raw.githubusercontent.com/google/fonts/main/ofl
for w in Light Regular Medium SemiBold Bold; do get "$G/barlow/Barlow-$w.ttf" "fonts/Barlow-$w.ttf"; done
get "$G/barlow/OFL.txt" fonts/OFL-Barlow.txt
for w in Medium SemiBold Bold ExtraBold; do get "$G/barlowcondensed/BarlowCondensed-$w.ttf" "fonts/BarlowCondensed-$w.ttf"; done
get "$G/barlowcondensed/OFL.txt" fonts/OFL-BarlowCondensed.txt
