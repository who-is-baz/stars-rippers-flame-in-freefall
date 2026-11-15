"""Diferencia de píxeles entre las capturas t0/t3/t8 de cada escenario (confirma que hay movimiento). Requiere Pillow."""
import glob, os, re, sys
from PIL import Image, ImageChops
d = os.path.join(os.path.dirname(__file__), '..', 'docs', 'screenshots')
names = sorted({re.sub(r'-t\d+\.png$', '', os.path.basename(f)) for f in glob.glob(os.path.join(d, 'match-burn-*-t0.png'))})
bad = 0
for n in names:
    ims = [Image.open(os.path.join(d, f'{n}-t{t}.png')).convert('RGB') for t in (0, 3, 8)]
    diffs = [sum(1 for px in ImageChops.difference(a, b).convert('L').getdata() if px > 12) for a, b in ((ims[0], ims[1]), (ims[1], ims[2]), (ims[0], ims[2]))]
    print(f"{n.replace('match-burn-', ''):22s} px changed t0→3: {diffs[0]:6d}  t3→8: {diffs[1]:6d}  t0→8: {diffs[2]:6d}")
