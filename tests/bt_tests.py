#!/usr/bin/env python3
"""Tests d'acceptation du Bureau d'études BT (V1.11, section X) – Playwright + Chromium.
Usage : python3 tests/bt_tests.py [chemin/vers/index.html ou dist/yak-elec-pro.html]"""
import sys, pathlib, tempfile
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
target = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(root / 'index.html')
URL = 'file://' + target
res = []
def check(name, cond, detail=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  -> ' + str(detail)[:400]))
tmp = pathlib.Path(tempfile.mkdtemp())

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('.login'); pg.fill('#lu', 'bureau1'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    J = lambda js: pg.evaluate(js)

    # X1 navigation
    check('BT1 Onglet « Bureau d\'études » dans la barre et carte d\'accueil', pg.locator('nav .nav[data-go=bt]').count() == 1 and pg.locator('.card[data-a=bt]').count() == 1)
    pg.click('nav .nav[data-go=bt]'); pg.wait_for_selector('#bt-new')
    check('BT2 Liste des études vide + exemple proposé', pg.locator('#bt-demo').count() == 1)

    # X3 assistant
    pg.click('#bt-new'); pg.wait_for_selector('#w-name')
    for k in ['w-client', 'w-site', 'w-office', 'w-eng', 'w-P', 'w-Ik', 'w-RA', 'w-e', 'w-bld', 'w-sup', 'w-U', 'w-f']:
        pass
    fields = pg.locator('.modal [id^=w-]').count()
    pg.fill('#w-name', 'Étude test'); pg.fill('#w-client', 'Client A'); pg.fill('#w-Ik', '10'); pg.fill('#w-P', '50'); pg.fill('#w-RA', '20'); pg.select_option('#w-e', 'TT')
    pg.click('.modal .btn.primary'); pg.wait_for_selector('.bt #bttree')
    check('BT3 Assistant de création (client, site, réseau, neutre, Icc, Pdispo…) → étude ouverte', fields >= 15 and J("EE.BTUI.st.name==='Étude test'&&EE.BTUI.st.earthing==='TT'"), fields)
    check('BT4 Interface logiciel : menus, ruban, explorateur, onglets, propriétés, messages, barre d\'état',
          pg.locator('#btmenu .mtop').all_inner_texts() == ['Fichier', 'Édition', 'Affichage', 'Conception', 'Calculs', 'Distribution', 'Tableaux', 'Bibliothèque', 'Documents', 'Paramètres', 'Aide']
          and pg.locator('.ribbtn').count() >= 20 and pg.locator('.bttab').count() == 13 and pg.locator('#btmsgs').count() == 1 and pg.locator('#btsb').count() == 1, pg.locator('#btmenu .mtop').all_inner_texts())

    # X5 arborescence
    pg.click('.tn[data-k=board]'); pg.click('.ribbtn[title="+ Départ"]'); pg.click('.ribbtn[title="+ Circuit"]')
    n = J("EE.BTUI.st.boards.length"); c = J("EE.BTUI.st.boards[1].circuits.length")
    check('BT5 + Départ crée un tableau divisionnaire ; + Circuit l\'alimente', n == 2 and c == 1, [n, c])
    pg.fill('#btpropsb [data-f=length]', '30'); pg.locator('#btpropsb [data-f=length]').dispatch_event('change')
    pg.locator('.ldrow [data-lf=P]').first.fill('600'); pg.locator('.ldrow [data-lf=P]').first.dispatch_event('change')
    r = J("(()=>{const c=EE.BTUI.st.boards[1].circuits[0];return EE.BTUI.res.circuits[c.id]})()")
    check('BT6 Circuit calculé automatiquement (Ib, In, section, protection)', r and r['In'] > 0 and r['section'] and r['prot'], r and {k: r.get(k) for k in ['Ib', 'In', 'section', 'status']})
    J("EE.BTUI.A.dup()"); c2 = J("EE.BTUI.st.boards[1].circuits.length"); J("EE.BTUI.A.del()"); c3 = J("EE.BTUI.st.boards[1].circuits.length")
    check('BT7 Dupliquer / supprimer un circuit', c2 == 2 and c3 == 1, [c2, c3])
    pg.keyboard.press('Control+z'); c4 = J("EE.BTUI.st.boards[1].circuits.length"); pg.keyboard.press('Control+y'); c5 = J("EE.BTUI.st.boards[1].circuits.length")
    check('BT8 Annuler / rétablir (Ctrl+Z / Ctrl+Y)', c4 == 2 and c5 == 1, [c4, c5])
    J("(()=>{const U=EE.BTUI;U.sel={kind:'circuit',id:U.st.boards[1].circuits[0].id};U.A.copy();U.A.paste()})()")
    check('BT9 Copier / coller', J("EE.BTUI.st.boards[1].circuits.length") == 2)

    # X10 étude d'exemple complète puis tous les onglets
    J("EE.BTUI.saveNow()"); J("(()=>{const s=EE.BTUI.demoStudy();EE.BTUI.Studies.put(s);EE.BTUI.open(s.id)})()")
    st = J("EE.BTUI.res.stats")
    check('BT10 Étude d\'exemple (TGBT + 2 TD, 12 départs et circuits) entièrement dimensionnée', st['total'] == 12 and st['ko'] == 0 and st['missing'] == 0, st)
    tabs = J("[...document.querySelectorAll('.bttab')].map(b=>b.dataset.t)")
    bad = []
    for t in tabs:
        pg.click(f'.bttab[data-t={t}]'); pg.wait_for_timeout(60); txt = pg.inner_text('#btview')
        if 'Affichage impossible' in txt or 'Onglet indisponible' in txt or len(txt) < 60: bad.append((t, txt[:120]))
    check('BT11 Les 13 onglets s\'affichent sans erreur', not bad and len(tabs) == 13, bad)
    pg.click('.bttab[data-t=calc]'); pg.locator('tr[data-c]').nth(3).click()
    det = pg.inner_text('.calcdet').lower()
    check('BT12 Note de calcul : Ib, In, Iz, ΔU, Icc max/min, contacts indirects, solutions', all(k.lower() in det for k in ['Courant d\'emploi', 'Courant admissible', 'Chute de tension', 'Icc maximal', 'Icc minimal', 'Contacts indirects', 'Solutions possibles']), det[:300])
    pg.click('.bttab[data-t=repart]')
    check('BT13 Répartition : rangées, différentiels, peignes', pg.locator('.row2d').count() >= 1 and pg.locator('.dev.rcd').count() >= 1)
    pg.select_option('#rp-m', 'trad'); m = J("EE.BTUI.curBoard().layout")
    check('BT13b Répartition traditionnelle / optimisée commutables', m == 'trad', m)
    pg.click('.bttab[data-t=enc]')
    check('BT14 Enveloppe : plusieurs solutions proposées', pg.locator('#btview tbody tr').count() >= 2, pg.locator('#btview tbody tr').count())
    pg.click('.bttab[data-t=v2d]'); faces = []
    for k in ['face', 'interieur', 'cote']:
        pg.click(f'[data-v={k}]'); faces.append(pg.locator('.v2box svg rect').count())
    check('BT15 Vue 2D face / intérieur / côté', all(f > 3 for f in faces), faces)
    pg.click('.bttab[data-t=v3d]'); pg.wait_for_selector('#v3box svg polygon'); a = pg.inner_html('#v3box')
    bx = pg.locator('#v3box').bounding_box(); pg.mouse.move(bx['x'] + 200, bx['y'] + 200); pg.mouse.down(); pg.mouse.move(bx['x'] + 320, bx['y'] + 240); pg.mouse.up()
    check('BT16 Vue 3D : rendu et rotation à la souris', pg.locator('#v3box polygon').count() > 50 and pg.inner_html('#v3box') != a)
    pg.click('.bttab[data-t=sel]')
    txt = pg.inner_text('#btview')
    check('BT17 Sélectivité indicative, filiation jamais déclarée sans données constructeur', 'indicativ' in txt.lower() and 'constructeur' in txt.lower() and pg.locator('.curves svg').count() == 1)
    pg.click('.bttab[data-t=bom]')
    t = pg.inner_text('#btview')
    check('BT18 Nomenclature (appareillage, enveloppes, accessoires, câbles) et chiffrage HT / TVA / TTC', all(k in t for k in ['Appareillage', 'Enveloppes', 'Accessoires', 'Câbles', 'Total HT', 'Total TTC']))
    pid = J("(()=>{const m=EE.BTUI.bom.list.find(x=>x.cat==='Appareillage');return m.fab+'|'+m.ref})()")
    inp = pg.locator(f'[data-p="{pid}"]'); inp.fill('12500'); inp.dispatch_event('change')
    ht = J("EE.BTUI.bom.cost.ht")
    check('BT18b Saisie d\'un prix → enregistré en bibliothèque et chiffrage recalculé', ht > 0 and J(f"EE.BTLib.get('{pid.split('|')[1]}','{pid.split('|')[0]}').price") == 12500, ht)

    # X19 exports
    with pg.expect_download() as d: J("EE.BTViews.excel()")
    x = d.value; x.save_as(tmp / 'e.xls'); xml = (tmp / 'e.xls').read_text(encoding='utf-8')
    check('BT19a Classeur Excel 6 feuilles', xml.count('<Worksheet') == 6 and 'Nomenclature' in xml)
    with pg.expect_download() as d: J("EE.BTViews.csvCalc()")
    d.value.save_as(tmp / 'c.csv'); cs = (tmp / 'c.csv').read_text(encoding='utf-8-sig')
    check('BT19b CSV des protections', cs.startswith('Tableau;Circuit') and cs.count('\n') >= 10)
    with pg.expect_download() as d: J("EE.BTViews.libExport()")
    d.value.save_as(tmp / 'l.csv'); lc = (tmp / 'l.csv').read_text(encoding='utf-8-sig')
    imp = J("""(()=>{const t='reference;fabricant;designation;categorie;type;poles;courant_nominal;pouvoir_de_coupure_ka;courbe;modules;prix_unitaire\\nMARQ-X16;Marque X;Disjoncteur 1P+N C16;Disjoncteurs;mcb;1P+N;16;6;C;1;9000';const r=EE.BTLib.importCSV(t,'merge');return [r.added,EE.BTLib.get('MARQ-X16','Marque X').price]})()""")
    check('BT19c Bibliothèque : export CSV et import d\'un produit fabricant', lc.startswith('reference;fabricant') and imp == [1, 9000], imp)
    h = J("EE.BTViews.dossierHTML()")
    check('BT19d Dossier d\'étude : garde, bilan, unifilaire, notes, protections, câbles, matériel, 2D, 3D, étiquettes, commande, chiffrage, réserves', all(k in h for k in ['Dossier d\'étude', 'Bilan de puissance', 'Schéma unifilaire', 'Notes de calcul', 'Tableau des protections', 'sections de câbles', 'Liste de matériel', 'Implantation', 'Vue 3D', 'Étiquettes', 'Bon de commande', 'Chiffrage', 'Réserves']) and h.count('<svg') >= 6)
    pg.click('.bttab[data-t=lab]')
    check('BT19e Étiquettes générées et paramétrables', pg.locator('.lab').count() >= 10 and pg.locator('#lb-w').count() == 1)

    # X20 unifilaire auto dans l'atelier
    J("EE.BTViews.unifilaire()"); pg.wait_for_selector('#sheet', timeout=8000)
    u = J("[EE.app.project.schema, EE.app.project.sheets.length, EE.app.project.doc.comps.length, EE.app.project.doc.comps.filter(c=>c.type==='disjoncteur').length]")
    check('BT20 Schéma unifilaire généré dans l\'atelier (une feuille par tableau, modifiable)', u[0] == 'unifilaire' and u[1] == 3 and u[2] > 10 and u[3] >= 3, u)
    issues = J("EE.BTViews.unifDocs().flatMap(u=>EE.Engine.verify(u.doc).issues).filter(i=>/non raccordé : cette|ambiguë|posée sur un conducteur/.test(i.msg)).map(i=>i.msg).slice(0,5)")
    check('BT20b Unifilaire généré : tous les conducteurs raccordés (aucun fil en l\'air, aucune jonction ambiguë)', not issues, issues)

    # X21 persistance, import / export
    pg.click('nav .nav[data-go=bt]'); pg.wait_for_selector('.bt')
    pg.click('#btmenu .mtop[data-m="0"]'); pg.click('#btmenu .mitem:has-text("Fermer l\'étude")'); pg.wait_for_selector('#bt-new')
    check('BT21 Études enregistrées et listées', pg.locator('.tr[data-id]').count() == 2)
    s = J("JSON.stringify({format:'yak-elec-pro-etude-bt',version:1,study:EE.BTUI.Studies.list()[0]})")
    J(f"EE.BTUI.importStudy({s!r})")
    check('BT21b Import d\'une étude (.json)', J("EE.BTUI.Studies.list().length") == 3)
    pg.locator('.tr[data-id] [data-a=arch]').first.click()
    check('BT21c Archivage (masquée de la liste)', pg.locator('.tr[data-id]').count() == 2)

    # X22 mobile / sombre
    pg.set_viewport_size({'width': 390, 'height': 800}); pg.locator('.tr[data-id] [data-a=open]').first.click(); pg.wait_for_selector('.bt')
    ov = J("document.documentElement.scrollWidth - innerWidth")
    check('BT22 Affichage mobile sans débordement horizontal', ov <= 2, ov)
    pg.set_viewport_size({'width': 1400, 'height': 900})

    real = [e for e in errs if 'favicon' not in e]
    check('BT23 Aucune erreur JavaScript', not real, real[:5])
    pg.screenshot(path=str(tmp / 'bt.png'))
    b.close()
fails = [n for n, ok in res if not ok]
print(f"\n{len(res) - len(fails)}/{len(res)} tests réussis")
sys.exit(1 if fails else 0)
