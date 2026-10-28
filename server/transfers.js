'use strict';
const {request,HttpError}=require('./backend'),Access=require('../js/content-access');
const ops=new Set(['catalog-request','offers','publish','request','list','accept','decline','signal','complete']);
async function transferAction(method,body,user){
 if(method!=='POST'||!ops.has(body.operation))throw new HttpError(400,'Operação inválida.');
 const p=body.payload||{},op=body.operation;
 const rpc=async(operation,payload={})=>request('/rest/v1/rpc/hq_transfer',{admin:true,method:'POST',body:{actor:user.id,operation,payload}});
 const allowed=o=>Array.isArray(o.items)&&o.items.every(it=>Access.allowed(it,user.access,user.role));
 if(op==='publish'){
  if(user.role!=='admin')throw new HttpError(403,'Somente o administrador pode oferecer HQs.');
  if(typeof p.title!=='string'||!p.title.trim()||p.title.length>120||typeof p.cover!=='string'||p.cover.length>180000||!(/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(p.cover)||!p.cover)||!Array.isArray(p.items)||!p.items.length||p.items.length>200||p.items.some(it=>typeof it.id!=='string'||it.id.length>200||typeof it.titulo!=='string'||it.titulo.length>200||!Access.validUniverse(Access.universe(it))))throw new HttpError(400,'Oferta inválida. Use até 200 HQs e uma capa pequena.');
  p.items=p.items.map(it=>({id:it.id,titulo:it.titulo,colecao:it.colecao,formatoObra:it.formatoObra||'HQ',formato:it.formato||''}));
 }
 if(p.signal&&(!['offer','answer'].includes(p.signal.type)||typeof p.signal.sdp!=='string'||p.signal.sdp.length>64000||Object.keys(p.signal).some(k=>!['type','sdp'].includes(k))))throw new HttpError(400,'Sinalização inválida.');
 try{
  if(op==='catalog-request'){
   if(typeof p.id!=='string'||p.id.length>200)throw new HttpError(400,'Obra inválida.');
   const docs=await request('/rest/v1/catalog?id=eq.1&select=data',{admin:true});
   const catalog=docs[0]?.data||{};
   const series=(catalog.series||[]).find(it=>it.id===p.id);
   const item=series||[...(catalog.externas||[]),...(catalog.drive||[])].find(it=>it.id===p.id);
   if(!item||!Access.allowed(item,user.access,user.role))throw new HttpError(403,'Obra indisponível para seu perfil.');
   const offers=await rpc('offers');
   let offer=offers.find(o=>o.owner!==user.id&&allowed(o)&&o.items.some(it=>it.id===p.id&&!!it.requestSeries===!!series));
   if(!offer){
    const admins=await request('/rest/v1/profiles?role=eq.admin&select=id&order=created_at.asc&limit=1',{admin:true});
    if(!admins.length||admins[0].id===user.id)throw new HttpError(400,'Não há administrador disponível para receber este pedido.');
    const cover=typeof item.capa==='string'&&item.capa.length<=180000&&/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(item.capa)?item.capa:'';
    offer=await request('/rest/v1/rpc/hq_transfer',{admin:true,method:'POST',body:{actor:admins[0].id,operation:'publish',payload:{title:String(item.titulo||item.nome||'HQ').slice(0,120),cover,items:[{id:item.id,titulo:item.titulo||item.nome,colecao:item.colecao,formatoObra:item.formatoObra||'HQ',requestSeries:!!series}]}}});
   }
   return {data:await rpc('request',{offer:offer.id})};
  }
  if(op==='request'){const offers=await rpc('offers');if(!offers.some(o=>o.id===p.offer&&allowed(o)))throw new HttpError(403,'Oferta indisponível para seu perfil.');}
  if(['signal','complete'].includes(op)&&user.role!=='admin'){const rows=await rpc('list');if(!rows.some(r=>r.id===p.id&&allowed(r)))throw new HttpError(403,'Pedido indisponível para seu perfil.');}
  let data=await rpc(op,p);if(op==='offers'||op==='list')data=data.filter(allowed);return{data};
 }catch(e){const messages={'Not allowed':'Você não tem acesso a este pedido.','Session expired':'Esta conexão expirou. Peça ao administrador para reiniciar o envio.','Request limit':'Você já tem 30 pedidos ativos. Aguarde a conclusão.','Offer limit':'Limite de 200 ofertas atingido.','Invalid offer':'Oferta indisponível.'};if(messages[e.providerMessage])throw new HttpError(400,messages[e.providerMessage]);if(e.providerCode==='PGRST202')throw new HttpError(503,'Ative as transferências executando transfers.sql no Supabase.');throw e;}
}
module.exports={transferAction};
