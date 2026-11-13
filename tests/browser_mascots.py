from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('\nwith sync_playwright() as p:')[0])
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx=b.new_context(service_workers='block');connect(ctx);page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 login(page);page.locator('.mascot-toggle').click();assert page.locator('[data-pet-read]').count()==1
 page.locator('[data-pet-next]').click();page.locator('[data-pet-events]').click()
 page.locator('#mascotRewards').wait_for();assert page.locator('[data-pet=felino]').is_disabled()
 page.locator('[data-pet-visible]').uncheck();assert page.locator('#readingMascot').count()==0
 page.locator('[data-pet-visible]').check();page.locator('.mascot-toggle').click()
 page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
 page.evaluate("document.querySelector('#leitorHQ').classList.add('aberto')")
 assert not page.locator('#readingMascot').is_visible()
 assert not errors,errors
 print('Mascot recommendations, locked rewards, hide/show and mobile reader suppression: PASS');b.close()
