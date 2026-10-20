"""Prominent launch dialog, dismissal scope, mobile and keyboard behavior."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page,show_news=True)
    dialog=page.locator('#achievementLaunch')
    assert dialog.get_attribute('open') is not None
    assert dialog.locator('.reward-frame-art').count()==4
    dialog.screenshot(path='/tmp/achievement-launch-mobile.png')
    page.keyboard.press('Tab');assert page.evaluate("!!document.activeElement.closest('#achievementLaunch')")
    page.locator('[data-launch-later]').click();assert dialog.count()==0
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.reload();page.wait_for_selector('#achievementLaunch[open]')
    page.keyboard.press('Escape');assert dialog.count()==0
    page.reload();page.wait_for_selector('#achievementLaunch[open]')
    page.set_viewport_size({'width':320,'height':568})
    assert page.evaluate("document.querySelector('#achievementLaunch').scrollWidth<=document.querySelector('#achievementLaunch').clientWidth")
    page.locator('[data-launch-hide]').check();page.locator('[data-launch-close]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.reload();page.wait_for_selector('nav [data-ir=perfil]');assert dialog.count()==0
    assert cloud['data']['prefs']['achievementNews']['pending']==[]
    assert not errors,errors
    print('Launch dialog: mobile, focus, later/escape, opt-out persistence and no horizontal overflow: PASS')
    browser.close()
