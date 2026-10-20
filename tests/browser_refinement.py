"""Large cloud catalogs, filters, pagination and narrow-screen navigation."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
catalog['data']['externas']=[{'id':f'ext:{i}','tipo':'ext-hq','titulo':f'Edição {i}','colecao':'originais'} for i in range(125)]
cloud['data']={'historico':[{'id':'ext:2','prog':.5},{'id':'ext:5','prog':1}],'prefs':{'readingRewards':{'totalSeconds':16000}}}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=biblioteca]').click();page.wait_for_selector('[data-library-grid] .cartao')
    box=page.locator('[data-library=cloud]')
    assert box.locator('.cartao').count()==60
    box.locator('[data-library-more]').click();assert box.locator('.cartao').count()==120
    box.locator('[data-library-query]').fill('Edição 124');page.wait_for_function("document.querySelector('[data-library=cloud] [data-library-count]').textContent.startsWith('1 de 1')")
    assert box.locator('.cartao').count()==1
    box.locator('[data-library-query]').fill('inexistente');page.wait_for_selector('[data-library-empty]:visible')
    box.locator('[data-library-reset]').click();assert box.locator('.cartao').count()==60
    box.locator('[data-library-status]').select_option('reading');assert box.locator('.cartao').count()==1
    box.locator('[data-library-status]').select_option('finished');assert box.locator('.cartao').count()==1
    box.locator('[data-library-status]').select_option('all');box.locator('[data-library-sort]').select_option('title')
    for width in [320,390,768,1440]:
        page.set_viewport_size({'width':width,'height':950})
        assert page.evaluate('document.documentElement.scrollWidth<=innerWidth'),width
    page.screenshot(path='/tmp/eq-library-refined.png')
    page.locator('nav [data-ir=perfil]').click();page.locator('[data-profile-jump=rewardSearch]').click()
    page.locator('#rewardSearch').fill('Chamas');page.locator('[data-reward-id=flames]').click()
    assert page.locator('#rewardSearch').input_value()=='Chamas'
    assert page.locator('nav [data-ir=perfil]').get_attribute('aria-current')=='page'
    page.set_viewport_size({'width':320,'height':850});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    print('Cloud pagination/search/status/sort, 320–1440px layout, profile shortcuts and retained reward filter: PASS')
    browser.close()
