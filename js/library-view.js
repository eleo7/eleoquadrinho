/* Small, reusable catalog projection. File payloads are never needed here. */
(function(root){
 'use strict';
 const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function select(items,{query='',status='all',sort='recent'}={},history=[]){
  const progress=new Map(history.map(h=>[h.id,Number(h.prog)||0])),q=normalize(query).trim();
  const list=items.filter(it=>{
   const p=progress.get(it.id)||0;
   return (!q||normalize([it.titulo,it.sub,it.colecao,it.heroiNome,it.serieNome].join(' ')).includes(q))&&(status==='all'||status==='reading'&&p>0&&p<.99||status==='finished'&&p>=.99||status==='unread'&&p===0);
  });
  if(sort==='title')list.sort((a,b)=>collator.compare(a.titulo||'',b.titulo||''));
  else if(sort==='progress')list.sort((a,b)=>(progress.get(b.id)||0)-(progress.get(a.id)||0)||collator.compare(a.titulo||'',b.titulo||''));
  return list;
 }
 const api={select};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQLibraryView=api;
})(globalThis);
