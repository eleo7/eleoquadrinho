"""Batch series movement by button and native drag, with cloud persistence."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
catalog['data'] = {'series':[{'id':'serie:a','tipo':'serie-pasta','titulo':'Destino','colecao':'marvel'}], 'externas':[
    {'id':'ext:1','tipo':'ext-hq','titulo':'HQ 1','storagePath':'keep.pdf'},
    {'id':'ext:2','tipo':'ext-hq','titulo':'HQ 2'},
    {'id':'ext:3','tipo':'ext-hq','titulo':'HQ 3'},
    {'id':'ext:old','tipo':'ext-hq','titulo':'Existente','serieId':'serie:a','serieNome':'Destino','edicaoNum':5}
]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block');connect(ctx,'admin')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    login(page);page.locator('nav [data-ir=biblioteca]').click()
    page.locator('#organizarSeries summary').click()
    page.locator('#seriesBusca').fill('HQ')
    page.locator('#seriesSelecionar').click()
    assert page.locator('.series-item input:checked').count()==3
    page.locator('#seriesLimpar').click()
    assert page.locator('.series-item input:checked').count()==0
    page.locator('[data-series-item="ext:1"] input').check()
    page.locator('[data-series-item="ext:2"] input').check()
    page.locator('#seriesMover').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    byid={i['id']:i for i in catalog['data']['externas']}
    assert byid['ext:1']['edicaoNum']==6 and byid['ext:2']['edicaoNum']==7
    assert byid['ext:1']['storagePath']=='keep.pdf'
    assert byid['ext:old']['edicaoNum']==5 and 'serieId' not in byid['ext:3']
    page.locator('[data-series-item="ext:3"]').drag_to(page.locator('[data-series-target="serie:a"]'))
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    assert next(i for i in catalog['data']['externas'] if i['id']=='ext:3')['edicaoNum']==8
    page.set_viewport_size({'width':320,'height':900})
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.reload();page.wait_for_selector('#organizarSeries')
    page.locator('#organizarSeries summary').click()
    assert 'Destino' in page.locator('[data-series-item="ext:1"]').inner_text()
    assert cloud['data'].get('historico',[])==[]
    reader=browser.new_context(service_workers='block');connect(reader)
    rp=reader.new_page();login(rp);rp.locator('nav [data-ir=biblioteca]').click()
    rp.wait_for_selector('#bibCloud')
    assert rp.locator('#organizarSeries').count()==0
    assert not errors,errors
    print('Batch move, drag/drop, numbering, file preservation, reload, mobile and reader permissions: PASS')
    browser.close()
