"""Universe organization persists without modifying catalog works or reader history."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'admin')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('.ex-unis [data-ex-uni=u-mitologias]').click()
    assert page.locator('.ex-unis [data-ex-uni=u-grega]').count()==1
    page.locator('.ex-unis [data-ex-uni=u-grega]').click()
    assert page.locator('.ex-hero-info h2').inner_text()=='Mitologia Grega'
    page.locator('[data-ex-voltar]').click()
    assert page.locator('.ex-hero-info h2').inner_text()=='Mitologias'
    page.locator('nav [data-ir=perfil]').click();page.locator('.universe-manager').evaluate('(e)=>e.open=true')
    form=page.locator('#universeForm')
    form.locator('[name=title]').fill('Mitos reunidos')
    form.locator('button[type=submit]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.locator('.universe-manager').evaluate('(e)=>e.open=true')
    form.locator('[name=source]').select_option('u-grega');form.locator('[name=parent]').select_option(label='Mitos reunidos')
    form.locator('button[type=submit]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    new_id=next(n['id'] for n in catalog['data']['universes'] if n['nome']=='Mitos reunidos')
    assert next(n for n in catalog['data']['universes'] if n['id']=='u-grega')['parent']==new_id
    page.locator('.universe-manager').evaluate('(e)=>e.open=true')
    form.locator('[name=source]').select_option('u-grega');form.locator('[name=target]').select_option('u-nordica')
    page.once('dialog',lambda d:d.accept());form.locator('[data-universe-merge]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    assert set(next(n for n in catalog['data']['universes'] if n['id']=='u-nordica')['cols'])=={'nordica','grega'}
    assert catalog['data']['externas'][0]['id']=='ext:test'
    otherctx=browser.new_context(service_workers='block',viewport={'width':320,'height':900});connect(otherctx)
    other=otherctx.new_page();login(other)
    assert other.locator('.ex-unis [data-ex-uni=u-mitologias]').count()==1
    other.locator('nav [data-ir=perfil]').click();assert other.locator('#universeForm').count()==0
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    print('Mythology folders, navigation, create, move, merge, reader visibility and persistence: PASS')
    browser.close()
