/* Small, reusable catalog projection. File payloads are never needed here. */
(function(root){
 'use strict';
 const collator=new Intl.Collator('pt-BR',{numeric:true,sensitivity:'base'});
 const normalize=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 function select(items,{query='',status='all',sort='recent',received='all',receivedSeries=''}={},history=[]){
  const progress=new Map(history.map(h=>[h.id,Number(h.prog)||0])),q=normalize(query).trim();
  const list=items.filter(it=>{
   const p=progress.get(it.id)||0;
   return (received!=='series'||it.receivedPackage&&!!it.serieNome)&&(!receivedSeries||it.receivedPackage&&it.serieNome===receivedSeries)&&(!q||normalize([it.titulo,it.sub,it.colecao,it.heroiNome,it.serieNome].join(' ')).includes(q))&&(status==='all'||status==='reading'&&p>0&&p<.99||status==='finished'&&p>=.99||status==='unread'&&p===0);
  });
  if(sort==='title')list.sort((a,b)=>collator.compare(a.titulo||'',b.titulo||''));
  else if(sort==='progress')list.sort((a,b)=>(progress.get(b.id)||0)-(progress.get(a.id)||0)||collator.compare(a.titulo||'',b.titulo||''));
  return list;
 }
 function groups(items){
  const result=[],byKey=new Map();
  for(const item of items){
   if(!item.receivedPackage||!item.serieNome){result.push(item);continue;}
   const key=JSON.stringify([item.colecao||'',item.serieNome]);let group=byKey.get(key);
   if(!group){group={receivedGroup:true,key,titulo:item.serieNome,capa:item.capa,items:[]};byKey.set(key,group);result.push(group);}
   group.items.push(item);if(!group.capa&&item.capa)group.capa=item.capa;
  }
  for(const group of byKey.values())group.items.sort((a,b)=>(a.edicaoNum||0)-(b.edicaoNum||0)||collator.compare(a.titulo||'',b.titulo||''));
  return result;
 }
 const api={select,groups};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQLibraryView=api;
})(globalThis);
