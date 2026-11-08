from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 context=b.new_context(service_workers='block');connect(context);page=context.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 login(page)
 page.evaluate("""()=>{document.querySelector('#leitorHQ').classList.add('aberto');const stage=document.querySelector('#hqPalco');stage.innerHTML='<canvas width="600" height="800" style="width:300px;height:400px"></canvas>';const ctx=stage.firstChild.getContext('2d');ctx.fillStyle='white';ctx.fillRect(0,0,600,800);ctx.fillStyle='black';ctx.font='30px sans-serif';ctx.fillText('Olá, herói!',40,100);window.Tesseract={createWorker:async()=>({recognize:async()=>({data:{text:'Olá, herói!'}}),terminate(){}})};window.spoken=[];speechSynthesis.speak=u=>window.spoken.push(u.text);speechSynthesis.cancel=()=>{};}""")
 page.locator('#hqBubbles').click();r=page.locator('#hqPalco canvas').bounding_box()
 page.mouse.move(r['x']+10,r['y']+10);page.mouse.down();page.mouse.move(r['x']+240,r['y']+100);page.mouse.up()
 page.locator('[data-bubble-ocr]').click();page.wait_for_function("document.querySelector('[data-bubble-text]').value==='Olá, herói!'")
 page.locator('[data-bubble-speak]').click();assert page.evaluate('window.spoken')==['Olá, herói!']
 page.set_viewport_size({'width':390,'height':844});assert page.locator('.bubble-dialog').bounding_box()['width']<=390
 page.keyboard.press('Escape');assert page.locator('.bubble-dialog').count()==0
 assert page.locator('#leitorHQ').evaluate("e=>e.classList.contains('aberto')")
 assert page.locator('#hqBubbles').get_attribute('aria-pressed')=='false'
 assert not errors,errors
 print('Bubble selection, enlargement, OCR UI (mock), narration UI (mock), mobile dialog and Escape: PASS');b.close()
