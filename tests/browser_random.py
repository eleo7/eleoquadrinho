"""The dice uses current access and visibility, including an empty candidate pool."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_access.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block')
    user=setup(ctx,'reader',{'mode':'alternative','universes':['dc'],'categories':['hq']})
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    login(page)
    titles=page.evaluate('HQS_ACERVO.dc.map(x=>x.titulo)')
    for value in [0,0.2,0.5,0.8,0.9999]:
        page.evaluate('(value)=>{Math.random=()=>value}',value)
        page.locator('#btnSorteio').click()
        page.wait_for_selector('#detalhe.aberta')
        assert any(title in page.locator('#toast').inner_text() for title in titles)
        page.wait_for_function('!document.querySelector("#btnSorteio").disabled')
        page.locator('#detalhe [data-fechar]').click()
    page.locator('nav [data-ir=perfil]').click()
    page.locator('[data-visible-universe=dc]').uncheck();page.locator('[data-save-visible]').click()
    page.locator('#btnSorteio').click()
    page.wait_for_function("document.querySelector('#toast').textContent.includes('Nenhuma leitura disponível')")
    assert page.locator('#detalhe.aberta').count()==0
    page.wait_for_function('!document.querySelector("#btnSorteio").disabled')
    # Changes made by admin after login are checked before choosing a candidate.
    user['access']={'mode':'alternative','universes':['arquivo'],'categories':['manga']}
    page.locator('#btnSorteio').click();page.wait_for_selector('#detalhe.aberta')
    assert 'Akira' in page.locator('#toast').inner_text()
    page.wait_for_function('!document.querySelector("#btnSorteio").disabled')
    page.locator('#detalhe [data-fechar]').click()
    user['access']={'mode':'alternative','universes':[],'categories':[]}
    page.locator('#btnSorteio').click()
    page.wait_for_function("document.querySelector('#toast').textContent.includes('Nenhuma leitura disponível')")
    page.wait_for_function('!document.querySelector("#btnSorteio").disabled')
    assert not errors,errors
    print('Dice: allowed universe only, hidden universes, updated category restrictions and empty pool: PASS')
    browser.close()
