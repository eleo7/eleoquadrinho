/* Per-account local library. The metadata index never contains the book payload. */
(function(root){
  'use strict';
  function metadata(book) {
    const fields=['id','nome','sub','resumo','autor','colecao','formatoObra','serieId','serieNome','heroiId','heroiNome','edicaoNum','capa','paginas','formato','packageHash','localOnly','adicionado','storagePath','storageParts','storageSize'];
    const result=Object.fromEntries(fields.filter(key=>book[key]!==undefined).map(key=>[key,book[key]]));
    result.hasFile=!!(book.blob||book.blobs?.length);
    result.fileBytes=book.blob?.size||book.blobs?.reduce((sum,b)=>sum+b.size,0)||0;
    return result;
  }
  function create(getUser) {
    let db=null,account=null,opening=null;
    async function abrir() {
      const id=getUser()?.id;if(!id)throw new Error('Entre na sua conta.');
      if(db&&account===id)return db;
      if(opening&&account===id)return opening;
      db?.close();db=null;account=id;
      const promise=new Promise((resolve,reject)=>{
        let blocked=false;
        const r=indexedDB.open('eleoquadrinho:'+id,2);
        r.onupgradeneeded=()=>{
          const database=r.result;
          if(!database.objectStoreNames.contains('arquivos'))database.createObjectStore('arquivos',{keyPath:'id'});
          if(!database.objectStoreNames.contains('metadados')){
            const index=database.createObjectStore('metadados',{keyPath:'id'});
            const cursor=r.transaction.objectStore('arquivos').openCursor();
            cursor.onsuccess=()=>{const row=cursor.result;if(row){index.put(metadata(row.value));row.continue();}};
          }
        };
        r.onblocked=()=>{blocked=true;reject(new Error('Feche as outras abas do EleoQuadrinho e reabra a biblioteca para atualizar seus arquivos locais.'));};
        r.onerror=()=>reject(r.error);
        r.onsuccess=()=>{
          if(blocked||getUser()?.id!==id){r.result.close();reject(new Error('Reabra a biblioteca nesta conta.'));return;}
          const connection=r.result;db=connection;
          connection.onversionchange=()=>{connection.close();if(db===connection){db=null;opening=null;}};
          resolve(connection);
        };
      });
      opening=promise;
      try{return await promise;}finally{if(opening===promise)opening=null;}
    }
    async function transaction(stores,mode,work) {
      const id=getUser()?.id,connection=await abrir();
      if(getUser()?.id!==id)throw new Error('A conta mudou. Reabra a biblioteca.');
      return new Promise((resolve,reject)=>{
        const tx=connection.transaction(stores,mode);let result;
        tx.oncomplete=()=>resolve(typeof result==='function'?result():result);
        tx.onabort=tx.onerror=()=>reject(tx.error||new Error('Não foi possível salvar. Confira o espaço disponível no navegador.'));
        try{result=work(tx);}catch(error){tx.abort();reject(error);}
      });
    }
    return {
      abrir,
      todos:()=>transaction(['metadados'],'readonly',tx=>{const r=tx.objectStore('metadados').getAll();return ()=>r.result;}),
      pegar:id=>transaction(['arquivos'],'readonly',tx=>{const r=tx.objectStore('arquivos').get(id);return ()=>r.result;}),
      salvar:book=>transaction(['arquivos','metadados'],'readwrite',tx=>{tx.objectStore('arquivos').put(book);tx.objectStore('metadados').put(metadata(book));}),
      apagar:id=>transaction(['arquivos','metadados'],'readwrite',tx=>{tx.objectStore('arquivos').delete(id);tx.objectStore('metadados').delete(id);}),
      apagarSelecionados:async(ids,id)=>{
        if(getUser()?.id!==id||getUser()?.role!=='admin')throw new Error('Reabra a biblioteca na conta de administrador.');
        return transaction(['arquivos','metadados'],'readwrite',tx=>{
          if(getUser()?.id!==id||getUser()?.role!=='admin')throw new Error('A conta mudou. Reabra a biblioteca.');
          for(const key of new Set(ids)){tx.objectStore('arquivos').delete(key);tx.objectStore('metadados').delete(key);}
        });
      },
      organizarSeries:async(changes,id)=>{
        if(getUser()?.id!==id||getUser()?.role!=='admin')throw new Error('Reabra a biblioteca na conta de administrador.');
        return transaction(['arquivos','metadados'],'readwrite',tx=>{
          const store=tx.objectStore('arquivos'),index=tx.objectStore('metadados');
          for(const item of changes.values()){
            const r=store.get(item.id);r.onsuccess=()=>{
              if(!r.result||getUser()?.id!==id){tx.abort();return;}
              const {serieId,serieNome,edicaoNum,colecao,heroiId,heroiNome}=item;
              const book={...r.result,serieId,serieNome,edicaoNum,colecao,heroiId,heroiNome};
              store.put(book);index.put(metadata(book));
            };
          }
        });
      },
      importarPacote:async(books,id)=>{
        if(getUser()?.id!==id)throw new Error('A conta mudou. Importe novamente na conta desejada.');
        return transaction(['arquivos','metadados'],'readwrite',tx=>{
          let added=0;const store=tx.objectStore('arquivos'),index=tx.objectStore('metadados'),r=index.getAll();
          r.onsuccess=()=>{
            if(getUser()?.id!==id){tx.abort();return;}
            const hashes=new Set(r.result.filter(o=>o.packageHash).map(o=>o.formato+':'+o.packageHash));
            for(const item of books){
              const key=item.formato+':'+item.packageHash;if(hashes.has(key))continue;hashes.add(key);
              const book={...item,id:'local:'+crypto.randomUUID(),adicionado:Date.now()};
              store.add(book);index.add(metadata(book));added++;
            }
          };
          return ()=>added;
        });
      }
    };
  }
  root.EQLocalLibrary={create,metadata};
})(globalThis);
