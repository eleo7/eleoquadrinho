"""Upgrade existing files atomically; listing and pagination never load book payloads."""
from pathlib import Path
exec((Path(__file__).parent/'browser_smoke.py').read_text().split('with sync_playwright() as p:')[0])
with sync_playwright() as p:
    browser=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
    ctx=browser.new_context(service_workers='block');connect(ctx)
    ctx.add_init_script('''window.fileReads=[];for(const method of ['getAll','get','openCursor']){const orig=IDBObjectStore.prototype[method];IDBObjectStore.prototype[method]=function(...args){if(this.name==='arquivos')window.fileReads.push(method);return orig.apply(this,args);}}''')
    page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
    page.goto(BASE,wait_until='domcontentloaded')
    page.evaluate(r'''()=>new Promise((resolve,reject)=>{const r=indexedDB.open('eleoquadrinho:user-reader',1);r.onupgradeneeded=()=>r.result.createObjectStore('arquivos',{keyPath:'id'});r.onsuccess=()=>{const db=r.result,tx=db.transaction('arquivos','readwrite');for(let n=0;n<121;n++)tx.objectStore('arquivos').put({id:'local:old-'+n,nome:'HQ '+n,formato:'txt',localOnly:true,blob:new Blob(['Conteúdo original '+n+'\n'+'a'.repeat(65536)])});tx.oncomplete=()=>{db.close();resolve()};tx.onerror=()=>reject(tx.error);}})''')
    login(page);page.locator('nav [data-ir=biblioteca]').click();page.locator('#tabDevice').click()
    page.wait_for_function("document.querySelectorAll('[data-device-library] .cartao').length===60")
    assert page.evaluate("fileReads.filter(x=>x==='openCursor').length")==1
    assert page.evaluate("fileReads.filter(x=>x==='getAll'||x==='get').length")==0
    page.locator('[data-device-more]').click();assert page.locator('[data-device-library] .cartao').count()==120
    page.locator('[data-device-more]').click();assert page.locator('[data-device-library] .cartao').count()==121
    assert page.locator('[data-device-more]').is_hidden()
    state=page.evaluate('''async()=>{window.testLibrary=EQLocalLibrary.create(()=>({id:'user-reader',role:'reader'}));const items=await testLibrary.todos();return {count:items.length,clean:items.every(x=>!x.blob&&!x.blobs&&x.hasFile&&x.fileBytes>0),version:(await testLibrary.abrir()).version};}''')
    assert state=={'count':121,'clean':True,'version':2}
    page.locator('[data-device-library] [data-ler="local:old-0"]').click()
    page.wait_for_function("document.querySelector('#ltTexto').textContent.includes('Conteúdo original 0')")
    assert page.evaluate("fileReads.filter(x=>x==='getAll').length")==0
    assert page.evaluate("fileReads.filter(x=>x==='get').length")>=1
    outcome=page.evaluate('''async()=>{
      const book=await testLibrary.pegar('local:old-1');book.nome='Novo título';book.storagePath='cloud/book.txt';book.storageParts=['cloud/book.txt'];book.storageSize=book.blob.size;await testLibrary.salvar(book);
      const cloudMeta=(await testLibrary.todos()).find(x=>x.id===book.id);if(cloudMeta.storagePath!==book.storagePath||cloudMeta.storageParts[0]!==book.storagePath||cloudMeta.storageSize!==book.blob.size)throw new Error('Cloud metadata lost');
      const updated=(await testLibrary.todos()).find(x=>x.id===book.id).nome;
      const original=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.name==='metadados')throw new DOMException('quota','QuotaExceededError');return original.apply(this,args);};
      let failed=false;try{await testLibrary.salvar({...book,id:'local:rollback'})}catch{failed=true}finally{IDBObjectStore.prototype.put=original;}
      const absent=!(await testLibrary.pegar('local:rollback'))&&!(await testLibrary.todos()).some(x=>x.id==='local:rollback');
      await testLibrary.apagar('local:old-1');const deleted=!(await testLibrary.pegar('local:old-1'))&&!(await testLibrary.todos()).some(x=>x.id==='local:old-1');
      const other=EQLocalLibrary.create(()=>({id:'user-other',role:'reader'}));return {updated,failed,absent,deleted,isolated:(await other.todos()).length===0};
    }''')
    assert outcome=={'updated':'Novo título','failed':True,'absent':True,'deleted':True,'isolated':True}
    assert not errors,errors
    print('Local index: v1 migration, original reading, 121-item pagination, no payload listing, atomic rollback, update/delete and account isolation: PASS')
    browser.close()
