#!/usr/bin/env bash
# Re-downloads My Origin Report's own artwork from myoriginreport.com into
# my-origin-report/src/ (it is committed, so this is only needed to refresh it),
# and rebuilds the traced world map. Needs network access to
# www.myoriginreport.com and GitHub (for the two OFL fonts), Node with
# playwright-core (Chromium) and Python with numpy, scipy, Pillow and
# scikit-image.
set -euo pipefail
cd "$(dirname "$0")/../src"
SITE=https://www.myoriginreport.com
get() { curl -sSfL --retry 3 --max-time 120 -o "$2" "$1"; }

# The site's world outline (its .map-bg mask) and decorative heraldic art.
get "$SITE/maps/world-outline.svg" brand/world-outline.svg
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
get "$SITE/images/crest-placeholder.png" "$TMP/crest.png"
python3 -c "from PIL import Image; Image.open('$TMP/crest.png').convert('RGB').save('img/crest.webp', quality=92, method=6)"

# The logo mark is inline SVG in the site's nav; brand/logo-mark.svg is a copy.

# Fonts: Cormorant Garamond and Plus Jakarta Sans (SIL Open Font License).
G=https://raw.githubusercontent.com/google/fonts/main/ofl
get "$G/cormorantgaramond/CormorantGaramond%5Bwght%5D.ttf" fonts/CormorantGaramond-VF.ttf
get "$G/cormorantgaramond/CormorantGaramond-Italic%5Bwght%5D.ttf" fonts/CormorantGaramond-Italic-VF.ttf
get "$G/cormorantgaramond/OFL.txt" fonts/OFL-CormorantGaramond.txt
get "$G/plusjakartasans/PlusJakartaSans%5Bwght%5D.ttf" fonts/PlusJakartaSans-VF.ttf
get "$G/plusjakartasans/OFL.txt" fonts/OFL-PlusJakartaSans.txt

# Trace the outline's filled strokes down to hairlines so the map holds up
# close: rasterise at 2x (7400x4230), skeletonise, re-draw at ~4 px.
node -e "
const { chromium } = require('playwright-core');
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 7400, height: 4230 } });
  const svg = require('fs').readFileSync('brand/world-outline.svg').toString('base64');
  await p.setContent('<body style=\"margin:0;background:#fff\"><img src=\"data:image/svg+xml;base64,' + svg + '\" style=\"width:7400px;height:4230px;display:block\"></body>');
  await p.waitForTimeout(500);
  await p.screenshot({ path: '$TMP/map-2x.png' });
  await b.close();
})();
"
python3 - "$TMP/map-2x.png" <<'EOF'
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi
from skimage.morphology import skeletonize
im = np.asarray(Image.open(sys.argv[1]).convert("L")) > 128
sk = skeletonize(im)
lab, n = ndi.label(sk, structure=np.ones((3, 3)))
sizes = ndi.sum(sk, lab, range(1, n + 1))
keep = np.isin(lab, np.nonzero(sizes >= 25)[0] + 1)
a = (np.clip(2.4 - ndi.distance_transform_edt(~keep), 0, 1) * 255).astype(np.uint8)
out = np.zeros((*a.shape, 4), np.uint8)
out[..., :3] = 255
out[..., 3] = a
Image.fromarray(out, "RGBA").save("img/map-lines.png", optimize=True)
print("map-lines.png", a.shape)
EOF
echo done
