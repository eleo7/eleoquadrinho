"""XP reward previews, equipment, real layouts and cross-device persistence."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
cloud['data']={'prefs':{'readingRewards':{'totalSeconds':16000,'goalDays':0,'books':{},'days':{},'appearance':{}}}}
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':1440,'height':1050});connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=perfil]').click()
    assert page.locator('.xp-balance strong').inner_text()=='2.660 XP'
    assert page.locator('[data-reward-id=flames]').is_enabled()
    assert page.locator('[data-reward-id=dragon_frame]').is_disabled()
    assert page.locator('#reward-panel-frame .reward-card').count()==47
    page.locator('[data-reward-id=flames]').click()
    assert page.locator('#headerAvatar').get_attribute('data-frame')=='flames'
    assert page.locator('#headerAvatar > .reward-frame-art').count()==1
    page.locator('.missoes-painel').screenshot(path='/tmp/eleo-quest-gallery-desktop.png')
    page.locator('[data-reward-tab=avatar]').click();page.locator('[data-reward-id=ranger]').click()
    assert page.locator('#headerAvatar .reward-avatar-art').count()==1
    page.locator('[data-reward-tab=theme]').click();page.locator('[data-reward-id=obsidian]').click()
    assert page.locator('html').get_attribute('data-site-theme')=='obsidian'
    page.locator('[data-reward-tab=layout]').click()
    assert page.locator('[data-reward-id=shelf]').is_disabled()
    page.locator('[data-reward-id=showcase]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.locator('nav [data-ir=biblioteca]').click();page.wait_for_selector('#bibCloud .cartao')
    assert page.locator('#bibCloud .cartao').first.bounding_box()['width']>=200
    second=browser.new_context(service_workers='block',viewport={'width':320,'height':900});connect(second)
    other=second.new_page();login(other);other.locator('nav [data-ir=perfil]').click()
    assert other.locator('#headerAvatar').get_attribute('data-frame')=='flames'
    assert other.locator('#headerAvatar .reward-avatar-art').count()==1
    assert other.locator('body').get_attribute('data-library-layout')=='showcase'
    assert other.locator('html').get_attribute('data-site-theme')=='obsidian'
    assert other.evaluate('document.documentElement.scrollWidth<=innerWidth')
    other.locator('.missoes-painel').screenshot(path='/tmp/eleo-quest-gallery-mobile.png')
    other.locator('[data-reward-tab=frame]').focus();other.keyboard.press('ArrowRight')
    assert other.locator('[data-reward-tab=avatar]').get_attribute('aria-selected')=='true'
    assert not errors,errors
    print('XP gallery, locked thresholds, decorative frame/avatar, theme/layout, mobile and second device: PASS')
    browser.close()
