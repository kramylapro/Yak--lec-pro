#!/usr/bin/env python3
"""Génère desktop/icone_windows_amd64.syso (icône de Yak-elec-pro.exe) et desktop/yak-elec-pro.ico depuis assets/logo-ye.png.
Aucun outil externe : écrit directement un objet COFF (.rsrc) que Go lie dans l'exécutable Windows."""
import io, struct, pathlib
from PIL import Image
root = pathlib.Path(__file__).resolve().parent.parent
src = Image.open(root/'assets/logo-ye.png').convert('RGBA')
SIZES = [256, 128, 64, 48, 32, 24, 16]
pngs = []
for s in SIZES:
    b = io.BytesIO(); src.resize((s, s), Image.LANCZOS).save(b, 'PNG'); pngs.append(b.getvalue())
# fichier .ico (utile pour raccourcis / installateur)
ico = struct.pack('<HHH', 0, 1, len(SIZES)); off = 6 + 16 * len(SIZES); body = b''
for s, p in zip(SIZES, pngs):
    ico += struct.pack('<BBBBHHII', 0 if s == 256 else s, 0 if s == 256 else s, 0, 0, 1, 32, len(p), off + len(body)); body += p
(root/'desktop/yak-elec-pro.ico').write_bytes(ico + body)
# ---- ressources : RT_ICON (3) x N + RT_GROUP_ICON (14) ----
grp = struct.pack('<HHH', 0, 1, len(SIZES)) + b''.join(struct.pack('<BBBBHHIH', 0 if s == 256 else s, 0 if s == 256 else s, 0, 0, 1, 32, len(p), i + 1) for i, (s, p) in enumerate(zip(SIZES, pngs)))
datas = [(3, i + 1, p) for i, p in enumerate(pngs)] + [(14, 1, grp)]
n_icons = len(pngs)
# tailles : racine(16+2*8) ; niveau 2 : type3 (16+n*8), type14 (16+1*8) ; niveau 3 : chaque id -> (16+1*8) ; entrées de données (16) ; puis données
root_sz = 16 + 2 * 8; t3_sz = 16 + n_icons * 8; t14_sz = 16 + 8; lang_sz = 16 + 8
off_t3 = root_sz; off_t14 = off_t3 + t3_sz; off_lang = off_t14 + t14_sz
off_de = off_lang + lang_sz * len(datas); off_data = off_de + 16 * len(datas)
def dirhdr(nid): return struct.pack('<IIHHHH', 0, 0, 0, 0, 0, nid)
buf = bytearray(); relocs = []
buf += dirhdr(2) + struct.pack('<II', 3, 0x80000000 | off_t3) + struct.pack('<II', 14, 0x80000000 | off_t14)
buf += dirhdr(n_icons) + b''.join(struct.pack('<II', i + 1, 0x80000000 | (off_lang + lang_sz * i)) for i in range(n_icons))
buf += dirhdr(1) + struct.pack('<II', 1, 0x80000000 | (off_lang + lang_sz * n_icons))
for i in range(len(datas)): buf += dirhdr(1) + struct.pack('<II', 0x0409, off_de + 16 * i)
cur = off_data; entries = b''; blobs = b''
for i, (t, rid, d) in enumerate(datas):
    pad = (-len(d)) % 4
    relocs.append(off_de + 16 * i)  # OffsetToData (RVA) à reloger
    entries += struct.pack('<IIII', cur, len(d), 0, 0); blobs += d + b'\0' * pad; cur += len(d) + pad
buf += entries + blobs
raw = bytes(buf)
nrel = len(relocs); hdr = 20 + 40; ptr_rel = hdr + len(raw); ptr_sym = ptr_rel + 10 * nrel
coff = struct.pack('<HHIIIHH', 0x8664, 1, 0, ptr_sym, 2, 0, 0)
coff += struct.pack('<8sIIIIIIHHI', b'.rsrc', 0, 0, len(raw), hdr, ptr_rel, 0, nrel, 0, 0xC0300040)
coff += raw + b''.join(struct.pack('<IIH', r, 0, 3) for r in relocs)
coff += struct.pack('<8sIhHBB', b'.rsrc', 0, 1, 0, 3, 1) + struct.pack('<IHHIHBBBB', len(raw), nrel, 0, 0, 0, 0, 0, 0, 0)[:18]
coff += struct.pack('<I', 4)
(root/'desktop/icone_windows_amd64.syso').write_bytes(coff)
print('OK', len(coff), 'octets')
