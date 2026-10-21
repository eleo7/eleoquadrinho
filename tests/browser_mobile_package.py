"""Touch device import with generic MIME and older Blob API; preserve account state."""
from pathlib import Path
import hashlib, io, zipfile
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
content=b'Leitura transferida para o celular.'
manifest={'app':'EleoQuadrinho-HQs','version':1,'books':[{'nome':'HQ mobile','formato':'txt','file':'files/0.txt','size':len(content),'hash':hashlib.sha256(content).hexdigest()}]}
package=io.BytesIO()
with zipfile.ZipFile(package,'w',compression=zipfile.ZIP_STORED) as z:
    z.writestr('manifest.json',json.dumps(manifest));z.writestr('files/0.txt',content)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844},is_mobile=True,has_touch=True);connect(ctx)
    ctx.add_init_script('Blob.prototype.arrayBuffer = undefined;')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.locator('.pacotes-hq summary').click()
    assert page.locator('#importHQPackage').get_attribute('accept') is None
    page.wait_for_timeout(1200) # Let login preferences finish syncing before measuring import isolation.
    before=json.dumps(cloud);before_catalog=json.dumps(catalog)
    file={'name':'shared.eleohq','mimeType':'application/octet-stream','buffer':package.getvalue()}
    page.locator('#importHQPackage').set_input_files(file)
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('1 HQ(s) importadas')")
    page.locator('#importHQPackage').set_input_files(file)
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('0 HQ(s) importadas')")
    assert json.dumps(cloud)==before and json.dumps(catalog)==before_catalog
    page.locator('#importHQPackage').set_input_files({'name':'broken.eleohq','mimeType':'application/octet-stream','buffer':b'broken'})
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('Não foi possível importar: Pacote')")
    second_content=b'Outra HQ do lote.'
    second_manifest=json.loads(json.dumps(manifest));second_manifest['books'][0].update(nome='Segunda HQ',size=len(second_content),hash=hashlib.sha256(second_content).hexdigest())
    second=io.BytesIO()
    with zipfile.ZipFile(second,'w') as z:
        z.writestr('manifest.json',json.dumps(second_manifest));z.writestr('files/0.txt',second_content)
    page.locator('#importHQPackage').set_input_files([file,{'name':'invalid.eleohq','mimeType':'application/octet-stream','buffer':b'broken'},{'name':'second.eleohq','mimeType':'application/octet-stream','buffer':second.getvalue()}])
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('second.eleohq: 1 importada')")
    result=page.locator('#hqPackageStatus').inner_text()
    assert '1 HQ(s) importadas; 1 duplicada(s)' in result and 'invalid.eleohq' in result
    assert json.dumps(cloud)==before and json.dumps(catalog)==before_catalog
    page.locator('#importHQPackage').set_input_files([])
    assert page.locator('#importHQPackage').is_enabled()
    # Android file managers may show an extracted folder, not the original ZIP.
    import tempfile
    with tempfile.TemporaryDirectory() as directory:
        root=Path(directory)/'hqs-2026';(root/'files').mkdir(parents=True)
        (root/'manifest.json').write_text(json.dumps(manifest));(root/'files'/'0.txt').write_bytes(content)
        page.locator('#importHQFolder').set_input_files(str(root))
        page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('0 HQ(s) importadas')")
        page.locator('#importHQParts').set_input_files(str(root/'manifest.json'))
        page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('Falta selecionar files/0.txt')")
        page.locator('#importHQParts').set_input_files(str(root/'files'/'0.txt'))
        page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('0 HQ(s) importadas')")
        assert json.dumps(cloud)==before and json.dumps(catalog)==before_catalog
        page.locator('#importHQParts').set_input_files(str(root/'files'/'0.txt'))
        page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('Selecione também o manifest.json')")
        page.locator('.pacotes-hq summary').click()
        page.locator('#clearHQParts').click()
        assert 'seleção' in page.locator('#hqPackageStatus').inner_text().lower()
    page.evaluate("()=>{Blob.prototype.arrayBuffer=()=>Promise.reject(new DOMException('unreadable','NotReadableError'));}")
    page.locator('#importHQPackage').set_input_files(file)
    page.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('pasta Downloads')")
    assert not errors,errors
    print('Mobile touch import: generic MIME, FileReader fallback, duplicate protection, invalid/unreadable package, account preservation: PASS')
    browser.close()
