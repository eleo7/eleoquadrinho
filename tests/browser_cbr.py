"""Actual RAR4/RAR5 image archives -> local CBZ -> native reader and cloud publication."""
from pathlib import Path
import struct,zlib,io,zipfile
exec((Path(__file__).parent / 'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
def png(color):
    def chunk(kind,data):return struct.pack('>I',len(data))+kind+data+struct.pack('>I',zlib.crc32(kind+data))
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',1,1,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b'\0'+bytes(color)))+chunk(b'IEND',b'')
images={'page10.png':png([255,0,0]),'page2.png':png([0,255,0]),'page1.png':png([0,0,255])}
def rar4(entries,encrypted=False):
    def header(kind,flags,payload):
        data=struct.pack('<BHH',kind,flags,7+len(payload))+payload
        return struct.pack('<H',zlib.crc32(data)&65535)+data
    result=b'Rar!\x1a\x07\x00'+header(0x73,0,b'\0'*6)
    for name,data in entries.items():
        name=name.encode();payload=struct.pack('<IIBIIBBHI',len(data),len(data),3,zlib.crc32(data),0,20,0x30,len(name),0)+name
        result+=header(0x74,0x8004 if encrypted else 0x8000,payload)+data
    return result+header(0x7b,0,b'')
def vint(n):
    result=b''
    while n>127:result+=bytes([(n&127)|128]);n>>=7
    return result+bytes([n])
def rar5(entries):
    def header(data):
        b=vint(len(data))+data
        return struct.pack('<I',zlib.crc32(b))+b
    result=b'Rar!\x1a\x07\x01\x00'+header(b'\x01\x00\x00')
    for name,data in entries.items():
        name=name.encode()
        result+=header(b'\x02\x02'+vint(len(data))+b'\x00'+vint(len(data))+b'\x00\x00\x00'+vint(len(name))+name)+data
    return result+header(b'\x05\x00\x00')
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block');connect(ctx)
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    writes=[];page.on('request',lambda r:writes.append(r.url) if 'action=file-upload' in r.url else None)
    login(page);page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    for num,archive in enumerate([rar4(images),rar5(images)],1):
        page.locator('#localHQInput').set_input_files({'name':f'Leitura {num}.cbr','mimeType':'application/x-rar-compressed','buffer':archive})
        page.wait_for_function('(n)=>document.querySelectorAll("[data-device-library] .cartao").length===n',arg=num)
    records=page.evaluate('''async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('eleoquadrinho:user-reader');r.onsuccess=()=>resolve(r.result)});return await new Promise(resolve=>{const r=db.transaction('arquivos').objectStore('arquivos').getAll();r.onsuccess=async()=>resolve(await Promise.all(r.result.map(async o=>({format:o.formato,pages:o.paginas,local:o.localOnly,bytes:Array.from(new Uint8Array(await o.blob.arrayBuffer()))}))))})}''')
    assert len(records)==2
    for record in records:
        assert record['format']=='cbz' and record['pages']==3 and record['local']
        zip=zipfile.ZipFile(io.BytesIO(bytes(record['bytes'])))
        assert [zip.read(n) for n in sorted(zip.namelist())]==[images[n] for n in ['page1.png','page2.png','page10.png']]
    page.locator('[data-device-library] [data-ler]').first.click();page.wait_for_selector('#leitorHQ.aberto')
    page.wait_for_function("[...document.querySelectorAll('#hqPalco img')].some(img=>img.complete&&img.naturalWidth>0)")
    page.locator('#leitorHQ [data-fechar-leitor]').click()
    page.locator('#localHQInput').set_input_files({'name':'invalid.cbr','mimeType':'application/octet-stream','buffer':b'not a rar archive'})
    page.wait_for_function("document.querySelector('#toast').textContent.includes('Não foi possível importar')")
    assert page.locator('[data-device-library] .cartao').count()==2
    for archive,expected in [(rar4({'readme.txt':b'no pages'}),'não contém'),(rar4(images,True),'senha')]:
        message=page.evaluate('''async bytes=>{try{await EQCBR.convert(new File([new Uint8Array(bytes)],'test.cbr'));return 'unexpected success'}catch(e){return e.message}}''',list(archive))
        assert expected in message,message
    assert not writes and catalog['revision']==0
    admin=browser.new_context(service_workers='block');connect(admin,'admin')
    admin.route('**/api/account?action=cover-upload*',lambda route:route.fulfill(content_type='application/json',body=json.dumps({'uploadURL':BASE+'/test-cover','reference':'/api/account?action=cover-read&path=test.png'})))
    admin.route('**/test-cover',lambda route:route.fulfill(status=200,body='{}'))
    ap=admin.new_page();ap.on('pageerror',lambda e:errors.append(str(e)));login(ap);ap.locator('nav [data-ir=biblioteca]').click()
    ap.locator('#extArquivoObraInput').set_input_files({'name':'Formulario.cbr','mimeType':'application/x-rar-compressed','buffer':rar5(images)})
    ap.wait_for_function("document.querySelector('#extArquivoObraInfo').textContent.includes('CBZ pronto')")
    assert '3 páginas' in ap.locator('#extArquivoObraInfo').inner_text()
    ap.locator('#extLimparArquivoObra').click()
    ap.locator('#arqInput').set_input_files({'name':'Publicada.cbr','mimeType':'application/x-rar-compressed','buffer':rar4(images)})
    ap.wait_for_function("document.querySelector('#syncMessage').textContent.includes('HQ publicada:')")
    assert any(it.get('formato')=='cbz' and it.get('storagePath') for it in catalog['data']['externas'])
    published=next(it for it in catalog['data']['externas'] if it.get('storagePath'))
    fresh=browser.new_context(service_workers='block');connect(fresh)
    fresh.route('**/api/account?action=cover-read*',lambda route:route.fulfill(content_type='image/png',body=images['page1.png']))
    fp=fresh.new_page();fp.on('pageerror',lambda e:errors.append(str(e)));login(fp)
    fp.locator('nav [data-ir=biblioteca]').click()
    fp.locator('#bibCloud [data-ler="'+published['id']+'"]').click()
    fp.wait_for_selector('#leitorHQ.aberto')
    fp.wait_for_function("[...document.querySelectorAll('#hqPalco img')].some(img=>img.complete&&img.naturalWidth>0)")
    assert not errors,errors
    print('RAR4/RAR5 import, exact image bytes/order, native reader, invalid archive and cloud CBZ publication: PASS')
    browser.close()
