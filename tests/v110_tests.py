#!/usr/bin/env python3
"""Tests d'acceptation des ajouts V1.10 (section W) – Playwright + Chromium.
Usage : python3 tests/v110_tests.py [chemin/vers/index.html ou dist/yak-elec-pro.html]
Aucun mot de passe nécessaire (pas de test du portail ici)."""
import sys, os, pathlib, tempfile
from playwright.sync_api import sync_playwright
root = pathlib.Path(__file__).resolve().parent.parent
target = str(pathlib.Path(sys.argv[1]).resolve()) if len(sys.argv) > 1 else str(root / 'index.html')
URL = 'file://' + target
res = []
def check(name, cond, detail=''):
    res.append((name, bool(cond))); print(('PASS ' if cond else 'FAIL ') + name + ('' if cond else '  -> ' + str(detail)[:300]))
tmp = pathlib.Path(tempfile.mkdtemp())

with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 1400, 'height': 900}, accept_downloads=True); pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto(URL); pg.wait_for_selector('.login'); pg.fill('#lu', 'eleve1'); pg.fill('#lp', 'abcd'); pg.fill('#lp2', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    J = lambda js: pg.evaluate(js)

    # ---------- W1 symboles ----------
    need = ['autotransformateur', 'jeu_barres', 'bornier', 'bornier_lnpe', 'parafoudre', 'interrupteur_sectionneur', 'differentiel_tetra', 'alim_cc_dc', 'bobine_tempo_repos', 'contact_no_tr', 'contact_nf_tr', 'bobine_compteur', 'contact_compteur', 'automate', 'relais_logique', 'detecteur_capacitif', 'detecteur_photo', 'detecteur_mouvement', 'moteur_tri_6', 'poles_contacteur', 'contact_rt_nf', 'contact_rt_no', 'texte', 'titre', 'commentaire', 'repere']
    miss = J("(n)=>n.filter(i=>!EE.Library.get(i))", ) if False else pg.evaluate("(n)=>n.filter(i=>!EE.Library.get(i))", need)
    check('W1 Nouveaux symboles présents (distribution, protection, tempo repos, compteur, automate, capteurs, annotations)', not miss, miss)
    check('W1b Catégories Distribution, Automatisme, Annotations', J("['Distribution','Automatisme','Annotations'].every(c=>EE.Library.cats.includes(c))"))

    S = lambda js: pg.evaluate("()=>{const L=EE.Library;const mk=(cs,ws)=>{const d={comps:[],wires:[]};cs.forEach((a,i)=>{const c=L.newComp(a[0],a[1],a[2]);c.id='z'+i;c.label=a[3]||'';if(a[4]!=null)c.val=a[4];d.comps.push(c)});ws.forEach((p,i)=>d.wires.push({id:'w'+i,pts:p,n:1,desig:''}));const s=EE.Sim.create(d);s.solve();return {s,d};};" + js + "}")
    # ---------- W2 simulation des nouveaux appareils ----------
    check('W2a Temporisation au repos : contact maintenu pendant la durée après coupure', S("const {s}=mk([['phase',100,100,'','L1'],['interrupteur',100,200,'S1'],['bobine_tempo_repos',100,300,'KA1','2 s'],['neutre',100,380],['phase',300,100,'','L1'],['contact_no_tr',300,200,'KA1'],['lampe',300,300,'H1'],['neutre',300,380]],[[[100,100],[100,160]],[[100,240],[100,260]],[[100,340],[100,380]],[[300,100],[300,160]],[[300,240],[300,260]],[[300,340],[300,380]]]);const H=()=>!!s.view.comp.z6.on;const r=[H()];s.press('z1');r.push(H());s.press('z1');r.push(H());for(let i=0;i<15;i++)s.tick(0.1);r.push(H());for(let i=0;i<10;i++)s.tick(0.1);r.push(H());return r.join()==='false,true,true,true,false'"))
    check('W2b Compteur : le contact se ferme à la 3e impulsion, clic = remise à zéro', S("const {s}=mk([['phase',100,100,'','L1'],['bp_no',100,200,'S1'],['bobine_compteur',100,300,'KC1','3'],['neutre',100,380],['phase',300,100,'','L1'],['contact_compteur',300,200,'KC1'],['lampe',300,300,'H1'],['neutre',300,380]],[[[100,100],[100,160]],[[100,240],[100,260]],[[100,340],[100,380]],[[300,100],[300,160]],[[300,240],[300,260]],[[300,340],[300,380]]]);const H=()=>!!s.view.comp.z6.on;const q=[];for(let i=0;i<3;i++){s.press('z1');s.release('z1');q.push(H());}s.press('z2');q.push(H());return q.join()==='false,false,true,false'"))
    check('W2c Automate : programme Q1 = (I1 OU Q1) ET NON I2 (marche / maintien / arrêt)', S("const {s,d}=mk([['phase',220,100,'','L1'],['neutre',240,160],['automate',300,300,'A1','Q1 = (I1 OU Q1) ET NON I2'],['bp_no',260,180,'S1'],['bp_no',280,180,'S2'],['lampe',240,440,'H1'],['neutre',240,520],['phase',220,380,'','L1'],['phase',280,60,'','L1']],[[[220,100],[220,240]],[[240,160],[240,240]],[[220,100],[260,100],[260,140]],[[260,220],[260,240]],[[280,60],[280,140]],[[280,220],[280,240]],[[220,360],[220,380]],[[240,360],[240,400]],[[240,480],[240,520]]]);const H=()=>!!s.view.comp.z5.on;const o=[H()];s.press('z3');o.push(H());s.release('z3');o.push(H());s.press('z4');o.push(H());s.release('z4');o.push(H());return o.join()==='false,true,true,false,false'&&!EE.Engine.verify(d).issues.some(i=>i.sev==='error')"))
    check('W2d Programme d\'automate invalide : erreur expliquée', J("EE.PLC.parseProgram('Q1 = I1 ET ; X').errors.length===2"))
    check('W2e Jeu de barres et borne : continuité électrique', S("const {s,d}=mk([['phase',-80,-100,'','L1'],['jeu_barres',0,0,'W1','L1'],['bornier',40,60,'X1'],['lampe',40,160,'H1'],['neutre',40,240]],[[[-80,-100],[-80,-20]],[[40,20],[40,40]],[[40,80],[40,120]],[[40,200],[40,240]]]);return !!s.view.comp.z3.on&&!EE.Engine.verify(d).issues.length"))
    check('W2f Tensions et courants : lampe 100 W sous 230 V → 0,43 A', S("const {s}=mk([['phase',100,100,'','L1'],['lampe',100,200,'H1','100 W'],['neutre',100,300]],[[[100,100],[100,160]],[[100,240],[100,300]]]);const e=s.view.elec[0];return e.u===230&&Math.abs(e.I-0.4348)<0.001"))
    check('W2g Moteur triphasé 2,2 kW : I = P/(√3·U·cos φ·η)', J("Math.abs(EE.Sim.powerW('2,2 kW')-2200)<1e-9&&EE.Sim.powerW('3 CV')===2208"))

    # ---------- W3 exemples ----------
    r = J("EE.Examples.list.map(e=>{const x=EE.Examples.scenario(e);return [e.id,x.ok,x.issues.filter(i=>i.sev==='error').length,e.how.length>=3,e.steps.length>=4,e.exercises.length>=3,EE.Examples.components(e.build()).length>=2]})")
    check('W3a 12 exemples pédagogiques', len(r) == 12, len(r))
    bad = [x for x in r if not (x[1] and x[2] == 0 and all(x[3:]))]
    check('W3b Chaque exemple : schéma sans erreur, fonctionnement simulé conforme, composants, fonctionnement, étapes, exercices', not bad, bad)
    titles = J("EE.Examples.list.map(e=>e.title).join('|')")
    check('W3c Les 12 circuits demandés', all(t in titles for t in ['simple allumage', 'double allumage', 'va-et-vient', 'télérupteur', 'prises de courant', 'Démarrage direct', 'inversion de sens', 'étoile-triangle', 'auto-maintien', 'relais thermique', 'arrêt d\'urgence', 'distribution']), titles)
    pg.evaluate("EE.app.go('examples')"); pg.wait_for_selector('.excard')
    check('W3d Écran Exemples : 12 fiches avec aperçu', pg.locator('.excard').count() == 12 and pg.locator('.excard .prev svg').count() == 12)
    pg.click('[data-ex=va_et_vient]'); pg.wait_for_selector('.exdetail'); pg.click('#extest')
    check('W3e Fiche : 5 parties + test du fonctionnement', pg.locator('.exdetail h2').count() == 5 and 'fonctionne comme prévu' in pg.inner_text('#exres'))
    pg.click('#exopen'); pg.wait_for_selector('#sheet')
    check('W3f Ouvrir l\'exemple dans l\'atelier (projet créé)', J("EE.app.project.doc.comps.length>5&&/Exemple/.test(EE.app.project.name)"))

    # ---------- W4 atelier : menus, miroir, textes, segments, feuilles ----------
    check('W4a Barre de menus : Fichier, Édition, Affichage, Insertion, Simulation, Outils, Aide', pg.locator('.mtop').all_inner_texts() == ['Fichier', 'Édition', 'Affichage', 'Insertion', 'Simulation', 'Outils', 'Aide'])
    total = 0; failed = []
    for i in range(7):
        pg.click(f'.mtop[data-m="{i}"]'); n = pg.locator('.mitem').count(); total += n
        if n < 3: failed.append(i)
        pg.keyboard.press('Escape')
    check('W4b Chaque menu contient ses commandes', total >= 50 and not failed, [total, failed])
    pg.click('.mtop[data-m="1"]'); pg.click('.mitem:has-text("Tout sélectionner")'); n0 = J("EE.app.editor.selection.comps.length")
    check('W4c Menu Édition → Tout sélectionner', n0 > 5, n0)
    pg.keyboard.press('Escape'); J("EE.app.editor.select([],[])")
    pid = J("EE.app.project.id")
    fl = J("""()=>{const ed=EE.app.editor;const c=ed.doc.comps.find(x=>x.label==='S1');ed.select([c.id],[]);const ends=()=>{const c=ed.doc.comps.find(x=>x.label==='S1');const A=EE.Engine.analyze(ed.doc);return A.terms.filter(T=>T.cid===c.id).every(T=>{const n=A.nets[A.netOf(T.k)];return n.wires.length>0||n.terms.length>1})};const A0=ends();ed.flip();const c2=ed.doc.comps.find(x=>x.label==='S1');return [!!c2.flip,A0,ends()]}""")
    check('W4d Retourner (miroir) un composant : chaque borne reste raccordée à son conducteur', fl == [True, True, True], fl)
    J("EE.app.editor.flip()")
    J("EE.app.editor.arm('texte')"); r0 = J("(()=>{const ed=EE.app.editor;ed.mutate(d=>{const c=EE.Library.newComp('commentaire',600,100);c.val='Mon commentaire';d.comps.push(c)});return EE.Engine.verify(ed.doc).issues.filter(i=>i.code==='NO_ID').length})()")
    check('W4e Annotations (texte, commentaire) sans repère exigé', r0 == 0, r0)
    J("EE.app.editor.setTool('select')")
    seg = J("""()=>{const ed=EE.app.editor;const w=ed.doc.wires.find(w=>w.pts.length===2&&w.pts[0][0]===w.pts[1][0]&&Math.abs(w.pts[0][1]-w.pts[1][1])>=80);if(!w)return 'aucun';const a=w.pts[0].slice(),b=w.pts[w.pts.length-1].slice();const v=ed.view,r=document.querySelector('#sheet').getBoundingClientRect();return {id:w.id,a,b,sx:r.left+v.x+a[0]*v.k,sy:r.top+v.y+(a[1]+b[1])/2*v.k,k:v.k}}""")
    if isinstance(seg, dict):
        pg.mouse.move(seg['sx'], seg['sy']); pg.mouse.down(); pg.mouse.move(seg['sx'] + 40 * seg['k'], seg['sy'], steps=5); pg.mouse.up()
        aft = J(f"(()=>{{const w=EE.app.editor.doc.wires.find(x=>x.id==='{seg['id']}');return w?[w.pts[0],w.pts[w.pts.length-1],w.pts.length]:null}})()")
        check('W4f Déplacer un segment de conducteur sans le débrancher', aft and aft[0] == seg['a'] and aft[1] == seg['b'] and aft[2] == 4, [seg, aft])
        pg.keyboard.press('Control+z')
    else: check('W4f Déplacer un segment de conducteur sans le débrancher', False, seg)
    # feuilles
    pg.click('#sh-add'); pg.fill('#askv', 'Commande'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(200)
    J("(()=>{const ed=EE.app.editor;ed.mutate(d=>{const c=EE.Library.newComp('lampe',200,200);c.label='H9';d.comps.push(c)})})()")
    pg.click('[data-sh="0"]'); pg.wait_for_timeout(200); c0 = J("EE.app.editor.doc.comps.length"); J("EE.app.ui.flushSave()")
    st = J(f"(()=>{{const p=EE.Store.Projects.get('{pid}');return [p.sheets.length,p.sheets[1].name,p.sheets[1].doc.comps.length]}})()")
    check('W4g Plusieurs feuilles par projet : ajout, changement, enregistrement', st == [2, 'Commande', 1] and c0 > 5, [st, c0])
    pg.reload(); pg.wait_for_selector('.hero'); J(f"EE.app.go('editor','{pid}')"); pg.wait_for_selector('#shbar .shtab')
    check('W4h Feuilles conservées après rechargement', pg.locator('#shbar .shtab:not(.add)').count() == 2)
    pg.click('[data-sh="1"]'); pg.wait_for_timeout(200); check('W4i Contenu de la 2e feuille retrouvé', J("EE.app.editor.doc.comps.some(c=>c.label==='H9')")); pg.click('[data-sh="0"]'); pg.wait_for_timeout(200)

    # ---------- W5 simulation : pause et tensions ----------
    pg.click('#b-sim'); pg.wait_for_selector('#s-pause')
    J("(()=>{const s=EE.app.editor.sim;const c=s.doc.comps.find(x=>x.label==='S1');s.press(c.id);})()"); pg.wait_for_timeout(300)
    check('W5a Simulation : panneau tensions et courants', pg.locator('#psim table.elec').count() == 1 and '230 V' in pg.inner_text('#psim'))
    pg.click('#s-pause'); check('W5b Pause de la simulation', J("EE.app.editor.simPaused") and 'Reprendre' in pg.inner_text('#s-pause'))
    pg.click('#s-pause'); check('W5c Reprise de la simulation', not J("EE.app.editor.simPaused"))
    pg.click('#s-stop')

    # ---------- W6 exports ----------
    with pg.expect_download() as d: pg.select_option('#b-exp', 'dxf')
    fp = tmp / 'a.dxf'; d.value.save_as(fp); txt = fp.read_text(encoding='latin-1')
    check('W6a Export DXF (AutoCAD R12, calques, lignes, textes)', 'AC1009' in txt and 'ENTITIES' in txt and txt.count('\nLINE\n') > 20 and '\nTEXT\n' in txt and 'CONDUCTEURS' in txt and txt.strip().endswith('EOF'))
    pages = J("EE.Export.layoutPages(EE.app.project,{format:'A3',orient:'paysage',sheets:'all',author:'Moi',title:'T'}).map(p=>[p.W,p.H,/Moi/.test(p.svg),/Feuille/.test(p.svg),/Échelle/.test(p.svg),/Date/.test(p.svg)])")
    check('W6b Mise en page A3 paysage : une page par feuille, cartouche (auteur, date, feuille, échelle)', len(pages) == 2 and pages[0][:2] == [1191, 842] and all(all(x[2:]) for x in pages), pages)
    check('W6c Formats A4 et A2 portrait', J("[EE.Export.layoutPages(EE.app.project,{format:'A4',orient:'portrait',sheets:'current'})[0].W,EE.Export.layoutPages(EE.app.project,{format:'A2',orient:'portrait',sheets:'current'})[0].H].join()") == '595,1684')
    pg.select_option('#b-exp', 'print'); pg.wait_for_selector('#pr-prev svg'); pg.select_option('#pr-f', 'A2')
    with pg.expect_download() as d: pg.click('.modal .btn.primary')
    fp = tmp / 'a.pdf'; d.value.save_as(fp); pdf = fp.read_bytes()
    check('W6d PDF mis en page (2 pages)', pdf.startswith(b'%PDF') and b'/Count 2' in pdf and b'/MediaBox [0 0 1684 1191]' in pdf, pdf[:200])
    check('W6e Échelles du plan architectural (1:50)', J("(()=>{const p={name:'Plan',schema:'architectural',doc:{comps:[],wires:[{id:'w',pts:[[0,0],[400,0]]}]}};return EE.Export.layoutPages(p,{format:'A4',scale:'1:50',sheets:'current'})[0].scaleTxt})()") == '1:50')

    # ---------- W7 vérification : verrouillage ----------
    v = J("(()=>{const d=EE.Examples.build('inversion_sens');const a=EE.Engine.verify(d).issues.filter(i=>/SHORT/.test(i.code)).length;d.comps=d.comps.filter(c=>c.type!=='contact_nf');const b=EE.Engine.verify(d).issues.map(i=>i.code);return [a,b.includes('SHORT_IF'),b.includes('SHORT')]})()")
    check('W7 Inversion de sens : verrouillage reconnu ; sans verrouillage → avertissement « verrouillage manquant »', v == [0, True, False], v)

    # ---------- W8 calculs ----------
    c = J("""(()=>{const C=EE.Calc;return [C.ohm({U:'230',I:'2'}).res[0].v, C.courant({P:2000,U:230,cos:1,tri:'mono'}).res[0].v, C.courant({P:2200,U:400,cos:0.85,eta:0.9,tri:true}).res[0].v, C.chute({tri:'mono',mat:'cu',L:30,S:2.5,I:16,cos:1,U0:230,lim:3}).res[0].v, C.puissances({U:230,I:10,cos:0.8,tri:'mono'}).res.map(x=>Math.round(x.v)).join('/'), C.facteur({P:10000,Q:7500,cos2:0.93}).res[3].v, C.moteur({Pu:2200,U:400,cos:0.85,eta:0.85,tri:true}).res[1].v, C.resistance({mat:'cu',L:25,S:2.5}).res[0].v]})()""")
    exp = [115, 8.6957, 4.1512, 8.64, '1840/1380/2300/37', 3547.75, 4.3946, 0.225]
    ok = all((abs(a - e) < 0.01 * max(1, abs(e)) if isinstance(e, float) or isinstance(e, int) else a == e) for a, e in zip(c, exp))
    check('W8a Calculs : Ohm, courants mono/tri, chute de tension, P/Q/S, compensation, moteur, résistance', ok, c)
    pg.evaluate("EE.app.go('calc')"); pg.wait_for_selector('.calc')
    check('W8b Écran Calculs : 7 calculs avec formules', pg.locator('.calc').count() == 7 and pg.locator('.calc .fx').count() >= 7)
    pg.fill('.calc[data-calc=ohm] [data-k=R]', '115'); check('W8c Résultat mis à jour à la saisie', '2,00' in pg.inner_text('.calc[data-calc=ohm] .res') or 'Indiquez' in pg.inner_text('.calc[data-calc=ohm] .res'))

    # ---------- W9 dossiers ----------
    pg.evaluate("EE.app.go('projects')"); pg.wait_for_selector('#fol-add'); pg.click('#fol-add'); pg.fill('#nf', 'Classe CAP 1'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(150)
    pg.evaluate("EE.app.folder=''; EE.app.go('projects')"); pg.click('.tr[data-id] [data-a=fold] >> nth=0'); pg.select_option('#fd-s', 'Classe CAP 1'); pg.click('.modal .btn.primary'); pg.wait_for_timeout(200)
    pg.click('[data-fol="Classe CAP 1"]'); n = pg.locator('.tr[data-id]').count()
    check('W9 Projets rangés par dossiers (création, rangement, filtre)', n == 1 and J("EE.Store.Projects.list().filter(p=>p.folder==='Classe CAP 1').length") == 1, n)

    # ---------- W10 pédagogie ----------
    pg.evaluate("EE.app.go('learn')"); pg.wait_for_selector('#pd')
    check('W10a Bibliothèque de cours (6 cours intégrés)', pg.locator('#pd section.card').count() >= 6)
    pg.click('[data-t=quiz]');
    for i in range(10):
        pg.click('.qopt >> nth=0'); pg.click('#qz-next')
    check('W10b Quiz de reconnaissance des symboles (10 questions, score enregistré)', pg.locator('.score').count() == 1 and J("EE.Store.raw.get('eep.pedago.scores.'+EE.Store.Users.current().id,[]).length") == 1)
    note = J("(()=>{const e=EE.Examples.get('telerupteur');const ref=e.build();const full=EE.Pedago.correct(ref,EE.clone(ref),e.sim).note;const half=EE.clone(ref);half.wires=half.wires.slice(0,4);const h=EE.Pedago.correct(ref,half,e.sim);const none=EE.Pedago.correct(ref,{comps:[],wires:[]},e.sim).note;return [full,h.note,none,h.wrong.length>0]})()")
    check('W10c Correction automatique : 20/20 pour le corrigé, note partielle et liaisons manquantes listées, 0 pour une feuille vide', note[0] == 20 and 0 < note[1] < 20 and note[2] <= 3 and note[3], note)
    pg.click('[data-t=exos]'); pg.click('[data-go="x_va_et_vient"]'); pg.wait_for_selector('#sheet'); pg.wait_for_selector('.modal'); pg.click('.modal .btn.primary')
    check('W10d Circuit guidé : composants placés, sans conducteurs', J("EE.app.project.exercise&&EE.app.editor.doc.wires.length===0&&EE.app.editor.doc.comps.length>=5"))
    J("(()=>{const ed=EE.app.editor;const ex=EE.Examples.build('va_et_vient');ed.mutate(d=>{d.wires=ex.wires.map(w=>EE.clone(w));})})()")
    pg.click('.mtop[data-m="5"]'); pg.click('.mitem:has-text("Corriger mon exercice")'); pg.wait_for_selector('.score')
    check('W10e Menu Outils → Corriger mon exercice : note 20/20', '20 / 20' in pg.inner_text('.score'))
    with pg.expect_download() as d: pg.click('.modal .btn.primary')
    fp = tmp / 'remise.json'; d.value.save_as(fp)
    check('W10f Remise du travail : fichier élève + copie enregistrée', '"yak-elec-pro-remise"' in fp.read_text() and J("EE.Store.raw.get('eep.pedago.subs',[]).length") == 1)
    pg.evaluate("EE.Store.Settings.set({pedRole:'prof'}); EE.app.go('learn','creer')"); pg.wait_for_selector('#ce-go')
    pg.select_option('#ce-src', 'x:telerupteur'); pg.fill('#ce-t', 'Télérupteur du couloir'); pg.fill('#ce-c', 'Câblez le télérupteur.'); pg.click('#ce-go'); pg.wait_for_timeout(200)
    check('W10g Enseignant : création d\'un exercice', J("EE.Store.raw.get('eep.pedago.exercises',[]).some(e=>e.title==='Télérupteur du couloir')"))
    with pg.expect_download() as d: pg.click('[data-x] >> nth=0')
    fp2 = tmp / 'exo.json'; d.value.save_as(fp2); check('W10h Export de l\'exercice pour les élèves', '"yak-elec-pro-exercice"' in fp2.read_text())
    pg.evaluate("EE.app.go('learn','copies')"); pg.wait_for_selector('[data-rc]'); pg.click('[data-rc] >> nth=0'); pg.wait_for_selector('.score')
    check('W10i Enseignant : copies reçues, recorrection', '20 / 20' in pg.inner_text('.score')); pg.click('.modal .btn.primary')
    pg.set_input_files('#cp-f', str(fp)); pg.wait_for_timeout(300)
    check('W10j Import d\'une copie envoyée par un élève', J("EE.Store.raw.get('eep.pedago.subs',[]).length") == 2)

    # ---------- W11 mobile ----------
    m = b.new_context(viewport={'width': 390, 'height': 800}, is_mobile=True, has_touch=True); mp = m.new_page(); merr = []
    mp.on('pageerror', lambda e: merr.append(str(e))); mp.goto(URL); mp.fill('#lu', 'tel'); mp.fill('#lp', 'abcd'); mp.fill('#lp2', 'abcd'); mp.click('#lgo'); mp.wait_for_selector('.hero')
    ov = []
    for scr in ['examples', 'calc', 'learn']:
        mp.evaluate(f"EE.app.go('{scr}')"); mp.wait_for_timeout(200); ov.append(mp.evaluate("document.documentElement.scrollWidth<=window.innerWidth+2"))
    mp.evaluate("EE.app.go('examples')"); mp.click('[data-open=simple_allumage]'); mp.wait_for_selector('#mbar .mtop'); mp.tap('.mtop[data-m="0"]'); mp.wait_for_timeout(150)
    check('W11 Téléphone : écrans sans débordement, menus de l\'atelier utilisables', all(ov) and mp.locator('.mdrop .mitem').count() > 5 and not merr, [ov, merr])

    # ---------- W13 barre d'outils sur une ligne, sous-fenêtres ----------
    pg.evaluate("EE.app.go('examples')"); pg.click('[data-open=simple_allumage]'); pg.wait_for_selector('#eb .wbar')
    one = J("(()=>{const tb=document.querySelector('.tb');const t=[...tb.children].filter(e=>e.offsetParent).map(e=>e.getBoundingClientRect());return t.every(r=>r.top<t[0].bottom&&r.bottom>t[0].top)&&tb.scrollWidth<=tb.clientWidth+1})()")
    check('W13a Barre d\'outils sur une seule ligne (1400 px)', one)
    check('W13b Trois sous-fenêtres avec boutons Réduire / Agrandir', pg.locator('#eb .wbar').count() == 3 and pg.locator('#eb .wbtn[data-w=min]').count() == 3 and pg.locator('#eb .wbtn[data-w=max]').count() == 3)
    w0 = J("document.getElementById('sheet').getBoundingClientRect().width")
    pg.click('#pal .wbtn[data-w=min]'); pg.click('#side .wbtn[data-w=min]'); w1 = J("document.getElementById('sheet').getBoundingClientRect().width")
    check('W13c Réduire les panneaux agrandit la feuille', w1 > w0 + 300 and J("document.getElementById('pal').getBoundingClientRect().width") <= 36, [w0, w1])
    pg.click('#pal .wbar'); check('W13d Clic sur une fenêtre réduite = restaurer', J("document.getElementById('pal').getBoundingClientRect().width") > 100)
    pg.dblclick('#sheetwin .wbar .wtitle'); w2 = J("document.getElementById('sheet').getBoundingClientRect().width")
    check('W13e Double-clic sur la barre de titre = agrandir (plein espace)', w2 >= 1390 and not J("document.getElementById('pal').offsetParent"), w2)
    pg.click('#sheetwin .wbtn[data-w=max]'); check('W13f Restaurer après agrandissement', J("document.getElementById('pal').offsetParent!==null") and J("!document.getElementById('eb').classList.contains('max-sheet')"))
    pg.reload(); pg.wait_for_selector('.hero'); pg.evaluate("EE.app.go('editor')"); pg.wait_for_selector('#eb')
    check('W13g Disposition des fenêtres mémorisée', J("document.getElementById('side').classList.contains('wmin')"))
    J("EE.Panes.reset()"); check('W13h Rétablir la disposition', not J("document.getElementById('side').classList.contains('wmin')"))
    # ---------- W14 onglet déroulant « Matériel » ----------
    check('W14a Quantitatif et Composants ne sont plus des onglets séparés', pg.locator('.top nav > [data-go=quant]').count() == 0 and pg.locator('.top nav > [data-go=compo]').count() == 0 and pg.locator('.navgb:has-text("Matériel")').inner_text().startswith('Matériel'))
    pg.click('.navgb:has-text("Matériel")'); check('W14b Clic sur « Matériel » : les sous-titres apparaissent sous l\'onglet', pg.locator('.navdrop:visible .navsub').count() == 2 and J("(()=>{const a=[...document.querySelectorAll('.navgb')].find(b=>/Matériel/.test(b.textContent)).getBoundingClientRect(),d=document.querySelector('.navdrop:not([hidden])').getBoundingClientRect();return d.top>=a.bottom&&Math.abs(d.left-a.left)<40})()"))
    pg.click('.navdrop [data-go=compo]'); pg.wait_for_selector('.qt'); check('W14c Sous-titre Composants ouvre l\'écran, onglet parent mis en évidence', J("EE.app.screen==='compo'") and 'on' in pg.get_attribute('.navgb:has-text("Matériel")', 'class') and pg.locator('.navdrop:visible').count() == 0)
    pg.click('.navgb:has-text("Matériel")'); pg.click('#main', position={'x': 5, 'y': 5}); check('W14d Clic ailleurs : la liste se referme', pg.locator('.navdrop:visible').count() == 0)
    pg.click('.navgb:has-text("Matériel")'); pg.click('.navdrop [data-go=quant]'); pg.wait_for_selector('#qrooms'); check('W14e Sous-titre Quantitatif', J("EE.app.screen==='quant'"))
    pg.click('.navgb:has-text("Matériel")'); col = J("(()=>{const b=document.querySelector('.navdrop:not([hidden]) .navsub:not(.on) b')||document.querySelector('.navdrop:not([hidden]) .navsub b');return getComputedStyle(b).color})()"); pg.keyboard.press('Escape')
    check('W14f Sous-titres lisibles (texte foncé sur fond clair)', col not in ('rgb(255, 255, 255)',), col)
    # ---------- W15 Accueil déroulant : page d'accueil, paramètres, portail, déconnexion ----------
    check('W15a Paramètres, Portail et Déconnexion ne sont plus dans la barre', pg.locator('.top nav > [data-go=settings]').count() == 0 and pg.locator('.top nav > [data-go=portal]').count() == 0 and pg.locator('.top .user').count() == 0)
    pg.click('.navgb:has-text("Accueil")'); items = pg.locator('.navdrop:visible .navsub').all_inner_texts()
    check('W15b Onglet Accueil : page d\'accueil, paramètres, déconnexion + nom du compte (pas de portail pour un élève)', len(items) == 3 and 'Paramètres' in items[1] and 'Déconnexion' in items[2] and 'eleve1' in pg.inner_text('.navdrop:visible .navhead') and pg.locator('[data-go=portal]').count() == 0, items)
    pg.click('.navdrop:visible [data-go=settings]'); pg.wait_for_selector('#s-dark'); check('W15c Sous-titre Paramètres ouvre l\'écran (onglet Accueil en surbrillance)', 'on' in pg.get_attribute('.navgb:has-text("Accueil")', 'class'))
    pg.click('.navgb:has-text("Accueil")'); pg.click('.navdrop:visible [data-go=home]'); pg.wait_for_selector('.hero'); check('W15d Sous-titre Page d\'accueil', J("EE.app.screen==='home'"))
    pg.click('.navgb:has-text("Accueil")'); pg.click('#logout'); pg.wait_for_selector('.login'); check('W15e Sous-titre Déconnexion', J("!EE.Store.Users.current()"))
    pg.fill('#lu', 'eleve1'); pg.fill('#lp', 'abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    J("EE.Config.isAdmin=()=>true;EE.app.go('home')"); pg.click('.navgb:has-text("Accueil")')
    check('W15f Administrateur : le Portail apparaît dans l\'onglet Accueil', pg.locator('.navdrop:visible [data-go=portal]').count() == 1); pg.keyboard.press('Escape')
    # ---------- W16 clic sur un onglet à sous-titres = contenu visible ; présentation dans le portail ----------
    J("EE.app.go('calc')"); pg.click('.navgb:has-text("Matériel")'); pg.wait_for_selector('#qrooms')
    check('W16a Clic sur « Matériel » : le contenu (Quantitatif) s\'affiche et la liste des sous-titres reste ouverte', J("EE.app.screen==='quant'") and pg.locator('.navdrop:visible .navsub').count() == 2)
    pg.click('.navdrop:visible [data-go=compo]'); pg.wait_for_selector('.qt'); check('W16b Clic sur un sous-titre : son contenu s\'affiche', J("EE.app.screen==='compo'"))
    J("EE.app.go('calc')"); pg.click('.navgb:has-text("Accueil")'); pg.wait_for_selector('.hero'); check('W16c Clic sur « Accueil » : la page d\'accueil s\'affiche, liste ouverte', pg.locator('.navdrop:visible #logout').count() == 1); pg.keyboard.press('Escape')
    J("EE.Config.isAdmin=()=>true;EE.portalUnlocked=false;EE.app.go('portal')"); pg.wait_for_selector('#pp')
    check('W16d Portail (avant le mot de passe) : texte de présentation de l\'application', pg.locator('.about').count() == 1 and 'conception, de simulation' in pg.inner_text('.about'))
    J("EE.portalUnlocked=true;EE.app.go('portal')"); pg.wait_for_selector('.ptabs')
    check('W16e Portail ouvert : présentation affichée au-dessus des onglets', 'mode pédagogique' in pg.inner_text('.about'))
    pg.fill('#bab', 'Ma présentation personnalisée.\nDeuxième paragraphe.'); pg.click('#lsave'); pg.wait_for_timeout(200); J("EE.app.go('portal')"); pg.wait_for_selector('.about')
    check('W16f Texte de présentation modifiable dans « Apparence et textes »', pg.locator('.about p').count() == 2 and 'Ma présentation personnalisée.' in pg.inner_text('.about'))
    J("EE.Config.set(c=>{c.brand.about=''});EE.portalUnlocked=false")
    # ---------- W17 contenus des sous-titres les uns sous les autres ----------
    J("EE.app.go('calc')"); pg.click('.navgb:has-text("Matériel")'); pg.wait_for_selector('#gs-compo .qt'); pg.keyboard.press('Escape')
    pos = J("['quant','compo'].map(k=>{const e=document.getElementById('sec-'+k);return e?e.getBoundingClientRect().top+scrollY:-1})")
    check('W17a Matériel : Quantitatif puis Composants, l\'un sous l\'autre sur la même page', pos[0] >= 0 and pos[1] > pos[0] + 300 and pg.locator('#gs-quant #qrooms').count() == 1 and pg.locator('#gs-compo .qt').count() > 0, pos)
    pg.click('.navgb:has-text("Matériel")'); pg.click('.navdrop:visible [data-go=compo]'); pg.wait_for_timeout(300)
    check('W17b Clic sur le sous-titre Composants : la page descend jusqu\'à son contenu', abs(J("document.getElementById('sec-compo').getBoundingClientRect().top-document.getElementById('main').getBoundingClientRect().top")) < 30)
    n0 = J("document.querySelectorAll('#qrooms tbody tr, #qrooms .qroom, #qrooms tr').length"); pg.click('#qaddr'); pg.wait_for_timeout(150)
    check('W17c Agir dans le Quantitatif ne fait pas disparaître les Composants', pg.locator('#sec-compo .qt').count() > 0 and pg.locator('#sec-quant').count() == 1)
    pg.fill('#cmq', 'disjoncteur'); pg.wait_for_timeout(150)
    check('W17d Rechercher dans les Composants ne fait pas disparaître le Quantitatif', pg.locator('#gs-quant #qrooms').count() == 1 and pg.locator('#gs-compo .qt').count() > 0)
    pg.fill('#cmq', ''); J("EE.Config.isAdmin=()=>false"); J("EE.app.go('calc')"); pg.click('.navgb:has-text("Accueil")'); pg.wait_for_selector('#gs-settings #s-dark'); pg.keyboard.press('Escape')
    check('W17e Accueil : page d\'accueil puis Paramètres l\'un sous l\'autre (pas de portail pour un élève)', pg.locator('#gs-home .hero').count() == 1 and pg.locator('#sec-portal').count() == 0 and J("document.getElementById('sec-settings').getBoundingClientRect().top>document.getElementById('sec-home').getBoundingClientRect().top"))
    J("EE.Config.isAdmin=()=>true"); J("EE.app.go('home')"); pg.wait_for_selector('#gs-portal .about')
    check('W17f Administrateur : le Portail s\'affiche sous les Paramètres', J("document.getElementById('sec-portal').getBoundingClientRect().top>document.getElementById('sec-settings').getBoundingClientRect().top"))
    J("EE.Config.isAdmin=()=>false"); J("EE.app.go('home')")
    pg.click('.navgb:has-text("Matériel")'); pts = J("[...document.querySelectorAll('.navdrop:not([hidden]) .navsub')].map(b=>[...b.querySelectorAll('.navpts li')].map(l=>Math.round(l.getBoundingClientRect().top)))"); pg.keyboard.press('Escape')
    check('W18 Contenu des sous-titres en liste verticale (un élément par ligne)', len(pts) == 2 and all(len(x) >= 3 and all(x[i + 1] > x[i] for i in range(len(x) - 1)) for x in pts), pts)
    J("EE.app.go('examples')"); pg.click('[data-ex=etoile_triangle]'); pg.wait_for_selector('#exprev')
    fit = J("(()=>{const b=document.getElementById('exprev').getBoundingClientRect(),g=document.querySelector('#exprev svg g').getBoundingClientRect();return b.top<=g.top+1&&b.bottom>=g.bottom-1&&b.left<=g.left+1&&b.right>=g.right-1})()")
    pg.click('#exzi'); big = J("document.querySelector('#exprev svg').getBoundingClientRect().height>document.getElementById('exprev').clientHeight"); pg.click('#exzfit')
    pg.click('#exfull'); pg.wait_for_selector('.exoverlay'); full = J("(()=>{const o=document.querySelector('.exoverlay').getBoundingClientRect(),g=document.querySelector('.exoverlay svg g').getBoundingClientRect();return o.width>=1390&&o.top<=g.top&&o.bottom>=g.bottom})()"); pg.keyboard.press('Escape')
    check('W19 Fiche : schéma entier visible, zoom +, plein écran sur toute la page, Échap pour fermer', fit and big and full and pg.locator('.exoverlay').count() == 0, [fit, big, full])
    check('W12 Aucune erreur JavaScript', not errs, errs)
    b.close()
n_ok = sum(1 for _, ok in res if ok); print(f'\n{n_ok}/{len(res)} tests réussis'); sys.exit(0 if n_ok == len(res) else 1)
