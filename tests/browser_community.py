"""Community UI: two readers, friend consent, private conversation, suggestion and mobile layout."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
people={'user-reader':{'id':'user-reader','nome':'Alice','login':'alice'},'user-friend':{'id':'user-friend','nome':'Bob','login':'bob'}}
relations=[];messages=[];calls=[]
def social(ctx,actor):
    def route(r):
        from urllib.parse import parse_qs,urlparse
        assert parse_qs(urlparse(r.request.url).query)['account']==[actor]
        body=r.request.post_data_json;op=body['operation'];v=body['payload'];calls.append(op)
        if op=='friends':
            data=[dict(people[f['recipient'] if f['requester']==actor else f['requester']],status=f['status'],outgoing=f['requester']==actor,blocked_by_me=False) for f in relations if actor in [f['requester'],f['recipient']]]
        elif op=='people':data=[p for p in people.values() if p['id']!=actor and p['login'].startswith(v['query'])]
        elif op=='request':relations.append({'requester':actor,'recipient':v['target'],'status':'pending'});data={'ok':True}
        elif op=='accept':
            f=next(f for f in relations if f['recipient']==actor and f['requester']==v['target']);f['status']='accepted';data={'ok':True}
        elif op=='send':
            if v['channel']=='private':assert any(f['status']=='accepted' and {actor,v['target']}=={f['requester'],f['recipient']} for f in relations)
            messages.append(dict(people[actor],id=str(len(messages)+1),sender=actor,recipient=v.get('target'),channel=v['channel'],body=v['text'],status='open',created_at='2026-10-19T12:00:00Z'));data={'id':messages[-1]['id']}
        elif op=='feed':data=[m for m in messages if m['channel']==v['channel'] and (v['channel']!='private' or {actor,v['target']}=={m['sender'],m['recipient']})]
        else:raise AssertionError(op)
        r.fulfill(content_type='application/json',body=json.dumps({'data':data}))
    ctx.route('**/api/account?action=community*',route)
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block',viewport={'width':390,'height':844},is_mobile=True,has_touch=True);connect(ctx);social(ctx,'user-reader')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)));login(page)
    page.locator('nav [data-ir=comunidade]').click();page.wait_for_selector('.community-empty')
    page.locator('[data-channel=friends]').click();page.locator('[data-search] input').fill('bob');page.locator('[data-search] button').click()
    page.locator('[data-operation=request]').click();page.wait_for_selector('[data-operation=remove]')
    assert page.locator('[data-chat]').count()==0
    other=browser.new_context(service_workers='block',viewport={'width':320,'height':844});connect(other,'friend');social(other,'user-friend')
    bp=other.new_page();bp.on('pageerror',lambda e:errors.append(str(e)));login(bp);bp.locator('nav [data-ir=comunidade]').click();bp.locator('[data-channel=friends]').click()
    bp.locator('[data-operation=accept]').click();bp.wait_for_selector('[data-chat]');bp.locator('[data-chat]').click()
    bp.locator('#communityText').fill('Olá, conversa privada <img src=x onerror=alert(1)>');bp.locator('[data-send]').click();bp.wait_for_selector('.community-message')
    assert bp.locator('.community-message img').count()==0
    page.locator('[data-channel=general]').click();page.locator('[data-channel=friends]').click();page.locator('[data-chat]').click()
    page.wait_for_selector('.community-message');assert 'conversa privada' in page.locator('.community-message').inner_text()
    page.locator('[data-channel=suggestions]').click();page.locator('#communityText').fill('Melhorar a busca');page.locator('[data-send]').click()
    page.wait_for_function("document.querySelector('[data-messages]').textContent.includes('Melhorar a busca')")
    assert 'conversa privada' not in page.locator('[data-messages]').inner_text()
    assert page.locator('[data-status]').count()==0
    page.locator('#communityText').fill('Meu rascunho');page.locator('[data-channel=general]').click();page.locator('[data-channel=suggestions]').click();assert page.locator('#communityText').input_value()=='Meu rascunho'
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth')
    assert bp.evaluate('document.documentElement.scrollWidth<=innerWidth')
    page.screenshot(path='/tmp/eleo-community-mobile.png',full_page=True)
    page.locator('nav [data-ir=inicio]').click();page.wait_for_function("document.querySelector('#aba-comunidade').textContent===''")
    assert cloud['revision']==0 and catalog['revision']==0
    assert not errors,errors
    print('Community: friend request/accept, private cross-device messages, suggestions, XSS escaping, drafts, cleanup and 320px/390px layout: PASS')
    browser.close()
