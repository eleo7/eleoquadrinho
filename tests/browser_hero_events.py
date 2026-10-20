"""Themed events, reward filtering and persistent equipment on mobile."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
cloud['data']={'prefs':{'readingRewards':{'eventRewards':{kind+':event_flash':True for kind in ['frame','avatar','theme']}}}}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=perfil]').click()
    assert page.locator('.hero-event').count()==1
    assert page.locator('.hero-event-art svg').count()==2
    page.locator('.hero-event').screenshot(path='/tmp/eleo-hero-event-mobile.png')
    page.locator('#rewardSearch').fill('Flash')
    page.locator('#rewardFilter').select_option('event')
    assert page.locator('#reward-panel-frame .reward-card:visible').count()==1
    page.locator('#reward-panel-frame [data-reward-id=event_flash]').click()
    assert page.locator('#headerAvatar').get_attribute('data-frame')=='event_flash'
    page.locator('[data-reward-tab=theme]').click()
    page.locator('#reward-panel-theme [data-reward-id=event_flash]').click()
    assert page.locator('html').get_attribute('data-site-theme')=='event_flash'
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.reload();page.wait_for_selector('nav [data-ir=perfil]');page.locator('nav [data-ir=perfil]').click()
    assert page.locator('html').get_attribute('data-site-theme')=='event_flash'
    assert page.locator('#headerAvatar').get_attribute('data-frame')=='event_flash'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    browser.close()
    print('Hero event art, mobile, filters and persistent event equipment: PASS')
