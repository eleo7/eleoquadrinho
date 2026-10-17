"""Browser integration against a mocked account API (no real Supabase credentials)."""
import json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8001'
cloud = {'data': {}, 'revision': 0}
catalog = {'data': {'externas': [{'id': 'ext:test', 'tipo': 'ext-hq', 'titulo': 'Obra de teste', 'colecao': 'originais', 'sub': 'Teste'}]}, 'revision': 0}

def connect(context, role='reader'):
    session = {'logged': False}
    user = {'id': 'user-' + role, 'login': role, 'nome': 'Leitor Teste', 'bio': '', 'avatar': '', 'role': role}
    def api(route):
        from urllib.parse import urlparse, parse_qs
        action = parse_qs(urlparse(route.request.url).query).get('action', ['session'])[0]
        body = route.request.post_data_json if route.request.method != 'GET' else {}
        status = 200
        if action == 'signup':
            result = {'message': 'Confira seu e-mail para confirmar o cadastro.'}
        elif action == 'login':
            if body.get('senha') != 'test-password':
                status = 401; result = {'error': 'Login ou senha inválidos.'}
            else:
                session['logged'] = True; result = {'user': user}
        elif not session['logged']:
            status = 401; result = {'error': 'Entre na sua conta.'}
        elif action == 'session': result = {'user': user}
        elif action == 'logout':
            session['logged'] = False; result = {'ok': True}
        elif action in ['state', 'catalog']:
            doc = cloud if action == 'state' else catalog
            if route.request.method == 'PUT':
                assert role == 'admin' or action != 'catalog'
                if body['revision'] != doc['revision']:
                    status = 409; result = {'error': 'Conflito'}
                else:
                    doc.update(data=body['data'], revision=doc['revision'] + 1)
                    result = {'revision': doc['revision']}
            else: result = doc
        elif action == 'profile':
            user.update(body); result = {'user': user}
        else: raise AssertionError(action)
        route.fulfill(status=status, content_type='application/json', body=json.dumps(result))
    context.route('**/api/account?*', api)
    # Avoid optional catalogs/CDNs in this deterministic application-flow test.
    context.route('https://**/*', lambda route: route.abort())
    return session

def login(page):
    page.goto(BASE, wait_until='domcontentloaded')
    page.locator('#authLoginInput').fill('reader')
    page.locator('#authSenhaInput').fill('test-password')
    page.locator('#formConta button[type=submit]').click()
    page.wait_for_function("document.querySelector('#headerNome').textContent === 'Leitor Teste'")

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    first = browser.new_context(service_workers='block'); connect(first)
    page = first.new_page(); errors = []; page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(BASE, wait_until='domcontentloaded')
    page.locator('[data-conta-aba=cadastro]').click()
    page.locator('#authNomeInput').fill('Leitor Teste')
    page.locator('#authLoginInput').fill('reader')
    page.locator('#authEmailInput').fill('reader@example.org')
    page.locator('#authSenhaInput').fill('test-password')
    page.locator('#formConta button[type=submit]').click()
    page.wait_for_function("document.querySelector('#authNotice').textContent.includes('confirmar')")
    page.locator('#authLoginInput').fill('reader')
    page.locator('#authSenhaInput').fill('wrong-password')
    page.locator('#formConta button[type=submit]').click()
    page.wait_for_function("document.querySelector('#authNotice').textContent.includes('inválidos')")
    assert page.locator('#headerNome').inner_text() == 'Entrar'
    page.locator('#authSenhaInput').fill('test-password')
    page.locator('#formConta button[type=submit]').click()
    page.wait_for_function("document.querySelector('#headerNome').textContent === 'Leitor Teste'")
    page.locator('nav [data-ir=biblioteca]').click()
    page.wait_for_selector('#aba-biblioteca.ativa .cartao')
    assert page.locator('#aba-biblioteca [data-editar]:visible').count() == 0
    assert page.locator('#aba-biblioteca [data-apagar]:visible').count() == 0
    assert page.locator('#painelFormObra').count() == 0
    page.locator('#aba-biblioteca [data-salvar]').click()
    page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('salvas na nuvem')")
    assert cloud['data']['salvos']['ext:test']
    page.locator('nav [data-ir=perfil]').click()
    page.locator('#btnEditarPerfil').click()
    page.locator('#authBioInput').fill('Meu perfil sincronizado')
    page.locator('#formConta button[type=submit]').click()
    page.wait_for_function("document.querySelector('#aba-perfil').textContent.includes('Meu perfil sincronizado')")
    second = browser.new_context(service_workers='block'); connect(second)
    other = second.new_page(); other.on('pageerror', lambda error: errors.append(str(error))); login(other)
    other.locator('nav [data-ir=salvos]').click()
    other.wait_for_selector('#aba-salvos.ativa .cartao[data-id="ext:test"]')
    other.locator('nav [data-ir=perfil]').click()
    other.once('dialog', lambda dialog: dialog.accept())
    other.locator('#btnSairPerfil').click()
    other.wait_for_selector('#formConta')
    assert other.locator('#headerNome').inner_text() == 'Entrar'
    admin = browser.new_context(service_workers='block'); connect(admin, 'admin')
    admin_page = admin.new_page(); admin_page.on('pageerror', lambda error: errors.append(str(error))); login(admin_page)
    admin_page.locator('nav [data-ir=biblioteca]').click()
    admin_page.wait_for_selector('#painelFormObra')
    assert admin_page.locator('[data-editar="ext:test"]:visible').count() > 0
    # Do not use the backend-provisioned admin credential in tests.
    assert not errors, errors
    print('Browser smoke: signup, invalid password, login, reader permissions, favorites across devices, profile update, logout, admin controls: PASS')
    browser.close()
