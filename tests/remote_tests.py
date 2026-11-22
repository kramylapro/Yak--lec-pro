#!/usr/bin/env python3
"""Tests X – contrôle à distance (blocage, mise à jour, portail). Compte normal ; le portail est ouvert par contournement de test.
Usage : python3 tests/remote_tests.py [chemin/vers/index.html]"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
URL = 'file://' + str(pathlib.Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else root/'index.html')
res = []
def check(n, c, d=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:300]))
CTL = {'v': {'blocked': False}, 'fail': False, 'hits': 0}
def handler(route):
    CTL['hits'] += 1
    if CTL['fail']: return route.abort()
    route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body=json.dumps(CTL['v']))
with sync_playwright() as pw:
    b = pw.chromium.launch(); ctx = b.new_context(viewport={'width': 1280, 'height': 900}); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    ctx.add_init_script("window.YAK_CONTROL_URL='https://ctl.test/control.json'")
    ctx.route('https://ctl.test/**', handler)
    pg.goto(URL); pg.fill('#lu', 'prof'); pg.click('.tab[data-t=up]'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    chk = lambda: pg.evaluate("EE.Remote.check().then(r=>r.ok)")
    locked = lambda: pg.locator('#yk-lock').count() == 1
    check('X1 Identifiant appareil au format YE-XXXX-XXXX, stable', pg.evaluate("/^YE-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(EE.Remote.deviceId())") and pg.evaluate("EE.Remote.deviceId()") == pg.evaluate("EE.Remote.deviceId()"))
    check('X2 Adresse de contrôle injectée par l\'hôte prioritaire', pg.evaluate("EE.Remote.controlURL()") == 'https://ctl.test/control.json')
    CTL['v'] = {'blocked': False}; chk(); check('X3 Fichier « non bloqué » : application utilisable', not locked() and pg.evaluate("document.getElementById('app').inert") is False)
    CTL['v'] = {'blocked': True, 'message': 'Accès suspendu par Yak.'}; chk()
    check('X4 Blocage général : écran de blocage, message, application inerte', locked() and 'Accès suspendu par Yak.' in pg.inner_text('#yk-lock') and pg.evaluate("document.getElementById('app').inert") is True)
    check('X5 L\'écran de blocage affiche l\'identifiant et les contacts du concepteur', pg.evaluate("EE.Remote.deviceId()") in pg.inner_text('#yk-lock') and pg.locator('#yk-lock a[href^="mailto:"]').count() == 1)
    CTL['v'] = {'blocked': False}; chk(); check('X6 Déblocage à distance : l\'écran disparaît', not locked() and pg.evaluate("document.getElementById('app').inert") is False)
    me = pg.evaluate("EE.Remote.deviceId()")
    CTL['v'] = {'blockedDevices': ['YE-ZZZZ-0000']}; chk(); check('X7 Autre appareil bloqué : cet appareil reste libre', not locked())
    CTL['v'] = {'blockedDevices': [me.lower()]}; chk(); check('X8 Appareil bloqué par son identifiant (insensible à la casse)', locked())
    CTL['v'] = {'blockedUsers': ['PROF']}; chk(); check('X9 Compte utilisateur bloqué', locked())
    CTL['v'] = {'blockedUsers': ['autre']}; chk(); check('X10 Autre compte bloqué : pas d\'effet', not locked())
    CTL['v'] = {'blocked': True}; chk(); CTL['fail'] = True; chk(); pg.reload(); pg.wait_for_selector('#yk-lock')
    check('X11 Hors ligne : le dernier état « bloqué » est conservé (même après redémarrage)', locked() and pg.evaluate("EE.Remote.state().ok") is False)
    CTL['fail'] = False; CTL['v'] = {'blocked': False}; pg.click('#yk-retry'); pg.wait_for_timeout(500)
    check('X12 Bouton Réessayer : le déblocage est repris en ligne', not locked())
    CTL['v'] = {'latestVersion': '9.9.9', 'updateUrl': 'https://exemple.test/yak.exe', 'updateNotes': 'Nouveautés X'}; chk()
    check('X13 Mise à jour proposée : bandeau avec version, notes et lien ; application utilisable', pg.locator('#yk-upd').count() == 1 and '9.9.9' in pg.inner_text('#yk-upd') and 'Nouveautés X' in pg.inner_text('#yk-upd') and pg.locator('#yk-upd a[href="https://exemple.test/yak.exe"]').count() == 1 and not locked())
    pg.click('#yk-later'); chk(); check('X14 « Plus tard » : bandeau masqué pour cette version', pg.locator('#yk-upd').count() == 0)
    CTL['v'] = {'latestVersion': '9.9.10'}; chk(); check('X15 Nouvelle version publiée : le bandeau revient', pg.locator('#yk-upd').count() == 1)
    CTL['v'] = {'latestVersion': '0.0.1'}; chk(); check('X16 Version déjà à jour : aucun bandeau', pg.locator('#yk-upd').count() == 0)
    CTL['v'] = {'minVersion': '9.0.0', 'updateUrl': 'https://exemple.test/yak.exe'}; chk()
    check('X17 Version minimale : mise à jour obligatoire, application inerte', locked() and 'obligatoire' in pg.inner_text('#yk-lock').lower() and pg.evaluate("document.getElementById('app').inert") is True)
    CTL['v'] = {'maxOfflineDays': 3}; chk(); CTL['fail'] = True
    pg.evaluate("()=>{const s=EE.Remote.state();s.lastOk=Date.now()-5*864e5;localStorage.setItem('eep.remote.state',JSON.stringify(s));EE.Remote.apply()}")
    check('X18 Blocage si aucune connexion depuis N jours', locked() and 'Internet' in pg.inner_text('#yk-lock'))
    CTL['fail'] = False; CTL['v'] = {}; chk()
    check('X19 Comparaison de versions', pg.evaluate("EE.Remote.cmp('1.10.0','1.9.0')===1&&EE.Remote.cmp('1.9.0','1.9.0')===0&&EE.Remote.cmp('1.8','1.9.0')===-1"))
    CTL['v'] = None; pg.evaluate("localStorage.setItem('eep.remote.state','{\"ctl\":{\"blocked\":false},\"ok\":true,\"at\":1}')")
    CTL['v'] = [1, 2]; r = chk(); check('X20 Fichier invalide ignoré (état précédent gardé, aucune erreur)', r is False and not locked())
    CTL['v'] = {'blocked': False}
    # Aperçu + portail (contournement de test de l'authentification admin)
    pg.evaluate("()=>{EE.Config.isAdmin=()=>true;EE.Config.checkAdminPassword=()=>true;EE.portalUnlocked=true;EE.app.go('portal')}"); pg.wait_for_selector('.ptabs')
    pg.click('.ptabs .chip:has-text("Contrôle à distance")'); pg.wait_for_selector('#fj')
    check('X21 Portail : onglet Contrôle à distance (identifiant, adresse, JSON)', me in pg.inner_text('#view, main, body') and json.loads(pg.input_value('#fj'))['blocked'] is False)
    pg.check('#fb'); pg.fill('#fm', 'Test'); pg.fill('#fd', 'YE-AAAA-1111\nYE-BBBB-2222'); pg.fill('#fl', '2.0.0'); pg.fill('#fx', 'https://x.test/a'); pg.fill('#fo', '10')
    j = json.loads(pg.input_value('#fj'))
    check('X22 Portail : le fichier généré suit le formulaire', j['blocked'] is True and j['message'] == 'Test' and j['blockedDevices'] == ['YE-AAAA-1111', 'YE-BBBB-2222'] and j['latestVersion'] == '2.0.0' and j['maxOfflineDays'] == 10 and 'updated' in j)
    pg.click('#fprev'); pg.wait_for_selector('#yk-close')
    check('X23 Portail : aperçu du blocage avec bouton de fermeture', locked() and 'Test' in pg.inner_text('#yk-lock'))
    pg.click('#yk-close'); check('X24 Fermer l\'aperçu rétablit l\'application', not locked())
    pub = {'calls': []}
    def gh(route):
        rq = route.request; pub['calls'].append((rq.method, rq.url, rq.post_data, rq.headers.get('authorization')))
        if rq.method == 'GET': route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{"sha":"abc123"}')
        else: route.fulfill(status=200, content_type='application/json', headers={'access-control-allow-origin': '*'}, body='{"content":{}}')
    ctx.route('https://api.github.com/**', gh)
    pg.fill('#go', 'moi'); pg.fill('#gr', 'depot'); pg.fill('#gb', 'main'); pg.fill('#gp', 'site/control.json'); pg.fill('#gt', 'ghp_TEST')
    pg.click('#gpub'); pg.wait_for_function("document.getElementById('gmsg').textContent.length>3&&document.getElementById('gmsg').textContent!=='Envoi…'")
    put = [c for c in pub['calls'] if c[0] == 'PUT']; body = json.loads(put[0][2]) if put else {}
    import base64
    check('X25 Publication GitHub : lecture du sha puis écriture du fichier encodé, jeton envoyé', len(put) == 1 and body.get('sha') == 'abc123' and json.loads(base64.b64decode(body['content']).decode())['blockedDevices'][0] == 'YE-AAAA-1111' and put[0][3] == 'Bearer ghp_TEST' and '/moi/depot/contents/site/control.json' in put[0][1], pub['calls'])
    check('X26 Publication : message de succès et jeton effacé du champ, jamais enregistré', '✔' in pg.inner_text('#gmsg') and pg.input_value('#gt') == '' and 'ghp_TEST' not in pg.evaluate("JSON.stringify(Object.assign({},localStorage))"))
    check('X27 Aucune erreur JavaScript', not errs, errs)
    b.close()
print(f"{sum(res)}/{len(res)}"); sys.exit(0 if all(res) else 1)
