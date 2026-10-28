from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
cloud['data']={'prefs':{'readingRewards':{'eventRewards':{f'{kind}:thunder_{name}':True for kind in ['frame','avatar','theme'] for name in ['liono','tygra','cheetara','panthro','mummra']}}}}
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx=b.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
 page.locator('nav [data-ir=perfil]').click()
 assert page.locator('.thunder-event .news-art').count()==5
 page.locator('.thunder-event').screenshot(path='/tmp/thunder-event.png')
 page.locator('[data-reward-kind=frame][data-reward-id=thunder_liono]').click()
 assert page.locator('#headerAvatar').get_attribute('data-frame')=='thunder_liono'
 page.locator('[data-reward-tab=avatar]').click();page.locator('[data-reward-kind=avatar][data-reward-id=thunder_cheetara]').click()
 assert 'thundercats-avatars.png' in page.locator('#headerAvatar').inner_html()
 page.locator('[data-reward-tab=theme]').click();page.locator('[data-reward-kind=theme][data-reward-id=thunder_mummra]').click()
 assert page.locator('html').get_attribute('data-site-theme')=='thunder_mummra'
 assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 assert not errors,errors
 print('ThunderCats mobile gallery, frame/avatar/theme equipment PASS');b.close()
