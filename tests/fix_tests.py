import sys
from playwright.sync_api import sync_playwright
U='/tmp/claude-0/-home-claude/440266f4-7ed0-5fec-83ee-f922ba0230c3/scratchpad/'
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+sys.argv[1]); pg.fill('#lu','prof'); pg.click('.tab[data-t=up]'); pg.fill('#lp','abcd'); pg.fill('#lp2','abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.click('[data-a=new]'); pg.fill('#pn','T'); pg.click('.btn.primary:has-text("Créer")'); pg.wait_for_selector('#sheet')
    pg.evaluate("""()=>{const ed=EE.app.editor;const mk=(t,x,y,l)=>{const c=EE.Library.newComp(t,x,y);c.label=l||'';ed.doc.comps.push(c)};
      mk('phase',200,100,'');mk('neutre',400,100,'');mk('disjoncteur',200,300,'');mk('lampe',200,500,'H1');mk('prise',500,400,'X1');mk('lampe',600,500,'H1');
      const W=(id,pts)=>ed.doc.wires.push({id,pts,n:1,desig:''});
      W('w1',[[200,100],[200,240]]);W('w2',[[200,340],[200,440]]);W('w3',[[400,100],[400,560],[200,560]]);W('w9',[[800,100],[900,100]]);ed.commit();ed.fit();}""")
    before=pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.map(i=>i.code).join(',')"); print('avant:',before)
    pg.click('#b-verify'); pg.wait_for_selector('.issues li'); print('boutons de correction:',pg.locator('.fixbtn').count(), '| tout corriger:',pg.locator('#fixall').count())
    pg.screenshot(path=U+'depannage_avant.png')
    pg.click('#b-fix'); pg.wait_for_timeout(300)
    after=pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.map(i=>i.code+':'+i.sev).join(',')"); print('après:',after)
    print(pg.inner_text('#preport')[:700])
    pg.screenshot(path=U+'depannage_apres.png')
    pg.keyboard.press('Control+z'); pg.wait_for_timeout(200); print('après annuler:',pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.length"))
    print(errs)
