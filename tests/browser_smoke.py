"""Browser integration against a mocked account API (no real Supabase credentials)."""
import json
from playwright.sync_api import sync_playwright

BASE = 'http://127.0.0.1:8001'
cloud = {'data': {}, 'revision': 0}
uploaded = {}
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
        elif action == 'storage-status': result = {'used': 810000000, 'reserved': 0, 'limit': 1000000000, 'blocked': False, 'warning': True}
        elif action == 'file-upload':
            assert role == 'admin'
            count = 3
            size = body['size']
            step = (size + count - 1) // count
            parts = [{'path': f'00000000-0000-4000-8000-{len(uploaded):09d}{i:03d}.txt', 'url': BASE + f'/test-storage/{len(uploaded)}-{i}', 'size': min(step, size - i * step)} for i in range(count)]
            result = {**parts[0], 'parts': parts}
            uploaded['manifest'] = parts
        elif action == 'file-read':
            assert any(item['id'] == body['id'] and item.get('storagePath') for item in catalog['data']['externas'])
            item = next(item for item in catalog['data']['externas'] if item['id'] == body['id'])
            result = {'urls': [uploaded[path] for path in item['storageParts']], 'size': item['storageSize']}
        elif action == 'users':
            assert role == 'admin'
            result = {'users': [], 'hasMore': False, 'page': 1}
        elif action == 'profile':
            user.update(body); result = {'user': user}
        else: raise AssertionError(action)
        route.fulfill(status=status, content_type='application/json', body=json.dumps(result))
    context.route('**/api/account?*', api)
    def storage(route):
        if route.request.method == 'PUT':
            uploaded[route.request.url] = route.request.post_data_buffer
            part = next(p for p in uploaded['manifest'] if p['url'] == route.request.url)
            uploaded[part['path']] = route.request.url
            assert len(uploaded[route.request.url]) == part['size']
            route.fulfill(status=200, body='{}', content_type='application/json')
        else:
            route.fulfill(status=200, body=uploaded[route.request.url], content_type='text/plain')
    context.route('**/test-storage/*', storage)
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
    admin_page.evaluate("""async()=>await new Promise((resolve,reject)=>{
      const open=indexedDB.open('eleoquadrinho:user-admin');
      open.onsuccess=()=>{const db=open.result;const tx=db.transaction(['arquivos','metadados'],'readwrite');
        const book={id:'local:legacy',nome:'HQ antiga',formato:'txt',blob:new Blob(['Conteudo antigo.'],{type:'text/plain'})};
        tx.objectStore('arquivos').put(book);tx.objectStore('metadados').put(EQLocalLibrary.metadata(book));
        tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);
      };open.onerror=()=>reject(open.error);
    })""")
    admin_page.locator('#btnPublicarLocais').click()
    admin_page.wait_for_function("document.querySelector('#syncMessage').textContent.includes('HQ publicada:')")
    assert any(item['id'] == 'local:legacy' and item.get('storagePath') for item in catalog['data']['externas'])
    print('Migration of a previously local HQ to shared catalog: PASS')
    admin.route('**/api/account?action=file-read*', lambda route: route.abort())
    admin_page.locator('#tabDevice').click()
    admin_page.locator('#bibDevice [data-ler="local:legacy"]').click()
    admin_page.wait_for_function("document.querySelector('#ltTexto').textContent.includes('Conteudo antigo.')")
    admin_page.locator('#leitorTexto [data-fechar-leitor]').click()
    admin_page.once('dialog', lambda dialog: dialog.accept())
    admin_page.locator('#bibDevice [data-apagar="local:legacy"]').click()
    admin_page.wait_for_function("!document.querySelector('#bibDevice [data-ler=\"local:legacy\"]')")
    assert any(item['id']=='local:legacy' for item in catalog['data']['externas'])
    admin_page.locator('#tabCloud').click()
    assert admin_page.locator('#bibCloud [data-ler="local:legacy"]').count() == 1
    print('Removing a local copy preserves the shared cloud HQ: PASS')
    admin.unroute('**/api/account?action=file-read*')
    print('Published HQ copy reads locally without a cloud download: PASS')
    admin_page.locator('#extTitulo').fill('HQ compartilhada')
    admin_page.locator('#extArquivoObraInput').set_input_files({'name': 'hq.txt', 'mimeType': 'text/plain', 'buffer': b'Conteudo compartilhado com o leitor.'})
    admin_page.locator('#extSalvarBtn').click()
    admin_page.wait_for_function("[...document.querySelectorAll('#bibCloud .cartao h4')].some(el=>el.textContent==='HQ compartilhada')")
    shared = next(item for item in catalog['data']['externas'] if item.get('titulo') == 'HQ compartilhada')
    fresh = browser.new_context(service_workers='block'); connect(fresh)
    reader = fresh.new_page(); reader.on('pageerror', lambda error: errors.append(str(error))); login(reader)
    reader.locator('nav [data-ir=biblioteca]').click()
    reader.locator('#aba-biblioteca [data-ler="' + shared['id'] + '"]').click()
    reader.wait_for_function("document.querySelector('#ltTexto').textContent.includes('Conteudo compartilhado com o leitor.')")
    print('Cloud file: admin upload -> fresh reader with no IndexedDB copy: PASS')
    reader.locator('#leitorTexto [data-fechar-leitor]').click()
    before_catalog = json.dumps(catalog)
    before_uploads = len(uploaded)
    reader.locator('nav [data-ir=biblioteca]').click()
    reader.locator('#tabDevice').click()
    assert reader.locator('#bibCloud').is_hidden()
    reader.locator('#localHQInput').set_input_files({'name': 'pessoal.txt', 'mimeType': 'text/plain', 'buffer': b'Leitura somente neste navegador.'})
    reader.wait_for_function("document.querySelector('#aba-biblioteca').textContent.includes('pessoal')")
    assert json.dumps(catalog) == before_catalog
    assert len(uploaded) == before_uploads
    local_id = reader.evaluate("""()=>new Promise(resolve=>{const r=indexedDB.open('eleoquadrinho:user-reader');r.onsuccess=()=>{const q=r.result.transaction('arquivos').objectStore('arquivos').getAll();q.onsuccess=()=>resolve(q.result.find(x=>x.nome==='pessoal').id)}})""")
    reader.locator('#aba-biblioteca [data-ler="' + local_id + '"]').click()
    reader.wait_for_function("document.querySelector('#ltTexto').textContent.includes('Leitura somente neste navegador.')")
    reader.reload(wait_until='domcontentloaded')
    reader.locator('nav [data-ir=biblioteca]').click()
    reader.wait_for_function("document.querySelector('#aba-biblioteca').textContent.includes('pessoal')")
    admin_page.locator('nav [data-ir=biblioteca]').click()
    assert admin_page.locator('#aba-biblioteca [data-ler="' + local_id + '"]').count() == 0
    admin_page.wait_for_function("document.querySelector('#cloudSpace').textContent.includes('espaço acabando')")
    print('Reader local import, reading, persistence, account isolation and cloud warning: PASS')
    import tempfile
    reader.locator('#tabDevice').click()
    assert reader.locator('#bibCloud').is_hidden()
    reader.locator('.pacotes-hq summary').click()
    reader.locator('#hqPackageSelection').select_option(local_id)
    with reader.expect_download() as download_info:
        reader.locator('#exportHQPackage').click()
    with tempfile.TemporaryDirectory() as directory:
        package_path = directory + '/shared.eleohq'
        download_info.value.save_as(package_path)
        recipient_context = browser.new_context(service_workers='block'); connect(recipient_context)
        recipient = recipient_context.new_page(); login(recipient)
        recipient.locator('nav [data-ir=biblioteca]').click()
        recipient.locator('#tabDevice').click()
        recipient.locator('.pacotes-hq summary').click()
        state_before = json.dumps(cloud); catalog_before = json.dumps(catalog)
        recipient.locator('#importHQPackage').set_input_files(package_path)
        recipient.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('1 HQ(s) importadas')")
        assert json.dumps(cloud) == state_before
        assert json.dumps(catalog) == catalog_before
        assert recipient.locator('#headerNome').inner_text() == 'Leitor Teste'
        imported = recipient.evaluate("""()=>new Promise(resolve=>{const r=indexedDB.open('eleoquadrinho:user-reader');r.onsuccess=()=>{const q=r.result.transaction('arquivos').objectStore('arquivos').getAll();q.onsuccess=async()=>resolve(await Promise.all(q.result.map(async x=>({id:x.id,text:await x.blob.text(),localOnly:x.localOnly}))))}})""")
        assert len(imported) == 1 and imported[0]['id'] != local_id
        assert imported[0]['text'] == 'Leitura somente neste navegador.' and imported[0]['localOnly']
        recipient.locator('#importHQPackage').set_input_files(package_path)
        recipient.wait_for_function("document.querySelector('#hqPackageStatus').textContent.includes('0 HQ(s) importadas')")
        assert json.dumps(cloud) == state_before and json.dumps(catalog) == catalog_before
        recipient.locator('#aba-biblioteca [data-ler="' + imported[0]['id'] + '"]').click()
        recipient.wait_for_function("document.querySelector('#ltTexto').textContent.includes('Leitura somente neste navegador.')")
    print('Portable HQ export -> fresh device import, identical bytes, no profile/history/catalog changes, duplicate protection: PASS')
    # A persisted catalog rejected by the server must not block logout or be discarded.
    pending_key = 'eq:pending:user-admin:catalog'
    pending = {'data': catalog['data'], 'revision': catalog['revision']}
    admin_page.evaluate('(args)=>localStorage.setItem(args.key,JSON.stringify(args.pending))', {'key': pending_key, 'pending': pending})
    def reject_catalog_save(route):
        if route.request.method == 'PUT':
            route.fulfill(status=413, content_type='application/json', body=json.dumps({'error': 'Dados muito grandes. Limite de 2 MB por sincronização.'}))
        else: route.fallback()
    admin.route('**/api/account?action=catalog*', reject_catalog_save)
    admin_page.reload(wait_until='domcontentloaded')
    admin_page.wait_for_function("document.querySelector('#headerNome').textContent === 'Leitor Teste'")
    admin_page.locator('nav [data-ir=perfil]').click()
    admin_page.once('dialog', lambda dialog: dialog.accept())
    admin_page.locator('#btnSairPerfil').click()
    admin_page.wait_for_selector('#formConta')
    assert admin_page.locator('#headerNome').inner_text() == 'Entrar'
    actual_pending = admin_page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))', pending_key)
    assert actual_pending == pending, {'actual': actual_pending, 'expected': pending}
    admin_page.reload(wait_until='domcontentloaded')
    admin_page.wait_for_selector('#formConta')
    assert admin_page.locator('#headerNome').inner_text() == 'Entrar'
    print('Logout despite catalog 413, pending changes preserved and session stays closed after reload: PASS')
    # Do not use the backend-provisioned admin credential in tests.
    assert not errors, errors
    print('Browser smoke: signup, invalid password, login, reader permissions, favorites across devices, profile update, logout, admin controls: PASS')
    browser.close()
