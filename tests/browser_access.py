"""Administrator access editor, reader preferences, and restricted navigation."""
from pathlib import Path
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
users=[{'id':'00000000-0000-4000-8000-000000000001','nome':'Pessoa Teste','login':'pessoa','email':'pessoa@example.test','bio':'','role':'reader','access':{'mode':'standard'}}]
catalog['data']={'externas':[{'id':'ext:dc','tipo':'ext-hq','titulo':'Minha DC','colecao':'dc','formatoObra':'HQ'},{'id':'ext:marvel','tipo':'ext-hq','titulo':'Minha Marvel','colecao':'marvel','formatoObra':'HQ'},{'id':'ext:manga','tipo':'ext-hq','titulo':'Meu Mangá','colecao':'arquivo','formatoObra':'Mangá'},{'id':'ext:lore','tipo':'ext-hq','titulo':'Minha Lore','colecao':'dc','formatoObra':'Lore'}]}
def setup(context,role,policy):
    session=connect(context,role)
    user={'id':'user-'+role,'nome':'Leitor Teste','login':role,'role':role,'access':policy}
    def auth(route):
        if 'action=login' in route.request.url:session['logged']=True
        route.fulfill(status=200 if session['logged'] else 401,content_type='application/json',body=json.dumps({'user':user} if session['logged'] else {'error':'Entre'}))
    context.route('**/api/account?action=login*',auth);context.route('**/api/account?action=session*',auth)
    def admin(route):
        assert role=='admin'
        if route.request.method=='PATCH':
            body=route.request.post_data_json;users[0].update(body);result={'user':users[0]}
        else:result={'users':users,'hasMore':False,'page':1}
        route.fulfill(content_type='application/json',body=json.dumps(result))
    context.route('**/api/account?action=users*',admin)
    return user
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    admin=browser.new_context(service_workers='block',viewport={'width':390,'height':900});setup(admin,'admin',{'mode':'standard'})
    page=admin.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    login(page);page.locator('nav [data-ir=perfil]').click()
    page.wait_for_selector('.access-user');assert 'pessoa@example.test' in page.locator('.access-user').inner_text()
    assert page.locator('#userAccessPanel [type=password]').count()==0
    page.locator('.access-user summary').click()
    page.locator('[name=mode]').select_option('alternative')
    page.locator('[name=universe]').evaluate_all('(els)=>els.forEach(el=>el.checked=["dc","marvel"].includes(el.value))')
    page.locator('[name=category]').evaluate_all('(els)=>els.forEach(el=>el.checked=el.value==="hq")')
    page.locator('[data-edit-user] [type=submit]').click()
    page.wait_for_function("document.querySelector('[data-edit-status]').textContent.includes('Perfil salvo')")
    assert users[0]['access']=={'mode':'alternative','universes':['marvel','dc'],'categories':['hq']}
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.locator('#userAccessPanel').screenshot(path='/tmp/eleo-admin-access.png')
    ctx=browser.new_context(service_workers='block');user=setup(ctx,'reader',users[0]['access'])
    reader=ctx.new_page();reader.on('pageerror',lambda e:errors.append(str(e)));login(reader)
    reader.locator('nav [data-ir=biblioteca]').click();reader.wait_for_selector('#bibCloud')
    assert reader.locator('#bibCloud .cartao').count()==2
    reader.locator('nav [data-ir=perfil]').click()
    assert reader.locator('[data-users-list]').count()==0
    reader.locator('[data-visible-universe=dc]').uncheck();reader.locator('[data-save-visible]').click()
    reader.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    reader.locator('nav [data-ir=biblioteca]').click();reader.wait_for_selector('#bibCloud')
    assert reader.locator('#bibCloud .cartao').count()==1
    assert reader.locator('#bibCloud .cartao').get_attribute('data-id')=='ext:marvel'
    reader.reload();reader.wait_for_selector('#bibCloud')
    assert reader.locator('#bibCloud .cartao').count()==1
    # Administrator changes take effect on the next session check, without clearing history.
    user['access']={'mode':'initial'}
    reader.locator('#bibCloud [data-id="ext:marvel"]').click()
    reader.wait_for_selector('#detalhe.aberta')
    reader.locator('#detalhe [data-fechar]').first.click()
    reader.locator('nav [data-ir=biblioteca]').click()
    assert reader.locator('#bibCloud [data-id="ext:manga"]').count()==0
    assert reader.locator('#bibCloud [data-id="ext:lore"]').count()==0
    assert not errors,errors
    print('Admin email/access editor, no password fields, reader permissions and persistent hidden universes: PASS')
    browser.close()
