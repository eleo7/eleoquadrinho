from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
    b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=b.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('[data-queue="ext:test"]').first.click()
    page.locator('nav [data-ir=salvos]').click()
    page.locator('#personalShelf').select_option('queue')
    assert page.locator('.personal-grid [data-queue="ext:test"]').count()==1
    page.locator('#personalDensity').select_option('list')
    page.once('dialog',lambda d:d.accept('Minhas sagas'));page.locator('#newPersonalShelf').click()
    page.locator('#personalShelf').select_option('queue')
    page.once('dialog',lambda d:d.accept('Minhas sagas'));page.locator('[data-personal-add="ext:test"]').click()
    page.locator('#personalShelf').select_option('Minhas sagas')
    assert page.locator('.personal-grid .cartao').count()==1
    assert not errors,errors
    print('Personal queue, collections and layout: PASS');b.close()
