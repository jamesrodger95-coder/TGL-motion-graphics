#!/usr/bin/env bash
# Re-downloads the SPS film's fonts (SIL Open Font License, from Google Fonts'
# GitHub) into sps-plumbing/src/fonts/. They are committed, so this is only
# needed to refresh them. The site's own Articulat CF and Helvetica Neue are
# commercial faces and are not copied: El Messiri is the site's hero serif,
# and Montserrat stands in for its sans and matches the SPS wordmark.
set -euo pipefail
cd "$(dirname "$0")/../src"
get() { curl -sSfL --retry 3 --max-time 120 -o "$2" "$1"; }
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/elmessiri/ElMessiri%5Bwght%5D.ttf" fonts/ElMessiri-VF.ttf
get "$G/elmessiri/OFL.txt" fonts/OFL-ElMessiri.txt
get "$G/montserrat/Montserrat%5Bwght%5D.ttf" fonts/Montserrat-VF.ttf
get "$G/montserrat/Montserrat-Italic%5Bwght%5D.ttf" fonts/Montserrat-Italic-VF.ttf
get "$G/montserrat/OFL.txt" fonts/OFL-Montserrat.txt
