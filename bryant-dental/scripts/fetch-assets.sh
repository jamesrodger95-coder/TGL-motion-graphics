#!/usr/bin/env bash
# Downloads Bryant Dental's own media from bryant.dental and cuts the exact
# clips and stills the film uses into bryant-dental/assets/.
# Needs network access to bryant.dental and r2.vidzflow.com, plus ffmpeg
# (the one bundled with the imageio-ffmpeg Python package is used).
set -euo pipefail
cd "$(dirname "$0")/.."
FF=$(python3 -c "import imageio_ffmpeg; print(imageio_ffmpeg.get_ffmpeg_exe())")
SRC=$(mktemp -d)
trap 'rm -rf "$SRC"' EXIT

get() { curl -sSfL --max-time 180 -o "$SRC/$2" "$1"; }
get https://r2.vidzflow.com/source/b3e7d5ca-f566-4ab5-a7cf-f256d992d0f7.mp4 magniflex.mp4 # MagTech barrel switch render
get https://r2.vidzflow.com/v/lR01o2fL7G_1080p_1742573593.mp4 face.mp4                    # AI fitting face scan
get https://r2.vidzflow.com/source/c605c16e-4b34-428b-af95-7aa35ccb7c4d.mp4 workshop.mp4   # Handcrafted in the UK
get https://bryant.dental/assets/images/fund-the-future/globe-mobile.avif globe.avif

seq() { # name, input, start, duration, filter
  rm -rf "assets/seq/$1" && mkdir -p "assets/seq/$1"
  "$FF" -hide_banner -loglevel error -ss "$3" -t "$4" -i "$SRC/$2" -vf "$5" -q:v 3 "assets/seq/$1/f%03d.jpg"
}
# The barrels flying in and clicking on (source 6.4 s - 8.9 s), front view of the frame.
seq magniflex magniflex.mp4 6.4 2.5 "crop=2560:1314:640:0,scale=1600:-2"
# The face mesh resolving.
seq face face.mp4 0.6 3.0 "scale=720:720"
# Five workshop moments, square-cropped on the subject.
seq craft1 workshop.mp4 3.0 0.62 "crop=1080:1080:640:0,scale=720:720"
seq craft2 workshop.mp4 13.1 0.62 "crop=1080:1080:420:0,scale=720:720"
seq craft3 workshop.mp4 20.1 0.62 "crop=1080:1080:330:0,scale=720:720"
seq craft4 workshop.mp4 15.6 0.62 "crop=1080:1080:480:0,scale=720:720"
seq craft5 workshop.mp4 2.0 0.62 "crop=1080:1080:520:0,scale=720:720"

mkdir -p assets/img
node -e "require('sharp')('$SRC/globe.avif').webp({ quality: 92, alphaQuality: 100 }).toFile('assets/img/globe.webp')"
python3 scripts/clean-globe.py assets/img/globe.webp assets/img/globe.webp
for d in assets/seq/*/; do echo "$(basename "$d"): $(ls "$d" | wc -l) frames"; done
