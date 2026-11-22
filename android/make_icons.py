#!/usr/bin/env python3
"""Génère les icônes Android (mipmap) depuis assets/logo-ye.png. Nécessite Pillow."""
import pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
logo = Image.open(root/'assets/logo-ye.png').convert('RGBA')
for d, n in (('mdpi', 48), ('hdpi', 72), ('xhdpi', 96), ('xxhdpi', 144), ('xxxhdpi', 192)):
    out = root/'android/app/src/main/res'/f'mipmap-{d}'; out.mkdir(parents=True, exist_ok=True)
    bg = Image.new('RGBA', (n, n), (11, 29, 58, 255)); t = logo.copy(); t.thumbnail((int(n*0.84),)*2)
    bg.alpha_composite(t, ((n-t.width)//2, (n-t.height)//2)); bg.convert('RGB').save(out/'ic_launcher.png')
print('icônes Android générées')
