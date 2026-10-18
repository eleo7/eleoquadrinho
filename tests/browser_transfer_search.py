"""Filtered package selection preserves choices and exports exactly those files."""
from pathlib import Path
import zipfile
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':900});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.locator('#localHQInput').set_input_files([{'name':name+'.txt','mimeType':'text/plain','buffer':name.encode()} for name in ['Ação 1','Batman','Outra HQ']])
    page.wait_for_function("document.querySelector('#hqPackageSelection').options.length===3")
    page.locator('.pacotes-hq summary').click()
    page.locator('#hqPackageSearch').fill('ACAO')
    assert page.locator('#hqPackageSelection option').count()==1
    page.locator('#hqPackageSelectResults').click()
    page.locator('#hqPackageSearch').fill('batman')
    assert '1 fora do filtro' in page.locator('#hqPackageSearchStatus').inner_text()
    page.locator('#hqPackageSelection').select_option(index=0)
    assert '2 selecionada(s)' in page.locator('#hqPackageSearchStatus').inner_text()
    with page.expect_download() as downloaded:page.locator('#exportHQPackage').click()
    with zipfile.ZipFile(downloaded.value.path()) as archive:
        manifest=json.loads(archive.read('manifest.json'))
        assert {book['nome'] for book in manifest['books']}=={'Ação 1','Batman'}
    page.locator('#hqPackageSearch').fill('não existe')
    assert page.locator('#hqPackageSelection option').count()==0
    assert 'Nenhuma HQ encontrada' in page.locator('#hqPackageSearchStatus').inner_text()
    page.locator('#hqPackageClearSelection').click()
    page.locator('#hqPackageSearch').fill('txt')
    assert page.locator('#hqPackageSelection option').count()==3
    assert page.locator('#hqPackageSelection option:checked').count()==0
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert cloud['revision']==0 and catalog['revision']==0
    assert not errors,errors
    print('Transfer search: accents, format, persistent selection, exact package, empty results and mobile: PASS')
    browser.close()
