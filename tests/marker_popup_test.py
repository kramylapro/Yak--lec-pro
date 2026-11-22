import sys
from playwright.sync_api import sync_playwright
U='/tmp/claude-0/-home-claude/440266f4-7ed0-5fec-83ee-f922ba0230c3/scratchpad/'
with sync_playwright() as pw:
    b=pw.chromium.launch(); pg=b.new_page(viewport={'width':1400,'height':900}); errs=[]; pg.on('pageerror',lambda e:errs.append(str(e)))
    pg.goto('file://'+sys.argv[1]); pg.fill('#lu','prof'); pg.click('.tab[data-t=up]'); pg.fill('#lp','abcd'); pg.fill('#lp2','abcd'); pg.click('#lgo'); pg.wait_for_selector('.hero')
    pg.click('[data-a=new]'); pg.fill('#pn','T'); pg.click('.btn.primary:has-text("Créer")'); pg.wait_for_selector('#sheet')
    pg.evaluate("""()=>{const ed=EE.app.editor;const mk=(t,x,y,l)=>{const c=EE.Library.newComp(t,x,y);c.label=l||'';ed.doc.comps.push(c)};
      mk('phase',200,100,'');mk('neutre',400,100,'');mk('disjoncteur',200,300,'Q1');mk('lampe',200,500,'H1');
      const W=(id,pts)=>ed.doc.wires.push({id,pts,n:1,desig:''});W('w1',[[200,100],[200,240]]);ed.commit();ed.fit();}""")
    pg.click('#b-verify'); pg.wait_for_selector('.issues li')
    iss=pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.filter(i=>i.code==='DANGLING').map(i=>[i.id,i.x,i.y])")[0]
    sc=pg.evaluate("(a)=>{const v=EE.app.editor.view,r=document.getElementById('sheet').getBoundingClientRect();return [r.left+v.x+a[1]*v.k,r.top+v.y+a[2]*v.k]}",iss)
    pg.mouse.click(sc[0],sc[1]); pg.wait_for_selector('#mkpop'); print('bulle:',pg.inner_text('#mkpop')[:300].replace('\n',' | '))
    pg.screenshot(path=U+'bulle_erreur.png')
    n0=pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.length")
    pg.click('#mkpop .mkb button.primary'); pg.wait_for_timeout(300)
    print('anomalies',n0,'->',pg.evaluate("EE.Engine.verify(EE.app.editor.doc).issues.length"),'| bulle fermée:',pg.locator('#mkpop').count()==0)
    print(errs)
