#!/usr/bin/env python3
"""Assemble le projet en un fichier HTML autonome (dist/yak-elec-pro.html) et le site web/PWA (dist/site/).
Adresse du fichier de contrôle à distance (facultative) : variable YAK_CONTROL_URL ou fichier controle/url.txt."""
import re, os, json, base64, pathlib, struct, zlib
root = pathlib.Path(__file__).parent
html = (root/'index.html').read_text(encoding='utf-8')
css = (root/'css/style.css').read_text(encoding='utf-8')
html = re.sub(r'<link rel="stylesheet" href="css/style.css">', lambda m: '<style>\n'+css+'\n</style>', html)
url = os.environ.get('YAK_CONTROL_URL', '').strip()
f = root/'controle'/'url.txt'
if not url and f.exists():
    url = f.read_text(encoding='utf-8').strip().splitlines()[0].strip() if f.read_text(encoding='utf-8').strip() else ''
bake = ('<script>window.YAK_CONTROL_URL=' + json.dumps(url) + ';</script>\n') if url else ''
first = [True]
def js(m):
    code = (root/m.group(1)).read_text(encoding='utf-8').replace('</script>', '<\\/script>')
    pre = bake if first[0] else ''
    first[0] = False
    return pre + '<script>\n' + code + '\n</script>'
html = re.sub(r'<script src="(js/[^"]+)"></script>', js, html)
logo = (root/'assets/logo-ye.png').read_bytes()
html = html.replace('href="assets/logo-ye.png"', 'href="data:image/png;base64,'+base64.b64encode(logo).decode()+'"')
out = root/'dist'; out.mkdir(exist_ok=True)
(out/'yak-elec-pro.html').write_text(html, encoding='utf-8')
print('dist/yak-elec-pro.html', len(html)//1024, 'Ko', '| contrôle:', url or 'non défini')

# ---- site web / PWA (GitHub Pages, hébergement web, installation sur Android via « Ajouter à l'écran d'accueil ») ----
site = out/'site'; site.mkdir(exist_ok=True)
ver = re.search(r"EE.VERSION = '([^']+)'", (root/'js/core.js').read_text(encoding='utf-8')).group(1)
pwa = html.replace('</head>', '<link rel="manifest" href="manifest.webmanifest">\n<meta name="theme-color" content="#0b1d3a">\n<link rel="apple-touch-icon" href="icon-192.png">\n</head>', 1)
pwa = pwa.replace('</body>', "<script>if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(function(){});}</script>\n</body>", 1)
(site/'index.html').write_text(pwa, encoding='utf-8')
(site/'manifest.webmanifest').write_text(json.dumps({"name":"Yak-élec-pro","short_name":"Yak-élec-pro","description":"Schémas électriques, simulation, métré et photovoltaïque","start_url":"./index.html","scope":"./","display":"standalone","orientation":"any","background_color":"#0b1d3a","theme_color":"#0b1d3a","lang":"fr","icons":[{"src":"icon-192.png","sizes":"192x192","type":"image/png","purpose":"any"},{"src":"icon-512.png","sizes":"512x512","type":"image/png","purpose":"any maskable"}]}, ensure_ascii=False, indent=1), encoding='utf-8')
(site/'sw.js').write_text("""/* Yak-élec-pro – hors ligne : page en cache, control.json toujours demandé au réseau */
const V='yep-%s';
self.addEventListener('install',e=>{e.waitUntil(caches.open(V).then(c=>c.addAll(['./','index.html','manifest.webmanifest','icon-192.png','icon-512.png'])).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==V).map(x=>caches.delete(x)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{const u=new URL(e.request.url);if(e.request.method!=='GET'||/control\\.json/.test(u.pathname)||u.origin!==location.origin)return;
e.respondWith(fetch(e.request).then(r=>{const c=r.clone();caches.open(V).then(x=>x.put(e.request,c));return r;}).catch(()=>caches.match(e.request).then(r=>r||caches.match('index.html'))));});
""" % ver, encoding='utf-8')
# icônes redimensionnées depuis le logo (Pillow si disponible)
try:
    from PIL import Image
    im = Image.open(root/'assets/logo-ye.png').convert('RGBA')
    for n in (192, 512):
        bg = Image.new('RGBA', (n, n), (11, 29, 58, 255)); k = int(n*0.82)
        t = im.copy(); t.thumbnail((k, k)); bg.alpha_composite(t, ((n-t.width)//2, (n-t.height)//2)); bg.convert('RGB').save(site/f'icon-{n}.png')
except Exception as e:
    print('icônes PWA non générées:', e)
if not (site/'control.json').exists():
    (site/'control.json').write_text(json.dumps({"blocked": False, "message": "", "latestVersion": ver, "updateUrl": "", "updateNotes": ""}, ensure_ascii=False, indent=2), encoding='utf-8')
print('dist/site/ prêt (PWA)')
