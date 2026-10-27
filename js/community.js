/* Authenticated community UI. Messages never enter reader backups or localStorage. */
(function(root){
  'use strict';
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function mount(el, { user, api }) {
    let alive=true, channel='general', target=null, generation=0, friends=[], messages=[], loading=false, timer;
    const drafts=new Map();
    const key=()=>channel+':'+(target?.id||'');
    const $=selector=>el.querySelector(selector);
    async function call(operation,payload={}) {
      try { return (await api('community','POST',{operation,payload},user.id)).data; }
      catch(error) { if (!error.status) error.message='Sem conexão. Tente novamente; o texto digitado continua nesta tela.'; throw error; }
    }
    const notice=text=>{if(alive) $('[data-notice]').textContent=text;};
    el.innerHTML=`<section class="community"><header class="community-heading"><div><small>LEITORES CONECTADOS</small><h2>Comunidade</h2><p>Troque ideias, sugira melhorias e encontre amigos para conversar.</p></div><span class="community-tag">Seu cantinho entre leituras</span></header>
      <div class="community-tabs" role="tablist" aria-label="Conversas"><button role="tab" data-channel="general" aria-selected="true">💬 Conversa geral</button><button role="tab" data-channel="suggestions" aria-selected="false">💡 Sugestões</button><button role="tab" data-channel="friends" aria-selected="false">👥 Amigos</button></div>
      <p data-notice role="status" aria-live="polite"></p>
      <section class="community-friends" hidden><h3>Encontre leitores</h3><form data-search><label>Login do usuário<input name="query" minlength="3" maxlength="32" placeholder="Digite pelo menos 3 caracteres" required autocomplete="off"></label><button class="btn btn-pri">Pesquisar</button></form><div data-people></div><h3>Amizades e solicitações</h3><div data-friends></div></section>
      <section class="community-chat"><div class="community-chat-heading"><div><h3 data-title>Conversa geral</h3><p data-description>Visível para os usuários cadastrados. Atualiza a cada 15 segundos enquanto esta aba estiver aberta.</p></div><button class="btn btn-sec" data-refresh>Atualizar</button></div><button class="btn btn-sec" data-older hidden>Carregar anteriores</button><div class="community-messages" data-messages aria-label="Mensagens"></div>
      <form data-compose><label for="communityText">Sua mensagem</label><textarea id="communityText" name="text" maxlength="2000" rows="3" placeholder="Escreva aqui…" required></textarea><div><small>Até 2.000 caracteres · Sem anexos</small><button class="btn btn-pri" data-send>Enviar</button></div></form></section>
      ${user.role==='admin'?'<details class="community-reports"><summary>Denúncias de mensagens públicas</summary><button class="btn btn-sec" data-load-reports>Atualizar denúncias</button><div data-report-list></div></details><details class="community-setup"><summary>Configuração inicial do banco</summary><p>Se esta é a primeira ativação da Comunidade, baixe o script, abra-o e copie todo o conteúdo para o SQL Editor do Supabase. Execute uma vez e toque em Atualizar.</p><a class="btn btn-sec" href="assets/community.sql" download="community.sql">Baixar script de ativação</a></details>':''}
      </section>`;
    function renderMessages(keepPosition=false) {
      const box=$('[data-messages]'), oldTop=box.scrollTop, oldHeight=box.scrollHeight;
      const nearBottom=oldHeight-oldTop-box.clientHeight<80;
      box.innerHTML=messages.length?messages.map(m=>`<article class="community-message ${m.sender===user.id?'mine':''}"><header><strong>${esc(m.nome)}</strong><span>@${esc(m.login)}</span><time>${esc(new Date(m.created_at).toLocaleString('pt-BR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'}))}</time></header><p>${esc(m.body)}</p><footer>${m.sender!==user.id&&channel!=='private'?`<button data-report="${esc(m.id)}">Denunciar</button><button data-operation="block" data-user="${esc(m.sender)}">Bloquear usuário</button>`:''}${channel==='suggestions'?`<span class="suggestion-state">${({open:'Recebida',planned:'Planejada',done:'Concluída'})[m.status]||'Recebida'}</span>`:''}${m.sender===user.id || (user.role==='admin'&&channel!=='private')?`<button data-delete="${esc(m.id)}">Excluir</button>`:''}${user.role==='admin'&&channel==='suggestions'?`<label>Status <select data-status="${esc(m.id)}">${Object.entries({open:'Recebida',planned:'Planejada',done:'Concluída'}).map(([id,label])=>`<option value="${id}" ${id===m.status?'selected':''}>${label}</option>`).join('')}</select></label>`:''}</footer></article>`).join(''):'<p class="community-empty">Ainda não há mensagens. Comece a conversa!</p>';
      if(keepPosition) box.scrollTop=oldTop+(box.scrollHeight-oldHeight); else if(nearBottom) box.scrollTop=box.scrollHeight;
      $('[data-older]').hidden=messages.length<50;
    }
    function renderFriends() {
      $('[data-friends]').innerHTML=friends.length?friends.map(f=>`<article class="community-person"><div><strong>${esc(f.nome)}</strong><small>@${esc(f.login)} · ${f.status==='accepted'?'Amigo':f.status==='blocked'?'Bloqueado':f.outgoing?'Pedido enviado':'Quer ser seu amigo'}</small></div><div>${f.status==='accepted'?`<button class="btn btn-pri" data-chat="${esc(f.id)}">Conversar</button>`:''}${f.status==='pending'&&!f.outgoing?`<button class="btn btn-pri" data-operation="accept" data-user="${esc(f.id)}">Aceitar</button>`:''}${f.status!=='blocked'?`<button class="btn btn-sec" data-operation="remove" data-user="${esc(f.id)}">${f.status==='accepted'?'Remover':f.outgoing?'Cancelar pedido':'Recusar'}</button><button class="btn btn-sec" data-operation="block" data-user="${esc(f.id)}">Bloquear</button>`:`<button class="btn btn-sec" data-operation="unblock" data-user="${esc(f.id)}">Desbloquear</button>`}</div></article>`).join(''):'<p>Nenhuma amizade ainda. Pesquise um login para enviar um pedido.</p>';
    }
    async function refresh(older=false) {
      if(!alive||loading)return;
      loading=true;const version=generation;
      try {
        const list=await call('friends');if(!alive||version!==generation)return;
        friends=list;renderFriends();
        if(channel==='private'&&!friends.some(f=>f.id===target?.id&&f.status==='accepted')){select('friends');notice('Esta amizade não está mais ativa.');return;}
        if(channel!=='friends') {
          const rows=await call('feed',{channel,target:target?.id,...(older&&messages.length?{before:messages[0].id}:{})});
          if(!alive||version!==generation)return;
          const earlier=!older&&messages.length>50&&rows.length?messages.filter(m=>BigInt(m.id)<BigInt(rows[0].id)):[];
          messages=older?[...rows,...messages.filter(m=>!rows.some(r=>r.id===m.id))]:[...earlier,...rows];
          renderMessages(older);if(older&&rows.length<50)$('[data-older]').hidden=true;
        }
      }catch(error){if(alive&&version===generation)notice(error.message);}
      finally{if(version===generation)loading=false;}
    }
    function select(next,person=null) {
      drafts.set(key(),$('[data-compose] textarea').value);channel=next;target=person;generation++;messages=[];
      $('[data-compose] textarea').value=drafts.get(key())||'';
      el.querySelectorAll('[data-channel]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.channel===(next==='private'?'friends':next))));
      $('.community-friends').hidden=next!=='friends';$('.community-chat').hidden=next==='friends';
      $('[data-title]').textContent=next==='private'?'Conversa com '+person.nome:next==='suggestions'?'Ideias para melhorar o EleoQuadrinho':'Conversa geral';
      $('[data-description]').textContent=next==='private'?'Conversa privada entre vocês. Atualiza a cada 15 segundos.':next==='suggestions'?'Descreva sua ideia. O administrador pode marcar sugestões como planejadas ou concluídas.':'Visível para os usuários cadastrados. Atualiza a cada 15 segundos enquanto esta aba estiver aberta.';
      notice('');renderMessages();loading=false;refresh();
    }
    el.onclick=async e=>{
      const report=e.target.closest('[data-report]'),load=e.target.closest('[data-load-reports]'),resolve=e.target.closest('[data-resolve-report]');
      if(report||load||resolve){const button=report||load||resolve;button.disabled=true;
        try{
          if(report){const reason=prompt('Por que deseja denunciar esta mensagem pública? (3 a 500 caracteres)');if(!reason)return;if(reason.trim().length<3||reason.length>500)return notice('Informe um motivo com 3 a 500 caracteres.');await call('report',{id:report.dataset.report,reason});notice('Denúncia enviada ao administrador.');}
          else if(resolve){await call('resolve-report',{id:resolve.dataset.resolveReport});button.closest('article').remove();notice('Denúncia encerrada.');}
          else{const rows=await call('reports');if(!alive)return;$('[data-report-list]').innerHTML=rows.map(r=>`<article class="community-message"><strong>@${esc(r.login)}</strong><p>${esc(r.body)}</p><p>Motivo: ${esc(r.reason)}</p><button data-delete="${esc(r.message_id)}">Excluir mensagem</button><button data-resolve-report="${esc(r.id)}">Encerrar denúncia</button></article>`).join('')||'<p>Nenhuma denúncia pendente.</p>';}
        }catch(error){notice(error.message);}finally{button.disabled=false;}return;
      }
      const tab=e.target.closest('[data-channel]');if(tab)return select(tab.dataset.channel);
      const chat=e.target.closest('[data-chat]');if(chat){const person=friends.find(f=>f.id===chat.dataset.chat);if(person)select('private',person);return;}
      if(e.target.closest('[data-refresh]')){notice('');return refresh();}
      if(e.target.closest('[data-older]'))return refresh(true);
      const operation=e.target.closest('[data-operation]'), del=e.target.closest('[data-delete]');
      if(!operation&&!del)return;
      const button=operation||del;button.disabled=true;
      try {
        if(del&&!confirm('Excluir esta mensagem?'))return;
        await call(del?'delete':operation.dataset.operation,del?{id:del.dataset.delete}:{target:operation.dataset.user});
        if(!alive)return;notice(del?'Mensagem excluída.':'Amizade atualizada.');$('[data-people]').innerHTML='';await refresh();
      }catch(error){notice(error.message);}finally{button.disabled=false;}
    };
    el.onchange=async e=>{if(!e.target.matches('[data-status]'))return;const input=e.target;input.disabled=true;try{await call('status',{id:input.dataset.status,status:input.value});await refresh();}catch(error){notice(error.message);}finally{input.disabled=false;}};
    $('[data-search]').onsubmit=async e=>{e.preventDefault();const button=e.target.querySelector('button');button.disabled=true;try{const rows=await call('people',{query:e.target.query.value.trim()});if(!alive)return;$('[data-people]').innerHTML=rows.length?rows.map(p=>`<article class="community-person"><div><strong>${esc(p.nome)}</strong><small>@${esc(p.login)}</small></div>${friends.some(f=>f.id===p.id)?'<span>Veja em Amizades</span>':`<button class="btn btn-pri" data-operation="request" data-user="${esc(p.id)}">Adicionar amigo</button>`}</article>`).join(''):'<p>Nenhum leitor encontrado com esse login.</p>';}catch(error){notice(error.message);}finally{button.disabled=false;}};
    $('[data-compose]').onsubmit=async e=>{e.preventDefault();const input=e.target.querySelector('textarea'),text=input.value.trim();if(!text)return;const button=$('[data-send]'),thread=key();button.disabled=true;try{await call('send',{channel,target:target?.id,text});drafts.delete(thread);if(!alive)return;if(key()===thread)input.value='';notice('Mensagem enviada.');await refresh();}catch(error){notice(error.message);}finally{button.disabled=false;}};
    refresh();timer=setInterval(()=>{if(!document.hidden)refresh();},15000);
    return ()=>{alive=false;generation++;clearInterval(timer);drafts.clear();el.innerHTML='';el.onclick=el.onchange=null;};
  }
  root.EQCommunity={mount};
})(globalThis);
