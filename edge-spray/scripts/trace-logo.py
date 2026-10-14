"""Traces the EDGE® wordmark into a vector SVG.

The site's header logo is an SVG wrapping a 744x207 PNG (#e2e319 on clear).
This pulls that PNG out of the page, upsamples its alpha 4x and traces it with
potrace (the `potracer` port), so the film can scale the mark crisply.

    python3 -I edge-spray/scripts/trace-logo.py home.html edge-spray/src/brand/edge-logo.svg
"""

import base64
import io
import re
import sys

import numpy as np
import potrace
from PIL import Image, ImageFilter

page = open(sys.argv[1], encoding="utf-8", errors="replace").read()
box = page.find('viewBox="0 0 140 39"')
svg_open = page.rfind("<svg", 0, box)
data = re.search(r'href="data:image/png;base64,([^"]+)"', page[svg_open : page.find("</svg>", svg_open)]).group(1)
logo = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGBA")
W, H = logo.size
S = 4
alpha = np.asarray(logo.getchannel("A").resize((W * S, H * S), Image.LANCZOS).filter(ImageFilter.GaussianBlur(1.6))) / 255.0
# potracer fills the False pixels, so the ink is passed as False.
path = potrace.Bitmap(alpha < 0.5).trace(turdsize=8, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=0.9, opticurve=True, opttolerance=0.2)


def p(pt):
    return f"{pt.x / S:.2f} {pt.y / S:.2f}"


d = []
for curve in path:
    d.append(f"M{p(curve.start_point)}")
    for seg in curve:
        if seg.is_corner:
            d.append(f"L{p(seg.c)}L{p(seg.end_point)}")
        else:
            d.append(f"C{p(seg.c1)} {p(seg.c2)} {p(seg.end_point)}")
    d.append("Z")
open(sys.argv[2], "w").write(
    f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}">'
    f'<path fill="#e2e319" fill-rule="evenodd" d="{"".join(d)}"/></svg>\n'
)
print(f"logo: {W}x{H}, {len(path)} contours -> {sys.argv[2]}")
