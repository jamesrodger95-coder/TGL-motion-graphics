#!/usr/bin/env bash
# Re-downloads Everyone's Energy's own artwork from everyonesenergy.co.uk into
# everyones-energy/src/ (it is committed, so this is only needed to refresh it).
# The hero illustration is inline SVG on the home page, so it is cut out of the
# page by the data attributes the theme uses (.hero__house, .hero__car, ...).
# Needs network access to everyonesenergy.co.uk and GitHub (for Poppins, OFL).
set -euo pipefail
cd "$(dirname "$0")/../src"
SITE=https://everyonesenergy.co.uk
THEME=$SITE/wp-content/themes/everyones-energy/assets/img
UP=$SITE/wp-content/uploads/2023/10
get() { curl -sSfL --max-time 120 -o "$2" "$1"; }

# Brand: logo, the loading screen's flash, the sun's rays, night sky, moon, lines.
for f in ee-logo.svg ee-logo-reverse.svg flash.png underline.svg squiggle.svg hero-after.svg waves.svg moon.svg; do
  get "$THEME/$f" "brand/$f"
done
get "$THEME/heros/rays.png" brand/rays.png
get "$THEME/heros/stars.svg" brand/stars.svg

# Backgrounds: the hero sky, the quote section's waves, the speckled navy.
get "$THEME/heros/hero-home-bg.jpg" img/hero-home-bg.jpg
get "$THEME/waves-bg.jpg" img/waves-bg.jpg
get "$THEME/speckled.jpg" img/speckled.jpg

# Service icons.
get "$UP/solar-pv.svg" icons/solar-pv.svg
get "$UP/battery-storage.svg" icons/battery-storage.svg
for f in clock bill battery; do get "$THEME/icons/$f.svg" "icons/$f.svg"; done

# Inline SVG from the home page: the hero's parts, its clouds and the three
# featured cards' icons.
PAGE=$(mktemp)
trap 'rm -f "$PAGE"' EXIT
get "$SITE/" "$PAGE"
python3 - "$PAGE" <<'EOF'
import re, sys
h = open(sys.argv[1], encoding="utf-8").read()
def svg_after(marker, start=0):
    p = h.index(marker, start)
    a = h.index("<svg", p)
    return h[a : h.index("</svg>", a) + 6], a
for cls, out in [("hero__trees", "trees"), ("hero__car", "car"), ("hero__house", "house"),
                 ("hero__solar-panel", "solar-panel"), ("hero__batteries", "batteries")]:
    open(f"art/{out}.svg", "w").write(svg_after(f'class="{cls}"')[0])
for n, key in enumerate(["cloud-one", "cloud-two", "cloud-three"], 1):
    open(f"art/cloud-{n}.svg", "w").write(svg_after(f"hero__clouds--{key}")[0].strip() + "\n")
for key, out in [("Save money", "save"), ("Earn income", "earn"), ("Take control", "take")]:
    i = h.index(">" + key + "<")
    s = h.rfind('<div class="card', 0, i)
    open(f"icons/card-{out}.svg", "w").write(re.search(r"<svg[\s\S]*?</svg>", h[s:i]).group(0))
print("inline SVG: 5 hero parts, 3 clouds, 3 card icons")
EOF

# Poppins (SIL Open Font License), the site's typeface, from Google Fonts' repo.
for w in Regular Medium SemiBold Bold ExtraBold Black; do
  get "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-$w.ttf" "fonts/Poppins-$w.ttf"
done
get https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/OFL.txt fonts/OFL.txt
echo "done"
