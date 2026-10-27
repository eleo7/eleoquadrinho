from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=b.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'admin')
 page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
 page.locator('nav [data-ir=perfil]').click();page.locator('.scheduled-events summary').click()
 form=page.locator('#scheduledEventForm');form.locator('[name=title]').fill('Semana especial');form.locator('[name=start]').fill('2026-10-27');form.locator('[name=end]').fill('2026-10-30');form.locator('button').click()
 page.wait_for_function("document.querySelector('.scheduled-events article')?.textContent.includes('Semana especial')")
 assert catalog['data']['events'][0]['title']=='Semana especial'
 page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabCloud').click()
 page.locator('#organizarSeries').evaluate('(e)=>e.open=true')
 page.locator('#seriesSelecionar').click();page.locator('#seriesUniverso').select_option('dc')
 page.once('dialog',lambda d:d.accept());page.locator('#seriesMoverUniverso').click()
 page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
 assert catalog['data']['externas'][0]['colecao']=='dc'
 readerctx=b.new_context(service_workers='block');connect(readerctx);reader=readerctx.new_page();login(reader);reader.locator('nav [data-ir=perfil]').click()
 assert reader.locator('#scheduledEventForm').count()==0
 assert 'Semana especial' in reader.locator('.scheduled-events').inner_text()
 assert not errors,errors
 print('Schedule creation, reader visibility, admin-only controls and bulk universe transfer PASS');b.close()
