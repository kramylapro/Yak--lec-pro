#!/usr/bin/env python3
"""Tests A – téléchargement de l'application Android depuis le site (V1.13). Le site (dist/site) est simulé à l'adresse https://yak-elec-pro.test.
Usage : python3 tests/android_dl_tests.py   (lancer d'abord : python3 build.py)"""
import sys, json, pathlib
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
site = root / 'dist' / 'site'
res = []
def check(n, c, d=''):
    res.append(bool(c)); print(('PASS ' if c else 'FAIL ') + n + ('' if c else '  -> ' + str(d)[:300]))
HOST = 'https://yak-elec-pro.test'
WEB = HOST + '/index.html'
TYPES = {'.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json'}
def serve(route):
    path = route.request.url.split(HOST, 1)[1].split('?')[0].lstrip('/') or 'index.html'
    f = site / path
    if path in ('control.json', 'sw.js') or not f.is_file(): return route.fulfill(status=404, body='') if path != 'control.json' else route.fulfill(status=200, content_type='application/json', body='{}')
    route.fulfill(status=200, content_type=TYPES.get(f.suffix, 'application/octet-stream'), body=f.read_bytes())
DEF = 'https://github.com/kramylapro/Yak--lec-pro/releases/download/android/Yak-elec-pro.apk'
with sync_playwright() as pw:
    b = pw.chromium.launch(); errs = []
    def page(ua=None, init=None, url=WEB):
        ctx = b.new_context(viewport={'width': 412, 'height': 860}, user_agent=ua) if ua else b.new_context(viewport={'width': 1280, 'height': 900})
        ctx.route(HOST + '/**', serve)
        if init: ctx.add_init_script(init)
        pg = ctx.new_page(); pg.on('pageerror', lambda e: errs.append(str(e))); pg.goto(url); pg.wait_for_selector('.login'); return pg
    # site public simulé (adresse https://yak-elec-pro.test servie depuis dist/site)
    pg = page('Mozilla/5.0 (Linux; Android 13; SM-A135F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Mobile Safari/537.36')
    check('A1 Site web sur téléphone : bouton « Télécharger l\'application Android » sur l\'écran de connexion', pg.locator('#apk-login').count() == 1)
    pg.click('#apk-login'); pg.wait_for_selector('#apk-go')
    href = pg.get_attribute('#apk-go', 'href'); body = pg.inner_text('.modal')
    check('A2 Fenêtre d\'installation : lien direct vers l\'APK (adresse fixe de la Release « android »)', href == DEF and pg.get_attribute('#apk-go', 'download') == 'Yak-elec-pro.apk', href)
    check('A3 Étapes d\'installation expliquées (sources inconnues, Play Protect)', 'applications inconnues' in body and 'Play Protect' in body and 'Installer' in body)
    pg.click('.overlay .mf .btn'); pg.wait_for_selector('.overlay', state='detached')
    pg.fill('#lu', 'tel1'); pg.click('.tab[data-t=up]'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.evaluate("EE.app.go('settings')"); pg.wait_for_selector('#apk-set')
    check('A4 Bouton aussi dans Paramètres › À propos', pg.locator('#apk-set').count() == 1)
    pg.context.close()
    pg = page(init="localStorage.setItem('eep.remote.state', JSON.stringify({ctl:{androidUrl:'https://exemple.test/autre.apk'},at:Date.now(),ok:true}))")
    check('A5 Lien remplacé par control.json (androidUrl)', pg.evaluate("EE.AndroidDL.url()") == 'https://exemple.test/autre.apk')
    pg.context.close()
    pg = page(init="localStorage.setItem('eep.remote.state', JSON.stringify({ctl:{androidUrl:'javascript:alert(1)'},at:Date.now(),ok:true}))")
    check('A6 Lien non sûr refusé (seulement https)', pg.evaluate("EE.AndroidDL.url()") == DEF)
    pg.context.close()
    pg = page(init="window.YAK_APK_URL='https://github.com/x/y/releases/download/android/Yak-elec-pro.apk'")
    check('A7 Adresse intégrée à la fabrication (YAK_APK_URL) utilisée', pg.evaluate("EE.AndroidDL.url()").startswith('https://github.com/x/y/'))
    pg.context.close()
    pg = page(init="window.YakAndroid={saveBase64(){}}")
    check('A8 Dans l\'application Android elle-même : pas de bouton', pg.locator('#apk-login').count() == 0)
    pg.context.close()
    pg = page(url='file://' + str(root / 'dist' / 'yak-elec-pro.html'))
    check('A9 Fichier HTML ouvert en local / application Windows : pas de bouton', pg.locator('#apk-login').count() == 0)
    pg.context.close()
    ah = (site / 'android.html').read_text(encoding='utf-8')
    check('A10 Page à partager « android.html » : bouton de téléchargement, étapes, lien vers la version web', 'Yak-elec-pro.apk' in ah and 'download=' in ah and 'applications inconnues' in ah and 'index.html' in ah and '<script' not in ah)
    ctx = b.new_context(); ctx.route(HOST + '/**', serve); pg = ctx.new_page(); pg.goto(HOST + '/android.html'); check('A11 android.html s\'affiche', 'Yak-élec-pro pour Android' in pg.inner_text('body')); pg.close()
    # portail
    pg = page()
    pg.fill('#lu', 'adm'); pg.click('.tab[data-t=up]'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.evaluate("()=>{EE.Config.isAdmin=()=>true;EE.portalUnlocked=true;EE.app.go('portal')}"); pg.wait_for_selector('.ptabs'); pg.click('.ptabs .chip[data-t=remote]'); pg.wait_for_selector('#fa')
    pg.fill('#fa', 'https://exemple.test/yak.apk'); ctl = json.loads(pg.input_value('#fj'))
    check('A12 Portail › Contrôle à distance : lien Android ajouté à control.json', ctl.get('androidUrl') == 'https://exemple.test/yak.apk', ctl)
    pg.fill('#fa', 'ftp://mauvais'); ctl = json.loads(pg.input_value('#fj'))
    check('A13 Lien invalide non publié', 'androidUrl' not in ctl)
    pg.context.close()
    check('A14 Aucune erreur JavaScript', not errs, errs)
    b.close()
print(f'\n{sum(res)}/{len(res)} tests réussis'); sys.exit(0 if all(res) else 1)
