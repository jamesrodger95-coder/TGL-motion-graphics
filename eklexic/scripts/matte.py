"""Cuts a jewelry studio shot (on white) into a transparent PNG.

Large near-white regions become background: anything connected to the image
border, plus enclosed areas big enough to be a ring's hole rather than a
highlight. The soft grey shadow and reflection under a piece is kept as a
translucent shadow; the metal itself stays opaque, highlights included.

    python3 -I eklexic/scripts/matte.py in.jpg out.png [size]
"""

import sys

import numpy as np
from PIL import Image
from scipy import ndimage

src, dst = sys.argv[1], sys.argv[2]
size = int(sys.argv[3]) if len(sys.argv) > 3 else 1200
im = Image.open(src).convert("RGB")
im.thumbnail((size, size), Image.LANCZOS)
a = np.asarray(im).astype(np.float32)
mn = a.min(axis=2)
mx = a.max(axis=2)
sat = (mx - mn) / np.maximum(mx, 1)
lum = a @ np.array([0.299, 0.587, 0.114], dtype=np.float32)

white = (mn > 246) & (sat < 0.06)
lab, n = ndimage.label(white)
sizes = ndimage.sum(np.ones_like(lum), lab, index=np.arange(1, n + 1))
border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
big = {i + 1 for i, s in enumerate(sizes) if s > 0.004 * lum.size}
bg = np.isin(lab, list(border | big))

# Shadow: pale, unsaturated pixels next to the background (the floor shadow).
pale = (sat < 0.10) & (mn > 150) & ~bg
near = ndimage.binary_dilation(bg, iterations=3)
lab2, _ = ndimage.label(pale)
touch = np.unique(lab2[near & pale])
shadow = np.isin(lab2, touch[touch > 0])

alpha = np.ones_like(lum)
alpha[bg] = 0
sh_a = np.clip((250 - lum) / 110, 0, 1) * 0.75
alpha[shadow] = sh_a[shadow]
alpha = ndimage.gaussian_filter(alpha, 0.7)
rgb = a.copy()
rgb[shadow] = np.array([70, 55, 40], dtype=np.float32)  # warm shadow tone
out = np.dstack([rgb, alpha[..., None] * 255]).clip(0, 255).astype(np.uint8)
Image.fromarray(out, "RGBA").save(dst, optimize=True)
print(f"{dst}: {im.size}, opaque {np.mean(alpha > 0.5):.1%}")
