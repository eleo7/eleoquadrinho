"""Native reading time, reward equipment and account-scoped persistence."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    context = browser.new_context(service_workers='block', viewport={'width':390,'height':900})
    connect(context)
    page = context.new_page(); errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
    page.clock.install()
    login(page); page.bring_to_front()
    page.locator('nav [data-ir=perfil]').click()
    assert page.locator('[data-reward-id=owl]').is_disabled()
    assert page.locator('[data-reward-id=forest]').is_disabled()
    page.locator('#metaLeituraMinutos').select_option('5')
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    page.locator('nav [data-ir=biblioteca]').click(); page.locator('#tabDevice').click()
    page.locator('#localHQInput').set_input_files({'name':'missao.txt','mimeType':'text/plain','buffer':b'Texto da missao.\n' * 50})
    page.wait_for_selector('#bibDevice [data-ler]')
    page.locator('#bibDevice [data-ler]').click()
    page.wait_for_selector('#leitorTexto.aberto')
    page.locator('#ltCorpo').evaluate('(el)=>{el.scrollTop=el.scrollHeight;el.dispatchEvent(new Event("scroll"))}')
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    # Each interval has interaction and is evaluated with the foreground reader open.
    for i in range(23):
        page.mouse.move(100 + i % 2, 200)
        page.clock.run_for(15000)
    page.clock.run_for(1500)
    page.locator('#leitorTexto [data-fechar-leitor]').click()
    page.locator('nav [data-ir=perfil]').click()
    page.wait_for_function("!document.querySelector('[data-reward-id=owl]').disabled")
    assert page.locator('[data-reward-id=owl]').is_enabled()
    assert page.locator('[data-reward-id=bronze]').is_enabled()
    assert page.locator('[data-reward-id=forest]').is_disabled()
    assert 'Meta de hoje cumprida' in page.locator('.meta-leitura').inner_text()
    page.locator('[data-reward-id=owl]').click()
    page.locator('[data-reward-id=bronze]').click()
    page.locator('[data-reward-id=compact]').click()
    page.clock.run_for(1500)
    assert page.locator('#headerAvatar').inner_text() == '🦉'
    assert page.locator('#headerAvatar').get_attribute('data-frame') == 'bronze'
    assert page.locator('body').get_attribute('data-library-layout') == 'compact'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/eleo-missions-mobile.png', full_page=True)
    earned = cloud['data']['prefs']['readingRewards']
    assert earned['totalSeconds'] >= 300 and earned['goalDays'] == 1
    second = browser.new_context(service_workers='block');connect(second)
    other=second.new_page();login(other)
    assert other.locator('#headerAvatar').inner_text() == '🦉'
    assert other.locator('#headerAvatar').get_attribute('data-frame') == 'bronze'
    assert other.locator('body').get_attribute('data-library-layout') == 'compact'
    # Earned themes apply to the whole site and remain usable on narrow screens.
    cloud['data']['prefs']['readingRewards']['totalSeconds'] = 1800
    themed = browser.new_context(service_workers='block', viewport={'width':320,'height':900}); connect(themed)
    theme_page = themed.new_page(); login(theme_page); theme_page.locator('nav [data-ir=perfil]').click()
    theme_page.locator('[data-reward-id=forest]').click()
    assert theme_page.locator('html').get_attribute('data-site-theme') == 'forest'
    assert theme_page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    theme_page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    # A separate account's empty state has no borrowed rewards or appearance.
    cloud['data']={};cloud['revision']=0
    fresh=browser.new_context(service_workers='block');connect(fresh)
    newcomer=fresh.new_page();login(newcomer);newcomer.locator('nav [data-ir=perfil]').click()
    assert newcomer.locator('[data-reward-id=owl]').is_disabled()
    assert newcomer.locator('body').get_attribute('data-library-layout')=='comfortable'
    assert not errors,errors
    print('Active reading -> missions -> avatar/frame/layout -> second device -> empty account isolation: PASS')
    browser.close()
