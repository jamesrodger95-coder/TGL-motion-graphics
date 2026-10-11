#!/usr/bin/env bash
# Re-downloads Modus Projects' own artwork from modusprojects.nl into
# modus-projects/src/ (it is committed, so this is only needed to refresh it):
# the home hero's 121-frame scroll sequence, the logo and the striped deco
# (both inline SVG on the page), and two OFL stand-ins for the site's licensed
# faces. Needs network access to www.modusprojects.nl, cdn.overflow.nl and
# GitHub, and Python 3.
set -euo pipefail
cd "$(dirname "$0")/../src"
get() { curl -sSfL --retry 5 --retry-all-errors --max-time 120 -A "Mozilla/5.0" -o "$2" "$1"; }

# The hero's image sequence (1440x1440 JPEGs): a sunset drone flight from the
# tower into a finished apartment. The site scrubs it with the scroll.
for i in $(seq 0 120); do
  [ -s "seq/f$(printf "%03d" "$i").jpg" ] && continue
  n=$(printf "%03d" "$i")
  get "https://cdn.overflow.nl/modus-sequence-v2/frame$n.jpg" "seq/f$n.jpg"
done

# The footer's logo (viewBox 1344x238: five bars, then M O D U S), the
# section deco (five peach bars fading upwards) and the three M's cards'
# striped graphics, cut from the page as served.
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
get https://www.modusprojects.nl/ "$TMP/home.html"
python3 -I - "$TMP/home.html" <<'PY'
import re, sys
html = open(sys.argv[1], encoding="utf-8", errors="ignore").read()
svgs = re.findall(r"<svg[^>]*>.*?</svg>", html, re.S)
def sized(s):
    # Give each SVG its viewBox as its intrinsic size, so it decodes as an <img>.
    w, h = re.search(r'viewBox="0 0 ([\d.]+) ([\d.]+)"', s).groups()
    return s.replace('width="100%" height="100%"', f'width="{w}" height="{h}"', 1)
def pick(vb):
    return sized(next(s for s in svgs if f'viewBox="{vb}"' in s))
open("brand/logo.svg", "w").write(pick("0 0 1344 238").replace('fill="currentColor"', 'fill="white"') + "\n")
open("brand/stripes.svg", "w").write(pick("0 0 151 908") + "\n")
# The three M's cards' graphics, in page order (Meerwaarde, Momentum, Maximale zekerheid).
cards = [s for s in svgs if 'viewBox="0 0 437 263"' in s or 'viewBox="0 0 438 318"' in s]
for i, s in enumerate(cards[:3]):
    open(f"brand/m{i + 1}.svg", "w").write(sized(s) + "\n")
print("logo.svg, stripes.svg, m1-m3.svg")
PY

# Fonts. The site sets its headings in OT Jubilee Silver and its labels in
# Aeonik Mono (both licensed); the film uses their closest OFL relatives,
# Jost (geometric, Futura-like caps) and DM Mono.
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/jost/Jost%5Bwght%5D.ttf" fonts/Jost-VF.ttf
get "$G/jost/OFL.txt" fonts/OFL-jost.txt
get "$G/dmmono/DMMono-Regular.ttf" fonts/DMMono-Regular.ttf
get "$G/dmmono/DMMono-Medium.ttf" fonts/DMMono-Medium.ttf
get "$G/dmmono/OFL.txt" fonts/OFL-dmmono.txt
echo done
