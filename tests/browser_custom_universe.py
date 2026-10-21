"""Custom universes own characters, series, lore and linked catalog books."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'admin')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    def manager(uid=None):
        page.locator('nav [data-ir=perfil]').click();page.wait_for_timeout(200)
        page.locator('.universe-manager').evaluate('(e)=>e.open=true')
        if uid: page.locator('#universeForm [name=source]').select_option(uid)
    def synced():
        page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    manager();page.locator('#universeForm [name=title]').fill('Universo Teste')
    page.locator('#universeForm button[type=submit]').click();synced()
    node=next(n for n in catalog['data']['universes'] if n['nome']=='Universo Teste');uid=node['id'];col=node['cols'][0]
    for kind,field,button,title,key in [('hero','novoHeroiNome','btnSalvarNovoHeroi','Herói Teste','herois'),('series','novaSerieTitulo','btnSalvarNovaSerie','Saga Teste','series'),('lore','extTitulo','extSalvarBtn','Lore Teste','externas')]:
        manager(uid);page.locator('[data-universe-content='+kind+']').click()
        page.locator('#'+field).fill(title)
        if kind=='lore':page.locator('#extTextoLore').fill('História deste novo universo.')
        page.locator('#'+button).click();synced()
        assert any(x['titulo']==title and x['colecao']==col for x in catalog['data'][key]),catalog['data'][key]
    manager(uid);page.locator('[data-universe-link]').click()
    page.locator('[data-universe-links] input[value="ext:test"]').check()
    page.locator('[data-confirm-universe-link]').click();synced()
    assert next(x for x in catalog['data']['externas'] if x['id']=='ext:test')['colecao']==col
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    reader_ctx=browser.new_context(service_workers='block');connect(reader_ctx)
    reader=reader_ctx.new_page();login(reader)
    reader.locator('[data-ex-uni="'+uid+'"]').click()
    assert reader.locator('.ex-hero-info h2').inner_text()=='Universo Teste'
    assert reader.locator('[data-universe-create]').count()==0
    assert not errors,errors
    print('Custom universe characters, series, lore and existing HQ linking on mobile: PASS')
    browser.close()
