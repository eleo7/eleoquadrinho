(function(root) {
  'use strict';
  const esc = s=>String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const names={hq:'HQs',manga:'Mangás',lore:'Lore',historia:'Contos e histórias'};
  function mount(container, {user,prefs,universes,save,refresh}) {
    const policy=EQContentAccess.normalize(user.access);
    const choices=universes.filter(u=>user.role==='admin'||policy.mode!=='alternative'||policy.universes.includes(u.id));
    container.innerHTML=`<section class="access-panel"><h3>Universos que quero ver</h3><p>Oculte universos sem apagar suas leituras. Isso não altera as permissões definidas pelo administrador.</p><div class="access-options">${choices.map(u=>`<label><input type="checkbox" data-visible-universe="${esc(u.id)}" ${!(prefs.hiddenUniverses||[]).includes(u.id)?'checked':''}> ${esc(u.nome)}</label>`).join('')}</div><button class="btn btn-pri" data-save-visible>Salvar preferências</button><p data-visible-status role="status"></p></section>${user.role==='admin'?'<section class="access-panel"><h3>Administração de usuários</h3><p>E-mails e logins são visíveis somente ao administrador. Os perfis de conteúdo não concedem permissão para editar ou excluir o catálogo.</p><div data-users-list></div><div class="access-actions"><button class="btn btn-sec" data-prev-users>Anterior</button><span data-users-page></span><button class="btn btn-sec" data-next-users>Próxima</button></div><p data-users-status role="status"></p></section>':''}`;
    container.querySelector('[data-save-visible]').onclick=()=> {
      const permitted=new Set(choices.map(u=>u.id));
      const hidden=(prefs.hiddenUniverses||[]).filter(id=>!permitted.has(id));
      container.querySelectorAll('[data-visible-universe]').forEach(el=>{if(!el.checked) hidden.push(el.dataset.visibleUniverse);});
      save(hidden);container.querySelector('[data-visible-status]').textContent='Preferências salvas. A página inicial seguirá sua seleção.';
    };
    if(user.role!=='admin') return;
    let page=1;
    const status=container.querySelector('[data-users-status]'),list=container.querySelector('[data-users-list]');
    async function load() {
      status.textContent='Carregando usuários…';
      try {
        const result=await EQAccount.api('users&page='+page,'GET',undefined,user.id);
        if(!container.isConnected)return;
        list.innerHTML=result.users.map(u=>{
          const p=EQContentAccess.normalize(u.access);
          return `<details class="access-user"><summary>${esc(u.nome)} · @${esc(u.login)}<small>${esc(u.email)} · ${u.role==='admin'?'Administrador':({standard:'Padrão',alternative:'Alternativo',initial:'Inicial'})[p.mode]}</small></summary><form data-edit-user="${esc(u.id)}"><label>Nome<input name="nome" value="${esc(u.nome)}" maxlength="80" required></label><label>Bio<textarea name="bio" maxlength="500">${esc(u.bio)}</textarea></label><label>Perfil de conteúdo<select name="mode" ${u.role==='admin'?'disabled':''}><option value="standard" ${p.mode==='standard'?'selected':''}>Padrão — todo o conteúdo</option><option value="alternative" ${p.mode==='alternative'?'selected':''}>Alternativo — escolher acesso</option><option value="initial" ${p.mode==='initial'?'selected':''}>Inicial — somente HQs</option></select></label><div data-custom-access ${p.mode==='alternative'?'':'hidden'}><fieldset><legend>Universos permitidos</legend><div class="access-options">${universes.map(v=>`<label><input type="checkbox" name="universe" value="${esc(v.id)}" ${p.universes.includes(v.id)?'checked':''}> ${esc(v.nome)}</label>`).join('')}</div></fieldset><fieldset><legend>Categorias permitidas</legend><div class="access-options">${Object.entries(names).map(([id,label])=>`<label><input type="checkbox" name="category" value="${id}" ${p.categories.includes(id)?'checked':''}> ${label}</label>`).join('')}</div></fieldset><p>Para liberar só mangás, mantenha os universos desejados e marque apenas Mangás. Nenhuma opção marcada significa nenhum acesso nesse grupo.</p></div><button class="btn btn-pri" type="submit">Salvar perfil</button><p data-edit-status role="status"></p></form></details>`;
        }).join('') || '<p>Nenhum usuário nesta página.</p>';
        container.querySelector('[data-prev-users]').disabled=page===1;
        container.querySelector('[data-next-users]').disabled=!result.hasMore;
        container.querySelector('[data-users-page]').textContent='Página '+page;
        list.querySelectorAll('form').forEach(form=>{
          form.elements.mode.onchange=()=>{form.querySelector('[data-custom-access]').hidden=form.elements.mode.value!=='alternative';};
          form.onsubmit=async e=>{
            e.preventDefault();const button=form.querySelector('[type=submit]'),notice=form.querySelector('[data-edit-status]');button.disabled=true;
            try {
              const access={mode:form.elements.mode.value,universes:[...form.querySelectorAll('[name=universe]:checked')].map(x=>x.value),categories:[...form.querySelectorAll('[name=category]:checked')].map(x=>x.value)};
              await EQAccount.api('users','PATCH',{id:form.dataset.editUser,nome:form.elements.nome.value,bio:form.elements.bio.value,access},user.id);
              notice.textContent='Perfil salvo. As permissões serão verificadas no próximo acesso à leitura.';
              if(form.dataset.editUser===user.id) await refresh();
            } catch(error) {notice.textContent=error.message;} finally{button.disabled=false;}
          };
        });
        status.textContent='';
      } catch(error){status.textContent=error.message;}
    }
    container.querySelector('[data-prev-users]').onclick=()=>{if(page>1){page--;load();}};
    container.querySelector('[data-next-users]').onclick=()=>{page++;load();};
    load();
  }
  root.EQUserAccessUI={mount};
})(globalThis);
