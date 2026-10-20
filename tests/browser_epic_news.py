"""Epic challenge previews and per-account discovery of newly published comics."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    assert page.locator('#releaseNews').count()==1
    page.locator('#releaseNews details summary').click()
    assert page.locator('#releaseNews .news-art svg').count()==5
    page.locator('[data-news-rewards]').click()
    page.wait_for_selector('.epic-challenges')
    assert page.locator('.epic-challenge').count()==2
    assert page.locator('.epic-art .epic-frame').count()==2
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('.epic-challenges').screenshot(path='/tmp/epic-challenges-mobile.png')
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.reload();page.wait_for_selector('nav [data-ir=perfil]')
    assert page.locator('#releaseNews').count()==0
    catalog['data']['externas'].append({'id':'ext:new','tipo':'ext-hq','titulo':'HQ recém-publicada','colecao':'dc'})
    page.reload();page.wait_for_selector('#releaseNews')
    page.locator('#releaseNews summary').click()
    assert 'HQ recém-publicada' in page.locator('#releaseNews').inner_text()
    assert 'Obra de teste' not in page.locator('#releaseNews').inner_text()
    assert not errors,errors
    print('Epic artwork, weekly/monthly UI, mobile layout and one-time new HQ announcement: PASS')
    browser.close()
