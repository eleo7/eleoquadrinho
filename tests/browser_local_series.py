"""Local series organization never uploads files or changes cloud documents."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
catalog['data']={'series':[{'id':'serie:local','tipo':'serie-pasta','titulo':'Minha Série','colecao':'marvel'},{'id':'serie:outra','tipo':'serie-pasta','titulo':'Outra Série'}], 'externas':[]}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block');connect(ctx,'admin')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    writes=[];page.on('request',lambda r:writes.append(r.url) if r.method in ['PUT','POST'] and 'action=login' not in r.url and 'action=storage-status' not in r.url else None)
    login(page);page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.locator('#localHQInput').set_input_files([{'name':f'HQ {n}.txt','mimeType':'text/plain','buffer':f'Conteudo {n}'.encode()} for n in [1,2,3]])
    page.wait_for_function("document.querySelectorAll('[data-device-library] .cartao').length===3")
    panel=page.locator('#organizarSeriesLocal');panel.locator('summary').click()
    panel.locator('#seriesSelecionarLocal').click();panel.locator('#seriesMoverLocal').click()
    page.wait_for_function("[...document.querySelectorAll('#organizarSeriesLocal .series-item small')].length===3 && [...document.querySelectorAll('#organizarSeriesLocal .series-item small')].every(el=>el.textContent==='Minha Série')")
    records=page.evaluate('''async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('eleoquadrinho:user-admin');r.onsuccess=()=>resolve(r.result)});return await new Promise(resolve=>{const r=db.transaction('arquivos').objectStore('arquivos').getAll();r.onsuccess=async()=>resolve(await Promise.all(r.result.map(async x=>({name:x.nome,series:x.serieId,number:x.edicaoNum,local:x.localOnly,text:await x.blob.text()}))))})}''')
    assert sorted(r['number'] for r in records)==[1,2,3]
    assert all(r['series']=='serie:local' and r['local'] and r['text'].startswith('Conteudo') for r in records)
    panel.locator('#seriesSelecionarLocal').click()
    panel.locator('.series-item').first.drag_to(panel.locator('[data-series-target="serie:outra"]'))
    page.wait_for_function("[...document.querySelectorAll('#organizarSeriesLocal .series-item small')].every(el=>el.textContent==='Outra Série')")
    page.reload();page.wait_for_selector('#tabDevice');page.locator('#tabDevice').click();page.locator('#organizarSeriesLocal summary').click()
    assert page.locator('#organizarSeriesLocal .series-item small').all_text_contents()==['Outra Série']*3
    assert catalog['revision']==0 and catalog['data']['externas']==[]
    assert set(cloud['data']).issubset({'prefs'}),cloud['data']
    assert not [url for url in writes if 'action=state' not in url],writes
    panel.locator('#seriesSelecionarLocal').click();panel.locator('#seriesUniversoLocal').select_option('dc')
    page.once('dialog',lambda d:d.accept());panel.locator('#seriesMoverUniversoLocal').click()
    page.wait_for_function("[...document.querySelectorAll('#organizarSeriesLocal .series-item small')].every(el=>el.textContent==='Sem série')")
    assert catalog['revision']==0
    assert not errors,errors
    print('Local batch series: persisted metadata, intact files, no upload/catalog/profile writes: PASS')
    browser.close()
