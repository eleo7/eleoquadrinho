"""Confirmed batch deletion removes local files only; cancel preserves them."""
from pathlib import Path
exec((Path(__file__).parent/'browser_mobile_package.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'reader')
    page=ctx.new_page();login(page)
    page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.locator('#importHQPackage').set_input_files({'name':'test.eleohq','mimeType':'application/octet-stream','buffer':package.getvalue()})
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('1 HQ(s) importadas')")
    page.wait_for_timeout(1200)
    before=json.dumps(cloud);before_catalog=json.dumps(catalog)
    page.locator('.pacotes-hq').evaluate('(e)=>e.open=true')
    page.locator('#hqPackageSelectResults').click()
    page.once('dialog',lambda d:d.dismiss());page.locator('#deleteHQSelection').click()
    assert page.locator('#hqPackageSelection option').count()==1
    def accept(d):
        assert '1 HQ(s)' in d.message and 'não pode ser desfeita' in d.message
        d.accept()
    page.once('dialog',accept);page.locator('#deleteHQSelection').click()
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('1 HQ(s) excluída(s)')")
    assert page.locator('#hqPackageSelection option').count()==0
    counts=page.evaluate("""()=>new Promise(resolve=>{const r=indexedDB.open('eleoquadrinho:user-reader');r.onsuccess=()=>{const tx=r.result.transaction(['arquivos','metadados']);const a=tx.objectStore('arquivos').count(),m=tx.objectStore('metadados').count();tx.oncomplete=()=>resolve([a.result,m.result]);}})""")
    assert counts==[0,0],counts
    assert json.dumps(cloud)==before and json.dumps(catalog)==before_catalog
    readerctx=browser.new_context(service_workers='block');connect(readerctx)
    reader=readerctx.new_page();login(reader);reader.locator('nav [data-ir=biblioteca]').click()
    assert reader.locator('#deleteHQSelection').count()==1
    print('Delete local selection: cancel, confirm, payload/metadata cleanup, cloud/account preservation and reader access PASS')
    browser.close()
