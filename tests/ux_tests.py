"""Tests Y – rapport d'erreurs détaillé et feuille ajustable (sans mot de passe admin).
Usage : python3 tests/ux_tests.py chemin/vers/index.html"""
import sys
from playwright.sync_api import sync_playwright
import pathlib
U='/tmp/'
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900}); errs=[]
    pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+sys.argv[1]); pg.fill('#lu','prof'); pg.click('.tab[data-t=up]'); pg.fill('#lp','abcd'); pg.fill('#lp2','abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.click('[data-a=new]'); pg.fill('#pn','T'); pg.click('.btn.primary:has-text("Créer")'); pg.wait_for_selector('#sheet')
    # schéma volontairement faux : lampe seule + fil pendant + disjoncteur sans repère
    pg.evaluate("""()=>{const ed=EE.app.editor;const mk=(t,x,y,l)=>{const c=EE.Library.newComp(t,x,y);c.label=l||'';ed.doc.comps.push(c)};
      mk('phase',200,100,'');mk('neutre',400,100,'');mk('disjoncteur',200,300,'');mk('lampe',300,500,'H1');
      ed.doc.wires.push({id:'w1',pts:[[200,100],[200,260]],n:1,desig:''});ed.doc.wires.push({id:'w2',pts:[[600,600],[700,600]],n:1,desig:''});ed.fit();}""")
    pg.click('#b-verify'); pg.wait_for_selector('.issues li')
    n=pg.locator('.issues li').count(); print('anomalies',n, 'avec solution', pg.locator('.issues li .ifix').count())
    print(pg.inner_text('.issues li >> nth=0')[:400])
    
    # zoom
    pg.fill('#b-zr','200'); pg.wait_for_timeout(100); print('zoom slider ->', pg.evaluate("Math.round(EE.app.editor.view.k*100)"), pg.inner_text('#b-z100'))
    pg.click('#b-z100'); print('100% ->', pg.evaluate("Math.round(EE.app.editor.view.k*100)"))
    w0=pg.evaluate("document.getElementById('sheet').getBoundingClientRect().width")
    pg.click('#b-full'); pg.wait_for_timeout(200); w1=pg.evaluate("document.getElementById('sheet').getBoundingClientRect().width")
    print('plein écran largeur feuille',w0,'->',w1, 'pal visible', pg.is_visible('#pal'))
    
    pg.keyboard.press('Escape'); pg.wait_for_timeout(200); print('après Échap pal visible', pg.is_visible('#pal'))
    bx=pg.locator('#sp-side').bounding_box(); pg.mouse.move(bx['x']+3,bx['y']+200); pg.mouse.down(); pg.mouse.move(bx['x']-150,bx['y']+200,steps=5); pg.mouse.up()
    print('panneau droit', pg.evaluate("document.getElementById('side').getBoundingClientRect().width"), pg.evaluate("localStorage.getItem('eep.panelw')"))
    fixed=pg.evaluate('1')
    print(errs)
