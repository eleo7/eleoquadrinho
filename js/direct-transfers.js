/* HQ payloads only travel through an authenticated-request WebRTC data channel. */
(function(root){
'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let config,watch,connectionTimer,pc,active=false,rows=[],busy=false,generation=0;
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const call=(operation,payload={})=>config.api('transfers','POST',{operation,payload},config.user.id).then(r=>r.data);
function notice(text){const el=document.querySelector('[data-transfer-status]');if(el)el.textContent=text;}
function stop(){clearTimeout(connectionTimer);generation++;pc?.close();pc=null;active=false;}
function dispose(){stop();clearInterval(watch);document.querySelector('#transferNotice')?.remove();config=null;}
async function refresh(){if(!config||busy)return;busy=true;const owner=config;try{const result=await call('list');if(config!==owner)return;rows=result;const count=rows.filter(r=>config.user.role==='admin'?r.owner===config.user.id&&r.status==='pending':r.status==='accepted').length;const badge=document.querySelector('#transferNotice');if(badge)badge.textContent='📨 Pedidos'+(count?' ('+count+')':'');renderRows();}catch(e){notice(e.message);}finally{busy=false;}}
function renderRows(){const box=document.querySelector('[data-transfer-requests]');if(!box||!config)return;box.innerHTML=rows.map(r=>`<article><strong>${esc(r.title)}</strong><p>${esc(r.nome)} (@${esc(r.login)}) · ${esc(({pending:'Pendente',accepted:'Aprovado — ambos precisam estar online',declined:'Recusado',completed:'Recebido'})[r.status])}</p>${r.owner===config.user.id&&['pending','accepted'].includes(r.status)?`<button class="btn btn-pri" data-transfer-send="${esc(r.id)}">${r.status==='pending'?'Aceitar e enviar':'Reiniciar envio'}</button><button class="btn btn-sec" data-transfer-decline="${esc(r.id)}">Recusar</button>`:r.reader===config.user.id&&r.status==='accepted'?`<button class="btn btn-pri" data-transfer-receive="${esc(r.id)}">Receber neste dispositivo</button>`:''}</article>`).join('')||'<p>Nenhum pedido.</p>';}
function start(c){dispose();config=c;const b=document.createElement('button');b.id='transferNotice';b.className='btn btn-sec';b.textContent='📨 Pedidos';b.onclick=()=>config.open();document.querySelector('.topo').append(b);if(document.querySelector('#transferPanel'))mount(document.querySelector('#transferPanel'));refresh();watch=setInterval(()=>{if(!document.hidden)refresh();},20000);}
async function gather(connection){if(connection.iceGatheringState!=='complete')await Promise.race([new Promise(resolve=>connection.addEventListener('icegatheringstatechange',()=>{if(connection.iceGatheringState==='complete')resolve();})),pause(12000)]);if(!connection.localDescription?.sdp.includes('a=candidate:'))throw new Error('Este navegador ou rede bloqueou a conexão direta. Tente outra rede ou use um pacote de backup.');}
async function session(row,sender){
 if(!root.RTCPeerConnection)return notice('Este navegador não oferece transferência direta. Use o pacote de backup.');
 if(active)return notice('Conclua ou cancele a transferência atual.');
 active=true;const token=++generation,account=config.user.id;let parts=[],size=0,expected=0,ended=false;
 const current=()=>config?.user.id===account&&generation===token;
 const connection=pc=new RTCPeerConnection({iceServers:[{urls:'stun:stun.l.google.com:19302'}]});
 const guard=()=>{if(!current())throw new Error('Transferência cancelada.');};
 const fail=e=>{if(current()){notice(e.message||'Conexão interrompida. Tente novamente com ambos online.');stop();parts=[];}};
 connection.onconnectionstatechange=()=>{if(['failed','disconnected'].includes(connection.connectionState))fail(new Error('Não foi possível manter a conexão direta. Tente outra rede; nenhum arquivo foi enviado à nuvem.'));};
 const timeout=connectionTimer=setTimeout(()=>fail(new Error('Tempo de conexão esgotado. Ambos devem abrir o pedido; algumas redes bloqueiam conexão direta.')),120000);
 try{
 if(sender){
  notice('Preparando pacote local…');const books=[];for(const item of row.items){const book=await config.library.pegar(item.id);guard();if(!book||(!book.blob&&!book.blobs?.length))throw new Error('A HQ '+item.titulo+' não está neste dispositivo. Abra o pedido no dispositivo que possui os arquivos.');books.push(book);}
  const bytes=await EQHQPackage.pack(books,JSZip);guard();await call('accept',{id:row.id});guard();
  const channel=connection.createDataChannel('hq-package',{ordered:true});channel.binaryType='arraybuffer';channel.bufferedAmountLowThreshold=65536;
  channel.onopen=async()=>{clearTimeout(timeout);try{channel.send(JSON.stringify({size:bytes.byteLength}));for(let offset=0;offset<bytes.byteLength;offset+=16384){guard();while(channel.bufferedAmount>262144){await pause(30);guard();if(channel.readyState!=='open')throw new Error('Conexão fechada.');}channel.send(bytes.slice(offset,offset+16384));notice('Enviando: '+Math.round(Math.min(bytes.byteLength,offset+16384)/bytes.byteLength*100)+'%');}channel.send('END');notice('Arquivo enviado. Aguardando confirmação da importação…');}catch(e){fail(e);}};
  channel.onmessage=e=>{if(e.data==='IMPORTED'&&current()){notice('HQs recebidas e salvas no dispositivo do leitor.');stop();refresh();}};
  await connection.setLocalDescription(await connection.createOffer());await gather(connection);guard();await call('signal',{id:row.id,signal:connection.localDescription.toJSON()});
  notice('Pedido aprovado. Aguarde o leitor tocar em Receber neste dispositivo.');
  for(let n=0;n<60;n++){guard();const result=await call('signal',{id:row.id});if(result.signal){await connection.setRemoteDescription(result.signal);break;}await pause(1500);}
 }else{
  connection.ondatachannel=e=>{const channel=e.channel;channel.binaryType='arraybuffer';channel.onopen=()=>{clearTimeout(timeout);notice('Recebendo diretamente do administrador…');};channel.onmessage=async event=>{try{
   guard();if(ended)return;
   if(typeof event.data==='string'){
    if(event.data==='END'){ended=true;if(!expected||size!==expected)throw new Error('Pacote incompleto. Solicite um novo envio.');notice('Conferindo e importando HQs…');const books=await EQHQPackage.unpack(new Blob(parts),JSZip);parts=[];guard();const count=await config.library.importarPacote(books,account);guard();await call('complete',{id:row.id});channel.send('IMPORTED');notice(count+' HQ(s) importadas. Perfil, histórico e favoritos preservados.');setTimeout(()=>{if(current()){stop();refresh();}},1000);return;}
    if(expected||size)throw new Error('Pacote inválido.');const meta=JSON.parse(event.data);if(!Number.isSafeInteger(meta.size)||meta.size<1||meta.size>EQHQPackage.LIMIT+12*1048576)throw new Error('Pacote acima de 500 MB.');expected=meta.size;
   }else{if(!expected||!(event.data instanceof ArrayBuffer)||size+event.data.byteLength>expected)throw new Error('Dados inválidos.');parts.push(event.data);size+=event.data.byteLength;notice('Recebendo: '+Math.round(size/expected*100)+'%');}
  }catch(err){fail(err);}};channel.onclose=()=>{if(current()&&!ended)fail(new Error('Envio interrompido antes da importação. Tente novamente.'));};};
  notice('Aguardando o administrador iniciar o envio…');let offer;
  for(let n=0;n<60;n++){guard();const r=await call('signal',{id:row.id});if(r.signal){offer=r.signal;break;}await pause(1500);}
  guard();if(!offer)throw new Error('Administrador indisponível. Tente novamente com ambos online.');await connection.setRemoteDescription(offer);await connection.setLocalDescription(await connection.createAnswer());await gather(connection);guard();await call('signal',{id:row.id,signal:connection.localDescription.toJSON()});
 }
 }catch(e){clearTimeout(timeout);fail(e);}
}
async function mount(el){
 if(!config)return;const owner=config,user=owner.user;el.innerHTML=`<details class="painel direct-transfer" open><summary>📨 Solicitar e receber HQs</summary><p>Transferência direta, sem guardar PDFs no Supabase. Ambos precisam manter o site aberto. Até 500 MB por pacote. Algumas redes não permitem conexão direta; nesses casos, use o pacote de backup.</p><p data-transfer-status role="status"></p><button class="btn btn-sec" data-transfer-cancel>Cancelar conexão atual</button>${user.role==='admin'?'<details><summary>Oferecer HQs deste dispositivo</summary><p>Selecione uma HQ ou várias edições de uma série. Somente título, capa e identificação serão publicados.</p><input data-offer-title maxlength="120" placeholder="Nome da HQ ou série"><select data-offer-series aria-label="Série para oferecer"></select><button class="btn btn-sec" data-offer-select-series>Selecionar série inteira</button><select data-offer-items multiple size="6" aria-label="HQs para oferecer"></select><button class="btn btn-pri" data-offer-publish>Publicar capas para solicitação</button></details><a href="assets/transfers.sql" download="transfers.sql">Baixar SQL de ativação das transferências</a>':''}<h3>Pedidos e notificações</h3><button class="btn btn-sec" data-transfer-refresh>Atualizar pedidos</button><div data-transfer-requests></div><h3>HQs e séries disponíveis</h3><div class="transfer-offers" data-transfer-offers></div></details>`;
 let local=[];
 if(user.role==='admin'){try{local=(await owner.library.todos()).filter(x=>x.hasFile);}catch(e){notice(e.message);return;}if(config!==owner||!el.isConnected)return;el.querySelector('[data-offer-series]').innerHTML='<option value="">Selecione uma série</option>'+[...new Map(local.filter(x=>x.serieId).map(x=>[x.serieId,x.serieNome||x.serieId]))].map(([id,name])=>`<option value="${esc(id)}">${esc(name)}</option>`).join('');el.querySelector('[data-offer-items]').innerHTML=local.map(x=>`<option value="${esc(x.id)}">${esc(x.nome)}${x.serieNome?' · '+esc(x.serieNome):''}</option>`).join('');}
 try{const offers=await call('offers');if(config!==owner||!el.isConnected)return;el.querySelector('[data-transfer-offers]').innerHTML=offers.map(o=>`<article>${o.cover?`<img src="${esc(o.cover)}" loading="lazy" alt="Capa de ${esc(o.title)}">`:''}<h4>${esc(o.title)}</h4><p>${o.items.length} HQ(s)</p>${o.owner!==user.id?`<button class="btn btn-pri" data-transfer-request="${esc(o.id)}">Solicitar</button>`:'<small>Oferecida por você</small>'}</article>`).join('')||'<p>Nenhuma oferta publicada.</p>';}catch(e){notice(e.message);}
 renderRows();
 el.onclick=async e=>{if(config!==owner)return;const b=e.target.closest('button');if(!b)return;b.disabled=true;try{
  if(b.hasAttribute('data-transfer-cancel')){stop();notice('Conexão cancelada. HQs já importadas foram preservadas.');}
  else if(b.hasAttribute('data-transfer-refresh'))await refresh();
  else if(b.dataset.transferRequest){await call('request',{offer:b.dataset.transferRequest});notice('Solicitação enviada. O administrador receberá uma notificação no sistema.');await refresh();}
  else if(b.dataset.transferDecline){await call('decline',{id:b.dataset.transferDecline});await refresh();}
  else if(b.dataset.transferSend||b.dataset.transferReceive){const row=rows.find(r=>r.id===(b.dataset.transferSend||b.dataset.transferReceive));if(row)await session(row,!!b.dataset.transferSend);}
  else if(b.hasAttribute('data-offer-select-series')){const id=el.querySelector('[data-offer-series]').value;if(!id)throw new Error('Selecione uma série.');const matches=local.filter(x=>x.serieId===id);for(const o of el.querySelector('[data-offer-items]').options)o.selected=matches.some(x=>x.id===o.value);el.querySelector('[data-offer-title]').value=matches[0]?.serieNome||'Série';}
  else if(b.hasAttribute('data-offer-publish')){const ids=new Set([...el.querySelector('[data-offer-items]').selectedOptions].map(o=>o.value)),items=local.filter(x=>ids.has(x.id));if(!items.length)throw new Error('Selecione HQs.');if(items.length>200||items.reduce((n,it)=>n+(it.fileBytes||0),0)>EQHQPackage.LIMIT)throw new Error('Divida a série em ofertas de até 200 HQs e 500 MB.');const title=el.querySelector('[data-offer-title]').value.trim()||items[0].nome;await call('publish',{title,cover:items[0].capa||'',items:items.map(x=>({id:x.id,titulo:x.nome,colecao:x.colecao||'arquivo',formatoObra:x.formatoObra||(['txt','epub'].includes(x.formato)?'Lore':'HQ'),formato:x.formato}))});await mount(el);notice('Capas publicadas. Os arquivos continuam neste dispositivo.');}
 }catch(err){notice(err.message);}finally{b.disabled=false;}};
}
root.EQDirectTransfers={start,dispose,mount};
})(globalThis);
