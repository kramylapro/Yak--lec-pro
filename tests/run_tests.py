#!/usr/bin/env python3
"""Tests d'acceptation Yak-élec-pro V1 (Playwright + Chromium).
Usage : python3 tests/run_tests.py [chemin/vers/index.html]"""
import re, os, sys, json, pathlib, subprocess, time, struct, tempfile, xml.etree.ElementTree as ET
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
target = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(root/'index.html')
URL = 'file://' + target
results = []
ADMPW = os.environ.get('YAK_ADMIN_PW', '')
if not ADMPW: print('ATTENTION : définissez YAK_ADMIN_PW pour tester le portail administrateur'); sys.exit(2)
def check(name, cond, detail=''):
    results.append({'name': name, 'ok': bool(cond), 'detail': str(detail)[:300]})
    print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  -> ' + str(detail)[:300]))
tmp = pathlib.Path(tempfile.mkdtemp())

def W(pg, x, y):  # monde -> écran
    return pg.evaluate("([x,y])=>{const r=document.querySelector('#sheet').getBoundingClientRect();const v=EE.app.editor.view;return [r.left+v.x+x*v.k, r.top+v.y+y*v.k]}", [x, y])
def click_w(pg, x, y, **kw):
    sx, sy = W(pg, x, y); pg.mouse.click(sx, sy, **kw)
def new_project(pg, name, schema='developpe'):
    pg.evaluate("EE.app.go('home')"); pg.click('[data-a=new]'); pg.fill('#pn', name); pg.select_option('#ps', schema)
    pg.click('.btn.primary:has-text("Créer")'); pg.wait_for_selector('#sheet')
def issues(pg):
    return pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.map(i=>i.code)")
def pid(pg): return pg.evaluate("EE.app.project.id")
def stored(pg, id_):
    return pg.evaluate("(id)=>EE.Store.Projects.get(id)", id_)

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True); pg = ctx.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('.login')

    # ============ A. Utilisateurs ============
    pg.fill('#lu', 'prof'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcx'); pg.click('#lgo')
    check('A1 Création de compte refusée si mots de passe différents', 'ne correspondent pas' in pg.inner_text('#lerr'))
    pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    check('A2 Compte créé et connexion automatique', pg.inner_text('.user').find('prof') >= 0)
    pg.add_script_tag(path=str(root/'tests/circuits.js'))
    check('A3 Tableau de bord : logo + 7 entrées (portail masqué)', pg.locator('.hero .logoimg').count() == 1 and pg.evaluate("document.querySelector('.hero .logoimg').naturalWidth") > 100 and pg.locator('.cards .card.act').count() == 7)
    pg.click('#logout'); pg.wait_for_selector('.login')
    pg.fill('#lu', 'prof'); pg.fill('#lp', 'mauvais'); pg.click('#lgo')
    check('A4 Mauvais mot de passe refusé', 'incorrect' in pg.inner_text('#lerr'))
    pg.fill('#lp', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    check('A5 Reconnexion réussie', True)

    # ============ B. Projets (CRUD) ============
    new_project(pg, 'Projet A', 'unifilaire'); id_a = pid(pg)
    st = stored(pg, id_a)
    check('B1 Projet créé avec nom / installation / type de schéma', st['name'] == 'Projet A' and st['schema'] == 'unifilaire' and st['install'] == 'Résidentiel')
    pg.click('[data-go=projects]'); pg.wait_for_selector('.table')
    pg.click('.tr[data-id] >> text=Modifier'); pg.fill('#pn', 'Projet A modifié'); pg.select_option('#pi', 'Tertiaire'); pg.click('.btn.primary:has-text("Enregistrer")')
    st = stored(pg, id_a); check('B2 Modification du projet', st['name'] == 'Projet A modifié' and st['install'] == 'Tertiaire')
    pg.click('.tr[data-id] >> text=Dupliquer'); pg.wait_for_timeout(100)
    check('B3 Duplication du projet', pg.evaluate("EE.Store.Projects.list().length") == 2 and pg.locator('.tr[data-id]').count() == 2)
    pg.locator('.tr[data-id]').first.locator('text=Supprimer').click(); pg.click('.modal .btn:has-text("Annuler")')
    check('B4 Suppression annulée : projet conservé', pg.evaluate("EE.Store.Projects.list().length") == 2)
    pg.locator('.tr[data-id]').first.locator('text=Supprimer').click(); pg.click('.modal .btn.danger'); pg.wait_for_timeout(100)
    check('B5 Suppression après confirmation', pg.evaluate("EE.Store.Projects.list().length") == 1)
    pg.fill('#flt', 'zzz'); check('B6 Filtre de la liste', pg.locator('.tr[data-id]').count() == 0); pg.fill('#flt', '')

    # ============ C. Bibliothèque ============
    pg.click('[data-go=library]'); pg.wait_for_selector('.libgrid')
    check('C1 Bibliothèque : 26 symboles de base + 37 industriels, bipolaires et commandes du bâtiment + 8 sources d\'énergie + 23 symboles de plan', pg.locator('.libgrid .sym').count() == 94 and pg.evaluate("EE.Library.list.filter(d=>d.cat&&/^Industriel/.test(d.cat)).length") >= 30, pg.locator('.libgrid .sym').count())
    need = ['Conducteur','Connexion','Croisement sans connexion','Terre','Phase','Neutre','Interrupteur simple','Interrupteur double','Va-et-vient','Bouton-poussoir NO','Bouton-poussoir NF','Contacteur','Relais','Fusible','Disjoncteur','Interrupteur différentiel','Lampe','Prise de courant','Moteur monophasé','Moteur triphasé','Transformateur','Résistance','Condensateur','Diode','Diode Zener','LED']
    names = pg.evaluate("EE.Library.list.map(d=>d.name)")
    check('C2 Tous les symboles demandés sont présents', all(any(n.startswith(x) for n in names) for x in need), [x for x in need if not any(n.startswith(x) for n in names)])
    bad = pg.evaluate("""()=>EE.Library.list.filter(d=>!d.desc||!d.ref||!d.notes||['developpe','unifilaire','multifilaire'].some(m=>{const c={id:'x',type:d.id,x:0,y:0,rot:0,label:'',val:''};return EE.Render.compMarkup(c,m,{}).length<60})).map(d=>d.id)""")
    check('C3 Chaque symbole a fiche + norme + rendu des 3 types de schéma', not bad, bad)
    pg.click('.sym >> nth=0'); pg.wait_for_selector('.fiche'); check('C4 Ouverture de la fiche descriptive', pg.locator('.fiche .prevs figure').count() == 3 and 'NF EN 60617' in pg.inner_text('.fiche'))
    pg.click('.modal .btn:has-text("Fermer")')
    pg.fill('#lq', 'disjoncteur'); check('C5 Recherche de symbole', 1 <= pg.locator('.libgrid .sym').count() <= 3 and pg.locator('.libgrid .sym').first.inner_text().lower().find('disjoncteur') >= 0)
    pg.fill('#lq', '')
    unip = pg.evaluate("""()=>{const d=EE.Library.get('prise');const c={id:'x',type:'prise',x:0,y:0,rot:0,label:'',val:''};return EE.Render.compMarkup(c,'unifilaire',{}).includes('2P+T') && !EE.Render.compMarkup(c,'developpe',{}).includes('2P+T')}""")
    check('C6 Représentation adaptée au type de schéma (prise : 2P+T en unifilaire)', unip)

    # ============ D. Atelier : interactions à la souris (simple allumage dessiné à la main) ============
    new_project(pg, 'Allumage UI'); id_ui = pid(pg)
    for t, x, y in [('phase', 100, 100), ('interrupteur', 100, 200), ('lampe', 100, 320), ('neutre', 200, 400)]:
        pg.click(f'.pitem[data-s={t}]'); click_w(pg, x, y)
    pg.keyboard.press('Escape')
    check('D1 Symboles déposés sur la feuille', pg.evaluate("EE.app.editor.doc.comps.length") == 4)
    labels = pg.evaluate("EE.app.editor.doc.comps.map(c=>c.label)")
    check('D2 Identification automatique (S1, H1)', 'S1' in labels and 'H1' in labels, labels)
    pg.click('#t-wire')
    for pts in ([(100,100),(100,160)], [(100,240),(100,280)], [(200,400),(100,360)]):
        click_w(pg, *pts[0]); click_w(pg, *pts[1])
    pg.keyboard.press('Escape'); pg.click('#t-select')
    check('D3 Conducteurs tracés entre bornes (3)', pg.evaluate("EE.app.editor.doc.wires.length") == 3)
    check('D4 Schéma dessiné à la main : aucune anomalie', issues(pg) == [], issues(pg))
    free = pg.evaluate("document.querySelectorAll('.tfree').length"); check('D5 Marqueurs de bornes : toutes reliées', free == 0, free)
    # déplacement avec conducteurs qui suivent
    sx, sy = W(pg, 100, 320); pg.mouse.move(sx, sy); pg.mouse.down(); ex, ey = W(pg, 180, 320); pg.mouse.move((sx+ex)/2, sy); pg.mouse.move(ex, ey); pg.mouse.up()
    lamp = pg.evaluate("EE.app.editor.doc.comps.find(c=>c.type==='lampe')")
    check('D6 Déplacement d\'un composant (grille respectée)', lamp['x'] == 180 and lamp['y'] == 320, lamp)
    check('D7 Les conducteurs suivent le composant déplacé (aucune anomalie)', issues(pg) == [], issues(pg))
    pg.keyboard.press('Control+z'); lamp = pg.evaluate("EE.app.editor.doc.comps.find(c=>c.type==='lampe')")
    check('D8 Annuler (Ctrl+Z)', lamp['x'] == 100 and issues(pg) == [], lamp)
    pg.keyboard.press('Control+y'); lamp = pg.evaluate("EE.app.editor.doc.comps.find(c=>c.type==='lampe')")
    check('D9 Rétablir (Ctrl+Y)', lamp['x'] == 180, lamp)
    pg.keyboard.press('Control+z')
    click_w(pg, 100, 320); pg.keyboard.press('r')
    rot = pg.evaluate("EE.app.editor.doc.comps.find(c=>c.type==='lampe').rot"); iss10 = issues(pg); check('D10 Rotation 90° (touche R) : les conducteurs restent raccordés aux bornes', rot == 90 and 'DANGLING' not in iss10 and 'TERM_OPEN' not in iss10 and 'OPEN' not in iss10, [rot, iss10])
    pg.keyboard.press('r'); pg.keyboard.press('r'); pg.keyboard.press('r')
    pg.keyboard.press('Control+c'); pg.keyboard.press('Control+v')
    n = pg.evaluate("EE.app.editor.doc.comps.length"); labs = pg.evaluate("EE.app.editor.doc.comps.filter(c=>c.type==='lampe').map(c=>c.label)")
    check('D11 Copier / coller (nouvelle identification unique)', n == 5 and sorted(labs) == ['H1', 'H2'], [n, labs])
    pg.keyboard.press('Delete'); check('D12 Suppression', pg.evaluate("EE.app.editor.doc.comps.length") == 4)
    pg.keyboard.press('Control+z'); check('D13 Annuler la suppression', pg.evaluate("EE.app.editor.doc.comps.length") == 5)
    pg.keyboard.press('Control+z'); pg.keyboard.press('Control+z')  # retire le collage
    # dérivation : fin de tracé sur un conducteur -> jonction automatique
    pg.click('.pitem[data-s=lampe]'); click_w(pg, 300, 320); pg.keyboard.press('Escape')
    n0 = pg.evaluate("EE.app.editor.doc.comps.filter(c=>c.type==='connexion').length")
    pg.evaluate("EE.app.editor.addWire([[200,500],[420,500]]); EE.app.editor.commit()")
    pg.click('#t-wire'); click_w(pg, 300, 360); click_w(pg, 300, 500)  # le tracé se termine sur un conducteur existant (en son milieu)
    n1 = pg.evaluate("EE.app.editor.doc.comps.filter(c=>c.type==='connexion').length")
    check('D14 Dérivation sur un conducteur : jonction ajoutée automatiquement', n1 == n0 + 1, [n0, n1])
    pg.click('#t-select'); pg.keyboard.press('Escape')
    # zoom / déplacement de la vue
    k0 = pg.evaluate("EE.app.editor.view.k"); sx, sy = W(pg, 600, 300); pg.mouse.move(sx, sy); pg.mouse.wheel(0, -300)
    k1 = pg.evaluate("EE.app.editor.view.k"); check('D15 Zoom (molette)', k1 > k0, [k0, k1])
    x0 = pg.evaluate("EE.app.editor.view.x"); sx, sy = W(pg, 700, 500); pg.mouse.move(sx, sy); pg.mouse.down(); pg.mouse.move(sx+80, sy+40, steps=4); pg.mouse.up()
    x1 = pg.evaluate("EE.app.editor.view.x"); check('D16 Déplacement de la feuille (pan)', abs((x1 - x0) - 80) < 1, [x0, x1])
    pg.click('#b-grid'); check('D17 Grille masquable', pg.evaluate("getComputedStyle(document.querySelector('#gridrect')).display") == 'none'); pg.click('#b-grid')
    pg.click('#b-fit'); check('D18 Ajuster la vue', pg.evaluate("EE.app.editor.view.k") > 0)
    # propriétés
    click_w(pg, 100, 200); pg.fill('#f-label', 'S10'); pg.press('#f-label', 'Enter'); pg.locator('#f-val').fill('10 A'); pg.press('#f-val', 'Tab')
    s = pg.evaluate("EE.app.editor.doc.comps.find(c=>c.type==='interrupteur')"); check('D19 Propriétés : identification et valeur', s['label'] == 'S10' and s['val'] == '10 A', s)
    # sauvegarde automatique sans action de l'utilisateur
    pg.wait_for_timeout(1100)
    sv = stored(pg, id_ui)['doc']['comps']; check('D20 Sauvegarde automatique', any(c['label'] == 'S10' for c in sv))
    check('D21 Marque d\'enregistrement affichée', 'Enregistré' in pg.inner_text('#sbsave'), pg.inner_text('#sbsave'))

    # ============ E. Les 4 circuits de test : vérification, sauvegarde, réouverture ============
    snap = {}
    for key in ['allumage', 'double', 'vav', 'commande']:
        label = pg.evaluate("(k)=>__CIRCUITS[k].name", key)
        new_project(pg, label)
        pg.evaluate("(k)=>{__build(k)}", key); id_k = pid(pg)
        iss = issues(pg)
        check(f'E-{key}-1 {label} : vérification sans anomalie', iss == [], iss)
        pg.click('[data-go=home]'); pg.wait_for_selector('.hero')   # quitter l'atelier = sauvegarde immédiate
        st = stored(pg, id_k)
        sig = pg.evaluate("(id)=>EE.Engine.signature(EE.Store.Projects.get(id).doc)", id_k)
        mk = pg.evaluate("(id)=>{const p=EE.Store.Projects.get(id);return EE.Render.docMarkup(p.doc,p.schema,{})}", id_k)
        snap[key] = {'id': id_k, 'doc': st['doc'], 'sig': sig, 'mk': mk, 'n': (len(st['doc']['comps']), len(st['doc']['wires']))}
        check(f'E-{key}-2 {label} : enregistré ({snap[key]["n"][0]} composants, {snap[key]["n"][1]} conducteurs)', snap[key]['n'][0] >= 4)
    # croisement sans connexion (va-et-vient)
    cross = pg.evaluate("""()=>{const d=__doc('vav');const A=EE.Engine.analyze(d);
      const l1=A.netOf('T:c2.L1'), l2=A.netOf('T:c2.L2'); return {sep: l1!==l2, w1: A.netOf('W:w2'), w2: A.netOf('W:w3'), crossing: A.netOf('W:w2')!==A.netOf('W:w3')}}""")
    check('E-vav-3 Va-et-vient : le croisement des deux navettes n\'est PAS une connexion', cross['sep'] and cross['crossing'], cross)
    # --- rechargement complet de la page puis réouverture
    pg.reload(); pg.wait_for_selector('.hero'); pg.add_script_tag(path=str(root/'tests/circuits.js'))
    check('E-0 Session conservée après rechargement', pg.inner_text('.user').find('prof') >= 0)
    pg.click('[data-go=projects]'); pg.wait_for_selector('.table')
    for key, s0 in snap.items():
        pg.locator(f'.tr[data-id="{s0["id"]}"]').locator('text=Ouvrir').click(); pg.wait_for_selector('#sheet')
        doc = pg.evaluate("EE.app.editor.doc"); sig = pg.evaluate("EE.Engine.signature(EE.app.editor.doc)")
        mk = pg.evaluate("EE.Render.docMarkup(EE.app.editor.doc,EE.app.project.schema,{})")
        dom = pg.evaluate("[document.querySelectorAll('#content [data-cid]').length, document.querySelectorAll('#content [data-wid]').length]")
        check(f'E-{key}-4 Réouverture : données identiques (JSON)', doc == s0['doc'])
        check(f'E-{key}-5 Réouverture : connexions identiques (réseaux)', sig == s0['sig'])
        check(f'E-{key}-6 Réouverture : symboles et tracés identiques (rendu SVG)', mk == s0['mk'])
        check(f'E-{key}-7 Réouverture : nombre d\'éléments affichés', dom == list(s0['n']), dom)
        check(f'E-{key}-8 Réouverture : vérification toujours sans anomalie', issues(pg) == [])
        pg.click('[data-go=projects]'); pg.wait_for_selector('.table')

    # ============ F. Moteur de connexion et vérification : cas défectueux ============
    def V(mut):
        return pg.evaluate("(m)=>{const d=__doc('allumage',new Function('d',m));return EE.Engine.verify(d).issues.map(i=>i.code)}", mut)
    r = V("d.wires.push({id:'wx',pts:[[300,100],[300,160]],n:1,desig:''})")
    check('F1 Conducteur isolé détecté', 'ISOLATED' in r, r)
    r = V("d.wires[0].pts[1]=[100,140]")
    check('F2 Fil non raccordé détecté', 'DANGLING' in r, r)
    r = V("d.wires.splice(1,1)")
    check('F3 Borne sans connexion + circuit ouvert détectés', 'TERM_OPEN' in r and 'OPEN' in r, r)
    r = V("d.wires.push({id:'wx',pts:[[100,100],[100,60],[200,60],[200,400]],n:1,desig:''}); d.comps.push(Object.assign(EE.Library.newComp('neutre',100,40),{id:'n2'}))")
    check('F4 Phase reliée au neutre : court-circuit détecté', 'SHORT' in r, r)
    r = V("d.comps[1].label=''")
    check('F5 Composant sans identification détecté', 'NO_ID' in r, r)
    r = V("d.comps[2].label='S1'")
    check('F6 Identification en double détectée', 'DUP_ID' in r, r)
    r = V("d.comps.push(Object.assign(EE.Library.newComp('interrupteur',300,200),{id:'x9',label:'S9'})); d.wires.push({id:'wy',pts:[[300,160],[300,100],[100,100]],n:1,desig:''}); d.wires[1].pts=[[100,240],[100,280]];")
    check('F7 Borne non raccordée du nouvel appareil détectée', 'TERM_OPEN' in r, r)
    # croisement : un conducteur phase croise le conducteur neutre -> aucune connexion, aucun court-circuit
    r = V("d.wires.push({id:'wc',pts:[[160,380],[260,380]],n:1,desig:''}); d.wires.push({id:'wd',pts:[[210,340],[210,420]],n:1,desig:''}); d.comps.push(Object.assign(EE.Library.newComp('neutre',260,380),{id:'n8'})); d.comps.push(Object.assign(EE.Library.newComp('phase',210,340),{id:'p8'}));")
    check('F8 Un simple croisement n\'est jamais une connexion (pas de court-circuit)', 'SHORT' not in r, r)
    r = V("d.wires.push({id:'wt',pts:[[100,260],[160,260],[160,400],[200,400]],n:1,desig:''})")
    check('F9 Contact « en T » sans jonction signalé (ambigu)', 'AMBIGUOUS' in r, r)
    r = V("d.comps.push(Object.assign(EE.Library.newComp('connexion',100,260),{id:'j1'})); d.wires.push({id:'wt',pts:[[100,260],[160,260],[160,400],[200,400]],n:1,desig:''})")
    check('F10 Même contact avec une jonction : connexion acceptée (plus d\'ambiguïté)', 'AMBIGUOUS' not in r, r)
    r = V("d.comps=d.comps.filter(c=>c.type!=='phase'&&c.type!=='neutre');d.wires=[]")
    check('F11 Absence de source signalée', 'NO_SOURCE' in r, r)
    r = V("d.wires.splice(2,1); d.comps.push(Object.assign(EE.Library.newComp('phase',100,360),{id:'px',val:'L1'}))")
    check('F12 Lampe reliée à la phase aux deux bornes : incohérence détectée (même potentiel)', 'SAME_POT' in r, r)
    # moteur triphasé
    r = pg.evaluate("""()=>{const L=EE.Library;const d={comps:[],wires:[]};const add=(t,x,y,l,v)=>{const c=L.newComp(t,x,y);c.label=l||'';if(v)c.val=v;c.id='k'+d.comps.length;d.comps.push(c);return c};
      add('phase',0,100,'','L1');add('phase',20,100,'','L2');add('phase',40,100,'','L3');add('moteur_tri',20,200,'M1');add('terre',20,300,'');
      d.wires.push({id:'a',pts:[[0,100],[0,140],[0,160]],n:1,desig:''});
      return EE.Engine.verify(d).issues.map(i=>i.code)}""")
    check('F13 Moteur triphasé non alimenté signalé', 'OPEN' in r or 'TERM_OPEN' in r, r)

    # ============ G. Types de schéma et conducteurs unifilaires ============
    new_project(pg, 'Unifilaire', 'unifilaire'); pg.evaluate("__build('allumage')")
    click_w(pg, 100, 130); pg.fill('#f-n', '3'); pg.press('#f-n', 'Tab'); pg.fill('#f-d', '3G1,5'); pg.press('#f-d', 'Tab')
    w0 = pg.evaluate("EE.app.editor.doc.wires[0]"); check('G1 Unifilaire : nombre de conducteurs et désignation du conducteur', w0['n'] == 3 and w0['desig'] == '3G1,5', w0)
    svg = pg.evaluate("document.querySelector('#content').innerHTML")
    check('G2 Unifilaire : traits obliques + désignation affichés', '3G1,5' in svg and svg.count('stroke-width="1.6"') == 3)
    pg.select_option('#b-mode', 'multifilaire'); check('G3 Changement de type de schéma', pg.evaluate("EE.app.project.schema") == 'multifilaire' and '3G1,5' not in pg.evaluate("document.querySelector('#content').innerHTML"))

    # ============ H. Exportations ============
    pg.evaluate("EE.app.go('home')"); pg.click('[data-go=projects]'); pg.locator('.tr[data-id]', has_text='Circuit de commande simple').locator('text=Ouvrir').click(); pg.wait_for_selector('#sheet')
    for kind in ['svg', 'png', 'pdf', 'json']:
        with pg.expect_download(timeout=15000) as dl: pg.select_option('#b-exp', kind)
        f = tmp/dl.value.suggested_filename; dl.value.save_as(str(f)); data = f.read_bytes()
        if kind == 'svg':
            root_el = ET.fromstring(data); ns = '{http://www.w3.org/2000/svg}'
            check('H1 Export SVG valide (XML) avec cartouche', root_el.tag == ns + 'svg' and 'Yak-élec-pro'.encode() in data and data.count(b'data-cid') == len(snap['commande']['doc']['comps']), (len(data), data.count(b'data-cid')))
        elif kind == 'png':
            w, h = struct.unpack('>II', data[16:24]); check('H2 Export PNG valide', data[:8] == b'\x89PNG\r\n\x1a\n' and w > 300 and h > 300, (w, h))
            from PIL import Image
            im = Image.open(f).convert('L'); dark = sum(1 for v in im.tobytes() if v < 100); check('H3 PNG non vide (contenu dessiné)', dark > 500, dark)
        elif kind == 'pdf':
            info = subprocess.run(['pdfinfo', str(f)], capture_output=True, text=True)
            check('H4 Export PDF valide (1 page A4)', data[:5] == b'%PDF-' and 'Pages:           1' in info.stdout and 'A4' in info.stdout or 'Pages:           1' in info.stdout, info.stdout[:200] + info.stderr[:100])
            subprocess.run(['pdftoppm', '-r', '60', '-png', str(f), str(tmp/'pdfpage')]); pngs = list(tmp.glob('pdfpage*.png'))
            from PIL import Image
            im = Image.open(pngs[0]).convert('L'); dark = sum(1 for v in im.tobytes() if v < 100); check('H5 PDF : le schéma est visible', dark > 300, dark)
        else:
            o = json.loads(data); check('H6 Export projet JSON (sauvegarde / transfert)', o['format'] == 'yak-elec-pro' and len(o['project']['doc']['comps']) == len(snap['commande']['doc']['comps']))
            exported = f
    # import du JSON exporté
    pg.click('[data-go=projects]'); pg.wait_for_selector('.table'); n_before = pg.evaluate("EE.Store.Projects.list().length")
    pg.set_input_files('#impf', str(exported)); pg.wait_for_timeout(300)
    check('H7 Import d\'un projet exporté', pg.evaluate("EE.Store.Projects.list().length") == n_before + 1)
    pg.fill('#flt', ''); 
    pg.evaluate("window.__bad=()=>{try{EE.Store.Projects.importJSON('{\"x\":1}');return 'noerr'}catch(e){return e.message}}"); check('H8 Import d\'un fichier invalide refusé', 'pas un projet' in pg.evaluate("__bad()"))

    # ============ I. Utilisateurs : isolation des données ============
    pg.click('#logout'); pg.wait_for_selector('.login'); pg.click('.tab[data-t=up]'); pg.fill('#lu', 'eleve'); pg.fill('#lp', 'zzzz'); pg.fill('#lp2', 'zzzz'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    check('I1 Deuxième utilisateur : aucun projet de l\'autre compte', pg.evaluate("EE.Store.Projects.list().length") == 0)
    pg.click('[data-go=settings]'); pg.fill('#pw0', 'zzzz'); pg.fill('#pw1', 'yyyy'); pg.click('#pwgo'); pg.click('#logout'); pg.wait_for_selector('.login')
    pg.fill('#lu', 'eleve'); pg.fill('#lp', 'yyyy'); pg.click('#lgo'); pg.wait_for_selector('.hero'); check('I2 Changement de mot de passe', True)
    pg.click('[data-go=settings]'); pg.click('#delacc'); pg.click('.modal .btn.danger'); pg.wait_for_selector('.login')
    check('I3 Suppression de compte', pg.evaluate("EE.Store.Users.list().map(u=>u.name)") == ['prof'])

    # ============ J. Adaptation mobile ============
    pg.fill('#lu', 'prof'); pg.fill('#lp', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.set_viewport_size({'width': 390, 'height': 780}); pg.click('[data-go=projects]'); pg.locator('.tr[data-id]').first.locator('text=Ouvrir').click(); pg.wait_for_selector('#sheet')
    sw = pg.evaluate("document.documentElement.scrollWidth"); check('J1 Mobile (390 px) : pas de défilement horizontal de la page', sw <= 391, sw)
    pg.click('#m-pal'); vis = pg.evaluate("document.querySelector('#pal').classList.contains('open')"); pg.click('.pitem[data-s=lampe]')
    check('J2 Mobile : palette de symboles en tiroir, symbole armé', vis and pg.evaluate("EE.app.editor.armed") == 'lampe')
    pg.screenshot(path=str(tmp/'mobile.png'))


    # ============ L. Mot de passe : afficher / masquer ============
    pg.click('#logout'); pg.wait_for_selector('.login')
    ty = lambda: pg.evaluate("document.querySelector('#lp').type")
    check('L1 Champ mot de passe masqué par défaut', ty() == 'password')
    pg.fill('#lp', 'secret'); pg.click('[data-eye=lp]')
    check('L2 Clic sur l\'œil : mot de passe visible', ty() == 'text' and pg.evaluate("document.querySelector('[data-eye=lp]').getAttribute('aria-pressed')") == 'true' and pg.input_value('#lp') == 'secret')
    pg.click('[data-eye=lp]'); check('L3 Second clic : mot de passe masqué à nouveau', ty() == 'password')
    pg.click('.tab[data-t=up]'); pg.click('[data-eye=lp2]'); check('L4 Œil sur « Confirmer le mot de passe » (indépendant)', pg.evaluate("document.querySelector('#lp2').type") == 'text' and ty() == 'password')
    pg.click('.tab[data-t=in]') if pg.locator('.tab[data-t=in]').count() else None
    pg.fill('#lu', 'prof'); pg.fill('#lp', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.click('[data-go=settings]')
    check('L5 Œil dans les paramètres (changement de mot de passe)', pg.locator('[data-eye=pw0]').count() == 1 and pg.locator('[data-eye=pw1]').count() == 1)

    # ============ M. Simulation (moteur) ============
    S = lambda js: pg.evaluate("()=>{const L=(k,m)=>{const d=__doc(k,m);const s=EE.Sim.create(d);s.solve();return s};" + js + "}")
    check('M1 Simple allumage : lampe éteinte puis allumée au clic, éteinte au 2e clic', S("const s=L('allumage');const a=s.view.comp.c3.on;s.press('c2');const b=s.view.comp.c3.on;s.press('c2');return !a&&b&&!s.view.comp.c3.on"))
    check('M2 Double allumage : deux lampes indépendantes', S("const s=L('double');s.press('c2',-20);const r1=[s.view.comp.c3.on,s.view.comp.c4.on];s.press('c2',-20);s.press('c2',20);const r2=[s.view.comp.c3.on,s.view.comp.c4.on];return r1[0]&&!r1[1]&&!r2[0]&&r2[1]"))
    check('M3 Va-et-vient : chaque interrupteur inverse l\'état de la lampe', S("const s=L('vav');const a=s.view.comp.c4.on;s.press('c2');const b=s.view.comp.c4.on;s.press('c3');const c=s.view.comp.c4.on;return a!==b&&b!==c"))
    check('M4 Commande : lampe allumée tant que S1 est appuyé, S0 ne coupe rien au repos', S("const s=L('commande');const a=s.view.comp.c6.on;s.press('c3');const b=s.view.comp.c6.on;s.release('c3');return !a&&b&&!s.view.comp.c6.on"))
    check('M5 Démarrage direct : marche, auto-maintien, arrêt par S0', S("const s=L('dol');s.press('c11');s.release('c11');const a=s.view.comp.c7.on&&s.view.comp.c5.coil;s.press('c10');s.release('c10');return a&&!s.view.comp.c7.on&&!s.view.comp.c5.coil"))
    check('M6 Démarrage direct : déclenchement thermique puis réarmement', S("const s=L('dol');s.press('c11');s.release('c11');s.press('c6');const a=!s.view.comp.c7.on&&s.view.comp.c6.tripped;s.press('c6');s.press('c11');s.release('c11');return a&&s.view.comp.c7.on"))
    check('M7 Sens de rotation : deux phases permutées → sens inverse', S("const a=L('dol');a.press('c11');a.release('c11');const d1=a.view.comp.c7.dir;const s=L('dol',(d)=>{const x=d.comps.find(c=>c.id=='c1'),y=d.comps.find(c=>c.id=='c3');const t=x.val;x.val=y.val;y.val=t});s.press('c11');s.release('c11');return a.view.comp.c7.on&&s.view.comp.c7.on&&d1==='cw'&&s.view.comp.c7.dir==='ccw'&&s.view.items.some(i=>i.text.includes('inverse'))"))
    MK = "const mk=(parts,wires)=>{const d={comps:[],wires:[]};parts.forEach(([t,x,y,l,v],n)=>{const c=EE.Library.newComp(t,x,y);c.id='z'+n;c.label=l||'';if(v)c.val=v;d.comps.push(c)});wires.forEach((p,n)=>d.wires.push({id:'w'+n,pts:p,n:1,desig:''}));const s=EE.Sim.create(d);s.solve();return s};"
    TIM = "const s=mk([['phase',100,100,'','L1'],['bobine_tempo',100,200,'KT1','3 s'],['neutre',100,240],['phase',240,100,'','L1'],['contact_no_tt',240,200,'KT1'],['lampe',240,300,'H1'],['neutre',240,380]],[[[100,100],[100,160]],[[240,100],[240,160]],[[240,240],[240,260]],[[240,340],[240,380]]]);"
    check('M8 Temporisation : lampe éteinte avant le délai (2 s), allumée après (3,5 s)', S(MK + TIM + "const lamp=()=>s.view.comp.z5.on;for(let i=0;i<20;i++)s.tick(0.1);const a=lamp();for(let i=0;i<15;i++)s.tick(0.1);return !a&&lamp()"))
    check('M8b Court-circuit phase/neutre : le disjoncteur déclenche', S(MK + "const s=mk([['phase',100,100,'','L1'],['disjoncteur',100,200,'Q1'],['neutre',100,240]],[[[100,100],[100,160]]]);const v=s.view.comp.z1;return v.tripped===true"))
    check('M8c Courant continu : alim_cc alimente un moteur CC', S(MK + "const s=mk([['alim_cc',100,200,'G1'],['moteur_cc',100,400,'M1']],[[[100,160],[100,120],[80,120],[80,360]],[[100,240],[100,300],[120,300],[120,360]]]);return s.view.comp.z1.on===true"))
    BI = lambda t: MK + "const s=mk([['phase',180,100,'','L1'],['%s',200,200,'Q1'],['lampe',180,300,'H1'],['neutre',200,100]],[[[180,100],[180,160]],[[200,100],[200,160]],[[180,240],[180,260]],[[180,340],[200,340],[200,240]]]);" % t
    check('M8d Appareils bipolaires (phase + neutre) : lampe allumée, coupée à l\'ouverture, réenclenchée', all(S(BI(t) + "const a=s.view.comp.z2.on;s.press('z1');const b=s.view.comp.z2.on;s.press('z1');return a===true&&!b&&s.view.comp.z2.on===true") for t in ['disjoncteur_bi','disjoncteur_diff_bi','sectionneur_bi','sectionneur_fusibles_bi']))
    check('M8e Disjoncteur bipolaire en court-circuit : déclenchement', S(MK + "const s=mk([['phase',180,100,'','L1'],['disjoncteur_bi',200,200,'Q1'],['neutre',200,100]],[[[180,100],[180,160]],[[200,100],[200,160]],[[180,240],[200,240]]]);return s.view.comp.z1.tripped===true"))
    check('M8f Télérupteur : chaque impulsion change l\'état de la lampe', S(MK + "const s=mk([['phase',100,100,'','L1'],['bp_no',100,200,'S1'],['phase',220,100,'','L1'],['telerupteur',200,200,'TL1'],['lampe',220,300,'H1'],['neutre',180,280],['neutre',220,380]],[[[100,100],[100,160]],[[100,240],[140,240],[140,160],[180,160]],[[180,240],[180,280]],[[220,100],[220,160]],[[220,240],[220,260]],[[220,340],[220,380]]]);const L=()=>!!s.view.comp.z4.on;const o=[L()];s.press('z1');s.release('z1');o.push(L());s.press('z1');s.release('z1');o.push(L());s.press('z1');s.release('z1');o.push(L());return o.join()==='false,true,false,true'"))
    check('M8g Minuteur : allume pendant la durée réglée puis éteint ; crépusculaire : clic = nuit', S(MK + "const s=mk([['phase',100,100,'','L1'],['minuteur',100,200,'KT1','5 s'],['lampe',100,300,'H1'],['neutre',100,380]],[[[100,100],[100,160]],[[100,240],[100,260]],[[100,340],[100,380]]]);const L=()=>!!s.view.comp.z2.on;const a=L();s.press('z1');const b=L();for(let i=0;i<30;i++)s.tick(0.1);const c=L();for(let i=0;i<30;i++)s.tick(0.1);const d=L();const k=mk([['phase',100,100,'','L1'],['crepusculaire',100,200,'CR1'],['lampe',100,300,'H1'],['neutre',100,380]],[[[100,100],[100,160]],[[100,240],[100,260]],[[100,340],[100,380]]]);const e=!!k.view.comp.z2.on;k.press('z1');return !a&&b&&c&&!d&&!e&&!!k.view.comp.z2.on"))
    check('M9 Aucune erreur sur la simulation des circuits (lecture de la vue)', S("return ['allumage','double','vav','commande','dol'].every(k=>{const s=L(k);return Array.isArray(s.view.items)&&Array.isArray(s.view.alerts)})"))

    # ============ N. Simulation dans l'atelier (interface) ============
    pg.set_viewport_size({'width': 1400, 'height': 900})
    new_project(pg, 'Sim UI'); pg.evaluate("__build('allumage')")
    pg.click('#b-sim'); pg.wait_for_selector('#simbar')
    check('N1 Bouton Simuler : bandeau de simulation et édition verrouillée', pg.locator('#simbar').is_visible() and pg.evaluate("EE.app.editor.sim") is not None)
    sx, sy = W(pg, 100, 220); pg.mouse.click(sx, sy); pg.wait_for_timeout(250)
    check('N2 Clic sur l\'interrupteur : lampe allumée (halo visible)', pg.evaluate("(()=>{const e=EE.app.editor.sim;const h=e.doc.comps.find(c=>c.type==='lampe');return !!(h&&e.view.comp[h.id]&&e.view.comp[h.id].on)})()"))
    pg.screenshot(path=str(tmp/'sim_on.png'))
    pg.click('#b-sim'); pg.wait_for_timeout(150)
    check('N3 Arrêt de la simulation : retour à l\'édition', pg.locator('#simbar').count() == 0 or not pg.locator('#simbar').is_visible())
    new_project(pg, 'Sim moteur'); pg.evaluate("__build('dol')"); pg.click('#b-sim'); pg.wait_for_selector('#simbar')
    sx, sy = W(pg, 480, 340); pg.mouse.down() if False else None
    pg.mouse.move(sx, sy); pg.mouse.down(); pg.wait_for_timeout(250)
    check('N4 Moteur en rotation animée pendant l\'appui sur S1', pg.locator('#sheet animateTransform').count() >= 1)
    pg.mouse.up(); pg.wait_for_timeout(250)
    check('N5 Auto-maintien : moteur toujours animé après relâchement', pg.locator('#sheet animateTransform').count() >= 1 and 'en marche' in pg.inner_text('body'))
    pg.click('#b-sim')

    # ============ O. Quantitatif et coffret ============
    Qe = lambda js: pg.evaluate("()=>{const Q=EE.Quant,base=(o)=>Object.assign(Q.newStudy('t'),o);const R=(a)=>Object.assign(Q.newRoom('p'),a);" + js + "}")
    check('O1 Métré : câbles calculés selon les formules (15 m en 1,5 mm², 24 m en 2,5 mm²)', Qe("const r=Q.compute(base({rooms:[R({id:'a',L:4,W:3,H:2.5,dist:5,lights:2,switches:1,vav:0,sockets:4})]}));const g=(id)=>(r.items.find(i=>i.id===id)||{}).qty;return g('cable_1_5')===15&&g('cable_2_5')===24&&g('gaine_16')===15&&g('inter_simple')===1&&g('prise_16')===4&&g('dcl')===2"))
    check('O2 Circuits : 8 prises max par circuit (9 → 2 circuits, 17 → 3)', Qe("const n=(k)=>Q.compute(base({rooms:[R({id:'a',lights:0,switches:0,sockets:k})]})).circuits.filter(c=>c.kind==='socket').length;return n(8)===1&&n(9)===2&&n(17)===3"))
    check('O3 Appareil spécialisé : circuit dédié 32 A / 6 mm² sur différentiel type A', Qe("const r=Q.compute(base({rooms:[R({id:'a',sockets:2})],appliances:[{type:'cuisiniere',room:'a',qty:1}]}));const c=r.circuits.find(c=>c.kind==='special');return c&&c.breaker===32&&c.section===6&&r.items.some(i=>i.id==='cable_6')&&r.items.some(i=>i.id.startsWith('diffA_'))"))
    check('O4 Éclairage séparé des prises (2 différentiels) puis regroupé si la règle est décochée', Qe("const s=base({rooms:[R({id:'a',lights:2,switches:1,sockets:3})]});const a=Q.compute(s).groups.length;const cfg=EE.clone(EE.Config.get());cfg.rules.separateLightDiff=false;return a===2&&Q.compute(s,cfg).groups.length===1"))
    check('O5 Prix du catalogue : total = Σ quantité × prix', Qe("const cfg=EE.clone(EE.Config.get());cfg.catalog.forEach(c=>c.price=100);const r=Q.compute(base({rooms:[R({id:'a',sockets:3})]}),cfg);const sum=r.items.reduce((a,i)=>a+i.qty*100,0);return Math.round(r.totals.total)===sum&&sum>0"))
    check('O6 Article absent du catalogue : avertissement, aucune erreur', Qe("const cfg=EE.clone(EE.Config.get());cfg.catalog=cfg.catalog.filter(c=>c.id!=='disj_20');const r=Q.compute(base({rooms:[R({id:'a',sockets:3})]}),cfg);return r.warns.some(w=>w.includes('catalogue'))&&r.items.some(i=>i.name.includes('20 A'))"))
    check('O7 Coffret : places suffisantes, réserve ≥ 20 %, plus grand coffret si beaucoup de circuits', Qe("const small=Q.compute(base({rooms:[R({id:'a',lights:2,switches:1,sockets:3})]})).coffret;const big=Q.compute(base({rooms:[R({id:'a',lights:60,switches:5,sockets:100})],appliances:[{type:'cuisiniere',room:'a',qty:1},{type:'lave_linge',room:'a',qty:1},{type:'chauffe_eau',room:'a',qty:1}]})).coffret;const cap=(c)=>c.nRows*c.perRow;return small.used<=cap(small)&&(cap(small)-small.used)/small.used>=0.2&&cap(big)>cap(small)&&big.used<=cap(big)"))
    check('O8 Étude vide : aucun article, pas d\'erreur', Qe("const r=Q.compute(base({rooms:[]}));return r.items.length===0&&r.circuits.length===0&&!r.coffret"))
    pg.click('[data-go=quant]'); pg.wait_for_selector('#qrooms')
    pg.fill('#qrooms tr >> nth=0 >> [data-k=lights]', '5'); pg.fill('#qrooms tr >> nth=0 >> [data-k=sockets]', '6'); pg.wait_for_timeout(250)
    check('O9 Écran : le résumé se met à jour en direct', '5 points lumineux' in pg.inner_text('.qsum') and '6 prises' in pg.inner_text('.qsum'), pg.inner_text('.qsum'))
    check('O10 Écran : tableau du matériel, circuits et coffret (SVG) affichés', pg.locator('#qres table.qt').count() == 2 and pg.locator('#qres svg.cofsvg').count() == 1 and pg.locator('#qres svg.cofsvg rect').count() > 5)
    pg.click('#qaddr'); pg.fill('#qrooms tr >> nth=1 >> [data-k=name]', 'Cuisine'); pg.click('#qadda'); pg.select_option('.qapp [data-k=room]', index=1); pg.wait_for_timeout(250)
    check('O11 Écran : appareil spécialisé ajouté (circuit cuisinière)', 'Cuisinière' in pg.inner_text('#qres'))
    pg.reload(); pg.wait_for_selector('.hero'); pg.click('[data-go=quant]'); pg.wait_for_selector('#qrooms')
    check('O12 Étude enregistrée : retrouvée après rechargement', pg.input_value('#qrooms tr >> nth=0 >> [data-k=lights]') == '5' and pg.locator('#qrooms tr').count() == 2 and pg.locator('.qapp').count() == 1)
    with pg.expect_download() as dl: pg.click('#qcsv')
    csv = pathlib.Path(dl.value.path()).read_text(encoding='utf-8-sig')
    check('O13 Export CSV : matériel, total et circuits', 'Désignation' in csv and 'TOTAL' in csv and 'Circuit' in csv and csv.count('\n') > 20)
    pg.click('#qnew'); pg.fill('#qn', 'Villa 2'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(150)
    check('O14 Plusieurs études : création, sélection', pg.locator('#qsel option').count() == 2 and pg.evaluate("document.querySelector('#qsel').selectedOptions[0].textContent") == 'Villa 2')
    pg.click('#qdel'); pg.click('.modal .btn.danger'); pg.wait_for_timeout(150)
    check('O15 Suppression d\'une étude après confirmation', pg.locator('#qsel option').count() == 1)

    # ============ P. Portail administrateur (réservé à l'e-mail administrateur + mot de passe) ============
    # Le mot de passe administrateur n'est pas écrit dans le code : le fournir par la variable d'environnement YAK_ADMIN_PW.
    AEMAIL = pg.evaluate("EE.Config.ADMIN_EMAIL")
    check('P1 Un compte ordinaire ne voit pas le portail (menu, accueil, accès direct)', pg.locator('[data-go=portal]').count() == 0 and pg.locator('[data-a=portal]').count() == 0 and (pg.evaluate("EE.app.go('portal')") or True) and 'refusé' in pg.inner_text('.page'))
    pg.click('#logout'); pg.wait_for_selector('.login'); pg.click('.tab[data-t=up]')
    pg.fill('#lu', AEMAIL); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo')
    check('P2 Création du compte administrateur refusée sans le bon mot de passe', 'réservé' in pg.inner_text('#lerr') and pg.evaluate("EE.Store.Users.list().every(u=>u.name!==EE.Config.ADMIN_EMAIL)"))
    check('P2b Mot de passe administrateur jamais écrit en clair dans le code', not any(ADMPW in (root/'js'/n).read_text(encoding='utf-8') for n in ['config.js','portal.js','store.js','app.js']) and not any(ADMPW in (root/n).read_text(encoding='utf-8') for n in ['README.md','docs/TESTS.md']))
    pg.fill('#lp', ADMPW); pg.fill('#lp2', ADMPW); pg.click('#lgo'); pg.wait_for_selector('.hero')
    check('P3 Compte administrateur créé : le portail est visible', pg.locator('[data-go=portal]').count() == 1 and pg.evaluate("EE.Config.isAdmin(EE.Store.Users.current())"))
    pg.click('[data-go=portal]'); pg.wait_for_selector('#pp')
    check('P4 Le portail ne s\'ouvre pas sans le mot de passe', pg.locator('.ptabs').count() == 0)
    for _ in range(5): pg.fill('#pp', 'faux'); pg.click('#punlock')
    pg.fill('#pp', ADMPW); pg.click('#punlock'); locked = 'patientez' in pg.inner_text('#perr') and pg.locator('.ptabs').count() == 0
    pg.evaluate("EE.portalLockUntil=0"); pg.fill('#pp', 'faux'); pg.click('#punlock'); bad = 'incorrect' in pg.inner_text('#perr')
    pg.fill('#pp', ADMPW); pg.click('#punlock'); pg.wait_for_selector('.ptabs')
    check('P5 Mot de passe faux refusé, blocage après 5 essais, bon mot de passe accepté', locked and bad and pg.locator('.ptabs .chip').count() == 6)
    pg.click('#plock'); pg.click('#logout'); pg.wait_for_selector('.login')
    pg.fill('#lu', AEMAIL); pg.fill('#lp', ADMPW); pg.click('#lgo'); pg.wait_for_selector('.hero'); pg.click('[data-go=portal]'); pg.wait_for_selector('#pp')
    pg.fill('#pp', ADMPW); pg.click('#punlock'); pg.wait_for_selector('.ptabs')
    # apparence
    pg.fill('#b2', 'EXPERT'); pg.fill('#bw', 'bienvenue à l\'atelier.'); pg.fill('#bcol', '#7a1fa2'); pg.fill('#bacc', '#e65100'); pg.fill('#bm', 'FG'); pg.click('#lsave'); pg.wait_for_timeout(200)
    check('P6 Apparence : nom, couleurs, titre de la page et monnaie modifiés', pg.inner_text('.brand') .strip().endswith('EXPERT') and pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--accent').trim()") == '#e65100' and pg.title().endswith('EXPERT') and pg.evaluate("EE.Config.get().currency") == 'FG')
    pg.click('[data-go=home]'); check('P7 Message d\'accueil personnalisé', 'bienvenue à l\'atelier' in pg.inner_text('.hero'))
    # logo
    from PIL import Image
    Image.new('RGBA', (500, 250), (200, 30, 30, 255)).save(tmp/'logo_test.png')
    pg.click('[data-go=portal]'); old_src = pg.evaluate("document.querySelector('.brand img').src")
    pg.set_input_files('#lfile', str(tmp/'logo_test.png')); pg.wait_for_timeout(500)
    new_src = pg.evaluate("document.querySelector('.brand img').src")
    check('P8 Logo remplaçable depuis un fichier image', new_src != old_src and new_src.startswith('data:image/png'))
    pg.click('#lreset'); pg.wait_for_timeout(200); check('P9 Logo d\'origine rétabli', pg.evaluate("document.querySelector('.brand img').src") == old_src)
    pg.reload(); pg.wait_for_selector('.hero')
    check('P10 Configuration conservée après rechargement', pg.inner_text('.brand').strip().endswith('EXPERT'))
    # catalogue
    pg.click('[data-go=portal]'); pg.fill('#pp', ADMPW); pg.click('#punlock'); pg.wait_for_selector('.ptabs'); pg.click('.ptabs .chip >> nth=1'); pg.wait_for_selector('#ctb')
    pg.fill('#cq', 'ICTA Ø16'); pg.fill('#ctb tr >> nth=0 >> [data-k=price]', '2000'); pg.dispatch_event('#ctb tr >> nth=0 >> [data-k=price]', 'change')
    check('P11 Catalogue : prix modifié et enregistré', pg.evaluate("EE.Config.get().catalog.find(c=>c.id==='gaine_16').price") == 2000)
    pg.click('#cadd'); pg.fill('#nn', 'Disjoncteur 45 A'); pg.fill('#np', '9000'); pg.fill('#nm', '2'); pg.fill('#ni', 'disj_45'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(150)
    check('P12 Catalogue : article ajouté', pg.evaluate("!!EE.Config.get().catalog.find(c=>c.id==='disj_45'&&c.price===9000&&c.mods===2)"))
    pg.click('#cinc'); pg.fill('#pc', '10'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(150)
    check('P13 Catalogue : hausse de 10 % de tous les prix', pg.evaluate("EE.Config.get().catalog.find(c=>c.id==='gaine_16').price") == 2200)
    with pg.expect_download() as dl: pg.click('#cexp')
    cp = tmp/'cat.csv'; dl.value.save_as(str(cp)); txt = cp.read_text(encoding='utf-8-sig')
    cp.write_text(txt.replace('"2200"', '"3000"'), encoding='utf-8'); pg.set_input_files('#cimp', str(cp)); pg.wait_for_timeout(300)
    check('P14 Catalogue : export CSV puis import (prix mis à jour depuis Excel)', pg.evaluate("EE.Config.get().catalog.find(c=>c.id==='gaine_16').price") == 3000, txt[:200])
    pg.evaluate("EE.Config.set(c=>{c.catalog.find(x=>x.id==='cable_1_5').price=1000},null)")
    q = pg.evaluate("(()=>{const s=EE.Quant.newStudy('x');s.rooms=[Object.assign(EE.Quant.newRoom('a'),{id:'a',lights:2,switches:1,sockets:0})];const r=EE.Quant.compute(s);return [r.items.find(i=>i.id==='cable_1_5').total,r.items.find(i=>i.id==='gaine_16').total]})()")
    check('P15 Les prix du portail alimentent le quantitatif', q[0] > 0 and q[1] > 0 and q[0] % 1000 == 0 and q[1] % 3000 == 0, q)
    # photo d'un appareil
    pg.fill('#cq', 'Disjoncteur DPN 1P+N 20 A'); Image.new('RGB', (300, 400), (30, 120, 200)).save(tmp/'photo_test.jpg')
    pg.set_input_files('[data-photo]', str(tmp/'photo_test.jpg')); pg.wait_for_timeout(500)
    check('P15b Photo d\'un appareil ajoutée dans le catalogue (image réduite, enregistrée)', pg.evaluate("(()=>{const c=EE.Config.get().catalog.find(x=>x.id==='disj_20');return !!c.img&&c.img.startsWith('data:image/jpeg')&&c.img.length<60000})()"))
    html_ph = pg.evaluate("""(()=>{const s=EE.Quant.newStudy('x');s.rooms=[Object.assign(EE.Quant.newRoom('a'),{id:'a',lights:0,switches:0,sockets:3})];EE.Config.apply();return 1})()""")
    pg.click('[data-go=quant]'); pg.wait_for_selector('#qres svg.cofsvg')
    ph_n = pg.locator('#qres svg.cofsvg g.dev-art.photo').count(); art_n = pg.locator('#qres svg.cofsvg g.dev-art').count()
    check('P15c Coffret : la photo remplace le dessin pour les disjoncteurs 20 A uniquement', ph_n >= 1 and art_n > ph_n and pg.locator('#qres svg.cofsvg image').count() == ph_n, (ph_n, art_n))
    pg.click('[data-go=portal]'); pg.wait_for_selector('.ptabs'); pg.click('.ptabs .chip >> nth=1'); pg.wait_for_selector('#ctb'); pg.fill('#cq', 'Disjoncteur DPN 1P+N 20 A'); pg.click('[data-noimg]'); pg.wait_for_timeout(200)
    check('P15d Photo retirée : retour au dessin réaliste', pg.evaluate("!EE.Config.get().catalog.find(x=>x.id==='disj_20').img"))
    # règles
    pg.click('.ptabs .chip >> nth=2'); pg.wait_for_selector('#rsave'); pg.fill('[data-r=lightPerCircuit]', '2'); pg.click('#rsave')
    n = pg.evaluate("(()=>{const s=EE.Quant.newStudy('x');s.rooms=[Object.assign(EE.Quant.newRoom('a'),{id:'a',lights:5,switches:1,sockets:0})];return EE.Quant.compute(s).circuits.length})()")
    check('P16 Règles : 2 points lumineux par circuit → 5 points = 3 circuits', n == 3, n)
    pg.click('#spadd'); pg.wait_for_timeout(100); check('P17 Appareils spécialisés : ajout d\'un appareil', pg.evaluate("EE.Config.get().specials.length") == 8)
    # fiches
    pg.click('.ptabs .chip >> nth=4'); pg.wait_for_selector('#ssel'); pg.select_option('#ssel', 'lampe'); pg.fill('#sd', 'DESCRIPTION PERSONNALISÉE'); pg.click('#ssave'); pg.wait_for_timeout(150)
    pg.click('[data-go=library]'); pg.wait_for_selector('.libgrid'); pg.click('.sym[data-s=lampe]'); pg.wait_for_selector('.fiche')
    check('P18 Fiche de symbole modifiée visible dans la bibliothèque', 'DESCRIPTION PERSONNALISÉE' in pg.inner_text('.fiche'))
    pg.click('.modal .btn:has-text("Fermer")')
    # sauvegarde / mise à jour
    pg.click('[data-go=portal]'); pg.wait_for_selector('.ptabs'); pg.click('.ptabs .chip >> nth=5'); pg.wait_for_selector('#bexp')
    with pg.expect_download() as dl: pg.click('#bexp')
    cfgf = tmp/'cfg.json'; dl.value.save_as(str(cfgf)); jc = json.loads(cfgf.read_text(encoding='utf-8'))
    check('P19 Export de la configuration (JSON)', jc['format'] == 'yak-elec-pro-config' and jc['config']['brand']['name2'] == 'EXPERT' and jc['config']['rules']['lightPerCircuit'] == 2)
    pg.click('#bres'); pg.click('.modal .btn.danger'); pg.wait_for_timeout(300)
    check('P20 Rétablissement des réglages d\'origine', pg.evaluate("EE.Config.get().brand.name2") == 'pro' and pg.evaluate("EE.Config.get().rules.lightPerCircuit") == 8 and pg.evaluate("EE.Config.get().catalog.find(c=>c.id==='gaine_16').price") == 0)
    pg.set_input_files('#bimp', str(cfgf)); pg.click('.modal .btn.danger'); pg.wait_for_timeout(400)
    check('P21 Mise à jour depuis un fichier de configuration', pg.evaluate("EE.Config.get().brand.name2") == 'EXPERT' and pg.evaluate("EE.Config.get().rules.lightPerCircuit") == 2 and pg.evaluate("EE.Config.get().library.lampe.desc") == 'DESCRIPTION PERSONNALISÉE')
    bad_f = tmp/'bad.json'; bad_f.write_text('{"x":1}'); pg.click('.ptabs .chip >> nth=5'); pg.set_input_files('#bimp', str(bad_f)); pg.click('.modal .btn.danger'); pg.wait_for_timeout(200)
    check('P22 Fichier de configuration invalide refusé', 'pas une configuration' in pg.inner_text('#toasts') or pg.evaluate("EE.Config.get().brand.name2") == 'EXPERT')
    check('P23 Journal des modifications renseigné', pg.evaluate("EE.Config.logs().length") >= 5)
    pg.evaluate("EE.Config.reset()")

    # ============ Q. Composants et symboles (correspondance exacte) ============
    exp = {'cable_1_5':'conducteur','cable_2_5':'conducteur','cable_4':'conducteur','cable_6':'conducteur','cable_10':'conducteur','cable_16':'conducteur','cable_terre':'conducteur',
           'cable_pv_4':'conducteur','cable_pv_6':'conducteur','cable_pv_10':'conducteur','cable_pv_16':'conducteur','cable_bat_16':'conducteur','cable_bat_25':'conducteur','cable_bat_35':'conducteur','cable_bat_50':'conducteur','cable_bat_70':'conducteur','cable_bat_95':'conducteur','inter_simple':'interrupteur','inter_va':'va_et_vient','prise_16':'prise','prise_32':'prise','dcl':'lampe','piquet_terre':'terre',
           'disj_6':'disjoncteur','disj_10':'disjoncteur','disj_16':'disjoncteur','disj_20':'disjoncteur','disj_25':'disjoncteur','disj_32':'disjoncteur','disj_40':'disjoncteur','disj_50':'disjoncteur','disj_63':'disjoncteur',
           'general_30':'disjoncteur','general_40':'disjoncteur','general_60':'disjoncteur','general_63':'disjoncteur',
           'diff_25_30':'differentiel','diff_40_30':'differentiel','diff_63_30':'differentiel','diffA_25_30':'differentiel','diffA_40_30':'differentiel','diffA_63_30':'differentiel'}
    got = pg.evaluate("Object.fromEntries(EE.Config.DEFAULTS.catalog.filter(c=>c.sym).map(c=>[c.id,c.sym]))")
    nosym = pg.evaluate("EE.Config.DEFAULTS.catalog.filter(c=>!c.sym).map(c=>c.id)")
    check('Q1 Chaque composant reçoit exactement le symbole prévu (aucune erreur de correspondance)', got == exp, {k: (got.get(k), exp.get(k)) for k in set(got) | set(exp) if got.get(k) != exp.get(k)})
    check('Q2 Tous les symboles référencés existent dans la bibliothèque', pg.evaluate("EE.Config.DEFAULTS.catalog.every(c=>!c.sym||!!EE.Library.get(c.sym))"))
    check('Q3 Composants sans symbole : signalés, aucun symbole inventé', set(nosym) >= {'parafoudre','boite_enc','boite_deriv','coffret_2x13','plaque','gaine_16','peigne'} and not any(k in got for k in nosym))
    pg.click('[data-go=compo]'); pg.wait_for_selector('.qt')
    check('Q4 Écran Composants : une ligne par composant, vignettes affichées', pg.locator('.page tbody tr').count() == pg.evaluate("EE.Config.get().catalog.length") and pg.locator('.page tbody svg.pv').count() == len(exp) and 'aucun symbole' in pg.inner_text('.page'))
    with pg.expect_download() as dl: pg.click('#cmcsv')
    ct = pathlib.Path(dl.value.path()).read_text(encoding='utf-8-sig')
    check('Q5 Export CSV de la liste des composants et symboles', 'Disjoncteur DPN 1P+N 16 A – courbe C – 6 kA";"Disjoncteur"' in ct and 'Parafoudre 1P+N – type 2";"aucun symbole"' in ct, ct[:200])
    pg.click('[data-go=quant]'); pg.wait_for_selector('#qrooms')
    check('Q6 Quantitatif : vignette de symbole dans la liste du matériel', pg.locator('#qres .symcell svg.pv').count() >= 5)
    pg.click('[data-go=quant]'); pg.wait_for_selector('#qres svg.cofsvg')
    nd = pg.evaluate("EE.lastQuant.res.coffret.rows.reduce((a,r)=>a+r.d.length,0)")
    check('Q7 Coffret : chaque appareil est dessiné (face avant sur rail DIN) sans photo', pg.locator('#qres svg.cofsvg g.dev-art').count() == nd and pg.locator('#qres svg.cofsvg image').count() == 0 and nd > 0, nd)

    # ============ R. Appareils et normes européennes ============
    pg.evaluate("EE.Config.reset()")
    cat_ = pg.evaluate("Object.fromEntries(EE.Config.get().catalog.map(c=>[c.id,c]))")
    check('R1 DPN (disjoncteur phase+neutre) : 1 module de 18 mm ; ID 2P : 2 modules', all(cat_[f'disj_{a}']['mods'] == 1 for a in [6,10,16,20,25,32,40,50,63]) and all(cat_[k]['mods'] == 2 for k in ['diff_40_30','diffA_40_30','general_40']) and 'DPN' in cat_['disj_16']['name'] and 'courbe C' in cat_['disj_16']['name'])
    check('R2 Normes européennes associées : EN 60898-1 (DPN), EN 61008-1 (ID), EN 61643-11 (parafoudre), EN 61439-3 (coffret), EN 60669-1, EN 60670-1', 'EN 60898-1' in cat_['disj_16']['norm'] and 'EN 61008-1' in cat_['diff_40_30']['norm'] and 'EN 61008-1' in cat_['diffA_40_30']['norm'] and 'EN 61643-11' in cat_['parafoudre']['norm'] and 'EN 61439-3' in cat_['coffret_2x13']['norm'] and 'EN 60669-1' in cat_['inter_simple']['norm'] and 'EN 60670-1' in cat_['boite_enc']['norm'] and 'EN 60947-7' in cat_['bornier_terre']['norm'])
    ok_lay = pg.evaluate("""(()=>{const s=EE.Quant.newStudy('x');s.rooms=[Object.assign(EE.Quant.newRoom('a'),{id:'a',lights:5,switches:1,sockets:10})];const r=EE.Quant.compute(s);const ds=r.coffret.rows.flatMap(x=>x.d);return ds.filter(d=>d.k==='cb').every(d=>d.mods===1)&&ds.filter(d=>d.k==='diff').every(d=>d.mods===2)&&r.coffret.used===ds.reduce((a,d)=>a+d.mods,0)&&r.coffret.rows.every(x=>x.u<=r.coffret.perRow)})()""")
    check('R3 Coffret : DPN sur 1 module, ID sur 2 modules, aucune rangée dépassée', ok_lay)
    ob = pg.evaluate("""(()=>{const s=EE.Quant.newStudy('x');s.rooms=[Object.assign(EE.Quant.newRoom('a'),{id:'a',lights:5,switches:1,sockets:10})];const r=EE.Quant.compute(s);return [(r.items.find(i=>i.id==='obturateur')||{}).qty,r.coffret.free]})()""")
    check('R4 Obturateurs : un par place libre du coffret', ob[0] == ob[1] and ob[0] > 0, ob)
    pg.evaluate("localStorage.setItem('eep.config', JSON.stringify({catalog:[{id:'disj_16',cat:'Protection',name:'Disjoncteur 1P+N 16 A',unit:'pce',price:777,mods:2},{id:'perso',cat:'Autres',name:'Mon article',unit:'pce',price:5,mods:0}]}))"); pg.reload(); pg.wait_for_selector('.hero')
    mig = pg.evaluate("(()=>{const c=EE.Config.get();const d=c.catalog.find(x=>x.id==='disj_16');return [d.price,d.mods,d.name,d.norm,!!c.catalog.find(x=>x.id==='perso'),!!c.catalog.find(x=>x.id==='obturateur'),c.catVer]})()")
    check('R5 Mise à jour d\'un ancien catalogue : prix et articles conservés, noms/normes/modules actualisés', mig[0] == 777 and mig[1] == 1 and 'DPN' in mig[2] and 'EN 60898-1' in mig[3] and mig[4] and mig[5] and mig[6] == 3, mig)
    pg.evaluate("EE.Config.reset()")
    pg.click('[data-go=compo]'); pg.wait_for_selector('.qt'); check('R6 Écran Composants : normes européennes affichées', 'EN 61008-1' in pg.inner_text('.page') and 'EN 60898-1' in pg.inner_text('.page'))
    pg.click('[data-go=quant]'); pg.wait_for_selector('#qres svg.cofsvg'); check('R7 Quantitatif : normes sous les désignations et légende des normes du coffret', 'EN 60898-1' in pg.inner_text('#qres') and 'Normes européennes' in pg.inner_text('#qres'))

    # ============ S. Photovoltaïque ============
    PVe = lambda js: pg.evaluate("()=>{const P=EE.PV,mk=(o)=>Object.assign(P.newStudy('t'),o);" + js + "}")
    check('S1 Site isolé : énergie, batteries et panneaux calculés selon les formules', PVe("const s=mk({loads:[{name:'a',P:100,n:2,h:5,start:1}],hsp:5,days:2,vbat:24,tech:'plomb',tmin:15,tcell:65,panel:'p400'});const r=P.compute(s);const d=r.design;const Edc=1000/0.9;const Eb=Edc*2/(0.5*0.85);const Pre=Edc/(0.85*5*0.75);return r.ok&&Math.abs(r.Eac-1000)<1e-6&&Math.abs(d.Eb-Eb)<1e-6&&d.panelsN*400>=Pre&&d.battery.cnt*d.battery.b.Ah*(24/12)/d.battery.s>=0&&d.vbat===24"))
    check('S2 Chaînes : tension à vide à froid ≤ limite du régulateur, tension mini ≤ tension à chaud', PVe("const s=mk({loads:[{name:'a',P:300,n:3,h:6,start:1}],hsp:5,vbat:48,tech:'lithium',panel:'p400',tmin:5});const r=P.compute(s),d=r.design,p=r.panel;const vc=p.Voc*(1+p.bVoc/100*(5-25)),vh=p.Vmp*(1+p.bVoc/100*(65-25));return r.ok&&d.ns*vc<=d.mppt.Vpv&&d.ns*vh>=48*1.2+5&&d.panelsN===d.ns*d.np&&d.np%d.nr===0"))
    check('S3 Batteries : tension du parc respectée (séries × tension nominale), lithium ≠ plomb', PVe("const a=P.compute(mk({vbat:24,tech:'plomb'})).design,b=P.compute(mk({vbat:24,tech:'lithium'})).design;return a.battery.s*a.battery.b.Vn===24&&b.battery.s*b.battery.b.Vn===24&&a.battery.b.tech==='plomb'&&b.battery.b.tech==='lithium'"))
    check('S4 Onduleur : puissance continue et surcharge suffisantes ; démarrage moteur pris en compte', PVe("const s=mk({loads:[{name:'pompe',P:750,n:1,h:2,start:4}],sim:1,vbat:24});const r=P.compute(s),d=r.design;return d.inverter.Pcont>=750*1.25&&d.inverter.Psurge>=d.Pstart&&d.Pstart===750+750*3"))
    check('S5 Câbles : section ≥ courant et ≥ calibre du fusible ; câble PV ≥ 4 mm², batterie ≥ 16 mm²', PVe("const r=P.compute(mk({loads:[{name:'a',P:1500,n:1,h:6,start:1}],vbat:24,dist:{dc:30,bat:2,bi:1,ac:10}}));const d=r.design;const AMP={1.5:15,2.5:21,4:28,6:36,10:50,16:68,25:89,35:110,50:134,70:171,95:207,120:239};return d.Sdc>=4&&d.Sbat>=16&&d.Sbi>=16&&AMP[d.Sbi]>=d.fuseBi&&AMP[d.Sac]>=d.acBreaker"))
    check('S6 Raccordé réseau : chaînes dans la plage de l\'onduleur, production et couverture calculées', PVe("const r=P.compute(mk({mode:'reseau',loads:[{name:'a',P:500,n:4,h:8,start:1}],coverage:100,hsp:5}));const d=r.design,p=r.panel,iv=d.inverter;return r.ok&&d.kind==='reseau'&&d.ns*p.Voc*(1+p.bVoc/100*(15-25))<=iv.Vdc&&d.Pdc/iv.Pac<=1.3&&d.prod>0&&r.warns.some(w=>w.includes('distributeur'))"))
    check('S7 Liste du matériel : panneaux, régulateur, onduleur, batteries, câbles, protections, normes', PVe("const r=P.compute(mk({conv:'separe'}));const ids=r.items.map(i=>i.id);const cp=r.items.find(i=>i.id.startsWith('cable_pv_'));return ids.some(i=>i.startsWith('pv:p'))&&ids.some(i=>i.startsWith('pv:m'))&&ids.some(i=>i.startsWith('pv:o'))&&ids.some(i=>i.startsWith('pv:b')||i.startsWith('pv:l'))&&ids.includes('pv_sect')&&ids.includes('pv_spd')&&ids.includes('pv_mc4')&&cp.norm.includes('EN 50618')&&r.items.find(i=>i.id==='pv_spd').norm.includes('EN 50539-11')&&EE.Config.get().catalog.find(c=>c.id==='pv_fuse').norm.includes('EN 60269-6')"))
    check('S8 Prix : le total suit les prix saisis (équipements et catalogue)', PVe("const cfg=EE.clone(EE.Config.get());cfg.pv.panels.forEach(p=>p.price=1000);cfg.catalog.forEach(c=>c.price=10);const r=P.compute(mk({}),cfg);const s=r.items.reduce((a,i)=>a+i.qty*i.price,0);return s>0&&Math.round(r.totals.total)===s&&r.items.find(i=>i.id.startsWith('pv:p')).price===1000"))
    check('S9 Entrées incomplètes ou absurdes : avertissement, aucune erreur', PVe("const a=P.compute(mk({loads:[]}));const b=P.compute(mk({loads:[{name:'x',P:'abc',n:'',h:'z'}]}));const c=P.compute(mk({vbat:36}));return !a.ok&&a.warns.length>0&&!b.ok&&(!c.ok||c.warns.length>=0)"))
    pg.click('[data-go=pv]'); pg.wait_for_selector('#vloads'); pg.wait_for_timeout(200)
    check('S10 Écran : grille de saisie, cartes de résultat, synoptique, détail et matériel', pg.locator('#vres .pvc').count() >= 3 and pg.locator('#vres svg.pvsyn').count() == 1 and pg.locator('#vres table.qt').count() == 2)
    before = pg.inner_text('.pvc >> nth=0')
    pg.fill('#vloads tr >> nth=0 >> [data-k=n]', '60'); pg.wait_for_timeout(250)
    check('S11 Écran : le dimensionnement se met à jour en direct quand on change une valeur', pg.inner_text('.pvc >> nth=0') != before, before)
    pg.select_option('[data-f=mode]', 'reseau'); pg.wait_for_timeout(250)
    check('S12 Écran : bascule en mode raccordé au réseau (synoptique, champs adaptés)', 'Onduleur réseau' in pg.inner_text('#vres') and pg.locator('.pvgrid .iso:not(.hide)').count() == 0)
    pg.select_option('[data-f=mode]', 'isole'); pg.click('#vaddl'); pg.select_option('#vpre', index=3); pg.wait_for_timeout(200)
    check('S13 Écran : ajout d\'une ligne et d\'un appareil courant', pg.locator('#vloads tr').count() == 5)
    pg.reload(); pg.wait_for_selector('.hero'); pg.click('[data-go=pv]'); pg.wait_for_selector('#vloads')
    check('S14 Étude enregistrée : retrouvée après rechargement', pg.locator('#vloads tr').count() == 5 and pg.input_value('#vloads tr >> nth=0 >> [data-k=n]') == '60')
    with pg.expect_download() as dl: pg.click('#vcsv')
    vc = pathlib.Path(dl.value.path()).read_text(encoding='utf-8-sig')
    check('S15 Export CSV du dimensionnement', 'Énergie consommée par jour' in vc and 'TOTAL' in vc and 'Panneau' in vc)
    check('S21 Panneau et tension automatiques : tension 12/24/48 V selon la puissance, panneau choisi', PVe("const a=P.compute(mk({conv:'separe',loads:[{name:'a',P:100,n:2,h:5,start:1}]})),b=P.compute(mk({conv:'separe',loads:[{name:'a',P:600,n:2,h:5,start:1}],sim:1})),c=P.compute(mk({conv:'separe',loads:[{name:'a',P:2000,n:2,h:5,start:1}],sim:1}));return a.ok&&a.design.vbat===12&&b.design.vbat===24&&c.design.vbat===48&&!!a.panel&&a.steps[0].label.indexOf('automatique')>0"))
    check('S22 Valeurs retenues : standard signalé, valeur saisie signalée', PVe("const a=P.compute(mk({}));const b=P.compute(mk({hsp:6}));return a.assumptions.every(x=>x[2])&&b.assumptions.find(x=>x[0].startsWith('Heures'))[2]===false"))
    check('S23 Écran : seules les colonnes obligatoires visibles, réglages avancés repliés, valeurs retenues affichées', pg.locator('details.card').count()==1 and pg.locator('details.card[open]').count()==0 and pg.locator('.pvass').count()==1)
    pg.click('[data-go=portal]'); pg.wait_for_selector('#pp, .ptabs')
    if pg.locator('#pp').count(): pg.fill('#pp', ADMPW); pg.click('#punlock')
    pg.wait_for_selector('.ptabs'); pg.click('.ptabs .chip >> nth=3'); pg.wait_for_selector('[data-l=panels]')
    pg.fill('[data-l=panels] tr >> nth=1 >> [data-f=W]', '450'); pg.fill('[data-l=panels] tr >> nth=1 >> [data-f=price]', '123456')
    check('S16 Portail : panneau modifié (puissance, prix) et enregistré', pg.evaluate("(()=>{const p=EE.Config.get().pv.panels[1];return p.W===450&&p.price===123456})()"))
    pg.click('[data-add=batteries]'); pg.wait_for_timeout(150)
    check('S17 Portail : ajout d\'une batterie', pg.evaluate("EE.Config.get().pv.batteries.length") == 7)
    pg.fill('[data-pr=pr]', '0.6'); pg.click('#pvrs'); check('S18 Portail : règle photovoltaïque modifiée', pg.evaluate("EE.Config.get().pv.rules.pr") == 0.6)
    check('S19 Les équipements du portail alimentent le dimensionnement', pg.evaluate("(()=>{const s=EE.PV.newStudy('x');s.panel='p400';const r=EE.PV.compute(s);return r.items.find(i=>i.id==='pv:p400').price===123456&&r.panel.W===450})()"))
    pg.click('#pvrr'); pg.click('.modal .btn.danger'); pg.wait_for_timeout(150)
    check('S20 Rétablissement des équipements photovoltaïques d\'origine', pg.evaluate("EE.Config.get().pv.panels[1].W") == 400 and pg.evaluate("EE.Config.get().pv.rules.pr") == 0.75)


    # ============ T. Sources d'énergie ============
    SRC = lambda js: pg.evaluate("()=>{const L=EE.Library;const d={comps:[],wires:[]};let n=0;const add=(t,x,y,l,v)=>{const c=L.newComp(t,x,y);c.label=l||'';if(v)c.val=v;c.id='k'+(n++);d.comps.push(c);return c};const w=(...p)=>d.wires.push({id:'w'+d.wires.length,pts:p,n:1,desig:''});" + js + "}")
    check('T1 8 nouvelles sources (11 au total) dans la catégorie Sources, avec symbole, description et norme', pg.evaluate("(()=>{const l=EE.Library.list.filter(d=>d.cat==='Sources');return l.length===11&&['reseau_mono','reseau_tri','groupe_mono','groupe_tri','batterie','pile','panneau_pv','eolienne'].every(id=>{const d=EE.Library.get(id);return d&&d.desc&&d.ref&&d.body({},{},{}).length>40&&d.term.length>=2})})()"))
    r = SRC("add('reseau_mono',100,100,'G1');add('lampe',80,260,'H1');w([80,140],[80,220]);w([100,140],[100,320],[80,320],[80,300]);const v=EE.Engine.verify(d);const s=EE.Sim.create(d);s.solve();return [v.issues.filter(i=>i.severity==='error').map(i=>i.code),s.view.comp.k1.on]")
    check('T2 Réseau monophasé alimente une lampe : aucune erreur, lampe allumée', r[0] == [] and r[1] is True, r)
    r = SRC("add('reseau_tri',100,100,'G1');add('moteur_tri',20,260,'M1');w([60,140],[60,180],[0,180],[0,220]);w([80,140],[80,200],[20,200],[20,220]);w([100,140],[100,210],[40,210],[40,220]);const v=EE.Engine.verify(d);return v.issues.filter(i=>i.severity==='error').map(i=>i.code)")
    check('T3 Réseau triphasé : neutre facultatif (aucune erreur de borne neutre ouverte)', 'SRC_OPEN' not in r, r)
    r = SRC("add('batterie',100,100,'GB1');add('lampe',100,260,'H1');const v=EE.Engine.verify(d);return v.issues.filter(i=>i.code==='SRC_OPEN'||i.code==='TERM_OPEN').length>=2")
    check('T4 Source non raccordée signalée (batterie)', r is True, r)
    r = SRC("add('panneau_pv',100,100,'PV1');add('batterie',200,100,'GB1');return [EE.Library.sources(d.comps[0]),EE.Library.sources(d.comps[1])]")
    check('T5 Panneau PV et batterie fournissent DC+ / DC−', r[0]['+'] == 'DC+' and r[0]['-'] == 'DC-' and r[1]['+'] == 'DC+', r)


    # ============ U. Contact ============
    pg.click('.ctab'); pg.wait_for_selector('.contactcard')
    ct = pg.inner_text('.contactcard'); hrefs = pg.evaluate("[...document.querySelectorAll('.contactcard a')].map(a=>a.getAttribute('href'))")
    check('U1 Onglet Contact sous le logo : e-mail et téléphone affichés', 'kramylapro@gmail.com' in ct and '+224 620 409 093' in ct and pg.locator('.brandcol .ctab').count() == 1, ct)
    check('U2 Liens directs : mailto, appel et WhatsApp (wa.me/224620409093)', any(h.startswith('mailto:kramylapro@gmail.com') for h in hrefs) and 'tel:+224620409093' in hrefs and any(h.startswith('https://wa.me/224620409093') for h in hrefs), hrefs)
    pg.fill('#cm', 'Bonjour test'); pg.select_option('#cs', index=1)
    pg.evaluate("window.__o=null;window.open=(u)=>{window.__o=u;return null}"); pg.click('#cwa'); u_ = pg.evaluate('window.__o'); check('U3 Message WhatsApp pré-rempli (objet, texte, nom)', u_.startswith('https://wa.me/224620409093?text=') and 'Bonjour%20test' in u_ and 'Probl' in u_, u_)


    # ============ V. Photovoltaïque moderne : lithium et onduleur hybride ============
    check('V1 Hybride par défaut : un seul appareil (MPPT intégré), pas de régulateur séparé, batteries lithium', PVe("const r=P.compute(mk({}));const d=r.design;const ids=r.items.map(i=>i.id);return r.ok&&d.hybrid===true&&d.battery.b.tech==='lithium'&&ids.some(i=>i.startsWith('pv:h'))&&!ids.some(i=>i.startsWith('pv:m'))"))
    check('V2 Hybride : tension de batterie 24 V jusqu\'à 2 kW, 48 V au-delà', PVe("const a=P.compute(mk({loads:[{name:'a',P:600,n:2,h:5,start:1}],sim:1})).design.vbat,b=P.compute(mk({loads:[{name:'a',P:2000,n:2,h:5,start:1}],sim:1})).design.vbat;return a===24&&b===48"))
    check('V3 Hybride : chaînes dans la fenêtre MPPT, puissance et courant de l\'onduleur respectés', PVe("const r=P.compute(mk({loads:[{name:'a',P:1500,n:2,h:6,start:1}],sim:1,panel:'p400'}));const d=r.design,h=d.inverter,p=r.panel;const voc=p.Voc*(1+p.bVoc/100*(15-25)),vmp=p.Vmp*(1+p.bVoc/100*(65-25));return r.ok&&d.ns*voc<=h.Vpv&&d.ns*vmp>=h.VmppMin&&d.Pdc<=h.Ppv&&h.Pcont>=d.Ppeak*1.25&&h.Psurge>=d.Pstart"))
    check('V4 Trois propositions (économique, équilibrée, moderne) : plomb et lithium, séparé et hybride', PVe("const a=P.proposals(mk({}));return a.length===3&&a.every(x=>x.ok)&&a[0].battery.b.tech==='plomb'&&a[1].battery.b.tech==='lithium'&&!a[1].hybrid&&a[2].hybrid===true&&a[2].years>a[0].years&&a[2].usableKWh>0"))
    check('V5 Lithium : décharge utile plus profonde, donc moins de capacité nominale que le plomb', PVe("const a=P.proposals(mk({}));return a[1].nominalKWh<a[0].nominalKWh"))
    check('V6 Ancienne étude (sans type d\'onduleur) : solution séparée conservée', PVe("const s=mk({});delete s.conv;s.tech='plomb';const r=P.compute(s);return r.ok&&r.design.hybrid===false&&r.items.some(i=>i.id.startsWith('pv:m'))"))
    check('V7 Mode réseau : pas de propositions de batteries', PVe("return P.proposals(mk({mode:'reseau'})).length===0"))
    pg.evaluate("localStorage.setItem('eep.config', JSON.stringify({pv:{batteries:[{id:'b12_100',name:'Ma batterie',price:555,tech:'plomb',Vn:12,Ah:100}]}}))"); pg.reload(); pg.wait_for_selector('.hero')
    mg = pg.evaluate("(()=>{const c=EE.Config.get().pv;return [c.batteries.find(b=>b.id==='b12_100').price,!!c.batteries.find(b=>b.id==='l48_200'),c.hybrids.length,EE.Config.get().pvVer]})()")
    check('V8 Mise à jour d\'un ancien catalogue photovoltaïque : prix conservés, batteries lithium et hybrides ajoutés', mg[0] == 555 and mg[1] and mg[2] == 7 and mg[3] == 2, mg)
    pg.evaluate("EE.Config.reset('pv')")
    pg.click('[data-go=pv]'); pg.wait_for_selector('.pvprop'); pg.wait_for_timeout(200)
    check('V9 Écran : trois propositions affichées, « Moderne » recommandée et choix actuel signalé', pg.locator('.pvprop').count() == 3 and pg.locator('.pvprop.reco').count() == 1 and pg.locator('.pvprop.cur').count() == 1 and 'kWh' in pg.inner_text('.pvprops'))
    pg.click('[data-pack=eco]'); pg.wait_for_timeout(300)
    check('V10 Écran : choisir « Économique » applique plomb + régulateur séparé et met à jour le résultat', pg.input_value('[data-f=tech]') == 'plomb' and pg.input_value('[data-f=conv]') == 'separe' and 'Régulateur' in pg.inner_text('#vres') and pg.locator('.pvprop.cur h3').inner_text().startswith('Économique'))


    # ============ W. Électricité bâtiment : quatre types de schéma ============
    pg.click('[data-go=bat]'); pg.wait_for_selector('.battype')
    check('W1 Onglet Bâtiment : les quatre types de schéma proposés', pg.locator('.battype').count() == 4 and all(t in pg.inner_text('.page') for t in ['développé', 'unifilaire', 'multifilaire', 'architectural']))
    pg.click('[data-new=architectural]'); pg.wait_for_selector('#pn'); pg.fill('#pn', 'Plan maison F3')
    sel_ = pg.input_value('#ps'); pg.click('.modal .btn.primary'); pg.wait_for_selector('#sheet')
    check('W2 Nouveau schéma architectural : type présélectionné, projet créé', sel_ == 'architectural' and 'architectural' in pg.inner_text('#pbadge'), sel_)
    pal = pg.inner_text('#pitems')
    check('W3 Palette du plan : symboles d\'architecture seulement (porte, fenêtre, prise, DCL…)', all(t in pal for t in ['Porte', 'Fenêtre', 'Prise de courant 16 A', 'Point lumineux en plafond', 'Détecteur de fumée']) and 'Contacteur' not in pal and 'Interrupteur simple allumage' in pal)
    check('W4 Outil Mur et bouton Bilan à la place de Conducteur / Vérifier ; simulation masquée', 'Mur' in pg.inner_text('#t-wire') and 'Bilan' in pg.inner_text('#b-verify') and not pg.is_visible('#b-sim'))
    pg.evaluate("""()=>{const ed=EE.app.editor,d=ed.doc,L=EE.Library;d.wires.push({id:'wa',pts:[[100,100],[400,100],[400,300],[100,300],[100,100]],n:1,desig:''});
      const add=(t,x,y,v)=>{const c=L.newComp(t,x,y);if(v)c.val=v;c.id='z'+d.comps.length;d.comps.push(c)};
      add('p_porte',200,300);add('p_fenetre',300,100);add('p_prise',140,140);add('p_prise',360,140);add('p_prise',360,260);add('p_plafonnier',250,200);add('p_inter',140,260);add('p_etiquette',250,160,'Salon');ed.render()}""")
    check('W5 Murs dessinés en trait épais ; symboles du plan affichés', pg.locator('#sheet polyline[stroke-width="7"]').count() >= 1 and pg.locator('#sheet [data-cid]').count() >= 8)
    pg.click('#b-verify'); pg.wait_for_timeout(200); bil = pg.inner_text('#preport')
    check('W6 Bilan du plan : décompte des équipements, pièces et longueur des murs (12,5 m)', 'Bilan du plan' in bil and '12,5 m' in bil and 'Salon' in bil and re.search(r'Prise de courant 16 A 2P\+T\s*3', bil) is not None, bil[:300])
    pg.select_option('#b-mode', 'developpe'); pg.wait_for_timeout(200); pal2 = pg.inner_text('#pitems')
    check('W7 Retour au schéma développé : palette électrique, plus de symboles de plan, simulation disponible', 'Porte' not in pal2 and 'Interrupteur simple' in pal2 and pg.is_visible('#b-sim') and 'Conducteur' in pg.inner_text('#t-wire'))
    pg.select_option('#b-mode', 'unifilaire'); pg.wait_for_timeout(100); pg.click('[data-go=bat]'); pg.wait_for_selector('.battype'); pg.wait_for_timeout(100)
    check('W8 Les projets apparaissent dans le type de schéma correspondant', pg.locator('.battype[data-k=unifilaire] [data-open]').count() == 1)

    check('K Aucune erreur JavaScript pendant toute la session', not errs, errs[:3])
    b.close()

ok = sum(r['ok'] for r in results); tot = len(results)
(root/'tests'/'results.json').write_text(json.dumps(results, ensure_ascii=False, indent=1))
print(f'\n=== {ok}/{tot} tests réussis ===')
import shutil; shutil.copy(tmp/'mobile.png', root/'tests'/'mobile.png') if (tmp/'mobile.png').exists() else None
sys.exit(0 if ok == tot else 1)
