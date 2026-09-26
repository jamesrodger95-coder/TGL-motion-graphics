"""Clears the render's own sky from the globe image, keeping the planet and a
band of atmosphere above the limb. Circle fitted to the limb: centre (608, 1528),
radius 938 px (apex at y 590)."""
import sys

import numpy as np
from PIL import Image

src, dst = sys.argv[1], sys.argv[2]
im = np.array(Image.open(src).convert("RGBA")).astype(np.float32)
h, w, _ = im.shape
yy, xx = np.mgrid[0:h, 0:w]
d = np.hypot(xx - 608, yy - 1528)
keep = np.clip(1 - (d - (938 + 22)) / 55, 0, 1)
keep = keep * keep * (3 - 2 * keep)  # smoothstep
im[..., :3] *= keep[..., None]
Image.fromarray(im.clip(0, 255).astype(np.uint8)).save(dst, quality=92, lossless=False)
print(f"globe cleaned: {dst}")
