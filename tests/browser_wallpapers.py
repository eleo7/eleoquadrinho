"""Covers and account-specific wallpaper survive reload; removal restores the theme."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'admin')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    assert page.locator('[data-ex-uni=u-mitologias] .ex-uni-bg').count()==1
    page.locator('nav [data-ir=perfil]').click();page.locator('.universe-manager summary').click()
    form=page.locator('#universeForm');form.locator('[name=source]').select_option('u-mitologias');form.locator('[name=cover]').fill('https://images.example/myth.jpg');form.locator('button[type=submit]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    assert next(n for n in catalog['data']['universes'] if n['id']=='u-mitologias')['cover']=='https://images.example/myth.jpg'
    page.locator('#wallpaperPanel summary').click()
    page.locator('#wallpaperForm input').fill('https://images.example/wall.jpg');page.locator('#wallpaperForm button').first.click()
    assert page.locator('body').evaluate("e=>e.style.backgroundImage.includes('wall.jpg')")
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.reload();page.wait_for_selector('nav [data-ir=perfil]');page.locator('nav [data-ir=perfil]').click()
    assert page.locator('body').evaluate("e=>e.style.backgroundImage.includes('wall.jpg')")
    page.locator('#wallpaperPanel summary').click();page.locator('[data-wallpaper-clear]').click()
    assert page.locator('body').evaluate("e=>e.style.backgroundImage===''")
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert not errors,errors
    print('Default covers, custom cover persistence, mobile wallpaper sync and restore: PASS')
    browser.close()
