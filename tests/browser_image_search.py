"""Free image search integration and admin cover selection."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844});connect(ctx,'admin')
    def images(route):
        assert route.request.post_data_json=={'q':'Naruto','kind':'anime'}
        route.fulfill(content_type='application/json',body=json.dumps({'provider':'Jikan / MyAnimeList','items':[{'id':'20','title':'Naruto','image':'https://cdn.myanimelist.net/images/anime/test.jpg','source':'https://myanimelist.net/anime/20'}]}))
    ctx.route('**/api/account?action=image-search*',images)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=perfil]').click();page.locator('#wallpaperPanel summary').click()
    page.locator('#imageSearchForm input').fill('Naruto');page.locator('#imageSearchForm button').click()
    page.get_by_role('button',name='Usar como fundo',exact=True).click()
    assert 'myanimelist.net' in page.locator('body').evaluate('e=>e.style.backgroundImage')
    page.get_by_role('button',name='Usar como capa de universo').click()
    page.locator('#universeForm [name=source]').select_option('u-mitologias')
    assert page.locator('#universeForm [name=cover]').input_value().endswith('test.jpg')
    page.locator('#universeForm button[type=submit]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    assert next(n for n in catalog['data']['universes'] if n['id']=='u-mitologias')['cover'].endswith('test.jpg')
    assert not errors,errors
    print('Free image query, wallpaper apply and admin universe cover persistence: PASS')
    browser.close()
