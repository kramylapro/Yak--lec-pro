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
apk = os.environ.get('YAK_APK_URL', '').strip()  # adresse de l'APK Android (Release GitHub « android »)
bake = ''.join(['<script>window.YAK_CONTROL_URL=' + json.dumps(url) + ';</script>\n' if url else '', '<script>window.YAK_APK_URL=' + json.dumps(apk) + ';</script>\n' if apk else ''])
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
_sw = "<script>if('serviceWorker' in navigator&&/^https?:$/.test(location.protocol)){navigator.serviceWorker.register('sw.js').catch(function(){});}</script>\n"
_i = pwa.rfind('</body>')  # DERNIÈRE balise </body> : ne jamais toucher une balise écrite dans le JavaScript
pwa = pwa[:_i] + _sw + pwa[_i:] if _i >= 0 else pwa + _sw
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
# page de téléchargement Android à partager (dist/site/android.html), sans JavaScript
apk_page = apk or re.search(r"DEFAULT_URL = '([^']+)'", (root/'js/android_dl.js').read_text(encoding='utf-8')).group(1)
(site/'android.html').write_text(f"""<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Yak-élec-pro pour Android</title><link rel="icon" href="icon-192.png"><meta name="theme-color" content="#0b1d3a">
<style>body{{margin:0;font:16px/1.5 system-ui,Segoe UI,Roboto,Arial,sans-serif;background:linear-gradient(160deg,#0b1d3a,#1769d1);color:#17212b;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box}}
.c{{background:#fff;border-radius:16px;max-width:520px;width:100%;padding:24px;box-shadow:0 10px 40px rgba(0,0,0,.3)}}h1{{margin:.2em 0;font-size:1.5rem;color:#0b3d6b}}img{{display:block;margin:0 auto 8px;width:96px;height:96px;border-radius:20px}}
.b{{display:block;text-align:center;background:#1769d1;color:#fff;text-decoration:none;font-weight:700;padding:14px;border-radius:10px;margin:18px 0;font-size:1.1rem}}.s{{background:#eef3f9;color:#0b3d6b}}
li{{margin:6px 0}}small{{color:#617080}}</style></head><body><div class="c"><img src="icon-192.png" alt=""><h1>Yak-élec-pro pour Android</h1>
<p>Schémas électriques, simulation, métré et photovoltaïque – fonctionne sans Internet. Version {ver}.</p>
<a class="b" href="{apk_page}" download="Yak-elec-pro.apk">⬇ Télécharger l'application (APK)</a>
<ol><li>Ouvrez le fichier <b>Yak-elec-pro.apk</b> téléchargé.</li><li>Si Android le demande : <b>Paramètres</b> › autorisez <b>Installer des applications inconnues</b> pour le navigateur.</li>
<li>Touchez <b>Installer</b> (si Play Protect avertit : <b>Installer quand même</b>).</li><li>Ouvrez <b>Yak-élec-pro</b> depuis l'écran d'accueil.</li></ol>
<a class="b s" href="index.html">Utiliser la version web</a><small>Android 7 ou plus récent. L'application ne vient pas du Play Store.</small></div></body></html>""", encoding='utf-8')
print('dist/site/ prêt (PWA + android.html)')
