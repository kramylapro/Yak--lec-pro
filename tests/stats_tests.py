#!/usr/bin/env python3
"""Tests S – statistiques de connexion (V1.12) : signal envoyé par chaque copie, lecture réservée au propriétaire,
onglet « Connexions » du portail. Firebase est simulé (aucun accès Internet). Le portail est ouvert par contournement de test.
Usage : python3 tests/stats_tests.py [chemin/vers/index.html ou dist/yak-elec-pro.html]"""
import sys, json, time, pathlib, tempfile
from urllib.parse import urlparse, parse_qs
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root / 'index.html')
DB = 'https://yak-test-default-rtdb.europe-west1.firebasedatabase.app'
res = []
def check(n, c, d=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:300]))
H = {'access-control-allow-origin': '*'}
S = {'db': {}, 'patches': [], 'reads': 0, 'auth_ok': 0}
def now_ms(): return int(time.time() * 1000)
def resolve(v):
    if isinstance(v, dict) and v.get('.sv') == 'timestamp': return now_ms()
    return v
def db_handler(route):
    rq = route.request; u = urlparse(rq.url)
    if rq.method == 'OPTIONS': return route.fulfill(status=204, headers={**H, 'access-control-allow-methods': 'GET,PATCH,PUT', 'access-control-allow-headers': 'content-type'})
    if rq.method == 'PATCH' and u.path.startswith('/presence/'):
        dev = u.path.split('/')[2].replace('.json', ''); body = json.loads(rq.post_data or '{}'); S['patches'].append((dev, body))
        S['db'].setdefault(dev, {}).update({k: resolve(v) for k, v in body.items()})
        return route.fulfill(status=200, headers=H, content_type='application/json', body='{}')
    if rq.method == 'GET' and u.path == '/presence.json':
        S['reads'] += 1
        if parse_qs(u.query).get('auth', [''])[0] != 'JETON-TEST': return route.fulfill(status=401, headers=H, content_type='application/json', body='{"error":"Permission denied"}')
        return route.fulfill(status=200, headers=H, content_type='application/json', body=json.dumps(S['db']))
    route.fulfill(status=404, headers=H, body='{}')
def auth_handler(route):
    rq = route.request
    if rq.method == 'OPTIONS': return route.fulfill(status=204, headers={**H, 'access-control-allow-methods': 'POST', 'access-control-allow-headers': 'content-type'})
    b = json.loads(rq.post_data or '{}')
    if 'key=CLE-TEST' not in rq.url: return route.fulfill(status=400, headers=H, content_type='application/json', body='{"error":{"message":"API key not valid. Please pass a valid API key."}}')
    if b.get('password') == 'bon-mdp':
        S['auth_ok'] += 1; return route.fulfill(status=200, headers=H, content_type='application/json', body=json.dumps({'idToken': 'JETON-TEST', 'expiresIn': '3600'}))
    route.fulfill(status=400, headers=H, content_type='application/json', body='{"error":{"message":"INVALID_LOGIN_CREDENTIALS"}}')

with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    ctx.route(DB + '/**', db_handler); ctx.route('https://identitytoolkit.googleapis.com/**', auth_handler)
    pg.goto(URL); pg.wait_for_selector('.login')
    J = lambda js: pg.evaluate(js)
    check('S1 Module chargé ; aucune base configurée → aucun envoi, pas d\'avis sur l\'écran de connexion',
          J("!!EE.Stats") and J("EE.Stats.cfg().url") == '' and pg.locator('#st-notice').count() == 0 and J("EE.Stats.beat().then(r=>r.error)") == 'no-url' and not S['patches'])
    check('S2 Adresse Firebase validée (refuse une adresse quelconque)',
          J(f"EE.Stats.cleanUrl('{DB}/')") == DB and J("EE.Stats.cleanUrl('https://pirate.example.com')") == '' and J("EE.Stats.cleanUrl('http://x.firebaseio.com')") == '')
    # base fournie par control.json (comme pour toutes les copies distribuées)
    J(f"localStorage.setItem('eep.remote.state', JSON.stringify({{ctl:{{statsUrl:'{DB}',statsKey:'CLE-TEST'}},at:Date.now(),ok:true}}))")
    pg.reload(); pg.wait_for_selector('.login')
    check('S3 Base lue dans control.json ; avis d\'information affiché sur l\'écran de connexion',
          J("EE.Stats.cfg().url") == DB and J("EE.Stats.cfg().source") == 'control.json' and pg.locator('#st-notice').count() == 1, J("EE.Stats.cfg()"))
    pg.fill('#lu', 'eleve1'); pg.click('.tab[data-t=up]'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.wait_for_timeout(3600)
    check('S7 Signal envoyé automatiquement au démarrage (sans action de l\'utilisateur)', len(S['patches']) >= 1, S['patches'])
    S['patches'].clear(); r = J("EE.Stats.beat()")
    dev = J("EE.Remote.deviceId()")
    last = S['patches'][-1] if S['patches'] else (None, {})
    check('S4 Signal envoyé : identifiant d\'appareil, utilisateur, plateforme, version, horodatage serveur',
          r.get('ok') and last[0] == dev and last[1].get('u') == 'eleve1' and last[1].get('v') == J("EE.VERSION") and last[1].get('p') == 'Fichier HTML' and last[1].get('t') == {'.sv': 'timestamp'}, (r, last))
    check('S5 Aucune donnée personnelle de plus (pas de projet, pas de mot de passe)', set(last[1].keys()) <= {'t', 'v', 'p', 'u', 'f'}, last[1])
    J("EE.Stats.beat()"); check('S6 « Première connexion » envoyée une seule fois', 'f' not in S['patches'][-1][1] and 'f' in S['db'][dev])
    # autres appareils dans la base simulée
    n = now_ms()
    S['db'].update({'YE-AAAA-1111': {'t': n - 30000, 'f': n - 2 * 864e5, 'v': '1.12.0', 'p': 'Android (application)', 'u': 'prof'},
                    'YE-BBBB-2222': {'t': n - 3 * 864e5, 'f': n - 20 * 864e5, 'v': '1.11.1', 'p': 'Windows (application)', 'u': 'atelier'},
                    'YE-CCCC-3333': {'t': n - 40 * 864e5, 'f': n - 60 * 864e5, 'v': '1.10.7', 'p': 'Site web', 'u': ''}})
    sm = J("EE.Stats.summary(%s)" % json.dumps(S['db']))
    check('S8 Calcul : connectés maintenant / 7 jours / 30 jours / total', sm['online'] == 2 and sm['week'] == 3 and sm['month'] == 3 and sm['total'] == 4, {k: sm[k] for k in ('online', 'week', 'month', 'total')})
    # portail
    J("()=>{EE.Config.isAdmin=()=>true;EE.Config.checkAdminPassword=()=>true;EE.portalUnlocked=true;EE.app.go('portal')}"); pg.wait_for_selector('.ptabs')
    check('S9 Onglet « 👥 Connexions » dans le portail', pg.locator('.ptabs .chip[data-t=stats]').count() == 1)
    pg.click('.ptabs .chip[data-t=stats]'); pg.wait_for_selector('#st-rules')
    rules = json.loads(pg.input_value('#st-rules'))
    check('S10 Règles Firebase fournies : écriture limitée et validée, lecture réservée à l\'e-mail administrateur',
          rules['rules']['.read'] is False and J("EE.Config.ADMIN_EMAIL") in rules['rules']['presence']['.read'] and '$other' in rules['rules']['presence']['$dev'] and 'YE-' in rules['rules']['presence']['$dev']['.write'])
    check('S11 Lecture sans connexion Firebase : demande l\'e-mail et le mot de passe (non enregistré)', pg.locator('#st-pw').count() == 1 and pg.input_value('#st-mail') == J("EE.Config.ADMIN_EMAIL"))
    pg.fill('#st-pw', 'faux'); pg.click('#st-in'); pg.wait_for_timeout(400)
    check('S12 Mauvais mot de passe : message clair, aucune donnée affichée', 'incorrect' in pg.inner_text('#st-err') and pg.locator('#st-res').count() == 0, pg.inner_text('#st-err'))
    pg.fill('#st-pw', 'bon-mdp'); pg.click('#st-in'); pg.wait_for_selector('.stgrid'); pg.wait_for_timeout(200)
    txt = pg.inner_text('#st-res')
    big = pg.locator('.stbig.on b').inner_text()
    check('S13 Tableau de bord : nombre de connectés maintenant, chiffres et liste des appareils',
          big == '2' and 'eleve1' in txt and 'prof' in txt and 'YE-AAAA-1111' in txt and 'Android (application)' in txt, (big, txt[:300]))
    check('S14 Mot de passe Firebase jamais stocké', 'bon-mdp' not in J("JSON.stringify(localStorage)"))
    with pg.expect_download() as dl: pg.click('#st-csv')
    p = pathlib.Path(tempfile.mkdtemp()) / 'c.csv'; dl.value.save_as(p); csv = p.read_text(encoding='utf-8-sig')
    check('S15 Export CSV des connexions', csv.startswith('etat;utilisateur') and 'YE-BBBB-2222' in csv and csv.count('\n') == 4, csv[:200])
    pg.click('#st-out'); pg.wait_for_selector('#st-pw')
    check('S16 Déconnexion Firebase : retour à la demande de mot de passe', not J("EE.Stats.signedIn()"))
    # réglage pour cet appareil + publication dans control.json
    pg.fill('#st-url', 'https://mauvaise-adresse.com'); pg.click('#st-save')
    check('S17 Adresse invalide refusée à l\'enregistrement', 'non reconnue' in pg.inner_text('#st-msg'))
    pg.fill('#st-url', DB + '/'); pg.fill('#st-key', 'CLE-TEST'); pg.click('#st-save'); pg.wait_for_timeout(200)
    check('S18 Réglage enregistré pour cet appareil', J("EE.Config.get().remote.statsUrl") == DB and J("EE.Stats.cfg().source") == 'appareil')
    pg.click('.ptabs .chip[data-t=remote]'); pg.wait_for_selector('#fj')
    ctl = json.loads(pg.input_value('#fj'))
    check('S19 L\'adresse et la clé sont ajoutées au fichier control.json à publier', ctl.get('statsUrl') == DB and ctl.get('statsKey') == 'CLE-TEST', ctl)
    pg.fill('#rurl', 'https://ctl.test/control.json'); pg.click('#rsave'); pg.wait_for_timeout(200)
    check('S20 Enregistrer le contrôle à distance ne supprime pas le réglage des statistiques', J("EE.Config.get().remote.statsUrl") == DB and J("EE.Config.get().remote.url") == 'https://ctl.test/control.json')
    check('S21 Aucune erreur JavaScript', not errs, errs)
    b.close()
print(f'\n{sum(res)}/{len(res)} tests réussis'); sys.exit(0 if all(res) else 1)
