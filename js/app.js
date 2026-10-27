/* =========================================================
   EleoQuadrinho — Aplicação principal
   - Foco em Lore Verdadeira e Completa (Riot Universe: biografias
     integrais + 240+ contos e crônicas de Runeterra)
   - HQs Oficiais do Universo LoL em PT-BR (séries + edições únicas)
   - HQs Reais e Completas da Marvel, DC e Vertigo em PT-BR no
     leitor nativo de páginas (com seletor de volumes/edições)
   ========================================================= */
'use strict';
(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  const embaralhar = (a) => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.random() * (i + 1) | 0;[a[i], a[j]] = [a[j], a[i]]; } return a; };
  const hash = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h); };
  const tirarTags = (s) => String(s || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').replace(/\{\{.*?\}\}/g, '…');

  /* ---------------- Armazenamento & Autenticação ---------------- */
  let accountUser = null;
  let readerSync = null;
  let catalogSync = null;
  const catalogKeys = ['drive', 'externas', 'herois', 'series'];
  const Store = {
    get(k, d) {
      const source = catalogKeys.includes(k) ? catalogSync?.data : readerSync?.data;
      return source?.[k] ?? d;
    },
    set(k, v) {
      if (!accountUser) return;
      if (catalogKeys.includes(k)) {
        if (accountUser.role !== 'admin') throw new Error('Somente o administrador pode alterar o catálogo.');
        catalogSync.update({ [k]: v });
      } else if (k === 'prefs') readerSync.update({ prefs: v });
    }
  };

  const AVATARES_PADRAO = [
    { id: 'jinx', nome: 'Jinx', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Jinx.png' },
    { id: 'yasuo', nome: 'Yasuo', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Yasuo.png' },
    { id: 'ahri', nome: 'Ahri', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ahri.png' },
    { id: 'zed', nome: 'Zed', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Zed.png' },
    { id: 'lux', nome: 'Lux', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Lux.png' },
    { id: 'batman', nome: 'Batman', url: 'https://archive.org/services/img/cavaleiro-das-trevas-edicao-definitiva' },
    { id: 'spiderman', nome: 'Homem-Aranha', url: 'https://archive.org/services/img/guerra-civil-marvel-deluxe' },
    { id: 'wolverine', nome: 'Wolverine', url: 'https://archive.org/services/img/reino-do-amanha-ed.-definitiva-panini' },
    { id: 'ashe', nome: 'Ashe', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ashe.png' },
    { id: 'ekko', nome: 'Ekko', url: 'https://ddragon.leagueoflegends.com/cdn/14.20.1/img/champion/Ekko.png' }
  ];

  let historico = [];
  let salvos = {};
  let avaliacoes = {};
  let finais = {};

  function syncStatus(message, error = false) {
    const el = $('#syncStatus');
    if (!el) return;
    const uploading = message.startsWith('Enviando ');
    el.hidden = !error && !uploading;
    $('#syncMessage').textContent = message;
    el.classList.toggle('sync-error', error);
    if (!error && message.startsWith('HQ publicada:')) toast(message);
  }
  const Auth = {
    get usuario() { return accountUser; },
    get admin() { return accountUser?.role === 'admin'; },
    atualizarHeader() {
      const u = this.usuario;
      $('#headerAvatar').textContent = u ? u.nome.charAt(0).toUpperCase() : '👤';
      $('#headerNome').textContent = u ? u.nome : 'Entrar';
      $('#btnPerfilTopo').title = u ? `Perfil de ${u.nome} (@${u.login})` : 'Entrar ou criar conta';
      document.body.classList.toggle('conta-admin', this.admin);
      aplicarRecompensas();
    },
    async cadastrar({ nome, login, email, senha }) {
      const result = await EQAccount.api('signup', 'POST', { nome, login, email, senha });
      abrirModalAuth('entrar', true);
      $('#authNotice').textContent = result.message;
    },
    async entrar(login, senha) {
      if (accountUser) throw new Error('Saia da conta atual antes de entrar em outra.');
      const result = await EQAccount.api('login', 'POST', { login, senha });
      await this.carregarConta(result.user);
    },
    async carregarConta(user) {
      const reader = new EQAccount.SyncDocument('state', user.id, syncStatus);
      const catalog = new EQAccount.SyncDocument('catalog', user.id, syncStatus);
      await reader.load();
      if (user.role === 'admin') await catalog.load();
      else {
        const snapshot = await EQAccount.api('catalog', 'GET', undefined, user.id);
        catalog.data = snapshot.data; catalog.revision = snapshot.revision; catalog.loaded = true;
      }
      readerSync = reader; catalogSync = catalog; accountUser = user;
      for(const key of Object.keys(libraryViews)){clearTimeout(libraryViews[key].timer);delete libraryViews[key];}
      rewardSearchState={query:'',filter:'all'};
      this.carregarDadosPerfil();
      drive = catalog.data.drive || []; externas = catalog.data.externas || [];
      herois = catalog.data.herois || []; series = catalog.data.series || [];
      atualizarUniversos();
      [...drive, ...externas, ...herois, ...series].forEach(reg);
      Object.assign(prefs, reader.data.prefs || {});
      rewardSession = { id: null, at: performance.now(), activity: performance.now(), account: user.id };
      this.atualizarHeader();
      fecharModalAuth();
      rota();
      carregarArquivosLocais();
      mostrarNovidades();
      if (!reader.dirty && !catalog.dirty) syncStatus('Conta conectada. Dados carregados da nuvem.');
    },
    saindo: false,
    sessaoEncerrada: false,
    async sair() {
      $('#releaseNews')?.remove();
      $('#achievementLaunch')?.remove();
      if (this.saindo) return;
      this.saindo = true;
      const button = $('#btnSairPerfil');
      if (button) { button.disabled = true; button.textContent = 'Saindo…'; }
      try {
        // A failed save must not trap the user in their account. SyncDocument
        // keeps pending changes under the original account's local storage key.
        const documents = [readerSync, ...(this.admin ? [catalogSync] : [])].filter(Boolean);
        await Promise.allSettled(documents.map(doc => doc.flush()));
        documents.forEach(doc => { clearTimeout(doc.timer); if (doc.dirty) doc.persist(); });
        await EQAccount.api('logout', 'POST', {});
        this.sessaoEncerrada = true;
        location.replace(location.pathname);
      } catch (error) {
        this.saindo = false;
        if (button) { button.disabled = false; button.textContent = '🚪 Sair'; }
        syncStatus('Não foi possível encerrar a sessão. Verifique a conexão e tente novamente. ' + error.message, true);
      }
    },
    carregarDadosPerfil() {
      const data = readerSync?.data || {};
      historico = Array.isArray(data.historico) ? data.historico : [];
      salvos = data.salvos || {}; avaliacoes = data.avaliacoes || {}; finais = data.finais || {};
    },
    salvarDadosPerfil() {
      if (accountUser) readerSync.update({ historico, salvos, avaliacoes, finais });
    }
  };

  let drive = Store.get('drive', []);
  let externas = Store.get('externas', []);
  let herois = Store.get('herois', []);
  let series = Store.get('series', []);
  let preHeroiSelecionado = null;
  let preSerieSelecionada = null;
  let itemParaEditar = null;
  const prefs = Object.assign({ tema: 'escuro', fonte: 'serif', tam: 19, larg: 720, vel: 1, voz: '', hqModo: 'pagina', hqRTL: false, hqSom: true, hqCinema: false }, Store.get('prefs', {}));
  const salvarPrefs = () => Store.set('prefs', prefs);

  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2800);
  }

  /* ---------------- Efeito Sonoro Realista de Virada de Página (Web Audio API) ---------------- */
  const SomFolha = {
    ctx: null,
    iniciar() {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) this.ctx = new AudioCtx();
      }
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().catch(() => {});
      }
    },
    tocar() {
      if (!prefs.hqSom) return;
      try {
        this.iniciar();
        if (!this.ctx) return;
        const ctx = this.ctx;
        const duracao = 0.15;
        const bufferSize = Math.floor(ctx.sampleRate * duracao);
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.42));
        }
        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(850, ctx.currentTime);
        filter.frequency.exponentialRampToValueAtTime(2400, ctx.currentTime + 0.05);
        filter.frequency.exponentialRampToValueAtTime(380, ctx.currentTime + duracao);
        filter.Q.setValueAtTime(1.6, ctx.currentTime);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duracao);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start();
        noise.stop(ctx.currentTime + duracao);
      } catch (e) {
        console.warn('Erro ao reproduzir som de página:', e);
      }
    }
  };

  /* ---------------- Registro de itens ---------------- */
  const REG = new Map();
  function reg(it) {
    const o = REG.get(it.id);
    if (o) { for (const k in it) if (it[k] != null) o[k] = it[k]; return o; }
    REG.set(it.id, it); return it;
  }
  const col = (id) => COLECOES.find(c => c.id === id) || (()=>{const u=catalogSync?.data.universes?.find(n=>n.cols.includes(id));return u?{id,nome:u.nome,sub:'Conteúdo deste universo',cor:['#182235','#eab64c'],emblema:'🌌',capa:u.cover||'assets/universe-default.svg',fonte:'Sua biblioteca'}:null;})();
  const snap = (it) => { const o = {}; for (const k in it) if (typeof it[k] !== 'function' && k !== 'blob') o[k] = it[k]; return o; };

  const REGIAO_DE = {};
  REGIOES.forEach(r => r.campeoes.forEach(c => { if (!REGIAO_DE[c]) REGIAO_DE[c] = r; }));

  const itemConto = (c) => reg({ id: 'conto:' + c.id, tipo: c.interativa ? 'interativa' : 'conto', titulo: c.titulo, sub: c.sub, colecao: c.colecao, ref: c.id, tempo: c.tempo });
  const itemHQ = (h) => reg({ id: 'hq:' + h.id, tipo: 'hq', titulo: h.titulo, sub: h.sub, capa: h.capa, colecao: h.colecao, ref: h.id, resumo: h.resumo });
  const itemCampeao = (c) => reg({ id: 'lol:' + c.id, tipo: 'lol', titulo: c.name, sub: c.title.charAt(0).toUpperCase() + c.title.slice(1), capa: Fontes.lolImg.loading(c.id), banner: Fontes.lolImg.splash(c.id), tags: c.tags.map(t => Fontes.TAGS[t] || t), resumo: c.blurb, colecao: 'lol', cid: c.id, info: c.info });
  const itemWiki = (t, colecao) => reg({ id: 'wiki:' + t, tipo: 'wiki', titulo: t.replace(/\s*\(.*\)\s*$/, ''), sub: colecao ? col(colecao).nome : 'Wikipédia', colecao, wtitulo: t });
  const itemRegiao = (r) => reg({ id: 'regiao:' + r.id, tipo: 'regiao', titulo: r.nome, sub: 'Região de Runeterra', ref: r.id, uSlug: r.uSlug, resumo: r.resumo, colecao: 'runeterra', capa: Fontes.lolImg.loading(r.campeoes[0]), banner: Fontes.lolImg.splash(r.campeoes[0]) });
  const itemLor = (c) => reg({ id: 'lor:' + c.cardCode, tipo: 'lor', titulo: c.name, sub: (c.regions || []).join(' · '), capa: c.assets?.[0]?.gameAbsolutePath, banner: c.assets?.[0]?.fullAbsolutePath, colecao: 'lor', carta: { flavor: c.flavorText, desc: c.descriptionRaw, tipo: c.type, raridade: c.rarity, artista: c.artistName, regioes: c.regions, custo: c.cost, ataque: c.attack, vida: c.health, sub: c.subtypes } });
  const itemIA = (d, colecao = 'arquivo') => reg({ id: 'ia:' + (d.ident || d.identifier), tipo: 'ia', titulo: d.titulo || (Array.isArray(d.title) ? d.title[0] : (d.title || d.identifier)), sub: d.sub || ([Array.isArray(d.creator) ? d.creator[0] : d.creator, d.year].filter(Boolean).join(' · ') || 'HQ em Português'), resumo: d.resumo || '', capa: `https://archive.org/services/img/${d.ident || d.identifier}`, colecao, ident: d.ident || d.identifier, idioma: d.language || 'por' });

  // HQs Oficiais da Riot (Séries e Edições Únicas)
  const itemRiotSerie = (s) => reg({ id: 'rserie:' + s.slug, tipo: 'riot-serie', titulo: s.titulo, sub: s.sub, capa: s.capa, banner: s.capa, resumo: s.resumo, colecao: 'hqs-lol', serieSlug: s.slug });
  const itemRiotEdicao = (e, colecao = 'hqs-lol') => reg({ id: 'rhq:' + e.caminho, tipo: 'riot-hq', titulo: e.titulo, sub: e.sub || 'HQ Oficial · Universo LoL', capa: e.capa || (e.campeao ? Fontes.lolImg.loading(e.campeao) : ''), banner: e.capa || (e.campeao ? Fontes.lolImg.splash(e.campeao) : ''), resumo: e.resumo || '', colecao, caminho: e.caminho });
  const itemRiotConto = (s) => reg({ id: 'rconto:' + s.slug, tipo: 'riot-conto', titulo: s.titulo, sub: [s.campeoes?.join(', '), s.autor, s.minutos ? `⏱ ${s.minutos} min` : ''].filter(Boolean).join(' · ') || 'Crônica de Runeterra', capa: s.imagem, banner: s.imagem, resumo: s.resumo, colecao: 'cronicas-lol', slug: s.slug, campeoes: s.campeoes || [] });

  CONTOS.forEach(itemConto);
  HQS.forEach(itemHQ);
  REGIOES.forEach(itemRegiao);
  HQS_RIOT_SERIES.forEach(itemRiotSerie);
  HQS_RIOT_ONESHOTS.forEach(e => itemRiotEdicao(e));
  Object.entries(HQS_ACERVO).forEach(([c, l]) => l.forEach(h => itemIA(h, c)));
  Object.entries(VERBETES).forEach(([c, l]) => l.forEach(t => itemWiki(t, c)));
  drive.forEach(d => reg(d));
  externas.forEach(x => reg(x));
  herois.forEach(h => reg(h));
  series.forEach(s => reg(s));

  // Retorna todas as edições/volumes dentro de uma Coleção/Série (subpasta), ordenadas de 1 a N
  function edicoesDaSerie(serieOuId) {
    const sIt = typeof serieOuId === 'string' ? REG.get(serieOuId) : serieOuId;
    if (!sIt) return [];
    const sId = sIt.id;
    const sNome = norm(sIt.titulo);
    const doUsuario = [
      ...externas.map(x => REG.get(x.id) || reg(x)),
      ...drive.map(d => REG.get(d.id) || reg(d)),
      ...[...REG.values()].filter(i => i.tipo === 'local' && !externas.some(x => x.id === i.id))
    ];
    const eds = doUsuario.filter(it => it.serieId === sId || (it.serieNome && norm(it.serieNome) === sNome));
    return eds.sort((a, b) => {
      const na = a.edicaoNum != null && a.edicaoNum !== '' ? +a.edicaoNum : null;
      const nb = b.edicaoNum != null && b.edicaoNum !== '' ? +b.edicaoNum : null;
      if (na != null && nb != null && na !== nb) return na - nb;
      if (na != null && nb == null) return -1;
      if (na == null && nb != null) return 1;
      return String(a.titulo || '').localeCompare(String(b.titulo || ''), undefined, { numeric: true, sensitivity: 'base' });
    });
  }

  // Retorna as Coleções/Séries (subpastas) vinculadas a um Herói/Personagem
  function seriesDoHeroi(heroiIt) {
    if (!heroiIt) return [];
    const hId = heroiIt.id;
    const hNome = norm(heroiIt.titulo);
    return series
      .map(s => REG.get(s.id) || reg(s))
      .filter(s => {
        if (s.heroiId === hId || (s.heroiNome && norm(s.heroiNome) === hNome) || (hNome.length >= 3 && norm(`${s.titulo} ${s.resumo || ''}`).includes(hNome))) return true;
        return edicoesDaSerie(s).some(ed => ed.heroiId === hId || (ed.heroiNome && norm(ed.heroiNome) === hNome));
      });
  }

  // Retorna todas as obras (HQs, Mangás, Lores, Contos) vinculadas a um Herói/Personagem
  function obrasDoHeroi(heroiIt) {
    if (!heroiIt) return [];
    const hId = heroiIt.id;
    const hNome = norm(heroiIt.titulo);
    const out = [];
    const vistos = new Set();
    const add = (it) => { if (it && it.id !== hId && !vistos.has(it.id)) { vistos.add(it.id); out.push(it); } };

    // 1. Obras adicionadas com vínculo direto ao herói (por ID, Nome ou Série do Herói)
    const idsSeriesHeroi = new Set(seriesDoHeroi(heroiIt).map(s => s.id));
    const doUsuario = [
      ...externas.map(x => REG.get(x.id) || reg(x)),
      ...drive.map(d => REG.get(d.id) || reg(d)),
      ...[...REG.values()].filter(i => i.tipo === 'local' && !externas.some(x => x.id === i.id))
    ];
    doUsuario.forEach(it => {
      if (it.heroiId === hId || (it.heroiNome && norm(it.heroiNome) === hNome) || (it.serieId && idsSeriesHeroi.has(it.serieId)) || (hNome.length >= 3 && norm(`${it.titulo} ${it.resumo || ''}`).includes(hNome))) {
        add(it);
      }
    });

    // 2. HQs e Contos do acervo (Marvel, DC, Vertigo, Riot) que mencionam o herói
    if (hNome.length >= 3) {
      [...REG.values()].forEach(it => {
        if (['ia', 'riot-serie', 'riot-hq', 'riot-conto', 'conto', 'hq'].includes(it.tipo)) {
          if (norm(`${it.titulo} ${it.sub || ''} ${it.resumo || ''} ${(it.campeoes || []).join(' ')}`).includes(hNome)) {
            add(it);
          }
        }
      });
    }
    return out;
  }

  // Calcula quantas Coleções/Séries, HQs, Mangás, Lores e Histórias estão vinculadas a um Herói/Personagem
  function contagemVinculosHeroi(heroiOuId) {
    const hIt = typeof heroiOuId === 'string' ? REG.get(heroiOuId) : heroiOuId;
    if (!hIt) return { total: 0, seriesCount: 0, hqs: 0, mangas: 0, lores: 0, historias: 0, textoCurto: '0 obras vinculadas', badgesHTML: '', obras: [], seriesH: [] };
    const obras = obrasDoHeroi(hIt);
    const seriesH = seriesDoHeroi(hIt);
    let hqs = 0, mangas = 0, lores = 0, historias = 0;
    obras.forEach(o => {
      const f = norm(o.formatoObra || '');
      if (f.includes('mang') || f.includes('manhw') || f.includes('webtoon')) mangas++;
      else if (f.includes('lore')) lores++;
      else if (f.includes('conto') || f.includes('outro') || ['riot-conto', 'conto', 'interativa'].includes(o.tipo)) historias++;
      else hqs++;
    });
    const partes = [];
    if (seriesH.length) partes.push(`${seriesH.length} ${seriesH.length === 1 ? 'Série' : 'Séries'}`);
    if (hqs) partes.push(`${hqs} ${hqs === 1 ? 'HQ' : 'HQs'}`);
    if (mangas) partes.push(`${mangas} ${mangas === 1 ? 'Mangá' : 'Mangás'}`);
    if (lores) partes.push(`${lores} ${lores === 1 ? 'Lore' : 'Lores'}`);
    if (historias) partes.push(`${historias} ${historias === 1 ? 'História' : 'Histórias'}`);
    const textoCurto = partes.length ? partes.join(' · ') : '0 histórias vinculadas';
    const badgesHTML = `<div class="heroi-contadores">
      <span class="contador-pill destaque-pill">📚 Total: <b>${obras.length}</b></span>
      <span class="contador-pill">📁 Coleções / Séries: <b>${seriesH.length}</b></span>
      <span class="contador-pill">🗯️ HQs: <b>${hqs}</b></span>
      <span class="contador-pill">🎌 Mangás: <b>${mangas}</b></span>
      <span class="contador-pill">📜 Lores: <b>${lores}</b></span>
      <span class="contador-pill">📖 Histórias / Contos: <b>${historias}</b></span>
    </div>`;
    return { total: obras.length, seriesCount: seriesH.length, hqs, mangas, lores, historias, textoCurto, badgesHTML, obras, seriesH };
  }

  // Lista todos os heróis/personagens cadastrados no sistema para vincular histórias
  function todosHerois() {
    const lista = [];
    herois.forEach(h => lista.push({ id: h.id, nome: h.titulo, grupo: '⭐ Meus Heróis Cadastrados', colecao: h.colecao || 'originais' }));
    [...REG.values()].filter(i => i.tipo === 'lol').sort((a, b) => a.titulo.localeCompare(b.titulo)).forEach(c => {
      lista.push({ id: c.id, nome: c.titulo, grupo: '⚔️ Campeões de League of Legends', colecao: 'hqs-lol' });
    });
    ['marvel', 'dc'].forEach(cid => {
      (VERBETES[cid] || []).forEach(t => {
        const it = REG.get('wiki:' + t);
        if (it) lista.push({ id: it.id, nome: it.titulo, grupo: cid === 'marvel' ? '🦸 Heróis & Vilões Marvel' : '🦇 Heróis & Vilões DC Comics', colecao: cid });
      });
    });
    ['grega', 'nordica', 'egipcia', 'japonesa', 'folclore', 'ioruba', 'asteca', 'hindu', 'celta'].forEach(cid => {
      (VERBETES[cid] || []).slice(0, 12).forEach(t => {
        const it = REG.get('wiki:' + t);
        if (it) lista.push({ id: it.id, nome: it.titulo, grupo: '⚡ Deuses & Mitologias', colecao: cid });
      });
    });
    return lista;
  }

  /* ---------------- Dados assíncronos ---------------- */
  const Dados = {
    _lol: null,
    _cronicas: null,
    lol() {
      if (!this._lol) this._lol = Fontes.lolCampeoes().then(l => l.map(itemCampeao)).catch(e => { this._lol = null; throw e; });
      return this._lol;
    },
    cronicas() {
      if (!this._cronicas) this._cronicas = Fontes.universoCatalogoContos().then(l => l.map(itemRiotConto)).catch(e => { this._cronicas = null; throw e; });
      return this._cronicas;
    }
  };

  async function aplicarMiniaturas(itens) {
    const pend = itens.filter(i => i && i.tipo === 'wiki' && !i.thumbOk);
    if (!pend.length) return;
    const r = await Fontes.wikiMiniaturas(pend.map(i => i.wtitulo));
    pend.forEach(i => {
      const m = r[i.wtitulo]; i.thumbOk = true;
      if (m) { if (m.thumb) i.capa = m.thumb; if (m.desc) i.desc = m.desc; }
      atualizarCapa(i.id);
    });
  }
  function atualizarCapa(id) {
    const it = REG.get(id); if (!it?.capa) return;
    $$(`.cartao[data-id="${CSS.escape(id)}"] svg.gerada`).forEach(svg => {
      const img = new Image(); img.src = it.capa; img.loading = 'lazy'; img.alt = it.titulo;
      img.onerror = () => img.replaceWith(svgEl(it));
      img.style.opacity = 0; img.style.transition = 'opacity .4s';
      img.onload = () => img.style.opacity = 1;
      svg.replaceWith(img);
    });
    $$(`.cartao[data-id="${CSS.escape(id)}"] p`).forEach(p => { if (it.desc) p.textContent = it.desc; });
  }

  /* ---------------- Capas geradas (SVG) ---------------- */
  let nSvg = 0;
  function quebrar(t, max) {
    const pal = t.split(/\s+/); const l = []; let at = '';
    pal.forEach(p => { if ((at + ' ' + p).trim().length > max && at) { l.push(at); at = p; } else at = (at + ' ' + p).trim(); });
    if (at) l.push(at); return l;
  }
  function estiloCapa(it) {
    const c = col(it.colecao) || { cor: ['#1b2030', '#f5b301'], emblema: '📖', nome: 'EleoQuadrinho' };
    const extra = {
      drive: { cor: ['#0b2b57', '#4c8bf5'], emblema: '☁️', nome: 'Google Drive' },
      local: { cor: ['#2a1b3d', '#c084fc'], emblema: '📁', nome: 'Biblioteca' },
      heroi: { cor: ['#082f49', '#38bdf8'], emblema: '🦸', nome: col(it.colecao)?.nome || 'Herói' },
      'serie-pasta': { cor: ['#451a03', '#f59e0b'], emblema: '📁', nome: col(it.colecao)?.nome || 'Série de HQs' },
      'ext-hq': { cor: ['#3b0d2c', '#ff4d94'], emblema: it.formatoObra === 'Mangá' ? '🎌' : it.formatoObra === 'Lore' ? '📜' : '🗯️', nome: it.formatoObra || col(it.colecao)?.nome || 'HQ' }
    }[it.tipo];
    return extra || c;
  }
  function capaSVG(it, largo = false) {
    const st = estiloCapa(it); const n = ++nSvg; const h = hash(it.id || it.titulo);
    const W = largo ? 480 : 300, H = largo ? 270 : 450;
    const [c1, c2] = st.cor;
    const linhas = quebrar(String(it.titulo).toUpperCase(), largo ? 20 : 11).slice(0, 4);
    const fs = largo ? 40 : (linhas.some(l => l.length > 9) ? 38 : 46);
    const base = H - 22 - (linhas.length - 1) * fs * .95;
    const cx = W / 2, cy = largo ? H * .42 : H * .43;
    let raios = '';
    for (let i = 0; i < 18; i++) {
      const a1 = (i / 18) * Math.PI * 2 + h % 7, a2 = a1 + Math.PI / 30, R = 700;
      raios += `<path d="M${cx},${cy} L${cx + Math.cos(a1) * R},${cy + Math.sin(a1) * R} L${cx + Math.cos(a2) * R},${cy + Math.sin(a2) * R}Z"/>`;
    }
    const fundo = (col(it.colecao)?.capa && (it.tipo === 'conto' || it.tipo === 'interativa'))
      ? `<image href="${col(it.colecao).capa}" x="${-(h % 160)}" y="${-(h % 220)}" width="${W * 1.7}" height="${H * 1.7}" preserveAspectRatio="xMidYMid slice" opacity=".55"/>` : '';
    const emb = String(st.emblema);
    const embTam = emb.length > 2 ? 70 : (largo ? 100 : 120);
    return `<svg class="gerada" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="g${n}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c1}"/><stop offset="1" stop-color="#05060a"/></linearGradient>
        <radialGradient id="r${n}" cx=".5" cy=".42" r=".6"><stop offset="0" stop-color="${c2}" stop-opacity=".6"/><stop offset="1" stop-color="${c2}" stop-opacity="0"/></radialGradient>
        <pattern id="p${n}" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="3.5" cy="3.5" r="1.3" fill="#fff" opacity=".13"/></pattern>
        <linearGradient id="b${n}" x1="0" y1="0" x2="0" y2="1"><stop offset=".45" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".85"/></linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#g${n})"/>${fundo}
      <g fill="${c2}" opacity=".12">${raios}</g>
      <rect width="${W}" height="${H}" fill="url(#r${n})"/>
      <rect width="${W}" height="${H}" fill="url(#p${n})"/>
      <text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-size="${embTam}" font-family="Bangers, 'Segoe UI Emoji', sans-serif" fill="#fff" stroke="${c2}" stroke-width="2" opacity=".95">${esc(emb)}</text>
      <rect width="${W}" height="${H}" fill="url(#b${n})"/>
      <rect width="${W}" height="30" fill="#000" opacity=".45"/>
      <text x="12" y="20" fill="${c2}" font-family="Inter, sans-serif" font-weight="800" font-size="11" letter-spacing="2">${esc(st.nome.toUpperCase())}</text>
      ${linhas.map((l, i) => `<text x="${cx}" y="${base + i * fs * .95}" text-anchor="middle" font-family="Bangers, Impact, sans-serif" font-size="${fs}" fill="#fff" stroke="#000" stroke-width="6" paint-order="stroke" letter-spacing="1">${esc(l)}</text>`).join('')}
      <rect x="5" y="5" width="${W - 10}" height="${H - 10}" rx="6" fill="none" stroke="${c2}" stroke-opacity=".45" stroke-width="2"/>
    </svg>`;
  }
  const svgEl = (it, largo) => { const d = document.createElement('div'); d.innerHTML = capaSVG(it, largo); return d.firstElementChild; };
  window.EQ = {
    falhaCapa(img) { const it = REG.get(img.dataset.id) || { id: img.dataset.id, titulo: img.alt }; img.replaceWith(svgEl(it, img.dataset.largo === '1')); }
  };
  function capaHTML(it, largo = false) {
    let src = largo ? (it.banner || it.capa) : it.capa;
    if (!src && it.tipo === 'serie-pasta') {
      const eds = edicoesDaSerie(it).filter(ed => conteudoPermitido(ed));
      src = eds[0]?.capa || '';
    }
    if (src) return `<img src="${esc(src)}" alt="${esc(it.titulo)}" loading="lazy" decoding="async" data-id="${esc(it.id)}" data-largo="${largo ? 1 : 0}" onerror="EQ.falhaCapa(this)">`;
    return capaSVG(it, largo);
  }

  /* ---------------- Componentes ---------------- */
  const SELOS = {
    hq: ['HQ Interativa', 'hq'],
    'riot-serie': ['Série HQ', 'hq'],
    'riot-hq': ['HQ LoL', 'hq'],
    'riot-conto': ['Crônica', ''],
    interativa: ['Interativa', 'interativa'],
    lol: ['Lore & Contos', ''],
    ia: ['HQ Completa', 'hq'],
    'ext-hq': ['HQ', 'hq'],
    heroi: ['Herói & Lore', 'heroi'],
    'serie-pasta': ['📁 Coleção / Série', 'serie'],
    conto: ['Conto', ''],
    wiki: ['Enciclopédia', ''],
    lor: ['Carta', ''],
    regiao: ['Região', ''],
    drive: ['Drive', ''],
    local: ['Arquivo', '']
  };
  function seloItem(it) {
    if (it.tipo === 'serie-pasta') return ['📁 Série', 'serie'];
    if (it.formatoObra) {
      const f = it.formatoObra;
      if (/mang|manhw|webtoon/i.test(f)) return [f, 'manga'];
      if (/lore|cr[oô]nica|universo/i.test(f)) return [f, 'lore'];
      if (/conto|novel|livro/i.test(f)) return [f, ''];
      return [f, 'hq'];
    }
    return SELOS[it.tipo] || ['', ''];
  }
  function conteudoPermitido(it, preferences = true) {
    return EQContentAccess.allowed(it, Auth.usuario?.access, Auth.usuario?.role) &&
      (!preferences || !(prefs.hiddenUniverses || []).includes(EQContentAccess.universe(it)));
  }
  function universoVisivel(id) {
    const policy = EQContentAccess.normalize(Auth.usuario?.access);
    return !(prefs.hiddenUniverses || []).includes(id) && (Auth.admin || policy.mode !== 'alternative' || policy.universes.includes(id));
  }
  function inicioFiltrado() { return EQContentAccess.normalize(Auth.usuario?.access).mode !== 'standard' || prefs.hiddenUniverses?.length; }
  async function atualizarPermissoes() {
    if (!Auth.usuario) return;
    const id = Auth.usuario.id;
    const {user} = await EQAccount.api('session');
    if (!user || user.id !== id || Auth.usuario?.id !== id) throw new Error('A conta mudou. Recarregue a página.');
    const changed = JSON.stringify(user.access) !== JSON.stringify(Auth.usuario.access);
    accountUser = user;
    if (changed) {
      if (user.role !== 'admin') {
        const snapshot = await EQAccount.api('catalog', 'GET', undefined, id);
        if (Auth.usuario?.id !== id) throw new Error('A conta mudou.');
        externas = snapshot.data.externas || []; drive = snapshot.data.drive || [];
        series = snapshot.data.series || []; herois = snapshot.data.herois || [];
        [...externas, ...drive, ...series, ...herois].forEach(reg);
      }
      inicioPronto = false;
      Ex.uni = Ex.heroi = Ex.serie = null;
      fecharCamada();
      if ($('#leitorTexto').classList.contains('aberto')) $('#leitorTexto [data-fechar-leitor]')?.click();
      if ($('#leitorHQ').classList.contains('aberto')) $('#leitorHQ [data-fechar-leitor]')?.click();
    }
    return changed;
  }
  window.addEventListener('focus', () => { atualizarPermissoes().then(changed => { if (changed) rota(); }).catch(() => {}); });
  function cartao(it, { largo = false } = {}) {
    if (!it || !conteudoPermitido(it)) return '';
    const h = historico.find(x => x.id === it.id);
    const [selo, cls] = seloItem(it);
    const ehHeroi = it.tipo === 'heroi';
    const ehSerie = it.tipo === 'serie-pasta';
    const edsSerie = ehSerie ? edicoesDaSerie(it) : null;
    const cv = (ehHeroi || it.tipo === 'lol' || it.tipo === 'wiki') ? contagemVinculosHeroi(it) : null;
    const seloVinc = ehSerie
      ? `<span class="selo-vinculos" title="Subpasta com ${edsSerie.length} edição(ões)">📁 ${edsSerie.length} ${edsSerie.length === 1 ? 'edição' : 'edições'}</span>`
      : (cv && (ehHeroi || cv.total > 0)
        ? `<span class="selo-vinculos" title="Obras vinculadas a ${esc(it.titulo)}">📚 ${esc(cv.textoCurto)}</span>`
        : (it.edicaoNum ? `<span class="selo-vinculos">#${esc(it.edicaoNum)}</span>` : ''));
    const ehMeu = ['ext-hq', 'heroi', 'serie-pasta', 'drive', 'local'].includes(it.tipo);
    const descTxt = ehSerie
      ? `${it.heroiNome ? '🦸 ' + it.heroiNome + ' · ' : ''}📁 ${edsSerie.length} ${edsSerie.length === 1 ? 'edição' : 'edições'}`
      : ehHeroi
        ? `${it.sub ? it.sub + ' · ' : ''}📚 ${cv.textoCurto}`
        : [it.heroiNome && `🦸 ${it.heroiNome}`, it.serieNome && `📁 ${it.serieNome}${it.edicaoNum ? ' #' + it.edicaoNum : ''}`, it.desc || it.sub || ''].filter(Boolean).join(' · ');
    return `<div class="cartao ${largo ? 'largo' : ''}" data-id="${esc(it.id)}" tabindex="0">
      <div class="capa">${capaHTML(it, largo)}
        ${selo ? `<span class="selo ${cls}">${esc(selo)}</span>` : ''}
        ${seloVinc}
        <button class="acao-ler" data-ler="${esc(it.id)}" title="Ler ${esc(it.titulo)}">▶ Ler</button>
        <button class="acao-salvar ${salvos[it.id] ? 'on' : ''}" data-salvar="${esc(it.id)}" title="Salvar">🔖</button>
        ${h && h.prog > 0 ? `<div class="barra-prog"><i style="width:${Math.round(h.prog * 100)}%"></i></div>` : ''}
      </div>
      <h4>${esc(it.titulo)}</h4><button class="queue-toggle" data-queue="${esc(it.id)}" aria-pressed="${(prefs.readQueue||[]).includes(it.id)}">${(prefs.readQueue||[]).includes(it.id)?'✓ Na fila':'+ Quero ler'}</button><p>${it.localOnly ? '<span class="origem-hq">Neste dispositivo</span>' : it.storagePath ? '<span class="origem-hq">Na nuvem</span>' : ''}${esc(descTxt)}</p>
      ${ehMeu ? `<div class="cartao-acoes">
        ${ehSerie ? `<button type="button" data-add-serie="${esc(it.id)}" title="Adicionar nova edição nesta série">➕ +Ed</button>` : ''}
        <button type="button" data-editar="${esc(it.id)}" title="Editar ${esc(it.titulo)}">✏️ Editar</button>
        <button type="button" class="perigo" data-apagar="${esc(it.id)}" title="Remover ${esc(it.titulo)}">🗑</button>
      </div>` : ''}
    </div>`;
  }
  function contagem(c) {
    if (c.id === 'hqs-lol') return `${HQS_RIOT_SERIES.length} séries · 38 edições`;
    if (c.id === 'cronicas-lol') return Dados._cronicasN ? `${Dados._cronicasN} contos oficiais` : '240+ contos oficiais';
    if (c.id === 'lol') return Dados._lolN ? `${Dados._lolN} campeões (Lore + Contos)` : '170+ campeões';
    if (c.id === 'marvel') return `${HQS_ACERVO.marvel.length} HQs completas + ${VERBETES.marvel.length} heróis`;
    if (c.id === 'dc') return `${HQS_ACERVO.dc.length} HQs completas + ${VERBETES.dc.length} heróis`;
    if (c.id === 'runeterra') return `${REGIOES.length} regiões`;
    if (c.id === 'lor') return 'Milhares de cartas';
    if (c.id === 'arquivo') return `${HQS_ACERVO.arquivo.length} coleções + busca livre`;
    const loc = CONTOS.filter(x => x.colecao === c.id).length + HQS.filter(x => x.colecao === c.id).length;
    const v = (VERBETES[c.id] || []).length;
    return `${loc ? loc + ' contos · ' : ''}${v} verbetes`.replace(/ · 0 verbetes$/, '');
  }
  function cartaoColecao(c) {
    if (!universoVisivel(EQContentAccess.universe({colecao:c.id}))) return '';
    const it = { id: 'col:' + c.id, titulo: c.nome, colecao: c.id, capa: c.capa };
    if (!c.capa) {
      if (c.id === 'hqs-lol') it.capa = HQS_RIOT_SERIES[0].capa;
      if (c.id === 'cronicas-lol') it.capa = Fontes.lolImg.loading('Thresh');
      if (c.id === 'lol') it.capa = Fontes.lolImg.loading('Ahri');
      if (c.id === 'runeterra') it.capa = Fontes.lolImg.loading('Azir');
      if (c.id === 'marvel') it.capa = `https://archive.org/services/img/${HQS_ACERVO.marvel[0].ident}`;
      if (c.id === 'dc') it.capa = `https://archive.org/services/img/${HQS_ACERVO.dc[0].ident}`;
      if (c.id === 'arquivo') it.capa = `https://archive.org/services/img/${HQS_ACERVO.arquivo[0].ident}`;
    }
    return `<div class="cartao colecao-cartao" data-colecao="${c.id}" tabindex="0">
      <div class="capa">${it.capa ? `<img src="${it.capa}" alt="${esc(c.nome)}" loading="lazy" decoding="async" data-id="${it.id}" onerror="EQ.falhaCapa(this)"><span class="rotulo">${esc(c.nome)}</span>` : capaSVG(it)}</div>
      <h4>${esc(c.nome)}</h4><p>${contagem(c)}</p></div>`;
  }
  const trilho = (html) => `<div class="trilho-wrap"><button class="trilho-seta esq" data-rolar="-1">‹</button><div class="trilho">${html}</div><button class="trilho-seta dir" data-rolar="1">›</button></div>`;
  const secao = (titulo, pequeno, corpo, ver, extra = '') => `<section class="secao"><div class="secao-cab"><div>${pequeno ? `<small>${pequeno}</small>` : ''}<h3>${titulo}${extra}</h3></div>${ver ? `<button class="ver-tudo" data-colecao="${ver}">Ver tudo →</button>` : ''}</div>${corpo}</section>`;
  const carregando = (t = 'Carregando...') => `<div class="carregando">${t}</div>`;

  /* ---------------- Navegação ---------------- */
  let abaAtual = 'inicio';
  let fecharComunidade = null;
  function renderComunidade() {
    if (!Auth.usuario) return;
    fecharComunidade = EQCommunity.mount($('#aba-comunidade'), { user: Auth.usuario, api: EQAccount.api });
  }
  function ir(aba) { location.hash = aba; }
  function rota() {
    if (fecharComunidade) { fecharComunidade(); fecharComunidade = null; }
    const h = decodeURIComponent(location.hash.slice(1)) || 'inicio';
    const [aba, arg] = h.split('/');
    const alvo = ['inicio', 'busca', 'historico', 'biblioteca', 'salvos', 'colecao', 'perfil', 'comunidade'].includes(aba) ? aba : 'inicio';
    abaAtual = alvo;
    $$('.aba').forEach(a => a.classList.toggle('ativa', a.id === 'aba-' + alvo));
    $$('.nav-inferior button').forEach(b => {const active=b.dataset.ir===alvo;b.classList.toggle('ativo',active);if(active)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});
    window.scrollTo({ top: 0 });
    return ({ comunidade: renderComunidade, inicio: renderInicio, busca: renderBusca, historico: renderHistorico, biblioteca: renderBiblioteca, salvos: renderSalvos, perfil: renderPerfil, colecao: () => renderColecao(arg) })[alvo]();
  }
  window.addEventListener('hashchange', rota);
  $('#skipContent').onclick=()=>{$('#app').focus();$('#app').scrollIntoView({block:'start'});};

  /* ---------------- Início ---------------- */
  let inicioPronto = false;
  function renderInicio() {
    if (inicioFiltrado()) {
      clearInterval(destaqueTimer);
      const items = [...REG.values()].filter(it => conteudoPermitido(it) && !['heroi','wiki','regiao'].includes(it.tipo));
      $('#aba-inicio').innerHTML = `<div id="secContinuar"></div><div id="secExplorar"></div><section class="painel estante-inicio"><h2>Sua estante</h2><p>Conteúdo disponível para seu perfil e seus universos favoritos. Ajuste o que deseja ver no Perfil.</p><div class="grade">${items.map(it => cartao(it)).join('')}</div>${items.length ? '' : '<p>Nenhuma obra disponível nesta seleção.</p>'}</section>`;
      inicioPronto = false;
      renderExplorador();
      renderContinuar();
      return;
    }
    if (inicioPronto) { renderContinuar(); renderMinhasHQs(); return; }
    inicioPronto = true;
    const el = $('#aba-inicio');
    const hqsRiot = [...HQS_RIOT_SERIES.map(s => REG.get('rserie:' + s.slug)), ...HQS_RIOT_ONESHOTS.map(e => REG.get('rhq:' + e.caminho))];
    const hqsMarvel = HQS_ACERVO.marvel.map(h => REG.get('ia:' + h.ident));
    const hqsDC = HQS_ACERVO.dc.map(h => REG.get('ia:' + h.ident));
    const hqsVertigo = HQS_ACERVO.arquivo.map(h => REG.get('ia:' + h.ident));
    const interativos = [...HQS.map(h => REG.get('hq:' + h.id)), ...CONTOS.filter(c => c.interativa).map(c => REG.get('conto:' + c.id))];
    const contosMitos = CONTOS.filter(c => !c.interativa).map(c => REG.get('conto:' + c.id));

    el.innerHTML = `
      <div id="secContinuar"></div>
      <div class="destaque" id="destaque"></div>
      <div id="secExplorar"></div>
      <div id="secMinhasHQs"></div>
      <div class="painel">
        <div class="secao-cab"><div><h3>Todas as Estantes</h3><small>Acesse a estante completa de cada coleção</small></div></div>
        ${trilho(COLECOES.map(cartaoColecao).join(''))}
      </div>
      ${secao('HQs Oficiais de League of Legends', 'Marvel & Riot Games · Séries e edições completas em português', trilho(hqsRiot.map(i => cartao(i)).join('')), 'hqs-lol')}
      ${secao('HQs Completas da Marvel', 'Edições reais e integrais em português · Guerra Civil, Dinastia M, X-Men, Demolidor, Wolverine e mais', trilho(hqsMarvel.map(i => cartao(i)).join('')), 'marvel')}
      ${secao('HQs Completas da DC Comics', 'Edições reais e integrais em português · Cavaleiro das Trevas, Reino do Amanhã, Watchmen, Crise e mais', trilho(hqsDC.map(i => cartao(i)).join('')), 'dc')}
      <div id="secCronicas">${secao('Crônicas e Contos de Runeterra', 'Riot Games Universe · Histórias e acontecimentos canônicos completos', carregando('Buscando contos em Runeterra...'), 'cronicas-lol')}</div>
      <div id="secLol">${secao('Biografias & Lore dos Campeões', 'Riot Games Universe · Biografias integrais e contos de cada campeão', carregando('Invocando campeões...'), 'lol')}</div>
      ${secao('Vertigo, Mangás & Clássicos em Quadrinhos', 'Sandman, Invencível, Hellboy, Fábulas, Akira, Holy Avenger e The Walking Dead em PT-BR', trilho(hqsVertigo.map(i => cartao(i)).join('')), 'arquivo')}
      ${secao('Contos de Mitologia & Folclore', 'Histórias completas para ler ou ouvir narradas em português', trilho(contosMitos.map(i => cartao(i)).join('')))}
      ${secao('Escolha seu Caminho (Interativas)', 'HQs e aventuras ramificadas com múltiplos finais', trilho(interativos.map(i => cartao(i)).join('')), 'originais')}
      ${secao('Regiões de Runeterra', 'Dossiês oficiais, história, galerias e campeões de cada nação', trilho(REGIOES.map(r => cartao(REG.get('regiao:' + r.id), { largo: true })).join('')), 'runeterra')}
    `;
    renderContinuar();
    renderMinhasHQs();
    montarDestaque();

    Dados.cronicas().then(lista => {
      Dados._cronicasN = lista.length;
      if (!$('#secCronicas')) return;
      $('#secCronicas').innerHTML = secao('Crônicas e Contos de Runeterra', `Riot Games Universe · ${lista.length} contos e novelas completas em português`, trilho(lista.slice(0, 32).map(i => cartao(i)).join('')), 'cronicas-lol');
      $$('[data-colecao="cronicas-lol"] p').forEach(p => p.textContent = `${lista.length} contos oficiais`);
    }).catch(() => {
      if (!$('#secCronicas')) return;
      $('#secCronicas').innerHTML = secao('Crônicas e Contos de Runeterra', 'Riot Games Universe', '<div class="erro">Não foi possível carregar o catálogo de contos no momento.</div>');
    });

    Dados.lol().then(lista => {
      Dados._lolN = lista.length;
      if (!$('#secLol')) return;
      $('#secLol').innerHTML = secao('Biografias & Lore dos Campeões', `Riot Games Universe · ${lista.length} campeões com biografias completas e contos`, trilho(embaralhar(lista).slice(0, 30).map(i => cartao(i)).join('')), 'lol');
      $$('[data-colecao="lol"] p').forEach(p => p.textContent = `${lista.length} campeões (Lore + Contos)`);
    }).catch(() => {
      if (!$('#secLol')) return;
      $('#secLol').innerHTML = secao('Biografias & Lore dos Campeões', 'Data Dragon', '<div class="erro">Não foi possível conectar ao Data Dragon.</div>');
    });
  }

  function renderMinhasHQs() {
    const el = $('#secMinhasHQs'); if (!el) return;
    const locais = [...REG.values()].filter(i => i.tipo === 'local' && !externas.some(x => x.id === i.id));
    const itens = [
      ...series.map(s => REG.get(s.id) || reg(s)),
      ...externas.map(x => REG.get(x.id) || reg(x)),
      ...locais,
      ...herois.map(h => REG.get(h.id) || reg(h)),
      ...drive.map(d => REG.get(d.id) || reg(d))
    ];
    if (!itens.length) { el.innerHTML = ''; renderExplorador(); return; }
    el.innerHTML = secao('Minhas Coleções, HQs, Mangás, Lore & Heróis', `${series.length ? `${series.length} coleção(ões)/série(s) · ` : ''}${itens.length} item(ns) na sua estante`, trilho(itens.map(i => cartao(i)).join('')));
    renderExplorador();
  }

  /* =========================================================
     EXPLORADOR HIERÁRQUICO
     Universo (título) → Personagens → Histórias, Lore, HQs
     → Subpastas de Coleção/Série → Volumes (#1..#N)
     ========================================================= */
  const COLS_LOL = ['hqs-lol', 'cronicas-lol', 'lol', 'runeterra', 'lor'];
  const UNIVERSOS_BASE = (() => {
    const imgIA = (c) => HQS_ACERVO[c]?.[0] ? `https://archive.org/services/img/${HQS_ACERVO[c][0].ident}` : '';
    const lista = [{
      id: 'u-lol', nome: 'League of Legends', sub: 'Runeterra · Campeões, Crônicas, HQs oficiais e Regiões',
      cols: COLS_LOL, cor: ['#0a1428', '#c89b3c'], emblema: '⚔️', lol: true,
      img: () => Fontes.lolImg.splash('Ahri')
    }];
    COLECOES.filter(c => !COLS_LOL.includes(c.id)).forEach(c => lista.push({
      id: 'u-' + c.id, nome: c.nome.replace(/^HQs (da |de )?/, ''), sub: c.sub, cols: [c.id], cor: c.cor, emblema: c.emblema,
      img: () => c.capa || imgIA(c.id)
    }));
    return lista;
  })();
  let UNIVERSOS = [];
  function estruturaUniversos() { return catalogSync?.data.universes || EQUniverseTree.defaults(UNIVERSOS_BASE); }
  function atualizarUniversos() {
    const nodes = estruturaUniversos();
    UNIVERSOS = nodes.map(n => {
      const base = UNIVERSOS_BASE.find(b => b.id === n.id) || UNIVERSOS_BASE.find(b => b.cols.some(c=>n.cols.includes(c)));
      return {...(base || {sub:'Organize suas coleções em subpastas',cor:['#182235','#eab64c'],emblema:'📁',img:()=>''}),...n,img:()=>n.cover || (n.id==='u-mitologias'?'assets/capas/grega.jpg':base?.img()) || 'assets/universe-default.svg',lol:n.cols.includes('lol')};
    });
  }
  function pastaUniversoVisivel(u) {
    return Auth.admin || u.cols.some(c=>universoVisivel(EQContentAccess.universe({colecao:c}))) || UNIVERSOS.some(n=>n.parent===u.id&&pastaUniversoVisivel(n));
  }
  function opcoesUniversoConteudo(){
    atualizarUniversos();
    const entries=new Map(COLECOES.map(c=>[c.id,c.nome]));
    for(const u of UNIVERSOS)for(const c of u.cols)if(EQUniverseTree.isCustom(c))entries.set(c,u.nome);
    return [...entries].map(([id,nome])=>`<option value="${esc(id)}">${esc(nome)}</option>`).join('');
  }
  async function universoParaConteudo(id){
    if(!Auth.admin||catalogSync.conflict)throw new Error('Apenas o administrador pode organizar universos com a sincronização em dia.');
    let nodes=estruturaUniversos(),u=nodes.find(n=>n.id===id);if(!u)throw new Error('Selecione um universo.');
    if(!u.cols.length){nodes=nodes.map(n=>n.id===id?{...n,cols:['custom-'+id.slice(2)]}:n);EQUniverseTree.validate(nodes);catalogSync.update({universes:nodes});await catalogSync.flush();atualizarUniversos();u=nodes.find(n=>n.id===id);}
    return u;
  }
  async function abrirCriadorUniverso(id,kind){
    try{
      const u=await universoParaConteudo(id);
      bibliotecaOrigem='cloud';history.pushState(null,'','#biblioteca');
      await rota();
      for(const field of ['extColecao','novoHeroiColecao','novaSerieColecao'])$('#'+field).value=u.cols[0];
      if(kind==='hero')$('#btnToggleNovoHeroi').click();
      else if(kind==='series')$('#btnToggleNovaSerie').click();
      else $(`[data-formato="${kind==='lore'?'Lore':'HQ'}"]`).click();
      const target=kind==='hero'?$('#painelNovoHeroi'):kind==='series'?$('#painelNovaSerie'):$('#painelFormObra');
      target.scrollIntoView({block:'start'});toast('Cadastrando conteúdo em '+u.nome+'.');
    }catch(e){toast(e.message);}
  }

  function gerenciadorUniversos() {
    if(!Auth.admin)return '';
    return `<details class="painel universe-manager"><summary>⚙️ Administrar universos e subpastas</summary><p>Edite nomes, transfira pastas ou unifique conteúdos. As permissões, arquivos e históricos são preservados.</p><form id="universeForm"><label>Universo ou subpasta<select name="source"><option value="">Novo universo / subpasta</option>${UNIVERSOS.map(n=>`<option value="${n.id}">${esc(n.nome)}</option>`).join('')}</select></label><label>Nome<input name="title" maxlength="80" required placeholder="Nome do universo"></label><label>Capa (endereço HTTPS, opcional)<input name="cover" type="url" placeholder="https://.../imagem.jpg"></label><label>Dentro de (transferir para)<select name="parent"><option value="">Raiz dos universos</option>${UNIVERSOS.map(n=>`<option value="${n.id}">${esc(n.nome)}</option>`).join('')}</select></label><button class="btn btn-pri" type="submit">Salvar universo</button><label>Destino da unificação<select name="target"><option value="">Selecione um destino</option>${UNIVERSOS.map(n=>`<option value="${n.id}">${esc(n.nome)}</option>`).join('')}</select></label><button class="btn btn-sec" type="button" data-universe-merge>Unificar com o destino</button><button class="btn btn-sec" type="button" data-universe-delete>Excluir pasta vazia</button><p role="status" id="universeStatus"></p><div class="universe-content-actions"><h4>Conteúdo do universo selecionado</h4><button type="button" class="btn btn-sec" data-universe-content="hero">🦸 Criar personagem</button><button type="button" class="btn btn-sec" data-universe-content="series">📁 Criar série / subpasta</button><button type="button" class="btn btn-sec" data-universe-content="hq">📚 Adicionar HQ</button><button type="button" class="btn btn-sec" data-universe-content="lore">📜 Adicionar lore / conto</button><button type="button" class="btn btn-sec" data-universe-link>Vincular HQs existentes</button><div data-universe-links></div></div></form></details>`;
  }
  function configurarUniversos() {
    const form=$('#universeForm');if(!form||!Auth.admin)return;
    const f=form.elements;
    f.source.onchange=()=>{const n=UNIVERSOS.find(n=>n.id===f.source.value);f.title.value=n?.nome||'';f.cover.value=n?.cover||'';f.parent.value=n?.parent||'';};
    async function save(type) {
      const status=$('#universeStatus');
      try {
        if(!Auth.admin||catalogSync.conflict)throw new Error('Resolva a sincronização antes de alterar universos.');
        const id=f.source.value;
        if(type!=='edit'&&!id)throw new Error('Selecione o universo de origem.');
        const next=EQUniverseTree.change(estruturaUniversos(),{type:type==='edit'&&!id?'create':type,id:id||'u-'+crypto.randomUUID(),nome:f.title.value,cover:f.cover.value.trim(),parent:f.parent.value,target:f.target.value,used:[...externas,...drive,...herois,...series].map(it=>it.colecao)});
        if(type==='merge'&&!confirm('Unificar estas pastas? O conteúdo e as subpastas serão movidos para o destino, preservando os arquivos e acessos.'))return;
        if(type==='delete'&&!confirm('Excluir esta pasta vazia?'))return;
        form.querySelectorAll('button').forEach(b=>b.disabled=true);
        catalogSync.update({universes:next});await catalogSync.flush();
        atualizarUniversos();inicioPronto=false;Ex.uni=Ex.heroi=Ex.serie=null;
        const selectedId=type==='delete'?'':type==='merge'?f.target.value:id||next[next.length-1].id;
        renderPerfil();
        const updated=$('#universeForm');updated.closest('details').open=true;updated.elements.source.value=selectedId;updated.elements.source.onchange();
        toast('Organização dos universos salva na nuvem.');
      }catch(e){status.textContent=e.message;form.querySelectorAll('button').forEach(b=>b.disabled=false);}
    }
    form.onsubmit=e=>{e.preventDefault();save('edit');};
    form.querySelector('[data-universe-merge]').onclick=()=>save('merge');
    form.querySelector('[data-universe-delete]').onclick=()=>save('delete');
    form.querySelectorAll('[data-universe-content]').forEach(b=>b.onclick=()=>abrirCriadorUniverso(f.source.value,b.dataset.universeContent));
    form.querySelector('[data-universe-link]').onclick=()=>{
      const u=estruturaUniversos().find(n=>n.id===f.source.value);if(!u)return toast('Selecione um universo.');
      const box=form.querySelector('[data-universe-links]');
      const items=[...externas,...drive].filter(it=>!u.cols.includes(it.colecao));
      box.innerHTML=`<p>Selecione as HQs para transferir. Vínculos com personagens ou séries de outro universo serão removidos; os arquivos e o histórico serão preservados.</p><div class="universe-link-list">${items.map(it=>`<label><input type="checkbox" value="${esc(it.id)}"> ${esc(it.titulo)}</label>`).join('')||'<p>Nenhuma HQ disponível para transferir.</p>'}</div><button type="button" class="btn btn-pri" data-confirm-universe-link>Vincular selecionadas</button>`;
      box.querySelector('button').onclick=async()=>{
        const button=box.querySelector('button');button.disabled=true;
        try{
          const ids=new Set([...box.querySelectorAll('input:checked')].map(e=>e.value));if(!ids.size)throw new Error('Selecione pelo menos uma HQ.');
          const target=await universoParaConteudo(u.id);
          const move=it=>{if(!ids.has(it.id))return it;const next={...it,colecao:target.cols[0]};if(!herois.some(h=>h.id===it.heroiId&&target.cols.includes(h.colecao))){next.heroiId='';next.heroiNome='';}if(!series.some(v=>v.id===it.serieId&&target.cols.includes(v.colecao))){next.serieId='';next.serieNome='';}return next;};
          externas=externas.map(move);drive=drive.map(move);catalogSync.update({externas,drive});await catalogSync.flush();[...externas,...drive].forEach(reg);inicioPronto=false;box.textContent=ids.size+' HQ(s) vinculada(s) a '+target.nome+'.';
        }catch(e){$('#universeStatus').textContent=e.message;button.disabled=false;}
      };
    };

  }
  const Ex = { uni: null, heroi: null, serie: null, filtro: 'tudo', filtroStatus: 'todos', busca: '', chip: 'todos', mostrar: 48, _cronOk: false };

  function categoriaObra(o) { return EQContentAccess.category(o); }
  const CAT_INFO = { hq: ['🗯️', 'HQ'], manga: ['🎌', 'Mangá'], lore: ['📜', 'Lore'], historia: ['📖', 'História'] };

  function obrasDoUsuario() {
    return [
      ...externas.map(x => REG.get(x.id) || reg(x)),
      ...drive.map(d => REG.get(d.id) || reg(d)),
      ...[...REG.values()].filter(i => i.tipo === 'local' && !externas.some(x => x.id === i.id))
    ];
  }
  function universoDoItem(it) {
    if (!it) return null;
    if (it.tipo === 'lol' || it.tipo === 'riot-conto' || it.tipo === 'riot-serie' || it.tipo === 'riot-hq') return UNIVERSOS.find(u=>u.lol) || null;
    return UNIVERSOS.find(u => u.cols.includes(it.colecao)) || null;
  }

  async function personagensDoUniverso(u) {
    const vistos = new Set(); const out = [];
    const add = (it) => { if (it && !vistos.has(it.id)) { vistos.add(it.id); out.push(it); } };
    herois.forEach(h => { if (u.cols.includes(h.colecao)) add(REG.get(h.id) || reg(h)); });
    [...obrasDoUsuario(), ...series.map(s => REG.get(s.id) || reg(s))].forEach(o => {
      if (!o.heroiId) return;
      const h = REG.get(o.heroiId);
      if (h && (u.cols.includes(o.colecao) || universoDoItem(h) === u)) add(h);
    });
    if (u.lol) {
      try { (await Dados.lol()).forEach(add); } catch { }
      if (!Ex._cronOk) {
        Ex._cronOk = true;
        Dados.cronicas().then(() => { if (Ex.uni === u.id) renderExplorador(); }).catch(() => { });
      }
    }
    u.cols.forEach(c => (VERBETES[c] || []).forEach(t => add(REG.get('wiki:' + t))));
    return out;
  }

  function obrasSoltasDoUniverso(u) {
    const out = [];
    if (u.lol) {
      out.push(...HQS_RIOT_SERIES.map(s => REG.get('rserie:' + s.slug)), ...HQS_RIOT_ONESHOTS.map(e => REG.get('rhq:' + e.caminho)));
    }
    u.cols.forEach(c => {
      (HQS_ACERVO[c] || []).forEach(h => out.push(REG.get('ia:' + h.ident)));
      CONTOS.filter(x => x.colecao === c).forEach(x => out.push(REG.get('conto:' + x.id)));
      HQS.filter(x => x.colecao === c).forEach(x => out.push(REG.get('hq:' + x.id)));
    });
    obrasDoUsuario().forEach(o => { if (u.cols.includes(o.colecao) && !o.heroiId && !o.serieId) out.push(o); });
    return out.filter(Boolean);
  }
  const seriesSoltasDoUniverso = (u) => series.map(s => REG.get(s.id) || reg(s)).filter(s => u.cols.includes(s.colecao) && !s.heroiId);

  function statsUniverso(u) {
    const nSeries = series.filter(s => u.cols.includes(s.colecao)).length;
    const nUser = obrasDoUsuario().filter(o => u.cols.includes(o.colecao)).length;
    const nAcervo = obrasSoltasDoUniverso(u).length;
    let nPers = herois.filter(h => u.cols.includes(h.colecao)).length + u.cols.reduce((a, c) => a + (VERBETES[c] || []).length, 0);
    if (u.lol) nPers += Dados._lolN || 170;
    return { nPers, nSeries, nObras: Math.max(nAcervo, nUser) };
  }

  function migalhas() {
    const u = UNIVERSOS.find(x => x.id === Ex.uni);
    const h = Ex.heroi ? REG.get(Ex.heroi) : null;
    const s = Ex.serie ? REG.get(Ex.serie) : null;
    const partes = [`<button data-ex-nivel="raiz" class="${!u ? 'atual' : ''}">🌌 Universos</button>`];
    if (u) { let parent=UNIVERSOS.find(n=>n.id===u.parent);const parents=[];while(parent){parents.unshift(`<button data-ex-uni="${parent.id}">${esc(parent.nome)}</button>`);parent=UNIVERSOS.find(n=>n.id===parent.parent);}partes.push(...parents); }
    if (u) partes.push(`<button data-ex-nivel="uni" class="${!h && !s ? 'atual' : ''}">${esc(u.emblema)} ${esc(u.nome)}</button>`);
    if (h) partes.push(`<button data-ex-nivel="heroi" class="${!s ? 'atual' : ''}">🦸 ${esc(h.titulo)}</button>`);
    if (s) partes.push(`<button data-ex-nivel="serie" class="atual">📁 ${esc(s.titulo)}</button>`);
    const voltar = u ? `<button class="ex-voltar" data-ex-voltar title="Voltar um nível">←</button>` : '';
    return `<nav class="ex-migalhas">${voltar}${partes.join('<span class="sep">›</span>')}</nav>`;
  }

  function cartaoUniverso(u) {
    if (!pastaUniversoVisivel(u)) return '';
    const st = statsUniverso(u);
    const img = u.img();
    return `<button class="ex-uni" data-ex-uni="${u.id}" style="--c1:${u.cor[0]};--c2:${u.cor[1]}">
      ${img ? `<span class="ex-uni-bg" style="background-image:url('${esc(img)}'),url('assets/universe-default.svg')"></span>` : ''}
      <span class="ex-uni-vel"></span>
      <span class="ex-uni-emb">${esc(u.emblema)}</span>
      <span class="ex-uni-txt">
        <b>${esc(u.nome)}</b>
        <small>${esc(u.sub)}</small>
        <span class="ex-uni-stats">
          ${UNIVERSOS.some(n=>n.parent===u.id)?`<i>📁 ${UNIVERSOS.filter(n=>n.parent===u.id&&pastaUniversoVisivel(n)).length} subpastas</i>`:''}
          <i>👥 ${st.nPers}${u.lol && !Dados._lolN ? '+' : ''}</i>
          ${st.nSeries ? `<i>📁 ${st.nSeries}</i>` : ''}
          <i>📚 ${st.nObras}</i>
        </span>
      </span>
      <span class="ex-uni-ir">Explorar →</span>
    </button>`;
  }

  function cartaoPersonagem(it, cv) {
    if (!conteudoPermitido(it)) return '';
    const meu = it.tipo === 'heroi';
    const cats = [['🗯️', cv.hqs], ['🎌', cv.mangas], ['📜', cv.lores], ['📖', cv.historias], ['📁', cv.seriesCount]].filter(c => c[1] > 0);
    return `<div class="ex-pers ${cv.total ? 'com-obras' : ''} ${meu ? 'meu' : ''}" data-ex-heroi="${esc(it.id)}" tabindex="0">
      <div class="ex-pers-img">${capaHTML(it)}</div>
      <div class="ex-pers-brilho"></div>
      ${cv.total ? `<span class="ex-pers-qtd" title="${esc(cv.textoCurto)}">${cv.total}</span>` : ''}
      ${meu ? '<span class="ex-pers-meu">⭐ Meu</span>' : ''}
      <div class="ex-pers-info">
        <b>${esc(it.titulo)}</b>
        <small>${esc(it.sub || it.desc || '')}</small>
        ${cats.length ? `<span class="ex-pers-cats">${cats.map(c => `<i>${c[0]} ${c[1]}</i>`).join('')}</span>` : ''}
      </div>
    </div>`;
  }

  function pastaSerie(s) {
    if (!conteudoPermitido(s)) return '';
    const eds = edicoesDaSerie(s);
    const capas = [s.capa, ...eds.map(e => e.capa)].filter(Boolean).slice(0, 3);
    const lidos = eds.filter(e => (historico.find(h => h.id === e.id)?.prog || 0) >= 0.99).length;
    return `<div class="ex-pasta" data-ex-serie="${esc(s.id)}" tabindex="0">
      <div class="ex-pasta-pilha">
        ${capas.length ? capas.map((c, i) => `<img src="${esc(c)}" alt="" loading="lazy" style="--i:${i}" onerror="this.remove()">`).reverse().join('') : `<div class="ex-pasta-vazia">${capaSVG(s)}</div>`}
        <span class="ex-pasta-aba">📁</span>
      </div>
      <div class="ex-pasta-info">
        <b>${esc(s.titulo)}</b>
        <small>${eds.length} ${eds.length === 1 ? 'volume' : 'volumes'}${eds.length ? ` · #${eds[0].edicaoNum || 1}–#${eds[eds.length - 1].edicaoNum || eds.length}` : ''}</small>
        ${eds.length ? `<div class="ex-pasta-prog"><i style="width:${Math.round(lidos / eds.length * 100)}%"></i></div>` : ''}
      </div>
    </div>`;
  }

  function cartaoVolume(ed, i) {
    if (!conteudoPermitido(ed)) return '';
    const h = historico.find(x => x.id === ed.id);
    const prog = Math.round((h?.prog || 0) * 100);
    const cat = CAT_INFO[categoriaObra(ed)];
    const num = ed.edicaoNum || i + 1;
    return `<div class="ex-vol ${prog >= 99 ? 'lido' : ''}" draggable="true" data-vol-id="${esc(ed.id)}" data-vol-idx="${i}" data-ler="${esc(ed.id)}" tabindex="0" style="--d:${Math.min(i, 20) * 35}ms">
      <div class="ex-vol-capa">${capaHTML(ed)}
        <span class="ex-vol-num">#${esc(num)}</span>
        ${prog >= 99 ? '<span class="ex-vol-ok">✓ Lido</span>' : ''}
        <span class="ex-vol-play">▶</span>
        ${prog > 0 ? `<div class="barra-prog"><i style="width:${prog}%"></i></div>` : ''}
      </div>
      <b>${esc(ed.titulo)}</b>
      <small>${cat[0]} ${esc(ed.formatoObra || cat[1])}${ed.paginas?.length ? ` · ${ed.paginas.length} págs.` : (typeof ed.paginas === 'number' && ed.paginas ? ` · ${ed.paginas} págs.` : '')}</small>
      <div class="ex-vol-acoes">
        <button type="button" data-ex-info="${esc(ed.id)}" title="Detalhes">ⓘ</button>
        ${['ext-hq', 'drive', 'local'].includes(ed.tipo) ? `<button type="button" data-editar="${esc(ed.id)}" title="Editar">✏️</button>` : ''}
      </div>
    </div>`;
  }

  async function renderExplorador() {
    const el = $('#secExplorar'); if (!el) return;
    atualizarUniversos();
    const u = UNIVERSOS.find(x => x.id === Ex.uni && pastaUniversoVisivel(x));
    let corpo = '';

    if (!u) {
      corpo = `<div class="ex-cab">
          <div><small>Navegue pela hierarquia</small><h3>🌌 Explorar por Universo</h3>
          <p>Escolha um título → um personagem → suas HQs, Lore e Histórias → as Coleções com todos os volumes.</p></div>
        </div>
        <div class="ex-unis">${UNIVERSOS.filter(n=>!n.parent).map(cartaoUniverso).join('')}</div>`;
    } else if (Ex.serie) {
      const s = REG.get(Ex.serie);
      if (!s || !conteudoPermitido(s)) { Ex.serie = null; return renderExplorador(); }
      const todasEds = edicoesDaSerie(s).filter(it => conteudoPermitido(it));
      const capa = s.capa || todasEds[0]?.capa || '';
      const lidos = todasEds.filter(e => (historico.find(h => h.id === e.id)?.prog || 0) >= 0.99).length;
      const emAnd = todasEds.filter(e => { const p = historico.find(h => h.id === e.id)?.prog || 0; return p > 0 && p < 0.99; }).length;
      const naoLidos = todasEds.filter(e => (historico.find(h => h.id === e.id)?.prog || 0) === 0).length;
      const prox = todasEds.find(e => (historico.find(h => h.id === e.id)?.prog || 0) < 0.99) || todasEds[0];

      const fs = Ex.filtroStatus || 'todos';
      const edsFiltradas = todasEds.filter(e => {
        const p = historico.find(h => h.id === e.id)?.prog || 0;
        if (fs === 'andamento') return p > 0 && p < 0.99;
        if (fs === 'concluido') return p >= 0.99;
        if (fs === 'nao_lidos') return p === 0;
        return true;
      });

      const filtrosStatusHTML = `
        <div class="ex-filtro-status">
          <button class="${fs === 'todos' ? 'ativo' : ''}" data-ex-status="todos">Todos (${todasEds.length})</button>
          <button class="${fs === 'andamento' ? 'ativo' : ''}" data-ex-status="andamento">⚡ Em andamento (${emAnd})</button>
          <button class="${fs === 'concluido' ? 'ativo' : ''}" data-ex-status="concluido">✓ Concluídos (${lidos})</button>
          <button class="${fs === 'nao_lidos' ? 'ativo' : ''}" data-ex-status="nao_lidos">📖 Não lidos (${naoLidos})</button>
        </div>`;

      corpo = `<div class="ex-hero ex-hero-serie" style="--c2:${u.cor[1]}">
          ${capa ? `<div class="ex-hero-bg" style="background-image:url('${esc(capa)}')"></div>` : ''}
          <div class="ex-hero-capa">${capaHTML({ ...s, capa })}</div>
          <div class="ex-hero-info">
            <span class="etiqueta">📁 Coleção / Série${s.heroiNome ? ` · 🦸 ${esc(s.heroiNome)}` : ''}</span>
            <h2>${esc(s.titulo)}</h2>
            <p>${esc(s.resumo || s.sub || '')}</p>
            <div class="heroi-contadores">
              <span class="contador-pill destaque-pill">📚 Volumes: <b>${todasEds.length}</b></span>
              <span class="contador-pill">✓ Lidos: <b>${lidos}</b></span>
              ${emAnd ? `<span class="contador-pill">⚡ Lendo: <b>${emAnd}</b></span>` : ''}
            </div>
            <div class="ex-prog-serie"><i style="width:${todasEds.length ? Math.round(lidos / todasEds.length * 100) : 0}%"></i></div>
            <div class="destaque-botoes">
              ${prox ? `<button class="btn btn-pri" data-ler="${esc(prox.id)}">▶ ${lidos ? 'Continuar' : 'Começar'} pelo #${esc(prox.edicaoNum || 1)}</button>` : ''}
              <button class="btn btn-sec" data-add-serie="${esc(s.id)}">➕ Adicionar volume</button>
              <button class="btn btn-sec" data-editar="${esc(s.id)}">✏️ Editar</button>
            </div>
          </div>
        </div>
        ${todasEds.length
          ? `${filtrosStatusHTML}<div class="ex-vols">${edsFiltradas.length ? edsFiltradas.map(cartaoVolume).join('') : '<div class="vazio">Nenhum volume nesta categoria de filtro.</div>'}</div>`
          : `<div class="vazio">Esta subpasta ainda não tem volumes.<br><br><button class="btn btn-pri" data-add-serie="${esc(s.id)}">➕ Adicionar o Volume #1</button></div>`}`;
    } else if (Ex.heroi) {
      const h = REG.get(Ex.heroi);
      if (!h || !conteudoPermitido(h)) { Ex.heroi = null; return renderExplorador(); }
      const cv = contagemVinculosHeroi(h);
      const idsS = new Set(cv.seriesH.map(s => s.id));
      let obras = cv.obras.filter(o => !(o.serieId && idsS.has(o.serieId)));
      if (['lol', 'wiki'].includes(h.tipo)) obras = [h, ...obras];
      const porCat = { hq: [], manga: [], lore: [], historia: [] };
      obras = obras.filter(o => conteudoPermitido(o));
      obras.forEach(o => porCat[categoriaObra(o)].push(o));
      const abas = [
        ['tudo', '✨ Tudo', obras.length + cv.seriesH.length],
        ['colecoes', '📁 Coleções', cv.seriesH.length],
        ['hq', '🗯️ HQs', porCat.hq.length],
        ['manga', '🎌 Mangás', porCat.manga.length],
        ['lore', '📜 Lore', porCat.lore.length],
        ['historia', '📖 Histórias', porCat.historia.length]
      ].filter(a => a[0] === 'tudo' || a[2] > 0);
      if (!abas.some(a => a[0] === Ex.filtro)) Ex.filtro = 'tudo';
      const f = Ex.filtro;
      const bloco = (titulo, itens) => itens.length ? `<div class="ex-bloco"><h4>${titulo} <em>${itens.length}</em></h4><div class="grade">${itens.map(i => cartao(i)).join('')}</div></div>` : '';
      const blocoSeries = (f === 'tudo' || f === 'colecoes') && cv.seriesH.length
        ? `<div class="ex-bloco"><h4>📁 Coleções & Séries <em>${cv.seriesH.length}</em></h4><div class="ex-pastas">${cv.seriesH.map(pastaSerie).join('')}</div></div>` : '';
      const conteudo = blocoSeries +
        ((f === 'tudo' || f === 'hq') ? bloco('🗯️ HQs', porCat.hq) : '') +
        ((f === 'tudo' || f === 'manga') ? bloco('🎌 Mangás', porCat.manga) : '') +
        ((f === 'tudo' || f === 'lore') ? bloco('📜 Lore', porCat.lore) : '') +
        ((f === 'tudo' || f === 'historia') ? bloco('📖 Histórias & Contos', porCat.historia) : '');
      corpo = `<div class="ex-hero" style="--c2:${u.cor[1]}">
          <div class="ex-hero-bg" style="background-image:url('${esc(h.banner || h.capa || '')}')"></div>
          <div class="ex-hero-capa redonda">${capaHTML(h)}</div>
          <div class="ex-hero-info">
            <span class="etiqueta">${esc(u.emblema)} ${esc(u.nome)} · Personagem</span>
            <h2>${esc(h.titulo)}</h2>
            <p>${esc(h.sub || h.desc || '')}</p>
            ${cv.badgesHTML}
            <div class="destaque-botoes">
              ${['lol', 'wiki'].includes(h.tipo) ? `<button class="btn btn-pri" data-ler="${esc(h.id)}">📜 Ler Lore completa</button>` : ''}
              <button class="btn btn-sec" data-ex-info="${esc(h.id)}">ⓘ Ficha</button>
              <button class="btn btn-sec" data-add-heroi="${esc(h.id)}">➕ Vincular HQ / Lore</button>
              ${h.tipo === 'heroi' ? `<button class="btn btn-sec" data-editar="${esc(h.id)}">✏️ Editar</button>` : ''}
            </div>
          </div>
        </div>
        <div class="ex-abas">${abas.map(a => `<button class="${a[0] === f ? 'ativo' : ''}" data-ex-filtro="${a[0]}">${a[1]} <em>${a[2]}</em></button>`).join('')}</div>
        <div class="ex-conteudo">${conteudo || `<div class="vazio">Nenhuma história vinculada a ${esc(h.titulo)} ainda.<br><br><button class="btn btn-pri" data-add-heroi="${esc(h.id)}">➕ Vincular a primeira HQ, Lore ou História</button></div>`}</div>`;
    } else {
      el.innerHTML = `<div class="ex-caixa">${migalhas()}<div class="ex-palco">${carregando(`Abrindo ${esc(u.nome)}...`)}</div></div>`;
      const pers = await personagensDoUniverso(u);
      if (Ex.uni !== u.id || Ex.heroi || Ex.serie) return;
      const lista = pers.filter(it => conteudoPermitido(it)).map(it => ({ it, cv: contagemVinculosHeroi(it) }));
      lista.sort((a, b) => ((b.it.tipo === 'heroi') * 2 + (b.cv.total > 0)) - ((a.it.tipo === 'heroi') * 2 + (a.cv.total > 0)) || a.it.titulo.localeCompare(b.it.titulo));
      const q = norm(Ex.busca);
      const filtrada = lista.filter(({ it, cv }) =>
        (Ex.chip === 'todos' || (Ex.chip === 'com' && cv.total > 0) || (Ex.chip === 'meus' && it.tipo === 'heroi')) &&
        (!q || norm(`${it.titulo} ${it.sub || ''}`).includes(q)));
      const nCom = lista.filter(x => x.cv.total > 0).length;
      const nMeus = lista.filter(x => x.it.tipo === 'heroi').length;
      const soltasS = seriesSoltasDoUniverso(u).filter(it => conteudoPermitido(it));
      const soltasO = obrasSoltasDoUniverso(u).filter(it => conteudoPermitido(it));
      const img = u.img();
      corpo = `<div class="ex-hero ex-hero-uni" style="--c1:${u.cor[0]};--c2:${u.cor[1]}">
          ${img ? `<div class="ex-hero-bg" style="background-image:url('${esc(img)}'),url('assets/universe-default.svg')"></div>` : ''}
          <div class="ex-hero-emb">${esc(u.emblema)}</div>
          <div class="ex-hero-info">
            <span class="etiqueta">Universo${UNIVERSOS.some(n=>n.parent===u.id)?' · Com subpastas':''}</span>
            <h2>${esc(u.nome)}</h2>
            <p>${esc(u.sub)}</p>
            <div class="heroi-contadores">
              <span class="contador-pill destaque-pill">👥 Personagens: <b>${lista.length}</b></span>
              <span class="contador-pill">📚 Com histórias: <b>${nCom}</b></span>
              ${soltasS.length ? `<span class="contador-pill">📁 Coleções: <b>${soltasS.length}</b></span>` : ''}
              <span class="contador-pill">🗯️ Obras: <b>${soltasO.length}</b></span>
            </div>
            <div class="destaque-botoes">${Auth.admin?`<button class="btn btn-pri" data-universe-create="${u.id}" data-kind="hq">➕ HQ / lore</button><button class="btn btn-sec" data-universe-create="${u.id}" data-kind="hero">🦸 Personagem</button><button class="btn btn-sec" data-universe-create="${u.id}" data-kind="series">📁 Série</button>`:''}${u.cols.filter(c=>universoVisivel(EQContentAccess.universe({colecao:c}))).map(c=>`<button class="btn btn-sec" data-colecao="${c}">📚 ${esc(col(c)?.nome||c)}</button>`).join('')}</div>
          </div>
        </div>
        ${lista.length ? `<div class="ex-bloco">
          <div class="ex-ferramentas">
            <h4>👥 Personagens <em>${filtrada.length}</em></h4>
            <div class="ex-chips">
              <button class="${Ex.chip === 'todos' ? 'ativo' : ''}" data-ex-chip="todos">Todos</button>
              ${nCom ? `<button class="${Ex.chip === 'com' ? 'ativo' : ''}" data-ex-chip="com">📚 Com histórias (${nCom})</button>` : ''}
              ${nMeus ? `<button class="${Ex.chip === 'meus' ? 'ativo' : ''}" data-ex-chip="meus">⭐ Meus (${nMeus})</button>` : ''}
            </div>
            <input type="search" class="ex-busca" id="exBusca" placeholder="🔎 Buscar personagem..." value="${esc(Ex.busca)}">
          </div>
          <div class="ex-perss">${filtrada.slice(0, Ex.mostrar).map(x => cartaoPersonagem(x.it, x.cv)).join('') || '<div class="vazio">Nenhum personagem encontrado.</div>'}</div>
          ${filtrada.length > Ex.mostrar ? `<div style="text-align:center;margin-top:18px"><button class="btn btn-sec" data-ex-mais>Mostrar mais (${filtrada.length - Ex.mostrar})</button></div>` : ''}
        </div>` : ''}
        ${soltasS.length ? `<div class="ex-bloco"><h4>📁 Coleções & Séries <em>${soltasS.length}</em></h4><div class="ex-pastas">${soltasS.map(pastaSerie).join('')}</div></div>` : ''}
        ${soltasO.length ? `<div class="ex-bloco"><h4>🗯️ HQs, Lore & Histórias do Universo <em>${soltasO.length}</em></h4>${trilho(soltasO.map(i => cartao(i)).join(''))}</div>` : ''}`;
      const wikis = filtrada.slice(0, Ex.mostrar).map(x => x.it).filter(i => i.tipo === 'wiki' && !i.thumbOk);
      if (wikis.length) aplicarMiniaturas(wikis).then(() => {
        wikis.forEach(w => { const c = $(`.ex-pers[data-ex-heroi="${CSS.escape(w.id)}"] .ex-pers-img`); if (c && w.capa && c.querySelector('svg.gerada')) c.innerHTML = capaHTML(w); });
      }).catch(() => { });
    }

    el.innerHTML = `<div class="ex-caixa ${u ? 'aberto' : ''}">${migalhas()}${Auth.admin?'<button class="btn btn-sec" data-ir="perfil">⚙️ Administrar universos</button>':''}<div class="ex-palco ex-entrar">${u&&!Ex.heroi&&!Ex.serie?`<div class="ex-unis">${UNIVERSOS.filter(n=>n.parent===u.id).map(cartaoUniverso).join('')}</div>`:''}${corpo}</div></div>`;
    const busca = $('#exBusca');
    if (busca) {
      busca.oninput = (e) => {
        Ex.busca = e.target.value; Ex.mostrar = 48;
        clearTimeout(busca._t);
        busca._t = setTimeout(async () => { await renderExplorador(); const b = $('#exBusca'); if (b) { b.focus(); b.setSelectionRange(b.value.length, b.value.length); } }, 220);
      };
    }
  }

  function exNavegar(mut) {
    Object.assign(Ex, mut);
    renderExplorador().then(() => {
      const el = $('#secExplorar');
      if (el && el.getBoundingClientRect().top < 60) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  document.addEventListener('click', e => {
    if (!Auth.admin && e.target.closest('[data-editar], [data-apagar], [data-add-serie], [data-add-heroi]')) {
      e.preventDefault(); e.stopImmediatePropagation();
      toast('Somente o administrador pode editar ou excluir conteúdo.');
    }
  }, true);

  // Cliques do Explorador (tratados antes do manipulador global)
  document.addEventListener('click', (e) => {
    const t = e.target;
    if (!t.closest || !t.closest('#secExplorar')) return;
    const pare = () => { e.stopPropagation(); e.preventDefault(); };
    const create=t.closest('[data-universe-create]');if(create){pare();return abrirCriadorUniverso(create.dataset.universeCreate,create.dataset.kind);}
    const ler = t.closest('[data-ler]');
    if (ler) {
      pare();
      if (leitorAberto()) fecharLeitores();
      return abrirLeitura(ler.dataset.ler, ler.dataset.cap != null ? +ler.dataset.cap : undefined);
    }
    const editar = t.closest('[data-editar]');
    if (editar) {
      pare();
      itemParaEditar = editar.dataset.editar;
      fecharCamada();
      if (leitorAberto()) fecharLeitores();
      if (abaAtual === 'biblioteca') renderBiblioteca();
      else ir('biblioteca');
      return;
    }
    const uni = t.closest('[data-ex-uni]');
    if (uni) { pare(); return exNavegar({ uni: uni.dataset.exUni, heroi: null, serie: null, busca: '', chip: 'todos', mostrar: 48, filtro: 'tudo' }); }
    const pers = t.closest('[data-ex-heroi]');
    if (pers) { pare(); return exNavegar({ heroi: pers.dataset.exHeroi, serie: null, filtro: 'tudo' }); }
    const ser = t.closest('[data-ex-serie]');
    if (ser) {
      pare();
      const s = REG.get(ser.dataset.exSerie);
      const mut = { serie: ser.dataset.exSerie };
      if (!Ex.uni) mut.uni = (universoDoItem(s) || UNIVERSOS[0]).id;
      return exNavegar(mut);
    }
    const info = t.closest('[data-ex-info]');
    if (info) { pare(); return abrirDetalhe(info.dataset.exInfo); }
    const filtro = t.closest('[data-ex-filtro]');
    if (filtro) { pare(); return exNavegar({ filtro: filtro.dataset.exFiltro }); }
    const chip = t.closest('[data-ex-chip]');
    if (chip) { pare(); return exNavegar({ chip: chip.dataset.exChip, mostrar: 48 }); }
    const statusBtn = t.closest('[data-ex-status]');
    if (statusBtn) { pare(); return exNavegar({ filtroStatus: statusBtn.dataset.exStatus }); }
    if (t.closest('[data-ex-mais]')) { pare(); Ex.mostrar += 48; return renderExplorador(); }
    if (t.closest('[data-ex-voltar]')) {
      pare();
      if (Ex.serie) return exNavegar({ serie: null });
      if (Ex.heroi) return exNavegar({ heroi: null });
      return exNavegar({ uni: UNIVERSOS.find(n=>n.id===Ex.uni)?.parent || null });
    }
    const nivel = t.closest('[data-ex-nivel]');
    if (nivel) {
      pare();
      const n = nivel.dataset.exNivel;
      if (n === 'raiz') return exNavegar({ uni: null, heroi: null, serie: null });
      if (n === 'uni') return exNavegar({ heroi: null, serie: null });
      if (n === 'heroi') return exNavegar({ serie: null });
    }
  }, true);

  // Drag & Drop para reordenar volumes de 1 a N dentro da Coleção/Série
  let volArrastadoId = null;
  document.addEventListener('dragstart', (e) => {
    const vol = e.target.closest?.('.ex-vol[data-vol-id]');
    if (!vol) return;
    volArrastadoId = vol.dataset.volId;
    vol.classList.add('arrastando');
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', volArrastadoId); } catch {}
  });
  document.addEventListener('dragend', (e) => {
    const vol = e.target.closest?.('.ex-vol[data-vol-id]');
    if (vol) vol.classList.remove('arrastando');
    $$('.ex-vol.sobre-drop').forEach(el => el.classList.remove('sobre-drop'));
    volArrastadoId = null;
  });
  document.addEventListener('dragover', (e) => {
    const vol = e.target.closest?.('.ex-vol[data-vol-id]');
    if (!vol || !volArrastadoId || vol.dataset.volId === volArrastadoId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    vol.classList.add('sobre-drop');
  });
  document.addEventListener('dragleave', (e) => {
    const vol = e.target.closest?.('.ex-vol[data-vol-id]');
    if (vol) vol.classList.remove('sobre-drop');
  });
  document.addEventListener('drop', async (e) => {
    const volAlvo = e.target.closest?.('.ex-vol[data-vol-id]');
    if (!volAlvo || !volArrastadoId || !Ex.serie) return;
    e.preventDefault();
    volAlvo.classList.remove('sobre-drop');
    const alvoId = volAlvo.dataset.volId;
    if (alvoId === volArrastadoId) return;

    const serieObj = REG.get(Ex.serie);
    if (!serieObj) return;
    const lista = edicoesDaSerie(serieObj);
    const idxOrig = lista.findIndex(x => x.id === volArrastadoId);
    const idxDest = lista.findIndex(x => x.id === alvoId);
    if (idxOrig === -1 || idxDest === -1) return;

    const [removido] = lista.splice(idxOrig, 1);
    lista.splice(idxDest, 0, removido);

    for (let k = 0; k < lista.length; k++) {
      const ed = lista[k];
      ed.edicaoNum = k + 1;
      reg(ed);
      if (ed.id.startsWith('local:')) {
        const shared = externas.find(x => x.id === ed.id);
        if (shared) shared.edicaoNum = k + 1;
        const itemBD = await BD.pegar(ed.id);
        if (itemBD) { itemBD.edicaoNum = k + 1; await BD.salvar(itemBD); }
      } else if (ed.id.startsWith('ext:')) {
        const itemExt = externas.find(x => x.id === ed.id);
        if (itemExt) itemExt.edicaoNum = k + 1;
      }
    }
    Store.set('externas', externas);
    toast('Ordem dos volumes reordenada com sucesso!');
    renderExplorador();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    const alvo = e.target.closest?.('#secExplorar [data-ex-heroi], #secExplorar [data-ex-serie], #secExplorar .ex-vol');
    if (alvo) alvo.click();
  });

  // Reinicia as abas/níveis abertos do Explorador e volta ao topo do Início
  function reiniciarInicio() {
    Object.assign(Ex, { uni: null, heroi: null, serie: null, filtro: 'tudo', filtroStatus: 'todos', busca: '', chip: 'todos', mostrar: 48 });
    fecharCamada();
    if (leitorAberto()) fecharLeitores();
    $$('#aba-inicio .trilho').forEach(tr => { tr.scrollLeft = 0; });
    renderExplorador();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.addEventListener('click', (e) => {
    const b = e.target.closest?.('[data-ir="inicio"]');
    if (!b) return;
    e.stopPropagation(); e.preventDefault();
    reiniciarInicio();
    if (abaAtual !== 'inicio' || location.hash.replace('#', '') !== 'inicio') ir('inicio');
  }, true);

  let destaqueTimer = null;
  function montarDestaque() {
    const el = $('#destaque'); if (!el) return;
    const slides = [
      { it: REG.get('rserie:lux'), img: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/57d1e7d4df30962a4617f613d89a3c7d02fa45de-712x1079.jpg', etiqueta: 'HQ Oficial · Marvel & Riot Games', texto: HQS_RIOT_SERIES[0].resumo },
      { it: REG.get('ia:guerra-civil-marvel-deluxe'), img: 'https://archive.org/services/img/guerra-civil-marvel-deluxe', etiqueta: 'HQ Completa em Português · Marvel Deluxe', texto: HQS_ACERVO.marvel[0].resumo },
      { it: REG.get('ia:reino-do-amanha-ed.-definitiva-panini'), img: 'https://archive.org/services/img/reino-do-amanha-ed.-definitiva-panini', etiqueta: 'HQ Completa em Português · DC Definitiva', texto: HQS_ACERVO.dc[1].resumo },
      { it: REG.get('rserie:zed'), img: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/e929640c1a137ed2a4c7143b5a69d5bc5e713019-712x1080.jpg', etiqueta: 'HQ Oficial · Universo League of Legends', texto: HQS_RIOT_SERIES[1].resumo },
      { it: REG.get('ia:cavaleiro-das-trevas-edicao-definitiva'), img: 'https://archive.org/services/img/cavaleiro-das-trevas-edicao-definitiva', etiqueta: 'Obra-Prima DC Comics · Frank Miller', texto: HQS_ACERVO.dc[0].resumo },
      { it: REG.get('hq:guardia-1'), img: 'assets/paineis/batalha.jpg', etiqueta: 'HQ Interativa Original', texto: HQS[0].resumo }
    ].filter(s => s.it);

    // Se houver leitura em andamento, adiciona como 1º slide do banner
    const emAndamento = historico.find(h => h.prog > 0 && h.prog < 0.99 && REG.get(h.id));
    if (emAndamento) {
      const itAnd = REG.get(emAndamento.id);
      if (itAnd) {
        const pct = Math.round(emAndamento.prog * 100);
        slides.unshift({
          it: itAnd,
          img: itAnd.banner || itAnd.capa || 'assets/paineis/batalha.jpg',
          etiqueta: `⚡ Continuar de Onde Parou · ${pct}% Concluído`,
          texto: emAndamento.detalhe ? `Você parou na ${emAndamento.detalhe}. Clique para continuar sua leitura imediatamente!` : (itAnd.resumo || 'Retome sua história de onde parou.'),
          continuar: true
        });
      }
    }

    el.innerHTML = slides.map((s, i) => `
      <div class="destaque-slide ${i === 0 ? 'ativo' : ''}">
        <div class="destaque-img" style="background-image:url('${s.img}')"></div>
        <div class="destaque-info">
          <span class="etiqueta">${esc(s.etiqueta)}</span>
          <h1>${esc(s.it.titulo)}</h1><h2>${esc(s.it.sub || '')}</h2>
          <p>${esc(s.texto || '')}</p>
          <div class="destaque-botoes">
            <button class="btn btn-pri" data-ler="${esc(s.it.id)}">▶ ${s.continuar ? 'Continuar lendo' : 'Ler agora'}</button>
            <button class="btn btn-sec" data-id="${esc(s.it.id)}">ⓘ Detalhes & Edições</button>
            <button class="btn btn-sec ${salvos[s.it.id] ? 'ativo' : ''}" data-salvar="${esc(s.it.id)}">🔖 Salvar</button>
          </div>
        </div>
      </div>`).join('') + `<div class="destaque-pontos">${slides.map((_, i) => `<button data-slide="${i}" class="${i === 0 ? 'ativo' : ''}"></button>`).join('')}</div>`;
    let atual = 0;
    const mostrar = (i) => {
      atual = (i + slides.length) % slides.length;
      $$('.destaque-slide', el).forEach((s, k) => s.classList.toggle('ativo', k === atual));
      $$('.destaque-pontos button', el).forEach((s, k) => s.classList.toggle('ativo', k === atual));
    };
    el.onclick = (e) => { const b = e.target.closest('[data-slide]'); if (b) { mostrar(+b.dataset.slide); reiniciar(); } };
    const reiniciar = () => { clearInterval(destaqueTimer); destaqueTimer = setInterval(() => { if (abaAtual==='inicio'&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches&&!el.matches(':hover')) mostrar(atual + 1); }, 7000); };
    reiniciar();
  }

  function renderContinuar() {
    const el = $('#secContinuar'); if (!el) return;
    const lista = historico.filter(h => h.prog < 0.99).slice(0, 10);
    if (!lista.length) { el.innerHTML = ''; return; }
    el.innerHTML = secao('Continuar lendo', '', `<div class="continuar">${lista.map(itemContinuar).join('')}</div>`, null, ` <em>(Mostrando últimas ${lista.length} abertas)</em>`);
  }
  function itemContinuar(h) {
    const it = REG.get(h.id) || reg(h.item || h);
    if (!conteudoPermitido(it)) return '';
    return `<div class="cont-item" data-ler="${esc(h.id)}">
      <div class="mini">${capaHTML(it)}</div>
      <div class="info"><b>${esc(it.titulo)}</b><small>${esc(h.rotulo || '')}</small>
        <div class="prog"><i style="width:${Math.round((h.prog || 0) * 100)}%"></i></div>
        <div class="rodape"><span>${h.prog >= 0.99 ? 'Concluído' : 'Em andamento'} · ${Math.round((h.prog || 0) * 100)}%</span><span>▶ Continuar</span></div>
      </div>
      <button class="remover" data-remover-hist="${esc(h.id)}" title="Remover">✕</button>
    </div>`;
  }

  /* ---------------- Coleção ---------------- */
  async function renderColecao(id) {
    if (inicioFiltrado()) {
      const items = [...REG.values()].filter(it => it.colecao === id && conteudoPermitido(it));
      $('#aba-colecao').innerHTML = `<h2>${esc(col(id)?.nome || 'Coleção')}</h2><div class="grade">${items.map(it => cartao(it)).join('')}</div>`;
      return;
    }
    if (!universoVisivel(EQContentAccess.universe({colecao:id}))) { $('#aba-colecao').innerHTML = '<p>Universo indisponível ou oculto nas preferências.</p>'; return; }
    const c = col(id); const el = $('#aba-colecao');
    if (!c) { el.innerHTML = '<div class="vazio">Coleção não encontrada.</div>'; return; }
    const fundoImg = c.capa || (id === 'hqs-lol' ? HQS_RIOT_SERIES[0].capa : id === 'lol' ? Fontes.lolImg.splash('Ahri') : id === 'cronicas-lol' ? Fontes.lolImg.splash('Thresh') : id === 'runeterra' ? Fontes.lolImg.splash('Azir') : '');
    el.innerHTML = `
      <button class="btn btn-sec voltar" onclick="history.back()">← Voltar</button>
      <div class="cab-colecao">${fundoImg ? `<div class="fundo" style="background-image:url('${fundoImg}')"></div>` : ''}
        <div class="capa">${c.capa ? `<img src="${c.capa}" alt="">` : capaSVG({ id: 'col:' + id, titulo: c.nome, colecao: id })}</div>
        <div><small class="ver-tudo">${esc(c.fonte)}</small><h2>${esc(c.nome)}</h2><p>${esc(c.sub)}</p><p style="margin-top:6px;color:var(--txt2);font-size:13px">${contagem(c)}</p></div>
      </div>
      <div id="colCorpo">${carregando()}</div>`;
    const corpo = $('#colCorpo');
    try {
      if (id === 'hqs-lol') return colecaoHQsLoL(corpo);
      if (id === 'cronicas-lol') return colecaoCronicasLoL(corpo);
      if (id === 'lol') return colecaoLol(corpo);
      if (id === 'runeterra') { corpo.innerHTML = `<div class="grade larga">${REGIOES.map(r => cartao(REG.get('regiao:' + r.id), { largo: true })).join('')}</div>`; return; }
      if (id === 'lor') return colecaoLor(corpo);
      if (id === 'arquivo') return colecaoArquivo(corpo);
      if (id === 'originais') {
        const serCol = series.filter(s => s.colecao === 'originais').map(s => REG.get(s.id) || reg(s));
        const extCol = externas.filter(x => x.colecao === 'originais').map(x => REG.get(x.id) || reg(x));
        const heroisCol = herois.filter(h => h.colecao === 'originais').map(h => REG.get(h.id) || reg(h));
        const it = [...serCol, ...extCol, ...heroisCol, ...HQS.map(h => REG.get('hq:' + h.id)), ...CONTOS.filter(x => x.interativa).map(x => REG.get('conto:' + x.id))];
        corpo.innerHTML = secao('HQs e histórias interativas', 'Suas escolhas mudam o final', `<div class="grade">${it.map(i => cartao(i)).join('')}</div>`);
        return;
      }
      const serCol = series.filter(s => s.colecao === id).map(s => REG.get(s.id) || reg(s));
      const extCol = externas.filter(x => x.colecao === id).map(x => REG.get(x.id) || reg(x));
      const heroisCol = herois.filter(h => h.colecao === id).map(h => REG.get(h.id) || reg(h));
      const hqsAcervo = [...serCol, ...extCol, ...(HQS_ACERVO[id] || []).map(h => REG.get('ia:' + h.ident))];
      const contos = CONTOS.filter(x => x.colecao === id).map(x => REG.get('conto:' + x.id));
      const verb = [...heroisCol, ...(VERBETES[id] || []).map(t => REG.get('wiki:' + t))];
      corpo.innerHTML =
        (serCol.length ? secao(`📁 Coleções & Séries (${serCol.length})`, 'Subpastas com edições numeradas em sequência', `<div class="grade">${serCol.map(i => cartao(i)).join('')}</div>`) : '') +
        (hqsAcervo.length ? secao(`HQs, Mangás & Lore em Português (${hqsAcervo.length})`, 'Edições completas para ler no leitor nativo', `<div class="grade">${hqsAcervo.map(i => cartao(i)).join('')}</div>`) : '') +
        (contos.length ? secao('Contos Completos & Aventuras Interativas', 'Narrativas completas em capítulos para ler ou ouvir', `<div class="grade">${contos.map(i => cartao(i)).join('')}</div>`) : '') +
        secao('Enciclopédia & Personagens / Heróis', 'História cronológica, arcos, heróis cadastrados e origens', `<div class="campo" style="margin-bottom:16px"><input type="search" id="filtroVerb" placeholder="Filtrar personagens ou temas..."></div><div class="grade" id="gradeVerb">${verb.map(i => cartao(i)).join('')}</div>`);
      $('#filtroVerb').oninput = (e) => { const q = norm(e.target.value); $$('#gradeVerb .cartao').forEach(cd => cd.style.display = norm(cd.textContent).includes(q) ? '' : 'none'); };
      aplicarMiniaturas(verb);
    } catch (e) { corpo.innerHTML = `<div class="erro">Erro ao carregar: ${esc(e.message)}</div>`; }
  }

  async function colecaoHQsLoL(corpo) {
    const serLoL = series.filter(s => s.colecao === 'hqs-lol').map(s => REG.get(s.id) || reg(s));
    const extLoL = externas.filter(x => x.colecao === 'hqs-lol').map(x => REG.get(x.id) || reg(x));
    const listaSeries = [...serLoL, ...extLoL, ...HQS_RIOT_SERIES.map(s => REG.get('rserie:' + s.slug))];
    const oneshots = HQS_RIOT_ONESHOTS.map(e => REG.get('rhq:' + e.caminho));
    corpo.innerHTML =
      secao('Séries Completas (Marvel & Riot Games)', 'Clique em uma série para escolher a edição ou começar pela Edição #1', `<div class="grade">${listaSeries.map(i => cartao(i)).join('')}</div>`) +
      secao('Edições Especiais & One-Shots', 'Quadrinhos completos de campeões de Runeterra', `<div class="grade">${oneshots.map(i => cartao(i)).join('')}</div>`);
  }

  async function colecaoCronicasLoL(corpo) {
    const lista = await Dados.cronicas();
    let q = '', mostrar = 48;
    corpo.innerHTML = `
      <div class="campo"><input type="search" id="fCron" placeholder="Buscar conto por título, campeão (ex.: Ahri, Yasuo, Thresh, Lucian) ou autor..."></div>
      <div id="gCron" style="margin-top:18px"></div>`;
    const desenhar = () => {
      const l = lista.filter(c => norm(`${c.titulo} ${c.sub} ${c.resumo}`).includes(norm(q)));
      $('#gCron').innerHTML = `<p class="ajuda" style="margin-bottom:12px">${l.length} contos oficiais encontrados</p><div class="grade">${l.slice(0, mostrar).map(i => cartao(i)).join('')}</div>` +
        (l.length > mostrar ? `<div style="text-align:center;margin:24px"><button class="btn btn-sec" id="maisCron">Carregar mais (${l.length - mostrar} restantes)</button></div>` : '') +
        (!l.length ? '<div class="vazio">Nenhum conto encontrado.</div>' : '');
      const m = $('#maisCron'); if (m) m.onclick = () => { mostrar += 48; desenhar(); };
    };
    $('#fCron').oninput = (e) => { q = e.target.value; mostrar = 48; desenhar(); };
    desenhar();
  }

  async function colecaoLol(corpo) {
    const lista = await Dados.lol();
    const tags = ['Todos', ...Object.values(Fontes.TAGS)];
    let tag = 'Todos', q = '', ordem = 'az';
    corpo.innerHTML = `
      <div class="campo"><input type="search" id="fLol" placeholder="Buscar campeão pelo nome ou título..."><select id="oLol" class="chip"><option value="az">A → Z</option><option value="za">Z → A</option><option value="alea">Aleatório</option></select></div>
      <div class="chips" id="cLol">${tags.map(t => `<button class="chip ${t === tag ? 'ativo' : ''}" data-t="${t}">${t}</button>`).join('')}</div>
      <div class="grade" id="gLol"></div>`;
    const desenhar = () => {
      let l = lista.filter(c => (tag === 'Todos' || c.tags.includes(tag)) && norm(c.titulo + ' ' + c.sub).includes(norm(q)));
      if (ordem === 'za') l = [...l].reverse();
      if (ordem === 'alea') l = embaralhar(l);
      $('#gLol').innerHTML = l.map(i => cartao(i)).join('') || '<div class="vazio">Nenhum campeão encontrado.</div>';
    };
    $('#fLol').oninput = (e) => { q = e.target.value; desenhar(); };
    $('#oLol').onchange = (e) => { ordem = e.target.value; desenhar(); };
    $('#cLol').onclick = (e) => { const b = e.target.closest('[data-t]'); if (!b) return; tag = b.dataset.t; $$('#cLol .chip').forEach(x => x.classList.toggle('ativo', x === b)); desenhar(); };
    desenhar();
  }

  async function colecaoLor(corpo) {
    let set = Fontes.LOR_SETS[0][0], regiao = 'Todas', q = '', cartas = [], mostrar = 60;
    corpo.innerHTML = `
      <div class="chips" id="cSet">${Fontes.LOR_SETS.map(([s, n]) => `<button class="chip ${s === set ? 'ativo' : ''}" data-s="${s}">${n}</button>`).join('')}</div>
      <div class="campo"><input type="search" id="fLor" placeholder="Buscar carta, região ou texto..."></div>
      <div class="chips" id="cReg"></div><div id="gLor"></div>`;
    const desenhar = () => {
      const l = cartas.filter(c => (regiao === 'Todas' || (c.carta.regioes || []).includes(regiao)) && norm(c.titulo + ' ' + c.sub + ' ' + (c.carta.flavor || '')).includes(norm(q)));
      $('#gLor').innerHTML = `<div class="grade">${l.slice(0, mostrar).map(i => cartao(i)).join('')}</div>` +
        (l.length > mostrar ? `<div style="text-align:center;margin:24px"><button class="btn btn-sec" id="maisLor">Carregar mais (${l.length - mostrar} restantes)</button></div>` : '') +
        (!l.length ? '<div class="vazio">Nenhuma carta encontrada.</div>' : '');
      const m = $('#maisLor'); if (m) m.onclick = () => { mostrar += 60; desenhar(); };
    };
    const carregar = async () => {
      $('#gLor').innerHTML = carregando('Embaralhando cartas de Runeterra...');
      try {
        const d = await Fontes.lorSet(set);
        cartas = d.filter(c => c.flavorText || c.descriptionRaw).map(itemLor);
        const regs = ['Todas', ...new Set(d.flatMap(c => c.regions || []))];
        regiao = 'Todas'; mostrar = 60;
        $('#cReg').innerHTML = regs.map(r => `<button class="chip ${r === regiao ? 'ativo' : ''}" data-r="${esc(r)}">${esc(r)}</button>`).join('');
        desenhar();
      } catch (e) { $('#gLor').innerHTML = `<div class="erro">Não foi possível carregar o conjunto do Legends of Runeterra (${esc(e.message)}).</div>`; }
    };
    $('#cSet').onclick = (e) => { const b = e.target.closest('[data-s]'); if (!b) return; set = b.dataset.s; $$('#cSet .chip').forEach(x => x.classList.toggle('ativo', x === b)); carregar(); };
    $('#cReg').onclick = (e) => { const b = e.target.closest('[data-r]'); if (!b) return; regiao = b.dataset.r; mostrar = 60; $$('#cReg .chip').forEach(x => x.classList.toggle('ativo', x === b)); desenhar(); };
    $('#fLor').oninput = (e) => { q = e.target.value; mostrar = 60; desenhar(); };
    carregar();
  }

  const PRESETS_IA = [
    ['Destaques Vertigo & Clássicos PT-BR', '__curados__'],
    ['Batman & DC (PT-BR)', '(language:por OR language:Portuguese) AND (title:batman OR title:superman OR title:lanterna OR title:watchmen OR title:sandman OR title:justica) AND mediatype:texts'],
    ['Marvel (PT-BR)', '(language:por OR language:Portuguese) AND (title:marvel OR title:aranha OR title:x-men OR title:vingadores OR title:demolidor OR title:wolverine OR title:hulk OR title:thor) AND mediatype:texts'],
    ['Gibis & Quadrinhos Brasileiros', '(language:por OR language:Portuguese) AND (gibi OR gibis OR quadrinhos OR "turma da monica" OR "holy avenger" OR calafrio) AND mediatype:texts'],
    ['Mangás & Independentes (PT-BR)', '(language:por OR language:Portuguese) AND (title:akira OR title:invencivel OR title:hellboy OR title:walking OR title:asterix OR title:fabulas) AND mediatype:texts']
  ];
  async function colecaoArquivo(corpo, consultaInicial) {
    let consulta = consultaInicial || PRESETS_IA[0][1], pagina = 1, acumulado = [];
    const curados = HQS_ACERVO.arquivo.map(h => REG.get('ia:' + h.ident));
    corpo.innerHTML = `
      <div class="chips" id="cIA">${PRESETS_IA.map(([n, qq], i) => `<button class="chip ${i === 0 && !consultaInicial ? 'ativo' : ''}" data-q="${esc(qq)}">${n}</button>`).join('')}</div>
      <div class="campo"><input type="search" id="fIA" placeholder="Pesquisar qualquer HQ no Internet Archive (ex.: Demolidor, Hellblazer, Conan, Spawn, Akira)..."><button class="btn btn-pri" id="bIA">Buscar</button></div>
      <p class="ajuda">Todas as HQs abrem diretamente no nosso leitor nativo de páginas (com suporte a múltiplos volumes e modo rolagem vertical).</p>
      <div id="gIA" style="margin-top:16px"></div>`;
    const buscar = async (nova) => {
      if (consulta === '__curados__') {
        $('#gIA').innerHTML = `<div class="grade">${curados.map(i => cartao(i)).join('')}</div>`;
        return;
      }
      if (nova) { pagina = 1; acumulado = []; $('#gIA').innerHTML = carregando('Vasculhando o acervo...'); }
      try {
        const r = await Fontes.arquivoBuscar(consulta, pagina);
        acumulado.push(...r.docs.map(d => itemIA(d)));
        $('#gIA').innerHTML = acumulado.length ? `<p class="ajuda">${r.total.toLocaleString('pt-BR')} resultados</p><div class="grade">${acumulado.map(i => cartao(i)).join('')}</div>` +
          (acumulado.length < r.total ? `<div style="text-align:center;margin:24px"><button class="btn btn-sec" id="maisIA">Carregar mais</button></div>` : '') : '<div class="vazio"><div class="em">📭</div>Nada encontrado.</div>';
        const m = $('#maisIA'); if (m) m.onclick = () => { pagina++; m.textContent = 'Carregando...'; buscar(false); };
      } catch (e) { $('#gIA').innerHTML = `<div class="erro">Não foi possível acessar o Internet Archive (${esc(e.message)}).</div>`; }
    };
    $('#cIA').onclick = (e) => { const b = e.target.closest('[data-q]'); if (!b) return; consulta = b.dataset.q; $$('#cIA .chip').forEach(x => x.classList.toggle('ativo', x === b)); buscar(true); };
    const livre = () => { const v = $('#fIA').value.trim(); if (!v) return; consulta = `(${v}) AND mediatype:texts`; $$('#cIA .chip').forEach(x => x.classList.remove('ativo')); buscar(true); };
    $('#bIA').onclick = livre; $('#fIA').onkeydown = (e) => { if (e.key === 'Enter') livre(); };
    if (consultaInicial) $('#fIA').value = consultaInicial.replace(/^\((.*)\) AND mediatype:texts$/, '$1');
    buscar(true);
  }

  /* ---------------- Detalhes ---------------- */
  function abrirCamada() { $('#detalhe').classList.add('aberta'); document.body.style.overflow = 'hidden'; }
  function fecharCamada() { $('#detalhe').classList.remove('aberta'); document.body.style.overflow = ''; }
  function topoDetalhe(it, { fundo, fonte, tags = [], botoes = '', capaCustom } = {}) {
    return `<div class="det-topo">${fundo ? `<div class="fundo" style="background-image:url('${esc(fundo)}')"></div>` : ''}
      <div class="det-capa"><div class="capa">${capaCustom || capaHTML(it)}</div></div>
      <div class="det-info">
        <span class="fonte">${esc(fonte || col(it.colecao)?.fonte || '')}</span>
        <h2>${esc(it.titulo)}</h2><h3>${esc(it.sub || '')}</h3>
        <div class="tags">${tags.filter(Boolean).map(t => `<span class="tag">${esc(t)}</span>`).join('')}</div>
        <div class="botoes">${botoes}
          <button class="btn btn-sec ${salvos[it.id] ? 'ativo' : ''}" data-salvar="${esc(it.id)}">🔖 ${salvos[it.id] ? 'Salvo' : 'Salvar'}</button>
        </div>
      </div></div>`;
  }
  const btnLer = (id, txt = '▶ Ler agora') => `<button class="btn btn-pri" data-ler="${esc(id)}">${txt}</button>`;

  async function abrirDetalhe(id) {
    if (!Auth.usuario) {
      abrirModalAuth('entrar', true);
      toast('⚠️ Crie ou acesse sua conta para ver os detalhes.');
      return;
    }
    let it = REG.get(id);
    if (!it) { const s = salvos[id] || historico.find(h => h.id === id)?.item; if (s) it = reg(s); }
    if (!it) return;
    try { await atualizarPermissoes(); } catch (error) { return toast(error.message); }
    if (!conteudoPermitido(it)) return toast('Este conteúdo não está disponível no seu perfil ou está oculto nas preferências.');
    const box = $('#detalheConteudo');
    abrirCamada();
    box.innerHTML = topoDetalhe(it, { fundo: it.banner, botoes: btnLer(id) }) + `<div class="det-corpo">${carregando()}</div>`;
    $('#detalhe .detalhe-caixa').scrollTop = 0;
    const corpo = () => $('#detalheConteudo .det-corpo');
    try {
      if (it.tipo === 'lol') {
        // Carrega em paralelo: Universe (biografia completa, contos e HQs oficiais) + Data Dragon (artes/visuais)
        const [uni, dd] = await Promise.all([
          Fontes.universoCampeao(it.cid).catch(() => null),
          Fontes.lolCampeao(it.cid).catch(() => null)
        ]);
        const r = REGIAO_DE[it.cid];
        const bioParagrafos = uni?.bioHtml ? Fontes.extrairParagrafosHTML(uni.bioHtml).filter(p => typeof p === 'string') : dividirTexto(dd?.lore || it.resumo);
        const contosItens = (uni?.contos || []).map(c => itemRiotConto({ slug: c.slug, titulo: c.titulo, subtitle: c.sub, description: c.resumo, 'minutes-to-read': c.minutos, 'featured-image': { uri: c.imagem }, campeoes: [it.titulo] }));
        const hqsOficiais = (uni?.hqs || []).map(h => {
          const sMatch = HQS_RIOT_SERIES.find(s => h.caminho.toLowerCase().includes(s.slug));
          if (sMatch) return REG.get('rserie:' + sMatch.slug);
          return itemRiotEdicao({ caminho: h.caminho, titulo: h.titulo, sub: h.sub, capa: h.imagem || it.capa, resumo: h.resumo });
        });
        const cv = contagemVinculosHeroi(it);
        const hqsItens = [...new Map([...cv.obras, ...hqsOficiais].filter(Boolean).map(x => [x.id, x])).values()];

        box.innerHTML = topoDetalhe(it, {
          fundo: uni?.imagem || it.banner,
          fonte: 'Riot Games · Universo de Runeterra',
          tags: [r && '📍 ' + r.nome, uni?.raca, uni?.funcao || (it.tags || [])[0], contosItens.length && `📜 ${contosItens.length} conto(s) oficial(is)`, `📚 ${cv.textoCurto}`],
          botoes: btnLer(id, '📖 Ler Biografia & Contos') +
            (contosItens[0] ? `<button class="btn btn-sec" data-ler="${esc(contosItens[0].id)}">📜 Ler "${esc(contosItens[0].titulo)}"</button>` : '') +
            `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir Lore</button>` +
            `<button class="btn btn-sec" data-add-heroi="${esc(it.id)}">➕ Vincular HQ/Lore</button>`
        }) + `<div class="det-corpo">
            <h4>Resumo de Obras Vinculadas a ${esc(it.titulo)}</h4>
            ${cv.badgesHTML}
            ${uni?.citacao ? `<blockquote class="sinopse" style="border-left:3px solid var(--acento);padding-left:16px;font-style:italic;margin-bottom:16px">“${esc(uni.citacao)}”</blockquote>` : ''}
            <h4>Biografia Oficial</h4>
            ${bioParagrafos.slice(0, 3).map(p => `<p class="sinopse" style="margin-bottom:10px">${esc(p)}</p>`).join('')}
            ${bioParagrafos.length > 3 ? `<p style="margin-top:6px"><button class="ver-tudo" data-ler="${esc(id)}">Continuar lendo a biografia completa (${bioParagrafos.length} parágrafos) →</button></p>` : ''}

            ${cv.seriesH.length ? `<h4>📁 Coleções & Séries (Subpastas) de ${esc(it.titulo)} (${cv.seriesH.length})</h4><div class="grade">${cv.seriesH.map(s => cartao(s)).join('')}</div>` : ''}

            ${contosItens.length ? `<h4>Contos e Crônicas de ${esc(it.titulo)} (${contosItens.length})</h4>
              <div class="lista-edicoes">${(uni?.contos || []).map(c => `
                <button class="edicao-item" data-ler="rconto:${esc(c.slug)}">
                  ${c.imagem ? `<img src="${esc(c.imagem)}" alt="" loading="lazy">` : ''}
                  <div class="info">
                    <b>📜 ${esc(c.titulo)}</b>
                    <small>${esc(c.resumo || c.sub || 'Conto oficial completo do Universo LoL')}</small>
                    <span class="acao">▶ Ler conto completo (${c.minutos || 6} min)</span>
                  </div>
                </button>`).join('')}</div>` : ''}

            ${hqsItens.length ? `<h4>Quadrinhos, Mangás & Lores de ${esc(it.titulo)} (${hqsItens.length})</h4><div class="grade">${hqsItens.map(h => cartao(h)).join('')}</div>` : ''}

            ${uni?.galeria?.length ? `<h4>Artes Conceituais de Runeterra (${uni.galeria.length})</h4>
              <div class="skins">${uni.galeria.slice(0, 16).map(g => `<figure data-zoom="${esc(g.uri)}" data-legenda="${esc(g.titulo)}"><img src="${esc(g.uri)}" loading="lazy" alt=""><figcaption>${esc(g.titulo)}</figcaption></figure>`).join('')}</div>` : ''}

            ${dd?.skins?.length ? `<h4>Visuais e Universos Alternativos (${dd.skins.length})</h4>
              <div class="skins">${dd.skins.map(s => `<figure data-zoom="${Fontes.lolImg.splash(it.cid, s.num)}" data-legenda="${esc(s.name === 'default' ? dd.name : s.name)}"><img src="${Fontes.lolImg.splash(it.cid, s.num)}" loading="lazy" alt=""><figcaption>${esc(s.name === 'default' ? 'Visual Padrão' : s.name)}</figcaption></figure>`).join('')}</div>` : ''}

            ${r ? `<h4>Campeões ligados a ${esc(r.nome)}</h4>${trilho((await Dados.lol()).filter(c => r.campeoes.includes(c.cid) && c.cid !== it.cid).map(c => cartao(c)).join(''))}` : ''}
          </div>`;
      } else if (it.tipo === 'heroi') {
        const cv = contagemVinculosHeroi(it);
        const obras = cv.obras;
        const bioP = dividirTexto(it.bio || it.resumo || 'Herói cadastrado no seu acervo do EleoQuadrinho.');
        box.innerHTML = topoDetalhe(it, {
          fundo: it.banner || it.capa,
          fonte: (col(it.colecao)?.nome || 'Universo Independente') + ' · Herói / Personagem',
          tags: ['🦸 Herói / Personagem', col(it.colecao)?.nome, `📚 ${cv.textoCurto}`],
          botoes: btnLer(id, '📖 Ler Biografia & Lore') +
            `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir Lore</button>` +
            `<button class="btn btn-sec" data-add-heroi="${esc(it.id)}">➕ Vincular HQ / Coleção / Lore</button>` +
            `<button class="btn btn-sec" data-editar="${esc(it.id)}">✏️ Editar Herói</button>` +
            `<button class="btn btn-sec" data-apagar="${esc(it.id)}">🗑 Remover</button>`
        }) + `<div class="det-corpo">
          <h4>Quantidade de Coleções, HQs, Mangás, Lores e Histórias Vinculadas</h4>
          ${cv.badgesHTML}
          <h4>Lore & Biografia de ${esc(it.titulo)}</h4>
          ${bioP.map(p => `<p class="sinopse" style="margin-bottom:10px">${esc(p)}</p>`).join('')}
          ${cv.seriesH.length ? `<h4>📁 Coleções & Séries (Subpastas) de ${esc(it.titulo)} (${cv.seriesH.length})</h4>
            <div class="grade">${cv.seriesH.map(s => cartao(s)).join('')}</div>` : ''}
          <h4>HQs, Mangás e Lores Vinculadas a ${esc(it.titulo)} (${obras.length})</h4>
          ${obras.length
            ? `<div class="grade">${obras.map(o => cartao(o)).join('')}</div>`
            : `<div class="vazio">Nenhuma HQ ou história vinculada ainda.<br><br><button class="btn btn-pri" data-add-heroi="${esc(it.id)}">➕ Adicionar 1ª HQ / Coleção / Lore de ${esc(it.titulo)}</button></div>`}
        </div>`;
      } else if (it.tipo === 'serie-pasta') {
        const eds = edicoesDaSerie(it).filter(ed => conteudoPermitido(ed));
        const heroiRef = it.heroiId ? REG.get(it.heroiId) : (it.heroiNome ? [...REG.values()].find(x => ['heroi', 'lol', 'wiki'].includes(x.tipo) && norm(x.titulo) === norm(it.heroiNome)) : null);
        const cvHeroi = heroiRef ? contagemVinculosHeroi(heroiRef) : null;
        box.innerHTML = topoDetalhe(it, {
          fundo: it.banner || it.capa || eds[0]?.capa,
          fonte: (col(it.colecao)?.nome || 'Acervo Pessoal') + ' · 📁 Coleção / Série (Subpasta)',
          tags: [`📁 ${eds.length} edição(ões)`, it.formatoObra || 'Série de HQ', it.heroiNome && `🦸 ${it.heroiNome}`],
          botoes: (eds[0] ? `<button class="btn btn-pri" data-ler="${esc(eds[0].id)}">▶ Começar pela Edição #${eds[0].edicaoNum || 1}</button>` : '') +
            `<button class="btn ${eds.length ? 'btn-sec' : 'btn-pri'}" data-add-serie="${esc(it.id)}">➕ Adicionar Edição (#${eds.length + 1})</button>` +
            `<button class="btn btn-sec" data-editar="${esc(it.id)}">✏️ Editar Subpasta</button>` +
            `<button class="btn btn-sec" data-apagar="${esc(it.id)}">🗑 Remover</button>`
        }) + `<div class="det-corpo">
          <p class="sinopse">${esc(it.resumo || `Subpasta da coleção/série "${it.titulo}" contendo ${eds.length} edição(ões) organizada(s) em sequência.`)}</p>
          ${heroiRef ? `<h4>Herói / Personagem Vinculado (${cvHeroi.textoCurto})</h4>
            ${cvHeroi.badgesHTML}
            <div class="lista-edicoes">
              <button class="edicao-item" data-id="${esc(heroiRef.id)}">
                ${heroiRef.capa ? `<img src="${esc(heroiRef.capa)}" alt="" loading="lazy">` : ''}
                <div class="info">
                  <b>🦸 ${esc(heroiRef.titulo)}</b>
                  <small>📚 ${esc(cvHeroi.textoCurto)} · ${esc(heroiRef.sub || 'Ver perfil completo deste herói')}</small>
                  <span class="acao">▶ Abrir perfil do herói</span>
                </div>
              </button>
            </div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin:18px 0 10px">
            <h4 style="margin:0">📁 Edições desta Coleção / Série (${eds.length})</h4>
            <button class="btn btn-pri" style="padding:7px 14px;font-size:12px" data-add-serie="${esc(it.id)}">➕ Adicionar Edição #${eds.length + 1}</button>
          </div>
          ${eds.length ? `
            <div class="lista-edicoes">
              ${eds.map((ed, i) => {
                const num = ed.edicaoNum || (i + 1);
                const qtdPags = ed.paginas?.length ? `${ed.paginas.length} págs.` : (ed.textoLore ? 'Texto/Lore' : 'Leitor Integrado');
                return `<div class="edicao-item-wrap">
                  <button class="edicao-item" data-ler="${esc(ed.id)}">
                    ${ed.capa ? `<img src="${esc(ed.capa)}" alt="" loading="lazy">` : `<div style="width:68px;height:96px;border-radius:8px;overflow:hidden;flex-shrink:0">${capaHTML(ed)}</div>`}
                    <div class="info">
                      <b>#${num} · ${esc(ed.titulo)}</b>
                      <small>${esc(ed.resumo || ed.sub || `${ed.formatoObra || 'HQ'} · ${qtdPags}`)}</small>
                      <span class="acao">▶ Ler Edição #${num} (${qtdPags})</span>
                    </div>
                  </button>
                  <div class="edicao-item-acoes">
                    <button class="btn btn-sec" data-id="${esc(ed.id)}" title="Ver detalhes da edição">ⓘ</button>
                    <button class="btn btn-sec" data-editar="${esc(ed.id)}" title="Editar esta edição">✏️ Editar</button>
                    <button class="btn btn-sec" data-apagar="${esc(ed.id)}" title="Remover esta edição">🗑</button>
                  </div>
                </div>`;
              }).join('')}
            </div>
            <h4>Visualização em Grade das Edições (${eds.length})</h4>
            <div class="grade">${eds.map(ed => cartao(ed)).join('')}</div>
          ` : `<div class="vazio">Esta subpasta de coleção/série ainda não possui edições.<br><br><button class="btn btn-pri" data-add-serie="${esc(it.id)}">➕ Cadastrar Edição #1 de ${esc(it.titulo)}</button></div>`}
        </div>`;
      } else if (it.tipo === 'riot-conto') {
        const st = await Fontes.universoConto(it.slug);
        const primeiroPar = st.secoes[0]?.paragrafos.filter(p => typeof p === 'string').slice(0, 3) || [];
        box.innerHTML = topoDetalhe(it, {
          fundo: st.imagem || it.banner,
          fonte: 'Riot Games · Crônicas de Runeterra',
          tags: [...(it.campeoes || []), `⏱ ${st.minutos} min`, `${st.secoes.length} parte(s)`, st.palavras ? `${st.palavras.toLocaleString('pt-BR')} palavras` : ''],
          botoes: btnLer(id, '📜 Ler Conto Completo') + `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir Narração</button>`
        }) + `<div class="det-corpo">
          ${primeiroPar.map(p => `<p class="sinopse" style="margin-bottom:10px">${esc(p)}</p>`).join('')}
          ${st.secoes.length > 1 ? `<h4>Partes da História</h4><div class="tags">${st.secoes.map((s, i) => `<button class="tag" data-ler="${esc(id)}" data-cap="${i}">${i + 1}. ${esc(s.titulo)}</button>`).join('')}</div>` : ''}
        </div>`;
      } else if (it.tipo === 'riot-serie') {
        const serie = await Fontes.universoSerieHQ(it.serieSlug);
        const eds = serie.edicoes.map(ed => itemRiotEdicao({
          caminho: ed.caminho,
          titulo: `${serie.nome}: ${ed.titulo}`,
          sub: `${serie.nome} · Edição #${ed.numero}`,
          capa: ed.capa,
          resumo: ed.descricao
        }));
        box.innerHTML = topoDetalhe(it, {
          fundo: serie.banner || it.banner,
          fonte: 'Riot Games & Marvel · Série Oficial em Português',
          tags: [`${eds.length} edições completas`, 'Alta Resolução', 'Português (PT-BR)'],
          botoes: eds[0] ? `<button class="btn btn-pri" data-ler="${esc(eds[0].id)}">▶ Ler Edição #1</button>` : ''
        }) + `<div class="det-corpo">
          <p class="sinopse">${esc(serie.descricao || it.resumo)}</p>
          <h4>Edições da Série (${eds.length}) — Clique para ler</h4>
          <div class="lista-edicoes">${serie.edicoes.map((ed, i) => `
            <button class="edicao-item" data-ler="${esc(eds[i].id)}">
              <img src="${esc(ed.capa)}" alt="" loading="lazy">
              <div class="info">
                <b>${esc(ed.titulo)}</b>
                <small>${esc(ed.descricao || `Edição #${ed.numero} de ${serie.nome}`)}</small>
                <span class="acao">▶ Abrir HQ completa</span>
              </div>
            </button>`).join('')}</div>
        </div>`;
      } else if (it.tipo === 'riot-hq') {
        const ed = await Fontes.universoEdicaoHQ(it.caminho);
        box.innerHTML = topoDetalhe(it, {
          fundo: ed.paginas[0] || it.banner,
          fonte: 'Riot Games · HQ Oficial em Português',
          tags: [`${ed.paginas.length} páginas`, 'Alta Resolução', ed.creditos],
          botoes: btnLer(id, `🗯️ Ler HQ (${ed.paginas.length} páginas)`)
        }) + `<div class="det-corpo">
          <p class="sinopse">${esc(ed.descricao || it.resumo || 'Quadrinho oficial completo do Universo de League of Legends.')}</p>
          <h4>Prévia das páginas</h4>
          <div class="skins">${ed.paginas.slice(0, 8).map((p, i) => `<figure data-ler="${esc(id)}" data-cap="${i}"><img src="${esc(p)}" loading="lazy" alt=""><figcaption>Página ${i + 1}</figcaption></figure>`).join('')}</div>
        </div>`;
      } else if (it.tipo === 'ia') {
        const meta = await Fontes.arquivoMetadados(it.ident);
        const vols = meta.volumes;
        box.innerHTML = topoDetalhe(it, {
          fundo: it.capa,
          fonte: col(it.colecao)?.nome + ' · Edição Completa em Português',
          tags: [vols.length ? `${vols.length} volume(s) / edição(ões)` : 'PDF Completo', meta.ano, meta.criador],
          botoes: btnLer(id, vols.length > 1 ? `📚 Ler Volume 1 (de ${vols.length})` : '📚 Ler HQ Completa') +
            `<button class="btn btn-sec" data-ia-embed="${esc(it.ident)}" data-ia-titulo="${esc(it.titulo)}">🖥 Visualizador Archive</button>`
        }) + `<div class="det-corpo">
          <p class="sinopse">${esc(it.resumo || meta.descricao || 'Edição completa em português disponível para leitura imediata página por página.')}</p>
          ${vols.length > 1 ? `<h4>Volumes / Edições incluídas neste pacote (${vols.length})</h4>
            <div class="lista-edicoes">${vols.map(v => `
              <button class="edicao-item" data-ler="${esc(id)}" data-cap="${v.indice}">
                <img src="https://${meta.servidor}/BookReader/BookReaderImages.php?zip=${meta.dir}/${encodeURIComponent(v.zip)}&file=${encodeURIComponent(v.prefixo + '_jp2/' + v.prefixo + '_0000.jp2')}&id=${encodeURIComponent(it.ident)}&scale=8&rotate=0" alt="" loading="lazy">
                <div class="info">
                  <b>#${v.indice + 1} · ${esc(v.nome)}</b>
                  <small>Clique para abrir no leitor nativo de páginas</small>
                  <span class="acao">▶ Ler edição</span>
                </div>
              </button>`).join('')}</div>` : ''}
        </div>`;
      } else if (it.tipo === 'conto' || it.tipo === 'interativa') {
        const c = CONTOS.find(x => x.id === it.ref);
        const sin = c.interativa ? c.nos[c.inicio].t[0] : c.capitulos[0][1][0];
        const totalF = c.interativa ? Object.values(c.nos).filter(n => n.fim).length : 0;
        const achados = finais[it.id] || [];
        box.innerHTML = topoDetalhe(it, {
          fundo: col(c.colecao)?.capa, tags: [col(c.colecao)?.nome, `⏱ ${c.tempo} min`, c.interativa ? `🏆 ${achados.length}/${totalF} finais` : `${c.capitulos.length} capítulos`],
          botoes: btnLer(id, c.interativa ? '🎮 Começar aventura' : '📖 Ler conto completo') + `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir</button>`
        }) + `<div class="det-corpo"><p class="sinopse">${esc(sin)}</p>
          ${c.interativa ? `<h4>Finais descobertos</h4><div class="tags">${achados.length ? achados.map(f => `<span class="tag">🏆 ${esc(f)}</span>`).join('') : '<span class="tag">Nenhum ainda — comece a jogar!</span>'}${'<span class="tag">🔒 ???</span>'.repeat(Math.max(0, totalF - achados.length))}</div>`
            : `<h4>Capítulos</h4><div class="tags">${c.capitulos.map((cp, i) => `<button class="tag" data-ler="${esc(id)}" data-cap="${i}">${i + 1}. ${esc(cp[0])}</button>`).join('')}</div>`}
          <h4>Mais de ${esc(col(c.colecao)?.nome)}</h4>${trilho([...CONTOS.filter(x => x.colecao === c.colecao && x.id !== c.id).map(x => REG.get('conto:' + x.id)), ...(VERBETES[c.colecao] || []).slice(0, 12).map(t => REG.get('wiki:' + t))].map(i => cartao(i)).join(''))}
        </div>`;
        aplicarMiniaturas((VERBETES[c.colecao] || []).slice(0, 12).map(t => REG.get('wiki:' + t)));
      } else if (it.tipo === 'hq') {
        const h = HQS.find(x => x.id === it.ref);
        const achados = finais[it.id] || [];
        box.innerHTML = topoDetalhe(it, { fundo: 'assets/paineis/batalha.jpg', tags: ['HQ interativa', `${h.paginas.length} páginas`, `🏆 ${achados.length}/4 finais`, 'Original'], botoes: btnLer(id, '⚡ Ler HQ') }) +
          `<div class="det-corpo"><p class="sinopse">${esc(h.resumo)}</p><h4>Finais descobertos</h4><div class="tags">${achados.map(f => `<span class="tag">🏆 ${esc(f)}</span>`).join('')}${'<span class="tag">🔒 ???</span>'.repeat(Math.max(0, 4 - achados.length))}</div>
          <h4>Galeria de painéis</h4><div class="skins">${['tempestade', 'laboratorio', 'batalha', 'amanhecer'].map(p => `<figure data-zoom="assets/paineis/${p}.jpg"><img src="assets/paineis/${p}.jpg" alt=""></figure>`).join('')}</div></div>`;
      } else if (it.tipo === 'wiki') {
        const a = await Fontes.wikiArtigo(it.wtitulo);
        if (a.imagem && !it.capa) { it.capa = a.imagem; atualizarCapa(it.id); }
        const intro = a.secoes[0]?.paragrafos.filter(p => typeof p === 'string').slice(0, 2) || [];
        const palavras = a.secoes.reduce((n, s) => n + s.paragrafos.join(' ').split(/\s+/).length, 0);
        const cv = contagemVinculosHeroi(it);
        const hqsRel = cv.obras;
        box.innerHTML = topoDetalhe(it, {
          fundo: a.imagem || it.capa, fonte: 'Enciclopédia · Wikipédia em português', tags: [a.desc, `⏱ ${Math.max(1, Math.round(palavras / 200))} min`, `${a.secoes.length} seções`, `📚 ${cv.textoCurto}`],
          botoes: btnLer(id, '📖 Ler história completa') +
            `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir</button>` +
            `<button class="btn btn-sec" data-add-heroi="${esc(it.id)}">➕ Vincular HQ/Lore</button>`
        }) + `<div class="det-corpo">
            <h4>Resumo de Obras Vinculadas a ${esc(it.titulo)}</h4>
            ${cv.badgesHTML}
            ${intro.map(p => `<p class="sinopse" style="margin-bottom:10px">${esc(p)}</p>`).join('')}
            ${cv.seriesH.length ? `<h4>📁 Coleções & Séries (Subpastas) de ${esc(it.titulo)} (${cv.seriesH.length})</h4><div class="grade">${cv.seriesH.map(s => cartao(s)).join('')}</div>` : ''}
            ${hqsRel.length ? `<h4>HQs, Mangás e Lores de ${esc(it.titulo)} (${hqsRel.length})</h4><div class="grade">${hqsRel.map(h => cartao(h)).join('')}</div>` : ''}
            <h4>Capítulos & Arcos</h4><div class="tags">${a.secoes.map((s, i) => `<button class="tag" data-ler="${esc(id)}" data-cap="${i}">${esc(s.titulo)}</button>`).join('')}</div>
            ${it.colecao ? `<h4>Relacionados</h4>${trilho(embaralhar((VERBETES[it.colecao] || []).filter(t => t !== it.wtitulo)).slice(0, 14).map(t => cartao(REG.get('wiki:' + t))).join(''))}` : ''}</div>`;
        if (it.colecao) aplicarMiniaturas((VERBETES[it.colecao] || []).map(t => REG.get('wiki:' + t)));
      } else if (it.tipo === 'regiao') {
        const r = REGIOES.find(x => x.id === it.ref);
        const [fac, camps, todasCronicas] = await Promise.all([
          r.uSlug ? Fontes.universoFaccao(r.uSlug).catch(() => null) : Promise.resolve(null),
          Dados.lol().catch(() => []),
          Dados.cronicas().catch(() => [])
        ]);
        const campsReg = camps.filter(c => r.campeoes.includes(c.cid));
        const nomesCamps = new Set(campsReg.map(c => norm(c.titulo)));
        const cronicasReg = todasCronicas.filter(cr => cr.campeoes.some(n => nomesCamps.has(norm(n))));
        box.innerHTML = topoDetalhe(it, {
          fundo: fac?.imagem || it.banner,
          fonte: 'Riot Games · Universo de Runeterra',
          tags: [`${campsReg.length} campeões`, cronicasReg.length && `📜 ${cronicasReg.length} contos da região`, r.emblema + ' ' + r.nome],
          botoes: btnLer(id, '📖 Ler História da Região') + `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir</button>`
        }) + `<div class="det-corpo">
          ${(fac?.paragrafos?.slice(0, 3) || [r.resumo]).map(p => typeof p === 'string' ? `<p class="sinopse" style="margin-bottom:10px">${esc(p)}</p>` : '').join('')}
          ${cronicasReg.length ? `<h4>Contos e Acontecimentos em ${esc(r.nome)} (${cronicasReg.length})</h4>${trilho(cronicasReg.slice(0, 20).map(c => cartao(c)).join(''))}` : ''}
          ${fac?.galeria?.length ? `<h4>Paisagens e Arquitetura de ${esc(r.nome)} (${fac.galeria.length})</h4><div class="skins">${fac.galeria.slice(0, 16).map(g => `<figure data-zoom="${esc(g.uri)}" data-legenda="${esc(g.titulo)}"><img src="${esc(g.uri)}" loading="lazy" alt=""><figcaption>${esc(g.titulo)}</figcaption></figure>`).join('')}</div>` : ''}
          <h4>Campeões de ${esc(r.nome)}</h4><div class="grade">${campsReg.map(c => cartao(c)).join('')}</div>
        </div>`;
      } else if (['ext-hq', 'drive', 'local'].includes(it.tipo)) {
        let pags = Array.isArray(it.paginas) ? it.paginas : [];
        let qtdPaginas = pags.length || (typeof it.paginasCount === 'number' ? it.paginasCount : 0);
        // Se for um PDF local, garante que a 1ª página já seja extraída como capa caso ainda não tenha capa, e gera prévias das primeiras páginas
        if (it.tipo === 'local' && it.formato === 'pdf') {
          const arqLocal = await BD.pegar(it.id).catch(() => null);
          if (arqLocal?.blob) {
            if (!it.capa || !arqLocal.paginas) {
              const metaPdf = await PDFUtil.extrairCapaEPaginas(arqLocal.blob);
              if (metaPdf.capa && !it.capa) {
                arqLocal.capa = metaPdf.capa;
                it.capa = metaPdf.capa;
                it.banner = metaPdf.capa;
                atualizarCapa(it.id);
              }
              if (metaPdf.paginas) {
                arqLocal.paginas = metaPdf.paginas;
                it.paginasCount = metaPdf.paginas;
              }
              await BD.salvar(arqLocal).catch(() => {});
            }
            qtdPaginas = arqLocal.paginas || qtdPaginas;
            pags = await PDFUtil.previasPaginas(arqLocal.blob, 6);
          }
        }
        const heroiRef = it.heroiId ? REG.get(it.heroiId) : (it.heroiNome ? [...REG.values()].find(x => ['heroi', 'lol', 'wiki'].includes(x.tipo) && norm(x.titulo) === norm(it.heroiNome)) : null);
        const cvHeroi = heroiRef ? contagemVinculosHeroi(heroiRef) : null;
        const serieRef = it.serieId ? (REG.get(it.serieId) || series.find(s => s.id === it.serieId)) : null;
        const edsSerie = serieRef ? edicoesDaSerie(serieRef) : [];
        const fmt = it.formatoObra || (it.tipo === 'drive' ? 'Google Drive' : it.tipo === 'local' ? (it.formato || 'Arquivo').toUpperCase() : 'HQ');
        const ehTexto = !!it.textoLore && !pags.length;
        box.innerHTML = topoDetalhe(it, {
          fundo: it.capa || pags[0],
          fonte: (col(it.colecao)?.nome || 'Acervo Pessoal') + ' · ' + fmt,
          tags: [fmt, serieRef && `📁 ${serieRef.titulo}${it.edicaoNum ? ` #${it.edicaoNum}` : ''}`, it.heroiNome && `🦸 ${it.heroiNome}`, qtdPaginas ? `${qtdPaginas} páginas` : (ehTexto ? 'Texto / Lore' : it.sub || 'Leitor Padrão')],
          botoes: btnLer(id, qtdPaginas ? `🗯️ Ler ${fmt} (${qtdPaginas} págs.)` : ehTexto ? `📜 Ler ${fmt}` : `▶ Ler ${fmt}`) +
            (serieRef ? `<button class="btn btn-sec" data-id="${esc(serieRef.id)}">📁 Abrir Série (${edsSerie.length} ed.)</button>` : '') +
            (it.textoLore ? `<button class="btn btn-sec" data-ouvir="${esc(id)}">🔊 Ouvir Narração</button>` : '') +
            `<button class="btn btn-sec" data-editar="${esc(it.id)}">✏️ Editar</button>` +
            `<button class="btn btn-sec" data-apagar="${esc(it.id)}">🗑 Remover</button>` +
            (it.url ? `<a class="btn btn-sec" href="${esc(it.url)}" target="_blank" rel="noopener">↗ Link Original</a>` : '')
        }) + `<div class="det-corpo">
          <p class="sinopse">${esc(it.resumo || (it.textoLore ? dividirTexto(it.textoLore)[0] : 'Obra adicionada à sua estante no EleoQuadrinho.'))}</p>
          ${serieRef ? `<h4>📁 Faz parte da Coleção / Série: ${esc(serieRef.titulo)} (${edsSerie.length} edições)</h4>
            <div class="lista-edicoes">
              <button class="edicao-item" data-id="${esc(serieRef.id)}">
                ${serieRef.capa ? `<img src="${esc(serieRef.capa)}" alt="" loading="lazy">` : ''}
                <div class="info">
                  <b>📁 ${esc(serieRef.titulo)}</b>
                  <small>${edsSerie.length} edição(ões) na subpasta · ${esc(serieRef.sub || 'Clique para ver todas as edições numeradas')}</small>
                  <span class="acao">▶ Abrir subpasta da série e ver todas as ${edsSerie.length} edições</span>
                </div>
              </button>
            </div>` : ''}
          ${heroiRef ? `<h4>Herói / Personagem Vinculado (${cvHeroi.textoCurto})</h4>
            ${cvHeroi.badgesHTML}
            <div class="lista-edicoes">
              <button class="edicao-item" data-id="${esc(heroiRef.id)}">
                ${heroiRef.capa ? `<img src="${esc(heroiRef.capa)}" alt="" loading="lazy">` : ''}
                <div class="info">
                  <b>🦸 ${esc(heroiRef.titulo)}</b>
                  <small>📚 ${esc(cvHeroi.textoCurto)} · ${esc(heroiRef.sub || 'Ver perfil completo e todas as HQs/Lores deste personagem')}</small>
                  <span class="acao">▶ Abrir perfil do herói e ver todas as ${cvHeroi.total} história(s) vinculada(s)</span>
                </div>
              </button>
            </div>` : ''}
          ${pags.length ? `<h4>Prévia das páginas (${qtdPaginas || pags.length}) — Clique para abrir no Leitor Padrão</h4>
            <div class="skins">${pags.slice(0, 10).map((p, i) => `<figure data-ler="${esc(id)}" data-cap="${i}"><img src="${esc(p)}" loading="lazy" alt=""><figcaption>Página ${i + 1}</figcaption></figure>`).join('')}</div>` : ''}
        </div>`;
      } else if (it.tipo === 'lor') {
        const k = it.carta;
        box.innerHTML = topoDetalhe(it, {
          fundo: it.banner, fonte: 'Legends of Runeterra', tags: [k.tipo, k.raridade, ...(k.regioes || []), ...(k.sub || []), k.custo != null && `💎 Custo ${k.custo}`],
          botoes: `<button class="btn btn-pri" data-zoom="${esc(it.banner)}" data-legenda="${esc(it.titulo)}">🖼 Ver arte completa</button>` + btnLer(id, '📖 Ler')
        }) + `<div class="det-corpo">${k.flavor ? `<blockquote class="sinopse" style="border-left:3px solid var(--acento);padding-left:16px;font-style:italic">“${esc(k.flavor)}”</blockquote>` : ''}
          ${k.desc ? `<h4>Texto da carta</h4><p class="sinopse">${esc(k.desc)}</p>` : ''}
          ${it.banner ? `<h4>Arte Completa</h4><div class="skins"><figure data-zoom="${esc(it.banner)}" style="flex-basis:100%"><img src="${esc(it.banner)}" alt=""></figure></div>` : ''}
          ${k.artista ? `<p class="ajuda">Arte por ${esc(k.artista)}</p>` : ''}</div>`;
      }
    } catch (e) {
      const c = corpo(); if (c) c.innerHTML = `<div class="erro">Não foi possível carregar os detalhes: ${esc(e.message)}</div>`;
    }
  }

  function zoomImagem(src, legenda) {
    const d = document.createElement('div'); d.className = 'zoom-img';
    d.innerHTML = `<img src="${esc(src)}" alt=""><p>${esc(legenda || '')}</p>`;
    d.onclick = () => d.remove(); document.body.appendChild(d);
  }

  /* ---------------- Histórico / salvos ---------------- */
  function registrarLeitura(it, prog, rotulo, pos) {
    historico = historico.filter(h => h.id !== it.id);
    const ant = { id: it.id, item: snap(it), prog: Math.max(0, Math.min(1, prog)), rotulo, pos, quando: Date.now() };
    historico.unshift(ant); historico = historico.slice(0, 80);
    Auth.salvarDadosPerfil();
  }
  const posicaoSalva = (id) => historico.find(h => h.id === id);
  function alternarSalvo(id) {
    const it = REG.get(id); if (!it) return;
    if (salvos[id]) { delete salvos[id]; toast('Removido dos salvos'); }
    else { salvos[id] = snap(it); toast('🔖 Salvo na sua estante'); }
    Auth.salvarDadosPerfil();
    $$(`[data-salvar="${CSS.escape(id)}"]`).forEach(b => {
      b.classList.toggle('on', !!salvos[id]); b.classList.toggle('ativo', !!salvos[id]);
      if (b.classList.contains('btn')) b.innerHTML = '🔖 ' + (salvos[id] ? 'Salvo' : 'Salvar');
    });
    if (abaAtual === 'salvos') renderSalvos();
  }

  /* ---------------- Abrir leitura ---------------- */
  function dividirTexto(t) {
    const partes = String(t).split(/\n+/).map(s => s.trim()).filter(Boolean);
    if (partes.length > 1) return partes;
    const frases = String(t).match(/[^.!?…]+[.!?…]+["”»']?\s*/g) || [t];
    const out = []; for (let i = 0; i < frases.length; i += 3) out.push(frases.slice(i, i + 3).join('').trim());
    return out;
  }

  async function abrirLeitura(id, cap) {
    if (!Auth.usuario) {
      abrirModalAuth('entrar', true);
      toast('⚠️ Crie ou acesse sua conta para ler.');
      return;
    }
    if (!id) return;
    let it = REG.get(id);
    if (!it && id.startsWith('local:')) {
      const o = await BD.pegar(id).catch(() => null);
      if (o) it = Biblioteca.item(o);
    }
    if (!it) { const s = salvos[id] || historico.find(h => h.id === id)?.item; if (s) it = reg(s); }
    if (!it && id.startsWith('serie:')) {
      const s = series.find(x => x.id === id);
      if (s) it = reg(s);
    }
    if (!it && id.startsWith('ext:')) {
      const x = externas.find(e => e.id === id);
      if (x) it = reg(x);
    }
    if (!it && id.startsWith('heroi:')) {
      const h = herois.find(x => x.id === id);
      if (h) it = reg(h);
    }
    if (!it) {
      toast('Obra não encontrada para leitura.');
      return;
    }
    try { await atualizarPermissoes(); } catch (error) { return toast(error.message); }
    if (!conteudoPermitido(it)) return toast('Este conteúdo não está disponível no seu perfil ou está oculto nas preferências.');
    fecharCamada();
    try {
      switch (it.tipo) {
        case 'conto': {
          const c = CONTOS.find(x => x.id === it.ref);
          if (!c) { toast('Conto não encontrado.'); return; }
          const cCol = col(c.colecao);
          return Leitor.abrir(it, {
            titulo: c.titulo,
            sub: cCol?.nome || 'Conto',
            imagem: cCol?.capa || it.capa,
            fonte: (cCol?.nome || 'Coleção') + ' · Conto EleoQuadrinho',
            secoes: (c.capitulos || []).map(([t, p]) => ({ titulo: t, paragrafos: p })),
            irPara: cap
          });
        }
        case 'interativa': {
          const c = CONTOS.find(x => x.id === it.ref);
          if (!c) { toast('História interativa não encontrada.'); return; }
          return Interativa.abrir(it, c);
        }
        case 'hq': {
          const h = HQS.find(x => x.id === it.ref) || HQS[0];
          return LeitorHQ.abrirRamificada(it, h);
        }
        case 'heroi': {
          const obras = obrasDoHeroi(it);
          const secoes = [
            { titulo: `Biografia & Lore de ${it.titulo}`, paragrafos: dividirTexto(it.bio || it.resumo || 'Sem biografia cadastrada.') }
          ];
          obras.filter(o => o.textoLore).forEach(o => {
            secoes.push({ titulo: `${o.formatoObra || 'História'}: ${o.titulo}`, paragrafos: dividirTexto(o.textoLore) });
          });
          const primeiraHQ = obras.find(o => o.paginas?.length || o.tipo === 'local' || o.tipo === 'ia' || o.tipo === 'riot-hq');
          if (primeiraHQ && (!it.bio || it.bio.length < 50) && !obras.some(o => o.textoLore)) {
            return abrirLeitura(primeiraHQ.id);
          }
          return Leitor.abrir(it, {
            titulo: it.titulo,
            sub: it.sub || 'Herói / Personagem',
            imagem: it.banner || it.capa,
            fonte: (col(it.colecao)?.nome || 'Acervo EleoQuadrinho') + ' · Lore de Personagem',
            secoes,
            irPara: cap
          });
        }
        case 'riot-serie': {
          toast('Carregando série de quadrinhos...');
          try {
            const serie = await Fontes.universoSerieHQ(it.serieSlug);
            const ed = (serie.edicoes && serie.edicoes[cap || 0]) || serie.edicoes?.[0];
            if (ed) {
              const edItem = itemRiotEdicao({ caminho: ed.caminho, titulo: `${serie.nome}: ${ed.titulo}`, sub: `${serie.nome} · Edição #${ed.numero}`, capa: ed.capa, resumo: ed.descricao });
              return await abrirLeitura(edItem.id);
            }
          } catch (e) {
            console.warn('Fallback para leitor Riot:', e);
          }
          registrarLeitura(it, 0.5, 'Riot Games Universe');
          const slug = it.serieSlug || 'lux';
          const urlOficial = `https://universe.leagueoflegends.com/pt_BR/comic/${slug}`;
          return Frame.abrir(it.titulo, 'HQ Oficial · Riot Games & Marvel', urlOficial, urlOficial);
        }
        case 'riot-hq': {
          toast('Abrindo HQ oficial...');
          try {
            const ed = await Fontes.universoEdicaoHQ(it.caminho);
            if (ed?.paginas?.length) {
              return LeitorHQ.abrirImagens(it, ed.paginas, { inicio: cap, sub: `${ed.paginas.length} páginas · Riot Games Universe` });
            }
          } catch (e) {
            console.warn('Fallback para leitor oficial:', e);
          }
          registrarLeitura(it, 0.5, 'Riot Games Universe');
          const slugLimpo = (it.caminho || '').replace(/^\/?pt_br\/comic\//i, '').replace(/^\/+|\/+$/g, '');
          const urlOficial = `https://universe.leagueoflegends.com/pt_BR/comic/${slugLimpo}`;
          return Frame.abrir(it.titulo, 'HQ Oficial · Riot Games Universe', urlOficial, urlOficial);
        }
        case 'riot-conto': {
          toast('Abrindo conto de Runeterra...');
          const st = await Fontes.universoConto(it.slug);
          return Leitor.abrir(it, {
            titulo: st.titulo,
            sub: st.sub,
            imagem: st.imagem || it.banner,
            fonte: 'Riot Games · Crônicas de Runeterra',
            secoes: st.secoes,
            irPara: cap
          });
        }
        case 'lol': {
          toast('Carregando biografia e contos oficiais...');
          const [uni, dd] = await Promise.all([
            Fontes.universoCampeao(it.cid).catch(() => null),
            Fontes.lolCampeao(it.cid).catch(() => null)
          ]);
          const r = REGIAO_DE[it.cid];
          const bioParagrafos = uni?.bioHtml ? Fontes.extrairParagrafosHTML(uni.bioHtml) : dividirTexto(dd?.lore || it.resumo || 'Biografia de Campeão');
          const secoes = [
            {
              titulo: 'Biografia Oficial',
              paragrafos: [
                ...(uni?.citacao ? [{ citacao: uni.citacao }] : []),
                ...bioParagrafos
              ]
            }
          ];
          if (uni?.contos?.length) {
            const contosCarregados = await Promise.all(uni.contos.slice(0, 4).map(c => Fontes.universoConto(c.slug).catch(() => null)));
            contosCarregados.filter(Boolean).forEach(st => {
              st.secoes.forEach((sec, sIdx) => {
                secoes.push({
                  titulo: sIdx === 0 ? `Conto: ${st.titulo}` : `${st.titulo} — ${sec.titulo}`,
                  paragrafos: [
                    ...(sIdx === 0 && st.imagem ? [{ img: st.imagem }] : []),
                    ...sec.paragrafos
                  ]
                });
              });
            });
          }
          return Leitor.abrir(it, {
            titulo: uni?.nome || dd?.name || it.titulo,
            sub: uni?.titulo || dd?.title || it.sub,
            imagem: uni?.imagem || Fontes.lolImg.splash(it.cid),
            fonte: `League of Legends${r ? ' · ' + r.nome : ''} · Riot Games Universe`,
            irPara: cap,
            secoes
          });
        }
        case 'wiki': {
          toast('Abrindo história...');
          const a = await Fontes.wikiArtigo(it.wtitulo);
          return Leitor.abrir(it, { titulo: a.titulo.replace(/\s*\(.*\)$/, ''), sub: a.desc || it.sub, imagem: a.imagem || it.capa, fonte: 'Wikipédia em português · CC BY-SA', secoes: a.secoes, irPara: cap, link: a.url });
        }
        case 'regiao': {
          toast('Carregando dossiê da região...');
          const r = REGIOES.find(x => x.id === it.ref);
          const [fac, camps] = await Promise.all([
            r.uSlug ? Fontes.universoFaccao(r.uSlug).catch(() => null) : Promise.resolve(null),
            Dados.lol().catch(() => [])
          ]);
          const campsReg = camps.filter(c => r.campeoes.includes(c.cid));
          const secoes = [
            {
              titulo: `História de ${r.nome}`,
              paragrafos: fac?.paragrafos?.length ? fac.paragrafos : [r.resumo]
            },
            ...campsReg.map(c => ({
              titulo: `${c.titulo}, ${c.sub}`,
              paragrafos: [{ img: c.banner }, ...dividirTexto(c.resumo)]
            }))
          ];
          return Leitor.abrir(it, {
            titulo: r.nome,
            sub: 'Dossiê e Crônicas de Runeterra',
            imagem: fac?.imagem || it.banner,
            fonte: 'Riot Games · Universo de Runeterra',
            secoes,
            irPara: cap
          });
        }
        case 'lor': {
          const k = it.carta;
          return Leitor.abrir(it, { titulo: it.titulo, sub: it.sub, imagem: it.banner, fonte: 'Legends of Runeterra', secoes: [{ titulo: 'Introdução', paragrafos: [k.flavor && { citacao: k.flavor }, k.desc && `Texto: ${k.desc}`, `${k.tipo || ''} · ${k.raridade || ''} · ${(k.regioes || []).join(', ')}`, k.artista && `Arte por ${k.artista}.`].filter(Boolean) }] });
        }
        case 'ia': {
          toast('Carregando páginas da HQ...');
          try {
            const { meta, vol, paginas } = await Fontes.arquivoPaginasVolume(it.ident, cap || 0);
            return LeitorHQ.abrirImagens(it, paginas, {
              sub: meta.volumes.length > 1 ? `${vol.nome} (${paginas.length} págs.)` : `${paginas.length} páginas · Português`,
              volumes: meta.volumes,
              volAtual: vol.indice,
              aoTrocarVolume: (novoIndice) => abrirLeitura(it.id, novoIndice)
            });
          } catch (e) {
            console.warn('Fallback para visualizador IA:', e);
            registrarLeitura(it, 0.5, 'Acervo Digital');
            return Frame.abrir(it.titulo, it.sub, `https://archive.org/embed/${it.ident}`, `https://archive.org/details/${it.ident}`);
          }
        }
        case 'serie-pasta': {
          const eds = edicoesDaSerie(it).filter(ed => conteudoPermitido(ed));
          if (!eds.length) {
            toast('Esta subpasta ainda não possui edições. Adicione a Edição #1!');
            return abrirDetalhe(it.id);
          }
          const alvoEd = eds[cap || 0] || eds[0];
          return abrirLeitura(alvoEd.id);
        }
        case 'ext-hq': {
          const edsSerie = it.serieId ? edicoesDaSerie(it.serieId).filter(ed => conteudoPermitido(ed)) : [];
          const idxSerie = edsSerie.findIndex(e => e.id === it.id);
          const serieRef = it.serieId ? (REG.get(it.serieId) || series.find(s => s.id === it.serieId)) : null;
          if (it.paginas?.length) {
            return LeitorHQ.abrirImagens(it, it.paginas, {
              inicio: cap,
              sub: `${it.paginas.length} páginas · ${serieRef ? `📁 ${serieRef.titulo} #${it.edicaoNum || (idxSerie + 1)} · ` : ''}${it.formatoObra || 'HQ'}${it.heroiNome ? ' · ' + it.heroiNome : ''}`,
              volumes: edsSerie.length > 1 ? edsSerie.map((e, i) => ({ indice: i, nome: `Edição #${e.edicaoNum || (i + 1)} — ${e.titulo}` })) : undefined,
              volAtual: idxSerie >= 0 ? idxSerie : 0,
              aoTrocarVolume: edsSerie.length > 1 ? (novoIdx) => { const prox = edsSerie[novoIdx]; if (prox) abrirLeitura(prox.id); } : undefined
            });
          }
          if (it.textoLore) {
            const secoes = edsSerie.length > 1 && edsSerie.every(e => e.textoLore)
              ? edsSerie.map((e, i) => ({ titulo: `Edição #${e.edicaoNum || (i + 1)} — ${e.titulo}`, paragrafos: dividirTexto(e.textoLore) }))
              : [{ titulo: it.titulo, paragrafos: dividirTexto(it.textoLore) }];
            return Leitor.abrir(it, {
              titulo: serieRef ? `${serieRef.titulo} — ${it.titulo}` : it.titulo,
              sub: `${it.formatoObra || 'Lore'}${it.heroiNome ? ' · ' + it.heroiNome : ''}`,
              imagem: it.capa || serieRef?.capa,
              fonte: (col(it.colecao)?.nome || 'Acervo Pessoal') + ' · ' + (it.formatoObra || 'Lore'),
              secoes,
              irPara: edsSerie.length > 1 && idxSerie >= 0 ? idxSerie : cap,
              link: it.url
            });
          }
          if (it.url && /\.pdf(\?|#|$)/i.test(it.url)) {
            toast('Abrindo PDF no leitor padrão...');
            try {
              return await LeitorHQ.abrirPDF(it, it.url, {
                inicio: cap,
                sub: `${serieRef ? `📁 ${serieRef.titulo} #${it.edicaoNum || (idxSerie + 1)} · ` : ''}${it.formatoObra || 'HQ'}${it.heroiNome ? ' · ' + it.heroiNome : ''}`,
                volumes: edsSerie.length > 1 ? edsSerie.map((e, i) => ({ indice: i, nome: `Edição #${e.edicaoNum || (i + 1)} — ${e.titulo}` })) : undefined,
                volAtual: idxSerie >= 0 ? idxSerie : 0,
                aoTrocarVolume: edsSerie.length > 1 ? (novoIdx) => { const prox = edsSerie[novoIdx]; if (prox) abrirLeitura(prox.id); } : undefined
              });
            } catch {
              // Se o servidor externo bloquear CORS, abre no visualizador integrado como fallback
            }
          }
          if (!it.paginas?.length && !it.textoLore && !it.url) {
            toast('Esta edição ainda não possui páginas ou PDF anexado. Clique em Editar para anexar o arquivo!');
            return abrirDetalhe(it.id);
          }
          registrarLeitura(it, 0.5, it.formatoObra || 'Site Externo');
          return Frame.abrir(it.titulo, it.sub || (serieRef ? `📁 ${serieRef.titulo} #${it.edicaoNum || ''}` : it.formatoObra || 'Site Externo'), it.embed || it.url, it.url);
        }
        case 'drive': registrarLeitura(it, 0.5, 'Google Drive'); return Frame.abrir(it.titulo, 'Google Drive', it.embed, it.url);
        case 'local': return Biblioteca.abrir(it, cap);
        default: {
          if (it.url) {
            registrarLeitura(it, 0.5, it.formatoObra || 'Leitura');
            return Frame.abrir(it.titulo, it.sub || '', it.embed || it.url, it.url);
          }
          toast('Tipo de obra não suportado para leitura direta.');
        }
      }
    } catch (e) { toast('Erro ao abrir: ' + e.message); console.error(e); }
  }

  /* ---------------- Voz (narração) ---------------- */
  const Voz = {
    ativo: false, fila: [], i: 0,
    suportado: 'speechSynthesis' in window,
    carregar() {
      if (!this.suportado) return;
      const vs = speechSynthesis.getVoices().filter(v => /^pt/i.test(v.lang));
      const sel = $('#ltVoz');
      sel.innerHTML = vs.length ? vs.map(v => `<option value="${esc(v.name)}" ${v.name === prefs.voz ? 'selected' : ''}>${esc(v.name)} (${v.lang})</option>`).join('') : '<option>Voz padrão do sistema</option>';
    },
    iniciar(container, aPartirDe) {
      if (!this.suportado) return toast('Seu navegador não suporta narração.');
      this.parar();
      this.fila = $$('h1, h2, h3, p, blockquote', container).filter(e => e.textContent.trim() && !e.closest('.fim'));
      if (aPartirDe != null) this.i = Math.max(0, this.fila.indexOf(aPartirDe));
      else {
        const corpo = container.closest('.leitor-corpo'); const topo = corpo ? corpo.getBoundingClientRect().top : 0;
        this.i = Math.max(0, this.fila.findIndex(e => e.getBoundingClientRect().bottom > topo + 40));
      }
      this.ativo = true; $('#ltOuvir').textContent = '⏸'; this.falar();
    },
    falar() {
      if (!this.ativo || this.i >= this.fila.length) return this.parar();
      $$('.falando').forEach(e => e.classList.remove('falando'));
      const el = this.fila[this.i]; el.classList.add('falando'); el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const u = new SpeechSynthesisUtterance(el.textContent);
      u.lang = 'pt-BR'; u.rate = prefs.vel;
      const v = speechSynthesis.getVoices().find(x => x.name === prefs.voz) || speechSynthesis.getVoices().find(x => /^pt-BR/i.test(x.lang));
      if (v) u.voice = v;
      u.onend = () => { if (this.ativo) { this.i++; this.falar(); } };
      speechSynthesis.speak(u);
    },
    parar() {
      this.ativo = false; if (this.suportado) speechSynthesis.cancel();
      $$('.falando').forEach(e => e.classList.remove('falando'));
      const b = $('#ltOuvir'); if (b) b.textContent = '🔊';
    }
  };
  if (Voz.suportado) { speechSynthesis.onvoiceschanged = () => Voz.carregar(); Voz.carregar(); }

  /* ---------------- Leitor de texto ---------------- */
  const Leitor = {
    it: null, salvarT: null,
    aplicarPrefs() {
      const c = $('#ltCorpo');
      c.classList.remove('escuro', 'sepia', 'claro'); c.classList.add(prefs.tema);
      c.classList.toggle('sans', prefs.fonte === 'sans');
      c.style.setProperty('--tam', prefs.tam + 'px'); c.style.setProperty('--larg', prefs.larg + 'px');
      $$('[data-tema]').forEach(b => b.classList.toggle('ativo', b.dataset.tema === prefs.tema));
      $$('[data-fonte]').forEach(b => b.classList.toggle('ativo', b.dataset.fonte === prefs.fonte));
      $('#ltVelocidade').value = prefs.vel;
    },
    abrir(it, { titulo, sub, imagem, fonte, secoes = [], irPara, link }) {
      this.it = it; this.modoInterativo = false;
      $('#ltTitulo').textContent = titulo; $('#ltSub').textContent = sub || '';
      const secoesValidas = (secoes && secoes.length ? secoes : [{ titulo: 'História', paragrafos: [it?.resumo || 'Sem texto disponível.'] }]).map(s => ({
        titulo: s.titulo || 'Capítulo',
        paragrafos: Array.isArray(s.paragrafos) ? s.paragrafos : (s.paragrafos ? [s.paragrafos] : [''])
      }));
      const palavras = secoesValidas.reduce((n, s) => n + s.paragrafos.map(p => typeof p === 'string' ? p : (p.citacao || '')).join(' ').split(/\s+/).length, 0);
      const corpoP = (p) => {
        if (typeof p === 'string') return `<p>${esc(p)}</p>`;
        if (p.sub) return `<h3 style="font-family:Inter;font-size:.95em;margin:1.4em 0 .5em">${esc(p.sub)}</h3>`;
        if (p.citacao) return `<blockquote>${esc(p.citacao)}</blockquote>`;
        if (p.img) return `<div class="abertura" style="margin:10px 0 20px"><img src="${esc(p.img)}" loading="lazy" alt=""></div>`;
        return '';
      };
      $('#ltTexto').innerHTML = `
        ${imagem ? `<div class="abertura"><img src="${esc(imagem)}" alt=""></div>` : ''}
        <h1>${esc(titulo)}</h1>
        <div class="linha-fonte">${esc(fonte || '')} · ⏱ ${Math.max(1, Math.round(palavras / 200))} min de leitura</div>
        ${secoesValidas.map((s, i) => `${i > 0 || s.titulo !== 'Introdução' ? `<h2 id="cap-${i}" data-cap="${i}">${esc(s.titulo)}</h2>` : `<span id="cap-${i}" data-cap="${i}"></span>`}${s.paragrafos.map(corpoP).join('')}`).join('')}
        ${this.rodape(it, link)}`;
      $('#ltPainelCapitulos').innerHTML = `<h4 style="margin:4px 8px 12px">Capítulos (${secoesValidas.length})</h4>` + secoesValidas.map((s, i) => `<button data-ir-cap="${i}">${i + 1}. ${esc(s.titulo)}</button>`).join('');
      this.mostrar();
      const corpo = $('#ltCorpo');
      const salvo = posicaoSalva(it.id);
      corpo.style.scrollBehavior = 'auto';
      requestAnimationFrame(() => {
        if (irPara != null) { const a = $('#cap-' + irPara); if (a) corpo.scrollTop = a.offsetTop - 20; }
        else if (salvo?.pos && salvo.prog < 0.99) { corpo.scrollTop = salvo.pos * (corpo.scrollHeight - corpo.clientHeight); toast('Continuando de onde você parou'); }
        else corpo.scrollTop = 0;
        corpo.style.scrollBehavior = '';
        this.aoRolar();
      });
    },
    rodape(it, link) {
      const nota = avaliacoes[it.id] || 0;
      const sug = embaralhar([...REG.values()].filter(x => x.id !== it.id && x.colecao && x.colecao === it.colecao && x.tipo !== 'lor')).slice(0, 6);
      return `<div class="fim">
        <p style="font-size:32px">✦</p><h3>Fim da leitura</h3>
        <p style="color:var(--txt2);font-size:14px;margin:6px 0 10px">Que nota você dá?</p>
        <div class="estrelas" data-avaliar="${esc(it.id)}">${[1, 2, 3, 4, 5].map(n => `<span data-n="${n}" class="${n <= nota ? 'on' : ''}">★</span>`).join('')}</div>
        ${link ? `<p style="margin-top:14px;font-size:13px"><a href="${esc(link)}" target="_blank" rel="noopener" style="color:var(--acento)">Ler na fonte original ↗</a></p>` : ''}
        ${sug.length ? `<h4 style="margin-top:36px">Continue explorando</h4><div class="sugestoes">${sug.map(s => cartao(s)).join('')}</div>` : ''}
      </div>`;
    },
    mostrar() {
      this.aplicarPrefs();
      $('#leitorTexto').classList.add('aberto'); document.body.style.overflow = 'hidden';
      $('#ltPainelAjustes').classList.remove('on'); $('#ltPainelCapitulos').classList.remove('on');
      $('#ltCapitulos').style.display = this.modoInterativo ? 'none' : '';
    },
    aoRolar() {
      const c = $('#ltCorpo'); const max = c.scrollHeight - c.clientHeight;
      const prog = max > 0 ? c.scrollTop / max : 1;
      $('#ltProgresso').style.width = (prog * 100) + '%';
      if (this.modoInterativo || !this.it) return;
      const caps = $$('[data-cap]', c);
      let atual = 0; caps.forEach((h, i) => { if (h.offsetTop - c.scrollTop < 140) atual = i; });
      $$('#ltPainelCapitulos button').forEach((b, i) => b.classList.toggle('atual', i === atual));
      clearTimeout(this.salvarT);
      this.salvarT = setTimeout(() => {
        const rot = caps[atual]?.textContent || 'Introdução';
        registrarLeitura(this.it, prog > 0.97 ? 1 : prog, `Capítulo ${atual + 1}${rot ? ' · ' + rot : ''}`, prog);
      }, 600);
    },
    fechar() { Voz.parar(); $('#leitorTexto').classList.remove('aberto'); }
  };

  /* ---------------- Histórias interativas ---------------- */
  const Interativa = {
    abrir(it, c) {
      this.it = it; this.c = c; this.caminho = [c.inicio];
      Leitor.it = it; Leitor.modoInterativo = true;
      $('#ltTitulo').textContent = c.titulo; $('#ltSub').textContent = 'História interativa · ' + col(c.colecao).nome;
      Leitor.mostrar(); this.render();
    },
    render() {
      const c = this.c, no = c.nos[this.caminho.at(-1)];
      const total = Object.values(c.nos).filter(n => n.fim).length;
      const passo = this.caminho.length;
      let html = '';
      if (passo === 1) html += `<div class="abertura"><img src="${col(c.colecao).capa || ''}" alt=""></div><h1>${esc(c.titulo)}</h1><div class="linha-fonte">${esc(col(c.colecao).nome)} · Aventura interativa · ${total} finais</div>`;
      else html += `<div class="caminho">Cena ${passo} · ${esc(c.titulo)}</div>`;
      html += no.t.map(p => `<p>${esc(p)}</p>`).join('');
      if (no.fim) {
        const lista = finais[this.it.id] = [...new Set([...(finais[this.it.id] || []), no.fim])];
        Auth.salvarDadosPerfil();
        const cores = { bom: '#3fd47a', ruim: '#ff6b6b', neutro: '#f5b301', secreto: '#b98cff' };
        html += `<div class="fim" style="margin-top:30px"><p style="font-size:42px">${no.tipoFim === 'secreto' ? '🌟' : no.tipoFim === 'bom' ? '🏆' : no.tipoFim === 'ruim' ? '💀' : '⚖️'}</p>
          <h2 style="border:0;color:${cores[no.tipoFim]};margin:0">${esc(no.fim)}</h2>
          <p style="color:var(--txt2);font-size:14px;margin:8px 0 20px">Você descobriu ${lista.length} de ${total} finais.</p>
          <div class="escolhas" style="max-width:420px;margin:0 auto"><button data-int="reiniciar">Recomeçar a aventura</button><button data-int="voltar">Voltar à última escolha</button></div>
          ${Leitor.rodape(this.it)}</div>`;
        registrarLeitura(this.it, 1, `Final: ${no.fim.replace(/^Final( Secreto)?:\s*/, '')}`);
      } else {
        html += `<div class="escolhas">${no.e.map(([txt, alvo]) => `<button data-int="${alvo}">${esc(txt)}</button>`).join('')}</div>`;
        if (passo > 1) html += `<p style="text-align:center"><button class="btn btn-sec" data-int="voltar">↶ Desfazer escolha</button></p>`;
        registrarLeitura(this.it, Math.min(0.9, passo / 5), `Cena ${passo}`);
      }
      $('#ltTexto').innerHTML = html;
      $('#ltCorpo').scrollTop = 0; Leitor.aoRolar();
      Voz.ativo && Voz.iniciar($('#ltTexto'));
    },
    acao(v) {
      if (v === 'reiniciar') this.caminho = [this.c.inicio];
      else if (v === 'voltar') { if (this.caminho.length > 1) this.caminho.pop(); }
      else this.caminho.push(v);
      this.render();
    }
  };

  /* ---------------- Utilitário de PDF (Capa da 1ª Página + Leitor Nativo) ---------------- */
  const PDFUtil = {
    configurar() {
      if (window.pdfjsLib && !window.pdfjsLib.GlobalWorkerOptions.workerSrc) {
        window.pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      }
    },
    async carregarDoc(blobOuUrl) {
      this.configurar();
      if (!window.pdfjsLib) throw new Error('Biblioteca PDF.js não carregada');
      if (typeof blobOuUrl === 'string') {
        return await window.pdfjsLib.getDocument({ url: blobOuUrl }).promise;
      }
      const buf = await blobOuUrl.arrayBuffer();
      return await window.pdfjsLib.getDocument({ data: new Uint8Array(buf) }).promise;
    },
    async renderPagina(pdfDoc, numPag = 1, larguraAlvo = 1350, comoBlobUrl = false) {
      const page = await pdfDoc.getPage(numPag);
      const vp1 = page.getViewport({ scale: 1 });
      const escala = Math.max(0.6, Math.min(2.6, larguraAlvo / (vp1.width || 600)));
      const viewport = page.getViewport({ scale: escala });
      const cv = document.createElement('canvas');
      cv.width = Math.round(viewport.width);
      cv.height = Math.round(viewport.height);
      const ctx = cv.getContext('2d', { alpha: false });
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, cv.width, cv.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      if (comoBlobUrl) {
        return await new Promise((resolve) => {
          cv.toBlob(b => resolve(b ? URL.createObjectURL(b) : cv.toDataURL('image/jpeg', 0.88)), 'image/jpeg', 0.88);
        });
      }
      return cv.toDataURL('image/jpeg', 0.85);
    },
    async extrairCapaEPaginas(blobOuUrl, larguraCapa = 460) {
      try {
        const pdfDoc = await this.carregarDoc(blobOuUrl);
        const paginas = pdfDoc.numPages || 1;
        const capa = await this.renderPagina(pdfDoc, 1, larguraCapa, false);
        try { pdfDoc.destroy(); } catch {}
        return { capa, paginas };
      } catch (e) {
        console.warn('Não foi possível extrair capa da 1ª página do PDF:', e);
        return { capa: null, paginas: 0 };
      }
    },
    async previasPaginas(blobOuUrl, max = 6) {
      try {
        const pdfDoc = await this.carregarDoc(blobOuUrl);
        const total = Math.min(max, pdfDoc.numPages || 0);
        const out = [];
        for (let i = 1; i <= total; i++) {
          out.push(await this.renderPagina(pdfDoc, i, 320, false));
        }
        try { pdfDoc.destroy(); } catch {}
        return out;
      } catch {
        return [];
      }
    }
  };

  /* ---------------- Leitor de HQ (Imagens, CBZ e PDF Padrão do Sistema) ---------------- */
  const LeitorHQ = {
    paginas: [], idx: 0, pilha: [], zoom: 1, ramificada: false, escolhas: [], mostrarEscolha: false, urls: [], volumes: [], volAtual: 0, aoTrocarVolume: null, pdfDoc: null,
    abrirImagens(it, urls = [], { inicio, sub, volumes = [], volAtual = 0, aoTrocarVolume = null } = {}) {
      this.limparPDF();
      if (!urls || !urls.length) {
        toast('Esta HQ ainda não possui páginas ou imagens carregadas.');
        return;
      }
      this.it = it; this.ramificada = false; this.urls = urls;
      this.paginas = urls.map(u => ({ src: u }));
      this.volumes = volumes; this.volAtual = volAtual; this.aoTrocarVolume = aoTrocarVolume;
      const salvo = posicaoSalva(it.id);
      this.idx = inicio ?? (salvo?.pos && salvo.prog < 0.99 ? Math.min(salvo.pos, urls.length - 1) : 0);
      this.preparar(it.titulo, sub || it.sub || `${urls.length} páginas`);
    },
    async abrirPDF(it, blobOuUrl, { inicio, sub, volumes = [], volAtual = 0, aoTrocarVolume = null } = {}) {
      this.limparPDF();
      const pdfDoc = await PDFUtil.carregarDoc(blobOuUrl);
      this.pdfDoc = pdfDoc;
      this.it = it;
      this.ramificada = false;
      this.urls = [];
      this.volumes = volumes;
      this.volAtual = volAtual;
      this.aoTrocarVolume = aoTrocarVolume;

      // Se a HQ em PDF foi enviada sem capa, usa automaticamente a 1ª página do PDF como capa!
      if (!it.capa) {
        PDFUtil.renderPagina(pdfDoc, 1, 460, false).then(capa1 => {
          if (capa1) {
            it.capa = capa1;
            it.banner = capa1;
            atualizarCapa(it.id);
            if (it.id.startsWith('local:')) {
              BD.pegar(it.id).then(o => {
                if (o) { o.capa = capa1; o.paginas = pdfDoc.numPages; BD.salvar(o); }
              }).catch(() => {});
            }
          }
        }).catch(() => {});
      }

      const totalPags = pdfDoc.numPages || 1;
      this.paginas = Array.from({ length: totalPags }, (_, i) => ({
        pdfPage: i + 1,
        src: null,
        thumb: i === 0 && it.capa ? it.capa : null,
        carregando: false
      }));

      const salvo = posicaoSalva(it.id);
      this.idx = inicio ?? (salvo?.pos && salvo.prog < 0.99 ? Math.min(salvo.pos, totalPags - 1) : 0);

      this.preparar(it.titulo, sub || `${totalPags} páginas · PDF (Leitor Padrão)`);
      this.garantirPaginaPDF(this.idx);
      if (prefs.hqModo === 'dupla' && this.idx + 1 < totalPags) {
        this.garantirPaginaPDF(this.idx + 1);
      }
      this.gerarMiniaturasPDF();
    },
    async garantirPaginaPDF(i) {
      const p = this.paginas[i];
      if (!p || !p.pdfPage || p.src || p.carregando || !this.pdfDoc) return p?.src;
      p.carregando = true;
      try {
        const docAtual = this.pdfDoc;
        const url = await PDFUtil.renderPagina(docAtual, p.pdfPage, 1380, true);
        if (this.pdfDoc !== docAtual) {
          if (url?.startsWith('blob:')) URL.revokeObjectURL(url);
          return null;
        }
        p.src = url;
        if (url?.startsWith('blob:')) this.urls.push(url);
        // Atualiza a imagem no palco caso já esteja visível na tela
        $$(`#hqPalco img[data-pdf-pg="${i}"]`).forEach(img => { img.src = url; img.style.filter = ''; });
        $$(`#hqMiniaturas button[data-hq-ir="${i}"]`).forEach(btn => {
          if (!btn.querySelector('img')) btn.innerHTML = `<img src="${esc(p.thumb || url)}" loading="lazy" alt="">`;
        });
        return url;
      } catch (e) {
        console.warn('Erro ao renderizar página do PDF:', i + 1, e);
        return null;
      } finally {
        p.carregando = false;
      }
    },
    async gerarMiniaturasPDF() {
      const docAtual = this.pdfDoc;
      if (!docAtual) return;
      const limite = Math.min(this.paginas.length, 40);
      for (let i = 0; i < limite; i++) {
        if (this.pdfDoc !== docAtual) break;
        const p = this.paginas[i];
        if (!p.thumb && !p.src) {
          try {
            p.thumb = await PDFUtil.renderPagina(docAtual, p.pdfPage, 200, false);
            $$(`#hqMiniaturas button[data-hq-ir="${i}"]`).forEach(btn => {
              btn.innerHTML = `<img src="${esc(p.thumb)}" loading="lazy" alt="">`;
            });
          } catch {}
        }
      }
    },
    limparPDF() {
      if (this.pdfDoc) {
        try { this.pdfDoc.destroy(); } catch {}
        this.pdfDoc = null;
      }
    },
    abrirRamificada(it, h) {
      this.limparPDF();
      this.it = it; this.h = h; this.ramificada = true; this.urls = []; this.volumes = []; this.aoTrocarVolume = null;
      this.paginas = h.paginas; this.idx = 0; this.pilha = []; this.escolhas = []; this.mostrarEscolha = false;
      this.preparar(h.titulo, 'HQ interativa · escolha o destino da heroína');
    },
    preparar(titulo, sub) {
      $('#hqTitulo').textContent = titulo; $('#hqSub').textContent = sub;
      const sel = $('#hqModo'); sel.value = this.ramificada ? 'pagina' : prefs.hqModo; sel.disabled = this.ramificada;
      // Seletor de volume/edição na barra superior quando houver múltiplos volumes
      let selVol = $('#hqVolume');
      if (this.volumes.length > 1) {
        if (!selVol) {
          sel.insertAdjacentHTML('beforebegin', '<select id="hqVolume" title="Escolher volume ou edição"></select>');
          selVol = $('#hqVolume');
          selVol.onchange = (e) => this.aoTrocarVolume?.(+e.target.value);
        }
        selVol.style.display = '';
        selVol.innerHTML = this.volumes.map(v => `<option value="${v.indice}" ${v.indice === this.volAtual ? 'selected' : ''}>#${v.indice + 1} · ${esc(v.nome.slice(0, 34))}</option>`).join('');
      } else if (selVol) selVol.style.display = 'none';

      $('#hqSlider').disabled = this.ramificada; $('#hqMiniaturasBtn').style.display = this.ramificada ? 'none' : '';
      $('#hqMiniaturas').classList.remove('on');
      this.zoom = 1;
      const palco = $('#hqPalco');
      palco.style.setProperty('--zoom', 1);
      palco.classList.remove('zoom-ativo', 'arrastando');
      palco.scrollLeft = 0; palco.scrollTop = 0;
      $('#hqZoomBadge')?.classList.remove('visivel');

      // Sincroniza controles novos (Sentido Mangá, Som de Folha e Modo Cinema)
      const leitorEl = $('#leitorHQ');
      leitorEl.classList.add('aberto');
      leitorEl.classList.toggle('manga-rtl', !!prefs.hqRTL);
      leitorEl.classList.toggle('modo-cinema', !!prefs.hqCinema);
      document.body.style.overflow = 'hidden';

      const btnSentido = $('#hqSentido');
      if (btnSentido) {
        btnSentido.textContent = prefs.hqRTL ? '🎌' : '📖';
        btnSentido.title = prefs.hqRTL ? 'Sentido: Mangá (Dir→Esq) [Atalho: R]' : 'Sentido: Ocidental (Esq→Dir) [Atalho: R]';
        btnSentido.classList.toggle('ativo', !!prefs.hqRTL);
      }
      const btnSom = $('#hqSom');
      if (btnSom) {
        btnSom.textContent = prefs.hqSom ? '🔊' : '🔇';
        btnSom.title = prefs.hqSom ? 'Som de folha: Ligado [Atalho: S]' : 'Som de folha: Desligado [Atalho: S]';
        btnSom.classList.toggle('ativo', !!prefs.hqSom);
      }
      const btnCinema = $('#hqCinema');
      if (btnCinema) {
        btnCinema.textContent = '🎬';
        btnCinema.title = prefs.hqCinema ? 'Modo Cinema: Ativo [Atalho: C]' : 'Modo Cinema: Inativo [Atalho: C]';
        btnCinema.classList.toggle('ativo', !!prefs.hqCinema);
      }

      this.miniaturas(); this.render();
    },
    get modo() { return this.ramificada ? 'pagina' : prefs.hqModo; },
    paginaHTML(i) {
      const p = this.paginas[i]; if (!p) return '';
      if (p.pdfPage) {
        if (!p.src) this.garantirPaginaPDF(i);
        const placeholder = p.src || p.thumb || this.it?.capa || '';
        return `<div class="hq-pagina" data-pg="${i}"><img data-pdf-pg="${i}" src="${esc(placeholder)}" alt="Página ${i + 1}" style="${!p.src && p.thumb ? 'filter:blur(2px)' : ''}" loading="${this.modo === 'rolagem' ? 'lazy' : 'eager'}"></div>`;
      }
      if (p.src) return `<div class="hq-pagina" data-pg="${i}"><img src="${esc(p.src)}" alt="Página ${i + 1}" loading="${this.modo === 'rolagem' ? 'lazy' : 'eager'}"></div>`;
      if (p.capa) return `<div class="hq-pagina"><img src="${p.capa}" alt="Capa" style="object-fit:cover"></div>`;
      if (p.fim) {
        const achados = finais[this.it.id] || [];
        return `<div class="hq-pagina"><div class="pagina-fim"><h2>FIM?</h2><p><b>${esc(p.t)}</b></p><p>${esc(p.d)}</p>
          <p>🏆 Finais descobertos: ${achados.length}/4</p>${achados.map(f => `<p style="font-size:12px;color:var(--acento)">${esc(f)}</p>`).join('')}
          <button class="btn btn-pri" data-hq="reiniciar">↺ Ler novamente</button><button class="btn btn-sec" data-hq="fechar">Sair da HQ</button></div></div>`;
      }
      const paineis = p.p.map((pn, k) => `<div class="painel-hq"><img src="${pn.img}" alt="" style="object-position:${pn.pos || 'center'};${pn.esc ? `transform:scale(${pn.esc})` : ''}">
        ${pn.b.map(([t, txt, x, y], j) => `<div class="balao ${t}" style="left:${x}%;top:${y}%;animation-delay:${(k * 0.6 + j * 0.45 + 0.2).toFixed(2)}s">${esc(txt)}</div>`).join('')}</div>`).join('');
      const escolha = p.e && this.mostrarEscolha ? `<div class="escolha-hq"><h3>${esc(p.e.t)}</h3>${p.e.op.map(([txt, alvo]) => `<button data-hq-escolha="${alvo}" data-txt="${esc(txt)}">${esc(txt)}</button>`).join('')}</div>` : '';
      return `<div class="hq-pagina"><div class="pagina-arte ${p.l}">${paineis}</div>${escolha}</div>`;
    },
    render() {
      const palco = $('#hqPalco'); const modo = this.modo;
      palco.classList.toggle('rolagem', modo === 'rolagem');
      $('#leitorHQ').classList.toggle('rolagem-on', modo === 'rolagem');
      if (modo === 'rolagem') {
        palco.innerHTML = this.paginas.map((_, i) => this.paginaHTML(i)).join('');
        if (this.pdfDoc) {
          for (let k = Math.max(0, this.idx - 1); k <= Math.min(this.paginas.length - 1, this.idx + 4); k++) {
            this.garantirPaginaPDF(k);
          }
        }
      } else if (modo === 'dupla' && this.idx > 0) {
        const a = this.idx % 2 === 1 ? this.idx : this.idx - 1;
        this.idx = a;
        // Modo Mangá (RTL): inverte a ordem das duas páginas na tela
        palco.innerHTML = prefs.hqRTL
          ? this.paginaHTML(a + 1) + this.paginaHTML(a)
          : this.paginaHTML(a) + this.paginaHTML(a + 1);
      } else palco.innerHTML = this.paginaHTML(this.idx);
      if (modo !== 'rolagem') {
        palco.scrollTop = 0;
        // Pré-carrega as próximas páginas (imagem ou PDF) para leitura instantânea
        [this.idx + 1, this.idx + 2, this.idx - 1].forEach(k => {
          const pg = this.paginas[k];
          if (!pg) return;
          if (pg.pdfPage) this.garantirPaginaPDF(k);
          else if (pg.src) { const im = new Image(); im.src = pg.src; }
        });
      } else requestAnimationFrame(() => { const el = $(`[data-pg="${this.idx}"]`, palco); if (el) el.scrollIntoView(); });
      this.atualizarInfo();
    },
    atualizarInfo() {
      const n = this.paginas.length;
      const nextButton=$('#hqNextIssue');
      const editions=this.it?.serieId?edicoesDaSerie(this.it.serieId).filter(conteudoPermitido):[];
      const position=editions.findIndex(it=>it.id===this.it?.id);
      const next=position>=0?editions[position+1]:null;
      nextButton.hidden=!next||this.ramificada||this.idx+(this.modo==='dupla'&&this.idx>0?2:1)<n;
      if(next){nextButton.dataset.ler=next.id;nextButton.textContent='Próxima edição: '+next.titulo;}else delete nextButton.dataset.ler;
      const brightness=Math.max(40,Math.min(100,Number(prefs.hqBrightness)||100));
      $('#hqPalco').style.filter=`brightness(${brightness}%)`;
      $('#hqBrightness').value=brightness;$('#hqGestures').checked=prefs.hqGestures!==false;
      const atual = this.ramificada ? this.pilha.length + 1 : this.idx + 1;
      $('#hqContador').textContent = this.ramificada ? `Página ${atual}` : `${n ? atual : 0} / ${n}`;
      const s = $('#hqSlider'); s.max = Math.max(1, n); s.value = Math.min(s.max, this.idx + 1);
      const prog = this.ramificada ? (this.paginas[this.idx]?.fim ? 1 : Math.min(0.95, atual / 7)) : (n > 1 ? this.idx / (n - 1) : 1);
      $('#hqProgresso').style.width = prog * 100 + '%';
      $$('#hqMiniaturas button').forEach((b, i) => b.classList.toggle('atual', i === this.idx));
      if (this.pdfDoc && this.modo === 'rolagem') {
        for (let k = Math.max(0, this.idx - 1); k <= Math.min(n - 1, this.idx + 3); k++) this.garantirPaginaPDF(k);
      }
      registrarLeitura(this.it, prog, `Página ${atual}`, this.ramificada ? 0 : this.idx);
    },
    miniaturas() {
      $('#hqMiniaturas').innerHTML = this.ramificada ? '' : this.paginas.slice(0, 80).map((p, i) => `<button data-hq-ir="${i}">${(p.src || p.thumb) ? `<img src="${esc(p.src || p.thumb)}" loading="lazy" alt="">` : i + 1}</button>`).join('');
    },
    prox() {
      if (this.modo === 'rolagem') return;
      SomFolha.tocar();
      const p = this.paginas[this.idx];
      if (this.ramificada) {
        if (p.e && !this.mostrarEscolha) { this.mostrarEscolha = true; return this.render(); }
        if (p.e) return toast('Faça uma escolha para continuar!');
        if (p.fim) return;
        const alvo = p.vai ? this.paginas.findIndex(x => x.id === p.vai) : this.idx + 1;
        this.pilha.push(this.idx); this.idx = alvo; this.mostrarEscolha = false;
        if (this.paginas[alvo]?.fim) this.registrarFinal();
        return this.render();
      }
      const passo = this.modo === 'dupla' && this.idx > 0 ? 2 : 1;
      if (this.idx + passo < this.paginas.length) { this.idx += passo; this.render(); }
      else if (this.volumes.length > 1 && this.volAtual + 1 < this.volumes.length) {
        toast(`Abrindo Edição / Volume #${this.volAtual + 2}...`);
        this.aoTrocarVolume?.(this.volAtual + 1);
      } else toast('Você chegou ao fim! 🎉');
    },
    ant() {
      if (this.modo === 'rolagem') return;
      SomFolha.tocar();
      if (this.ramificada) {
        if (this.mostrarEscolha) { this.mostrarEscolha = false; return this.render(); }
        if (!this.pilha.length) return;
        const v = this.pilha.pop(); if (this.paginas[this.idx]?.e || this.paginas[v]?.e) this.escolhas = this.escolhas.slice(0, this.pilha.filter(i => this.paginas[i].e).length);
        this.idx = v; this.mostrarEscolha = false; return this.render();
      }
      const passo = this.modo === 'dupla' && this.idx > 1 ? 2 : 1;
      this.idx = Math.max(0, this.idx - passo); this.render();
    },
    alternarSentido() {
      prefs.hqRTL = !prefs.hqRTL;
      salvarPrefs();
      $('#leitorHQ').classList.toggle('manga-rtl', !!prefs.hqRTL);
      const btn = $('#hqSentido');
      if (btn) {
        btn.textContent = prefs.hqRTL ? '🎌' : '📖';
        btn.title = prefs.hqRTL ? 'Sentido: Mangá (Dir→Esq) [Atalho: R]' : 'Sentido: Ocidental (Esq→Dir) [Atalho: R]';
        btn.classList.toggle('ativo', !!prefs.hqRTL);
      }
      toast(prefs.hqRTL ? '🎌 Modo Mangá ativado (Dir→Esq)' : '📖 Modo Ocidental ativado (Esq→Dir)');
      this.render();
    },
    alternarSom() {
      prefs.hqSom = !prefs.hqSom;
      salvarPrefs();
      const btn = $('#hqSom');
      if (btn) {
        btn.textContent = prefs.hqSom ? '🔊' : '🔇';
        btn.title = prefs.hqSom ? 'Som de folha: Ligado [Atalho: S]' : 'Som de folha: Desligado [Atalho: S]';
        btn.classList.toggle('ativo', !!prefs.hqSom);
      }
      if (prefs.hqSom) SomFolha.tocar();
      toast(prefs.hqSom ? '🔊 Som de página ativado' : '🔇 Som de página desativado');
    },
    alternarCinema() {
      prefs.hqCinema = !prefs.hqCinema;
      salvarPrefs();
      $('#leitorHQ').classList.toggle('modo-cinema', !!prefs.hqCinema);
      const btn = $('#hqCinema');
      if (btn) {
        btn.textContent = '🎬';
        btn.title = prefs.hqCinema ? 'Modo Cinema: Ativo [Atalho: C]' : 'Modo Cinema: Inativo [Atalho: C]';
        btn.classList.toggle('ativo', !!prefs.hqCinema);
      }
      toast(prefs.hqCinema ? '🎬 Modo Cinema ativado' : '🎬 Modo Cinema desativado');
    },
    ajudaAtalhos() {
      toast('⌨️ Atalhos: ←/→ Páginas · F Tela Cheia · M Modo · C Cinema · S Som · R Mangá · +/- Zoom · Esc Sair');
    },
    escolher(alvo, txt) {
      this.escolhas.push(txt.replace(/^\W+\s*/, ''));
      this.pilha.push(this.idx); this.idx = this.paginas.findIndex(x => x.id === alvo); this.mostrarEscolha = false;
      this.render();
    },
    registrarFinal() {
      const nome = this.escolhas.join(' → ');
      finais[this.it.id] = [...new Set([...(finais[this.it.id] || []), nome])];
      Auth.salvarDadosPerfil();
      toast('🏆 Final desbloqueado!');
    },
    ir(i) { this.idx = Math.max(0, Math.min(this.paginas.length - 1, i)); this.render(); },
    fechar() {
      fecharOpcoesHQ();
      const el = $('#leitorHQ');
      el.classList.remove('aberto', 'modo-cinema', 'mostrar-barras');
      this.limparPDF();
      this.zoom = 1;
      $('#hqPalco')?.classList.remove('zoom-ativo', 'arrastando');
      $('#hqZoomBadge')?.classList.remove('visivel');
      this.urls.forEach(u => u.startsWith('blob:') && URL.revokeObjectURL(u)); this.urls = [];
    }
  };

  /* ---------------- Visualizador externo ---------------- */
  const Frame = {
    abrir(titulo, sub, src, externo) {
      if (!src && !externo) {
        toast('Link de leitura não configurado para esta obra.');
        return;
      }
      $('#frTitulo').textContent = titulo; $('#frSub').textContent = sub || '';
      $('#frIframe').src = src || externo; $('#frExterno').href = externo || src;
      $('#leitorFrame').classList.add('aberto'); document.body.style.overflow = 'hidden';
    },
    fechar() { $('#leitorFrame').classList.remove('aberto'); $('#frIframe').src = 'about:blank'; if (this.blob) { URL.revokeObjectURL(this.blob); this.blob = null; } }
  };

  function fecharLeitores() {
    Leitor.fechar(); LeitorHQ.fechar(); Frame.fechar();
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
    document.body.style.overflow = $('#detalhe').classList.contains('aberta') ? 'hidden' : '';
    renderContinuar();
    $$('.cartao').forEach(c => {
      const h = historico.find(x => x.id === c.dataset.id); if (!h) return;
      let b = $('.barra-prog i', c);
      if (!b) { $('.capa', c).insertAdjacentHTML('beforeend', '<div class="barra-prog"><i></i></div>'); b = $('.barra-prog i', c); }
      b.style.width = Math.round(h.prog * 100) + '%';
    });
    if (abaAtual === 'historico') renderHistorico();
  }
  const leitorAberto = () => $('.leitor.aberto');

  /* ---------------- Biblioteca local (IndexedDB) + Drive ---------------- */
  const BD = EQLocalLibrary.create(() => Auth.usuario);
  const IMG_RE = /\.(jpe?g|png|gif|webp|avif|bmp)$/i;
  const ordenarNat = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

  async function miniatura(blob, w = 360) {
    try {
      const bmp = await createImageBitmap(blob);
      const h = Math.round(bmp.height * w / bmp.width);
      const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
      cv.getContext('2d').drawImage(bmp, 0, 0, w, h); return cv.toDataURL('image/jpeg', 0.84);
    } catch { return null; }
  }
  async function lerEPUB(blob) {
    const zip = await JSZip.loadAsync(blob);
    const cont = await zip.file('META-INF/container.xml').async('text');
    const opfPath = cont.match(/full-path="([^"]+)"/)[1];
    const base = opfPath.includes('/') ? opfPath.replace(/[^/]+$/, '') : '';
    const opf = new DOMParser().parseFromString(await zip.file(opfPath).async('text'), 'application/xml');
    const titulo = opf.getElementsByTagNameNS('*', 'title')[0]?.textContent;
    const autor = opf.getElementsByTagNameNS('*', 'creator')[0]?.textContent;
    const man = {}; [...opf.getElementsByTagNameNS('*', 'item')].forEach(i => man[i.getAttribute('id')] = i.getAttribute('href'));
    const secoes = [];
    for (const ref of opf.getElementsByTagNameNS('*', 'itemref')) {
      const href = man[ref.getAttribute('idref')]; if (!href) continue;
      const f = zip.file(base + decodeURIComponent(href)) || zip.file(base + href); if (!f) continue;
      const doc = new DOMParser().parseFromString(await f.async('text'), 'text/html');
      const ps = [...doc.querySelectorAll('p, blockquote')].map(p => p.textContent.replace(/\s+/g, ' ').trim()).filter(Boolean);
      if (!ps.length) continue;
      secoes.push({ titulo: doc.querySelector('h1,h2,h3')?.textContent.trim() || doc.title || `Parte ${secoes.length + 1}`, paragrafos: ps });
    }
    return { titulo, autor, secoes };
  }

  function extrairNumeroDoNome(nome) {
    if (!nome) return null;
    const m = nome.match(/(?:#|vol(?:ume|\.)?|ed(?:i[çc][aã]o|\.)?|cap(?:[ií]tulo|\.)?|parte)\s*0*(\d+)/i)
      || nome.match(/(?:^|[_\-–—\s])0*(\d{1,4})(?:[_\-–—\s.]|$)/);
    if (m && m[1]) {
      const num = parseInt(m[1], 10);
      if (!isNaN(num) && num > 0 && num < 10000) return num;
    }
    return null;
  }

  const Biblioteca = {
    async guardarLocal(o) {
      o.localOnly = true;
      try {
        await BD.salvar(o);
        Biblioteca.item(o);
        return true;
      } catch (error) {
        toast('Não foi possível guardar no navegador. Confira o espaço livre do dispositivo e faça backup dos seus arquivos.');
        return false;
      }
    },
    async publicar(o) {
      if (!Auth.admin) return false;
      if (o.localOnly) return Biblioteca.guardarLocal(o);
      const saveButton = $('#extSalvarBtn');
      if (saveButton) saveButton.disabled = true;
      try {
        await BD.salvar(o);
        if (!o.storagePath) {
          let file = o.blob;
          if (o.formato === 'imagens') {
            if (!window.JSZip) throw new Error('A biblioteca ZIP não carregou. Tente novamente.');
            const zip = new JSZip();
            o.blobs.forEach((blob, i) => zip.file(String(i + 1).padStart(5, '0') + '.' + (blob.name?.split('.').pop() || 'jpg'), blob));
            file = await zip.generateAsync({ type: 'blob' });
          }
          if (!file) throw new Error('Arquivo não encontrado neste navegador. Anexe-o novamente.');
          const format = o.formato === 'imagens' ? 'cbz' : o.formato;
          if (file.size > 500 * 1024 * 1024) throw new Error('O arquivo excede o limite de 500 MB por HQ.');
          syncStatus('Enviando "' + o.nome + '" para os leitores…');
          const upload = await EQAccount.api('file-upload', 'POST', { format, size: file.size }, Auth.usuario.id);
          const parts = upload.parts || [{ path: upload.path, url: upload.url, size: file.size }];
          let offset = 0;
          for (const [index, part] of parts.entries()) {
            syncStatus('Enviando "' + o.nome + '”: parte ' + (index + 1) + ' de ' + parts.length + '…');
            const response = await fetch(part.url, { method: 'PUT', headers: { 'Content-Type': file.type || 'application/octet-stream' }, body: file.slice(offset, offset + part.size) });
            if (!response.ok) throw new Error('O envio falhou (HTTP ' + response.status + '). Sua cópia local foi preservada. Confira o espaço disponível no Supabase e tente novamente.');
            offset += part.size;
          }
          o.storagePath = parts[0].path;
          o.storageParts = parts.map(part => part.path);
          o.storageSize = file.size;
          if (o.formato === 'imagens') { o.formato = 'cbz'; o.blob = file; delete o.blobs; }
          await BD.salvar(o);
        }
        const item = Biblioteca.item(o);
        externas = [snap(item), ...externas.filter(x => x.id !== item.id)];
        Store.set('externas', externas);
        await catalogSync.flush();
        atualizarEspacoNuvem();
        syncStatus('HQ publicada: "' + o.nome + '" está disponível aos leitores.');
        return true;
      } catch (error) {
        Biblioteca.item(o);
        syncStatus('HQ ainda não publicada: ' + error.message, true);
        toast(error.message);
        return false;
      } finally { if (saveButton) saveButton.disabled = false; }
    },
    async publicarPendentes(button) {
      if (!Auth.admin) return;
      if (button) button.disabled = true;
      try {
        const files = await BD.todos();
        const pending = files.filter(o => !o.localOnly && !externas.some(it => it.id === o.id && it.storagePath));
        if (!pending.length) return toast('Não há arquivos locais pendentes neste navegador.');
        let count = 0;
        for (const item of pending) { const o = await BD.pegar(item.id); if (o && await Biblioteca.publicar(o)) count++; else break; }
        toast(`${count} de ${pending.length} HQ(s) publicadas para os leitores.`);
        renderBiblioteca();
      } catch (error) { syncStatus(error.message, true); }
      finally { if (button) button.disabled = false; }
    },
    async importar(arquivos, opcoes = {}) {
      if (!Auth.admin && !opcoes.local) return toast('Somente o administrador pode publicar conteúdo.');
      const importAccount = Auth.usuario?.id;
      const guardar = o => {
        if (Auth.usuario?.id !== importAccount) throw new Error('A conta mudou durante a importação.');
        return opcoes.local ? Biblioteca.guardarLocal(o) : Biblioteca.publicar(o);
      };
      arquivos = [...arquivos]; if (!arquivos.length) return;
      const imgs = arquivos.filter(f => IMG_RE.test(f.name)).sort((a, b) => ordenarNat(a.name, b.name));
      const outros = arquivos.filter(f => !IMG_RE.test(f.name)).sort((a, b) => ordenarNat(a.name, b.name));
      let n = 0;

      // Se o usuário selecionou um Herói ou uma Subpasta de Série no formulário da Biblioteca, vincula automaticamente!
      const selHeroi = $('#extHeroiSelect');
      const heroiId = opcoes.heroiId ?? (selHeroi?.value && selHeroi.value !== '__novo__' ? selHeroi.value : '');
      const hItem = heroiId ? REG.get(heroiId) : null;
      const heroiNome = opcoes.heroiNome ?? (hItem?.titulo || selHeroi?.selectedOptions?.[0]?.dataset?.nome || '');

      const selSerie = $('#extSerieSelect');
      const serieId = opcoes.serieId ?? (selSerie?.value && selSerie.value !== '__nova__' ? selSerie.value : '');
      const serieObj = serieId ? (REG.get(serieId) || series.find(s => s.id === serieId)) : null;
      const serieNome = opcoes.serieNome ?? (serieObj?.titulo || '');
      const colecao = opcoes.colecao || $('#extColecao')?.value || serieObj?.colecao || hItem?.colecao || 'arquivo';
      const formatoObra = opcoes.formatoObra || $('#extFormato')?.value || 'HQ';
      let proxEdNum = opcoes.edicaoNum || (serieObj ? edicoesDaSerie(serieObj.id).length + 1 : null);

      if (imgs.length) {
        const nome = opcoes.nome || (imgs.length > 1 ? (imgs[0].webkitRelativePath?.split('/')[0] || imgs[0].name.replace(/[\d_\-. ]*\.\w+$/, '') || 'Álbum de imagens') : imgs[0].name.replace(/\.\w+$/, ''));
        const capaImg = opcoes.capa || await miniatura(imgs[0]);
        const obj = {
          id: 'local:' + Date.now() + Math.random().toString(36).slice(2, 6),
          nome,
          sub: opcoes.sub || '',
          resumo: opcoes.resumo || '',
          formato: 'imagens',
          formatoObra,
          heroiId,
          heroiNome,
          serieId,
          serieNome,
          edicaoNum: proxEdNum,
          colecao,
          blobs: imgs,
          paginas: imgs.length,
          capa: capaImg,
          adicionado: Date.now()
        };
        if (!await guardar(obj)) return;
        n++;
        if (proxEdNum != null) proxEdNum++;
      }

      for (const f of outros) {
        const ext = f.name.split('.').pop().toLowerCase();
        const nomeBase = opcoes.nome && outros.length === 1 ? opcoes.nome : f.name.replace(/\.\w+$/, '');
        const numDetectado = extrairNumeroDoNome(f.name);
        const edNum = (opcoes.edicaoNum != null && outros.length === 1) ? opcoes.edicaoNum : (numDetectado != null ? numDetectado : proxEdNum);
        const base = {
          id: 'local:' + Date.now() + Math.random().toString(36).slice(2, 6),
          nome: nomeBase,
          sub: opcoes.sub || '',
          resumo: opcoes.resumo || '',
          formatoObra,
          heroiId,
          heroiNome,
          serieId,
          serieNome,
          edicaoNum: edNum,
          colecao,
          blob: f,
          adicionado: Date.now()
        };
        if (proxEdNum != null) proxEdNum++;
        try {
          if (['cbz', 'zip', 'cbr', 'rar'].includes(ext)) {
            let archive = f;
            if (['cbr', 'rar'].includes(ext)) {
              toast('Abrindo CBR: ' + f.name + '…');
              archive = await EQCBR.convert(f);
              base.blob = archive;
            }
            const zip = await JSZip.loadAsync(archive);
            const pgs = Object.values(zip.files).filter(z => !z.dir && IMG_RE.test(z.name) && !z.name.startsWith('__MACOSX')).sort((a, b) => ordenarNat(a.name, b.name));
            if (!pgs.length) { toast(`${f.name}: nenhuma imagem encontrada`); continue; }
            const capaCbz = opcoes.capa || await miniatura(await pgs[0].async('blob'));
            const obj = { ...base, formato: 'cbz', paginas: pgs.length, capa: capaCbz };
            if (!await guardar(obj)) continue;
            if (!opcoes.local && serieObj && !serieObj.capa && capaCbz) {
              serieObj.capa = capaCbz; serieObj.banner = capaCbz; reg(serieObj);
              series = [snap(serieObj), ...series.filter(s => s.id !== serieObj.id)]; Store.set('series', series);
            }
          } else if (ext === 'pdf') {
            toast(`📄 Extraindo 1ª página como capa de "${f.name}"...`);
            const metaPdf = await PDFUtil.extrairCapaEPaginas(f);
            // Usa a capa enviada pelo usuário se houver; caso contrário, usa automaticamente a 1ª página do PDF!
            const capaPdf = opcoes.capa || metaPdf.capa || serieObj?.capa || hItem?.capa || '';
            const obj = { ...base, formato: 'pdf', paginas: metaPdf.paginas || 0, capa: capaPdf };
            if (!await guardar(obj)) continue;
            if (!opcoes.local && serieObj && !serieObj.capa && capaPdf) {
              serieObj.capa = capaPdf; serieObj.banner = capaPdf; reg(serieObj);
              series = [snap(serieObj), ...series.filter(s => s.id !== serieObj.id)]; Store.set('series', series);
            }
          } else if (ext === 'epub') {
            const e = await lerEPUB(f);
            const obj = { ...base, nome: opcoes.nome || e.titulo || base.nome, autor: e.autor, formato: 'epub', paginas: e.secoes.length, capa: opcoes.capa || '' };
            if (!await guardar(obj)) continue;
          } else if (['txt', 'md'].includes(ext)) {
            const obj = { ...base, formato: 'txt', capa: opcoes.capa || '' };
            if (!await guardar(obj)) continue;

          } else {
            toast(`Formato .${ext} não suportado`); continue;
          }
          n++;
          if (proxEdNum != null) proxEdNum++;
        } catch (e) { toast(`Não foi possível importar ${f.name}. ${e.message || 'Confira o formato e o espaço livre do navegador.'}`); }
      }
      if (n) {
        renderMinhasHQs();
        toast(`📚 ${n} arquivo(s) adicionado(s) com capa e leitor padrão!`);
      }
      if (abaAtual === 'biblioteca') renderBiblioteca();
    },
    item(o) {
      const subPadrao = `${o.serieNome ? `📁 ${o.serieNome}${o.edicaoNum ? ` #${o.edicaoNum}` : ''} · ` : ''}${(o.formato || 'ARQ').toUpperCase()}${o.paginas ? ' · ' + o.paginas + (o.formato === 'epub' ? ' capítulos' : ' páginas') : ''}`;
      return reg({
        id: o.id,
        tipo: 'local',
        formatoObra: o.formatoObra || (o.formato === 'epub' || o.formato === 'txt' ? 'Lore' : 'HQ'),
        heroiId: o.heroiId || '',
        heroiNome: o.heroiNome || '',
        serieId: o.serieId || '',
        serieNome: o.serieNome || '',
        edicaoNum: o.edicaoNum || null,
        colecao: o.colecao || 'arquivo',
        titulo: o.nome,
        sub: o.sub || subPadrao,
        resumo: o.resumo || '',
        capa: o.capa,
        banner: o.capa,
        formato: o.formato,
        readingKey: o.packageHash ? 'sha256:' + o.packageHash : o.id,
        localOnly: !!o.localOnly,
        storagePath: o.storagePath || '',
        ...(o.storageParts ? { storageParts: o.storageParts, storageSize: o.storageSize } : {}),
        paginasCount: o.paginas || 0
      });
    },
    async abrir(it, cap) {
      let o;
      if (it.storagePath) {
        try {
          toast('Carregando o arquivo compartilhado…');
          const signed = await EQAccount.api('file-read', 'POST', { id: it.id }, Auth.usuario.id);
          const blobs = [];
          for (const url of (signed.urls || [signed.url])) {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Não foi possível baixar a HQ completa. Tente novamente.');
            blobs.push(await response.blob());
          }
          const blob = new Blob(blobs, { type: blobs[0]?.type });
          if (signed.size && blob.size !== signed.size) throw new Error('O arquivo recebido está incompleto. Tente novamente.');
          o = { ...it, nome: it.titulo, paginas: it.paginasCount, blob };
        } catch (error) { return toast(error.message); }
      } else {
        o = await BD.pegar(it.id);
        if (!o) return toast('O administrador ainda precisa publicar o arquivo desta HQ.');
      }
      toast('Abrindo ' + o.nome + '...');
      const edsSerie = it.serieId ? edicoesDaSerie(it.serieId).filter(ed => conteudoPermitido(ed)) : [];
      const idxSerie = edsSerie.findIndex(e => e.id === it.id);
      const serieRef = it.serieId ? (REG.get(it.serieId) || series.find(s => s.id === it.serieId)) : null;
      const opcoesLeitor = {
        inicio: cap,
        sub: `${serieRef ? `📁 ${serieRef.titulo} #${it.edicaoNum || (idxSerie + 1)} · ` : ''}${o.paginas ? `${o.paginas} páginas · ` : ''}${(o.formato || 'HQ').toUpperCase()}${it.heroiNome ? ' · ' + it.heroiNome : ''}`,
        volumes: edsSerie.length > 1 ? edsSerie.map((e, i) => ({ indice: i, nome: `Edição #${e.edicaoNum || (i + 1)} — ${e.titulo}` })) : undefined,
        volAtual: idxSerie >= 0 ? idxSerie : 0,
        aoTrocarVolume: edsSerie.length > 1 ? (novoIdx) => { const prox = edsSerie[novoIdx]; if (prox) abrirLeitura(prox.id); } : undefined
      };

      if (o.formato === 'imagens') return LeitorHQ.abrirImagens(it, o.blobs.map(b => URL.createObjectURL(b)), opcoesLeitor);
      if (o.formato === 'cbz') {
        const zip = await JSZip.loadAsync(o.blob);
        const pgs = Object.values(zip.files).filter(z => !z.dir && IMG_RE.test(z.name) && !z.name.startsWith('__MACOSX')).sort((a, b) => ordenarNat(a.name, b.name));
        const urls = await Promise.all(pgs.map(async z => URL.createObjectURL(await z.async('blob'))));
        return LeitorHQ.abrirImagens(it, urls, opcoesLeitor);
      }
      if (o.formato === 'pdf') {
        try {
          return await LeitorHQ.abrirPDF(it, o.blob, opcoesLeitor);
        } catch (err) {
          console.warn('Fallback para visualizador de PDF:', err);
          const u = URL.createObjectURL(o.blob); Frame.abrir(o.nome, 'PDF local', u, u); Frame.blob = u; registrarLeitura(it, 0.5, 'PDF'); return;
        }
      }
      if (o.formato === 'epub') { const e = await lerEPUB(o.blob); return Leitor.abrir(it, { titulo: e.titulo || o.nome, sub: e.autor || 'EPUB', fonte: 'Biblioteca local · EPUB', secoes: e.secoes, irPara: cap }); }
      if (o.formato === 'txt') { const t = await o.blob.text(); return Leitor.abrir(it, { titulo: o.nome, sub: 'Texto local', fonte: 'Biblioteca local', secoes: [{ titulo: 'Introdução', paragrafos: t.split(/\n\s*\n/).map(s => s.replace(/\s+/g, ' ').trim()).filter(Boolean) }], irPara: cap }); }
    }
  };
  function carregarArquivosLocais() {
    return BD.todos().then(async (l) => {
    l.forEach(o => { if (!externas.some(it => it.id === o.id && it.storagePath)) Biblioteca.item(o); });
    renderMinhasHQs();
    }).catch(() => {});
  }

  function linkDrive(url) {
    url = url.trim();
    let m;
    if ((m = url.match(/\/folders\/([\w-]{10,})/))) return { tipo: 'pasta', fid: m[1], embed: `https://drive.google.com/embeddedfolderview?id=${m[1]}#grid` };
    if ((m = url.match(/docs\.google\.com\/(document|presentation|spreadsheets)\/d\/([\w-]{10,})/))) return { tipo: m[1], fid: m[2], embed: `https://docs.google.com/${m[1]}/d/${m[2]}/preview` };
    if ((m = url.match(/\/d\/([\w-]{10,})/) || url.match(/[?&]id=([\w-]{10,})/))) return { tipo: 'arquivo', fid: m[1], embed: `https://drive.google.com/file/d/${m[1]}/preview` };
    return null;
  }

  /* ---------------- Abas: Busca / Histórico / Biblioteca / Salvos ---------------- */
  let buscaT = null;
  function renderBusca(termoInicial) {
    const el = $('#aba-busca');
    if (!el.dataset.pronto) {
      el.dataset.pronto = 1;
      el.innerHTML = `
        <h2 style="font-family:Bangers;font-size:42px;letter-spacing:1px;margin-bottom:10px">Buscar HQs, Contos e Lore</h2>
        <div class="campo"><input type="search" id="buscaInput" placeholder="Ex.: Ultimate Wolverine, Guerra Civil, Lux, Zed, Cavaleiro das Trevas, Sandman..." autofocus></div>
        <div class="chips" id="buscaSug">${['Guerra Civil', 'Cavaleiro das Trevas', 'Lux', 'Zed', 'Sandman', 'Watchmen', 'Demolidor', 'Wolverine', 'Ahri', 'Thresh', 'Odin', 'Curupira'].map(s => `<button class="chip" data-sug="${s}">${s}</button>`).join('')}</div>
        <div id="resLocal"></div><div id="resWiki"></div><div id="resIA"></div>`;
      $('#buscaInput').oninput = (e) => { clearTimeout(buscaT); buscaT = setTimeout(() => buscar(e.target.value), 300); };
      $('#buscaSug').onclick = (e) => { const b = e.target.closest('[data-sug]'); if (b) { $('#buscaInput').value = b.dataset.sug; buscar(b.dataset.sug); } };
    }
    if (termoInicial != null) { $('#buscaInput').value = termoInicial; buscar(termoInicial); }
    setTimeout(() => $('#buscaInput').focus(), 50);
  }
  async function buscar(termo) {
    termo = termo.trim(); const q = norm(termo);
    const rl = $('#resLocal'), rw = $('#resWiki'), ri = $('#resIA');
    if (q.length < 2) { rl.innerHTML = rw.innerHTML = ri.innerHTML = ''; return; }
    await Promise.all([Dados.lol().catch(() => { }), Dados.cronicas().catch(() => { })]);
    const loc = [...REG.values()].filter(i => conteudoPermitido(i)).filter(i => ['serie-pasta', 'riot-serie', 'riot-hq', 'riot-conto', 'ia', 'ext-hq', 'heroi', 'lol', 'conto', 'interativa', 'hq', 'wiki', 'regiao', 'drive', 'local'].includes(i.tipo) && norm(`${i.titulo} ${i.sub} ${i.resumo || ''} ${i.heroiNome || ''} ${i.serieNome || ''} ${(i.tags || []).join(' ')}`).includes(q)).slice(0, 48);
    rl.innerHTML = secao('Coleções, HQs, Crônicas, Heróis e Lore na Estante', `${loc.length} resultado(s)`, loc.length ? `<div class="grade">${loc.map(i => cartao(i)).join('')}</div>` : '<div class="vazio">Nada na estante com esse nome — veja mais resultados abaixo.</div>');
    aplicarMiniaturas(loc);
    if (inicioFiltrado()) { rw.innerHTML = ri.innerHTML = ''; return; }
    rw.innerHTML = secao('Enciclopédia (Wikipédia em português)', 'Histórias, sagas e personagens', carregando('Pesquisando...'));
    ri.innerHTML = secao('Acervo Digital de Quadrinhos (Internet Archive)', 'HQs completas', `<button class="btn btn-sec" id="buscaIA">📚 Procurar HQs de "${esc(termo)}" no acervo completo</button>`);
    $('#buscaIA').onclick = () => { location.hash = 'colecao/arquivo'; setTimeout(() => colecaoArquivo($('#colCorpo'), `(${termo}) AND mediatype:texts`), 80); };
    try {
      const r = await Fontes.wikiBuscar(termo);
      if (norm($('#buscaInput').value.trim()) !== q) return;
      const its = r.map(x => { const i = itemWiki(x.titulo, REG.get('wiki:' + x.titulo)?.colecao); i.desc = i.desc || x.trecho; return i; });
      rw.innerHTML = secao('Enciclopédia (Wikipédia em português)', `${its.length} verbete(s)`, its.length ? `<div class="grade">${its.map(i => cartao(i)).join('')}</div>` : '<div class="vazio">Nenhum verbete.</div>');
      aplicarMiniaturas(its);
    } catch { rw.innerHTML = secao('Enciclopédia', '', '<div class="erro">Sem conexão com a Wikipédia.</div>'); }
  }

  function renderHistorico() {
    const el = $('#aba-historico');
    el.innerHTML = `<div class="secao-cab"><div><small>Tudo o que você abriu</small><h3 style="font-size:28px">Histórico de leitura</h3></div>${historico.length ? '<button class="btn btn-sec" id="limparHist">🗑 Limpar histórico</button>' : ''}</div>` +
      (historico.length ? `<div class="grade larga">${historico.filter(h => conteudoPermitido(REG.get(h.id) || h.item)).map(h => itemContinuar(h).replace('class="cont-item"', 'class="cont-item" style="flex:auto"')).join('')}</div>`
        : '<div class="vazio"><div class="em">🕮</div>Você ainda não leu nada. Que tal começar por uma HQ oficial ou saga completa?<br><br><button class="btn btn-pri" data-ler="rserie:lux">🗯️ Ler HQ Lux #1</button></div>');
    const b = $('#limparHist'); if (b) b.onclick = () => { if (confirm('Limpar todo o histórico?')) { historico = []; Auth.salvarDadosPerfil(); renderHistorico(); } };
  }

  function renderSalvos() {
    const el = $('#aba-salvos');
    const queue=(prefs.readQueue||[]).map(id=>REG.get(id)||salvos[id]).filter(it=>it&&conteudoPermitido(it));
    const groups=prefs.personalShelves||{};
    const selected=el.dataset.shelf||'';
    let lista=Object.values(salvos).map(s=>REG.get(s.id)||reg(s)).filter(conteudoPermitido);
    if(selected==='queue')lista=queue;
    else if(selected==='done')lista=historico.filter(h=>h.prog>=.99).map(h=>REG.get(h.id)||h.item).filter(it=>it&&conteudoPermitido(it));
    else if(groups[selected])lista=groups[selected].map(id=>REG.get(id)||salvos[id]).filter(it=>it&&conteudoPermitido(it));
    el.innerHTML=`<section class="painel"><h2>Minha biblioteca pessoal</h2><div class="personal-tools"><label>Visual<select id="personalDensity"><option value="small">Capas pequenas</option><option value="medium">Capas médias</option><option value="list">Lista</option></select></label><label>Coleção<select id="personalShelf"><option value="">Favoritas</option><option value="queue">Quero ler</option><option value="done">Concluídas</option>${Object.keys(groups).map(k=>`<option value="${esc(k)}">${esc(k)}</option>`).join('')}</select></label><button class="btn btn-sec" id="newPersonalShelf">Nova coleção</button></div><p>${lista.length} obras · As coleções não duplicam os arquivos.</p><div class="personal-tools"><button class="btn btn-sec" id="personalSelectAll">Selecionar todas</button><button class="btn btn-sec" id="personalClearAll">Limpar seleção</button><button class="btn btn-sec" id="personalMoveBatch">Adicionar à coleção</button><button class="btn btn-sec" id="personalReadBatch">Marcar como lidas</button></div><p id="personalBatchStatus" role="status"></p></section><div class="grade personal-grid">${lista.map(i=>`<div><label class="personal-select"><input type="checkbox" data-personal-check value="${esc(i.id)}"> Selecionar</label>${cartao(i)}<button class="btn btn-sec" data-personal-add="${esc(i.id)}">Organizar</button>${selected==='queue'?`<button class="btn btn-sec" data-queue-first="${esc(i.id)}">Ler primeiro</button>`:''}</div>`).join('')}</div>`;
    const checks=()=>[...el.querySelectorAll('[data-personal-check]')];
    $('#personalSelectAll').onclick=()=>checks().forEach(c=>c.checked=true);
    $('#personalClearAll').onclick=()=>checks().forEach(c=>c.checked=false);
    function batchItems(){return lista.filter(it=>checks().some(c=>c.checked&&c.value===it.id));}
    $('#personalMoveBatch').onclick=()=>{
      const items=batchItems();if(!items.length)return toast('Selecione pelo menos uma HQ.');
      const name=prompt('Coleção de destino: '+Object.keys(groups).join(', '));if(!Object.hasOwn(groups,name))return toast('Crie ou escolha uma coleção existente.');
      groups[name]=[...new Set([...groups[name],...items.map(it=>it.id)])];prefs.personalShelves=groups;salvarPrefs();$('#personalBatchStatus').textContent=items.length+' HQ(s) adicionadas à coleção '+name+'.';
    };
    $('#personalReadBatch').onclick=()=>{
      const items=batchItems();if(!items.length)return toast('Selecione pelo menos uma HQ.');
      if(!confirm('Marcar '+items.length+' HQ(s) como lidas? Isto atualiza o histórico, sem conceder XP ou recompensas de leitura.'))return;
      const ids=new Set(items.map(it=>it.id));historico=[...items.map(it=>({id:it.id,item:snap(it),prog:1,rotulo:'Marcada como lida',quando:Date.now()})),...historico.filter(h=>!ids.has(h.id))].slice(0,80);Auth.salvarDadosPerfil();renderSalvos();
    };
    const density=$('#personalDensity');density.value=localStorage.getItem('eq:shelf-density')||'small';el.dataset.density=density.value;
    density.onchange=()=>{el.dataset.density=density.value;localStorage.setItem('eq:shelf-density',density.value);};
    $('#personalShelf').value=selected;$('#personalShelf').onchange=e=>{el.dataset.shelf=e.target.value;renderSalvos();};
    $('#newPersonalShelf').onclick=()=>{const name=prompt('Nome da coleção pessoal (até 40 caracteres):')?.trim();if(!name)return;if(name.length>40||['queue','done','__proto__','constructor','prototype'].includes(name))return toast('Escolha outro nome, com até 40 caracteres.');if(Object.keys(groups).length>=30)return toast('Limite de 30 coleções.');prefs.personalShelves={...groups,[name]:groups[name]||[]};salvarPrefs();el.dataset.shelf=name;renderSalvos();};
  }

  /* ---------------- Missões e personalização da conta ---------------- */
  let rewardSession = { id: null, at: performance.now(), activity: performance.now(), account: null };
  function estadoRecompensas() { return EQReadingRewards.normalize(Auth.usuario ? prefs.readingRewards : null); }
  function avatarRecompensa(user, state = estadoRecompensas()) {
    const selected = EQReadingRewards.appearance(state).avatar;
    const reward = EQReadingRewards.OPTIONS.avatar.find(o => o.id === selected);
    if (reward.art) return `<span class="reward-face" role="img" aria-label="Avatar ${esc(reward.label)}">${EQRewardArt.avatar(selected)}</span>`;
    if (selected !== 'default') return `<span role="img" aria-label="Avatar ${esc(reward.label)}">${reward.icon}</span>`;
    return user?.avatar ? `<img src="${esc(user.avatar)}" alt="${esc(user.nome)}">` : `<span>${esc(user?.nome?.charAt(0).toUpperCase() || '👤')}</span>`;
  }
  function centralNovidades(){
    const works=[...externas,...drive].filter(it=>conteudoPermitido(it)).slice().reverse().slice(0,30);
    const day=EQReadingRewards.dayKey();
    const rewards=Object.entries(EQReadingRewards.OPTIONS).flatMap(([kind,items])=>items.filter(o=>o.epic&&(!o.release||o.release<=day)).map(o=>({...o,kind}))).slice(-24);
    return `<details class="painel news-center"><summary>🔔 Central de novidades</summary><p>Consulte o catálogo e as recompensas disponíveis para sua conta, mesmo depois de fechar os avisos iniciais.</p><h3>HQs e histórias do catálogo</h3><div class="news-center-list">${works.map(it=>`<button class="btn btn-sec" data-ler="${esc(it.id)}">${esc(it.titulo)}</button>`).join('')||'<p>Ainda não há obras nesta seleção.</p>'}</div><h3>Recompensas épicas</h3><div class="news-center-list">${rewards.map(o=>`<span>${esc(o.label)}</span>`).join('')}</div><button class="btn btn-pri" data-news-missions>Ver missões e regras</button></details>`;
  }
  function mostrarNovidades() {
    $('#releaseNews')?.remove();
    if(!Auth.usuario||!readerSync?.loaded||readerSync.conflict)return;
    const day=EQReadingRewards.dayKey();
    const works=[...externas,...drive].filter(it=>conteudoPermitido(it)&&['hq','manga'].includes(categoriaObra(it)));
    const rewards=Object.entries(EQReadingRewards.OPTIONS).flatMap(([kind,options])=>options.filter(o=>!o.release||o.release<=day).map(o=>({...o,id:kind+':'+o.id,rewardId:o.id,kind})));
    const news=EQReleaseNews.collect(prefs.releaseNews,works,rewards);
    mostrarLancamentoConquistas(rewards,news.rewards);
    if(news.works.length||news.rewards.length){prefs.releaseNews=news.snapshot;salvarPrefs();}
    news.rewards=[]; // Reward releases have their own spotlight; this banner lists HQs only.
    if(!news.works.length)return;
    const box=document.createElement('aside');box.id='releaseNews';box.className='release-news painel';box.setAttribute('aria-label','Novidades da sua conta');
    box.innerHTML=`<div class="release-news-head"><div><small>NOVIDADES</small><h3>${news.first?'Veja o que está disponível na sua conta':'Chegaram novidades para você!'}</h3></div><button class="btn btn-sec" data-news-close aria-label="Fechar novidades">✕</button></div><p>${news.works.length?`${news.works.length} HQ(s) ${news.first?'no catálogo':'adicionada(s) desde sua última visita'}. `:''}${news.rewards.length?`${news.rewards.length} nova(s) recompensa(s) para descobrir.`:''}</p><details><summary>Ver novidades</summary>${news.rewards.length?`<div class="news-rewards">${news.rewards.slice(0,5).map(o=>`<div><span class="news-art">${o.kind==='frame'?EQRewardArt.frame(o.rewardId):EQRewardArt.avatar(o.kind==='avatar'?o.rewardId:'sentinel')}</span><strong>${esc(o.label)}</strong></div>`).join('')}</div><button class="btn btn-pri" data-news-rewards>Ver desafios e recompensas</button>`:''}${news.works.length?`<h4>HQs disponíveis</h4><ul>${news.works.slice(0,8).map(it=>`<li>${esc(it.titulo||'HQ sem título')}</li>`).join('')}</ul>${news.works.length>8?'<p>Veja as demais HQs na biblioteca.</p>':''}<button class="btn btn-sec" data-news-library>Abrir biblioteca</button>`:''}</details>`;
    $('#app').prepend(box);
    box.querySelector('[data-news-close]').onclick=()=>box.remove();
    box.querySelector('[data-news-rewards]')?.addEventListener('click',()=>{box.remove();ir('perfil');});
    box.querySelector('[data-news-library]')?.addEventListener('click',()=>{box.remove();ir('biblioteca');});
  }
  function mostrarLancamentoConquistas(available,added) {
    $('#achievementLaunch')?.remove();
    const state=EQReleaseNews.spotlight(prefs.achievementNews,available,added);
    if(JSON.stringify(state)!==JSON.stringify(prefs.achievementNews)){prefs.achievementNews=state;salvarPrefs();}
    if(!state.pending.length)return;
    const items=available.filter(o=>state.pending.includes(o.id)),dialog=document.createElement('dialog'),account=Auth.usuario.id,previousFocus=document.activeElement;
    dialog.id='achievementLaunch';dialog.className='achievement-launch';dialog.setAttribute('aria-labelledby','achievementLaunchTitle');dialog.setAttribute('aria-describedby','achievementLaunchDescription');
    dialog.innerHTML=`<button class="launch-close" aria-label="Fechar lançamento" data-launch-close>✕</button><div class="launch-trophy" aria-hidden="true"><svg viewBox="0 0 120 120"><path d="M35 18h50v29c0 34-50 34-50 0Z M35 25H19v12q0 17 20 17m46-29h16v12q0 17-20 17M60 73v15m-15 13q0-13 15-13t15 13M40 105h40" fill="none" stroke="currentColor" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/></svg></div><span class="launch-tag">NOVAS RECOMPENSAS</span><h2 id="achievementLaunchTitle">CHEGARAM AS <strong>CONQUISTAS!</strong></h2><p id="achievementLaunchDescription">Sua próxima leitura vale uma nova conquista. Descubra ${items.length} recompensa(s) e os desafios para desbloqueá-las no seu perfil.</p><div class="launch-previews">${items.slice(0,4).map(o=>`<div><span>${previaRecompensa(o.kind,{...o,id:o.rewardId})}</span><small>${esc(o.label)}</small></div>`).join('')}</div><label class="launch-optout"><input type="checkbox" data-launch-hide> Não mostrar novamente este lançamento</label><button class="launch-primary" data-launch-profile>Ver meu perfil</button><button class="launch-later" data-launch-later>Depois</button>`;
    document.body.append(dialog);
    function close(acknowledge=false){
      if(Auth.usuario?.id===account&&(acknowledge||dialog.querySelector('[data-launch-hide]').checked)){prefs.achievementNews=EQReleaseNews.dismissSpotlight(state);salvarPrefs();}
      dialog.close();dialog.remove();if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});
    }
    dialog.querySelector('[data-launch-close]').onclick=()=>close();dialog.querySelector('[data-launch-later]').onclick=()=>close();
    dialog.querySelector('[data-launch-profile]').onclick=()=>{close(true);ir('perfil');};
    dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.showModal();
  }
  function aplicarRecompensas() {
    const state = estadoRecompensas(), selected = EQReadingRewards.appearance(state);
    document.documentElement.dataset.siteTheme = selected.theme;
    document.body.dataset.libraryLayout = selected.layout;
    const header = $('#headerAvatar');
    if (header) { header.innerHTML = avatarRecompensa(Auth.usuario, state) + (selected.frame !== 'default' ? EQRewardArt.frame(selected.frame) : ''); header.dataset.frame = selected.frame; }
    const avatar = $('#aba-perfil .perfil-avatar-wrap');
    if (avatar && Auth.usuario) { avatar.innerHTML = avatarRecompensa(Auth.usuario, state) + (selected.frame !== 'default' ? EQRewardArt.frame(selected.frame) : ''); avatar.dataset.frame = selected.frame; }
  }
  function guardarRecompensas(next) {
    const beforeState = estadoRecompensas();
    const before = EQReadingRewards.missions(beforeState).filter(m => m.unlocked).map(m => m.id);
    const newlyEarned = Object.entries(EQReadingRewards.OPTIONS).flatMap(([kind, options]) => options.filter(o => (o.xp !== undefined || o.event) && !EQReadingRewards.available(beforeState, kind, o.id) && EQReadingRewards.available(next, kind, o.id)).map(o => o.label));
    prefs.readingRewards = next;
    salvarPrefs(); aplicarRecompensas();
    const unlocked = EQReadingRewards.missions(next).filter(m => m.unlocked && !before.includes(m.id));
    const labels = [...new Set([...unlocked.map(m => m.label), ...newlyEarned])];
    if (labels.length) toast('🎉 Recompensa desbloqueada: ' + labels.join(', ') + '. Veja seu perfil!');
    else if (Object.keys(next.weeklyWins).length > Object.keys(beforeState.weeklyWins).length) toast('🏆 Caçada da semana concluída! +300 XP.');
  }
  ['pointerdown', 'pointermove', 'keydown', 'scroll'].forEach(event => document.addEventListener(event, () => { rewardSession.activity = performance.now(); }, { passive: true, capture: true }));
  document.addEventListener('visibilitychange', () => { rewardSession.at = performance.now(); rewardSession.id = null; });
  window.addEventListener('focus', () => { rewardSession.at = performance.now(); rewardSession.activity = performance.now(); });
  setInterval(() => {
    const now = performance.now(), elapsed = now - rewardSession.at; rewardSession.at = now;
    if (!Auth.usuario || Auth.saindo || !readerSync?.loaded || readerSync.conflict) { rewardSession.id = null; return; }
    const item = $('#leitorTexto').classList.contains('aberto') ? Leitor.it : $('#leitorHQ').classList.contains('aberto') ? LeitorHQ.it : null;
    if (!item || rewardSession.account !== Auth.usuario.id) { rewardSession.id = null; return; }
    if (rewardSession.id !== item.id) { rewardSession.id = item.id; return; }
    const seconds = EQReadingRewards.activeSeconds({ elapsed, visible: !document.hidden, focused: document.hasFocus(), reading: !!item, idle: now - rewardSession.activity });
    if (!seconds) return;
    const state = estadoRecompensas();
    const next = EQReadingRewards.advance(state, { id: item.readingKey || item.id, seconds, progress: posicaoSalva(item.id)?.prog || 0, day: EQReadingRewards.dayKey() });
    guardarRecompensas(next);
  }, 15000);
  let rewardSearchState={query:'',filter:'all'};
  let rewardTab = 'frame';
  const rewardNumber = n => n.toLocaleString('pt-BR');
  function previaRecompensa(kind, option) {
    if (kind === 'frame') return `<span class="reward-art-preview frame-preview">${EQRewardArt.avatar(option.set ? option.id : 'sentinel')}${option.id === 'default' ? '' : EQRewardArt.frame(option.id)}</span>`;
    if (kind === 'avatar') return `<span class="reward-art-preview avatar-preview">${option.art ? EQRewardArt.avatar(option.id) : `<span class="reward-emoji">${option.icon}</span>`}</span>`;
    if (kind === 'theme') return `<span class="theme-preview" data-preview-theme="${option.id}"><i></i><span><b></b><b></b><b></b></span><em></em>${option.set ? EQRewardArt.avatar(option.id) : ''}</span>`;
    return `<span class="layout-preview" data-preview-layout="${option.id}"><i></i><span>${Array.from({length:6},()=>'<b></b>').join('')}</span></span>`;
  }
  function painelEvento(state) {
    const event=EQReadingRewards.event(state),set=event.set,id='event_'+set.id;
    const goals=[['frame',event.seconds,event.minutesTarget*60,`Leia ${event.minutesTarget} minutos nesta semana`,`${Math.floor(event.seconds/60)} / ${event.minutesTarget} min`],['avatar',event.books,event.booksTarget,`Conclua ${event.booksTarget} obras nesta semana`,`${event.books} / ${event.booksTarget} obras`],['theme',event.days,event.daysTarget,`Cumpra os dois objetivos e leia em ${event.daysTarget} dias`,`${event.days} / ${event.daysTarget} dias · 5 min por dia`]];
    const next=Array.from({length:3},(_,i)=>EQRewardSeasons.SETS[(set.index+i+1)%EQRewardSeasons.SETS.length]);
    return `<section class="hero-event" style="--event-dark:${set.dark};--event-light:${set.light}" aria-label="Evento da semana"><div class="hero-event-identity"><span class="hero-event-tag">EVENTO DA SEMANA</span><p>${esc(set.hero)}</p><h3>${esc(set.title)}</h3><div class="hero-event-art">${EQRewardArt.avatar(id)}${EQRewardArt.frame(id)}</div><strong>${esc(set.label)} · Edição de evento</strong><p>Um ícone, uma moldura e um tema para sua coleção.</p><small>Até domingo, ${event.end.slice(8)}/${event.end.slice(5,7)}, às 23h59 · Brasília</small></div><div class="hero-event-objectives"><h4>Leia e conquiste o conjunto</h4>${goals.map(([kind,value,max,title,progress])=>{
      const won=EQReadingRewards.available(state,kind,id);
      return `<article class="event-objective ${won?'earned':''}"><div><strong>${won?'✓ ':''}${esc(title)}</strong><span>${({frame:'Moldura',avatar:'Ícone',theme:'Tema'})[kind]} ${won?(kind==='frame'?'conquistada':'conquistado'):(kind==='frame'?'exclusiva do evento':'exclusivo do evento')}</span></div><progress value="${won?max:Math.min(value,max)}" max="${max}" aria-label="${esc(title)}"></progress><small>${won?'Recompensa já está na sua coleção':esc(progress)}</small></article>`;
    }).join('')}<button class="btn btn-pri" data-quest-read>Ler para progredir</button><details><summary>Regras e próximos eventos</summary><p>Vale qualquer obra permitida na sua conta, inclusive arquivos locais. O personagem inspira o visual; não é obrigatório ter HQs dele. Uma conclusão exige 1 minuto de leitura ativa na obra durante a semana e 95% de progresso. Releituras contam uma vez por obra no evento.</p><p>As metas reiniciam às segundas-feiras. Recompensas conquistadas permanecem na conta. Os 12 conjuntos retornam a cada 12 semanas; novas leituras são necessárias a cada evento.</p><p>Próximas semanas: ${next.map(s=>esc(s.hero)).join(' → ')}.</p></details></div></section>`;
  }
  function painelMissoes() {
    const state = estadoRecompensas(), stats = EQReadingRewards.metrics(state), day = state.days[EQReadingRewards.dayKey()];
    const goal = day?.goal || state.goal, minutes = (day?.seconds || 0) / 60;
    const selected = EQReadingRewards.appearance(state), xp = EQReadingRewards.xp(state), week = EQReadingRewards.weekly(state);
    const names = {frame:'Molduras',avatar:'Avatares',theme:'Temas',layout:'Layouts'};
    return `<section class="missoes-painel" aria-labelledby="tituloMissoes">
      <div class="rewards-heading"><div><small>SUA JORNADA ENTRE PÁGINAS</small><h3 id="tituloMissoes">Leia. Conquiste. Personalize.</h3><p class="missoes-resumo">${Math.floor(stats.seconds / 60)} min de leitura · ${stats.completed} obras concluídas · ${stats.days} metas cumpridas</p></div><div class="xp-balance"><small>NÍVEL ${1+Math.floor(xp/1000)}</small><strong>${rewardNumber(xp)} <span>XP</span></strong><progress value="${xp%1000}" max="1000" aria-label="Progresso até o próximo nível"></progress><small>${rewardNumber(1000-xp%1000)} XP para o próximo nível</small></div></div>
      ${painelEvento(state)}
      <div class="epic-challenges">${EQEpicRewards.status(state.epicProgress,EQReadingRewards.dayKey()).map(c=>`<article class="painel epic-challenge"><div class="epic-art">${EQRewardArt.avatar('sentinel')}${EQRewardArt.frame(c.option.id)}</div><div><small>${c.kind==='week'?'DESAFIO ÉPICO DA SEMANA':'COLEÇÃO ÉPICA DO MÊS'}</small><h3>${esc(c.option.label)}</h3><p>Leia ${c.target/60} minutos ${c.kind==='week'?'e conclua 2 obras nesta semana.':'e leia pelo menos 5 minutos em 8 dias deste mês.'}</p><progress value="${Math.min(c.seconds,c.target)}" max="${c.target}" aria-label="Tempo de leitura"></progress><p>${Math.floor(c.seconds/60)} / ${c.target/60} min · ${c.count} / ${c.countTarget} ${c.kind==='week'?'obras':'dias'}</p><strong>${EQReadingRewards.available(state,'frame',c.option.id)?'✓ Moldura conquistada':'Conquiste a moldura exclusiva'}</strong><br><button class="btn btn-pri" data-quest-read>Ler para progredir</button></div></article>`).join('')}</div><p class="epic-rules">A semana começa na segunda-feira; o mês, no dia 1, no horário de Brasília. Apenas leituras realizadas no período contam. A coleção tem 12 edições mensais programadas, que retornam anualmente; as conquistas ficam na conta.</p>
      <div class="quest-columns">
        <article class="quest-banner quest-gold"><span class="quest-badge">CAÇADA DA SEMANA</span><div class="quest-content"><div class="quest-emblem">${EQRewardArt.avatar('phoenix')}${EQRewardArt.frame('gold')}</div><div><h4>${week.done ? 'Uma semana de conquistas!' : 'Uma hora, muitas aventuras'}</h4><p>Some 60 minutos de leitura ativa nesta semana.</p><progress value="${Math.min(week.seconds,week.target)}" max="${week.target}" aria-label="Progresso da caçada semanal"></progress><div class="quest-progress"><span>${Math.floor(week.seconds/60)} de 60 min</span><strong>${week.done ? '✓ +300 XP recebidos' : '+300 XP ao concluir'}</strong></div><small>Até domingo, ${week.end.slice(8)}/${week.end.slice(5,7)}, às 23h59 · Brasília</small><div class="quest-actions"><button class="btn btn-pri" data-quest-read>Continuar lendo</button><details><summary>ⓘ Ver regras</summary><p>Leia nos leitores internos. O tempo da semana soma entre as obras. O bônus é automático, uma vez por semana, e permanece com você.</p></details></div></div></div></article>
        <div class="meta-leitura quest-banner quest-green"><span class="quest-badge">SEU OBJETIVO DIÁRIO</span><div><h4>${day?.done ? '✓ Meta de hoje cumprida!' : 'Um capítulo de cada vez'}</h4><p>${Math.floor(minutes)} de ${goal} minutos de leitura ativa</p><progress value="${Math.min(minutes, goal)}" max="${goal}" aria-label="Progresso da meta diária"></progress><div class="quest-progress"><span>${day?.done ? 'Volte amanhã para uma nova meta' : 'Leia hoje para conquistar seu bônus'}</span><strong>${day?.done ? '✓ +50 XP recebidos' : '+50 XP ao concluir'}</strong></div></div><label>Meta diária<select id="metaLeituraMinutos">${EQReadingRewards.GOALS.map(n => `<option value="${n}" ${state.goal === n ? 'selected' : ''}>${n} minutos</option>`).join('')}</select></label>${day?.done && day.goal!==state.goal ? '<small>A nova meta vale a partir de amanhã.</small>' : ''}</div>
      </div>
      <details class="reward-rules"><summary>Como ganhar XP e concluir missões</summary><p>10 XP por minuto de leitura ativa, 100 XP por obra concluída pela primeira vez, 50 XP por meta diária e 300 XP pela caçada semanal. Seu XP é acumulado: desbloquear ou equipar não gasta pontos.</p><p>O tempo conta nos leitores internos, com a aba visível e em uso; pausa após 90 segundos sem interação. Uma conclusão exige pelo menos 1 minuto na obra e 95% de progresso. Links externos não contam. Metas e semanas seguem o horário de Brasília.</p><p>A leitura já registrada nas missões vale para o XP. Histórico, conquistas antigas e escolhas continuam preservados. Importar uma HQ ou limpar o histórico não concede XP extra.</p></details>
      <div class="reward-collection-heading"><div><small>SUAS RECOMPENSAS</small><h3>Monte sua identidade</h3></div><span>Desbloqueio automático · Sem gastar XP</span></div>
      <div class="reward-filters"><label>Buscar recompensa<input id="rewardSearch" type="search" placeholder="Personagem ou nome da recompensa"></label><label>Mostrar<select id="rewardFilter"><option value="all">Todas</option><option value="earned">Desbloqueadas</option><option value="locked">Bloqueadas</option><option value="event">Edições de evento</option></select></label></div>
      <div class="reward-tabs" role="tablist" aria-label="Coleção de recompensas">${Object.entries(names).map(([kind,name])=>`<button id="reward-tab-${kind}" role="tab" data-reward-tab="${kind}" aria-controls="reward-panel-${kind}" aria-selected="${rewardTab===kind}" tabindex="${rewardTab===kind?0:-1}">${name} <span>${EQReadingRewards.OPTIONS[kind].filter(o=>EQReadingRewards.available(state,kind,o.id)).length}/${EQReadingRewards.OPTIONS[kind].length}</span></button>`).join('')}</div>
      ${Object.entries(names).map(([kind,name])=>`<div class="reward-collection" id="reward-panel-${kind}" role="tabpanel" aria-labelledby="reward-tab-${kind}" ${rewardTab===kind?'':'hidden'}>${EQReadingRewards.OPTIONS[kind].map(o=>{
        const unlocked=EQReadingRewards.available(state,kind,o.id), equipped=selected[kind]===o.id;
        const mission=EQReadingRewards.MISSIONS.find(m=>m.reward===kind+':'+o.id);
        const requirement=o.epic ? (o.monthly?'Desafio mensal · a partir de '+o.release.slice(5,7)+'/'+o.release.slice(0,4):'Desafio épico semanal') : o.event ? 'Evento de '+EQRewardSeasons.find(o.id).hero : o.xp!==undefined ? `${rewardNumber(o.xp)} XP` : mission?.title || 'Disponível desde o início';
        return `<button type="button" class="reward-card ${equipped?'equipped':''} ${unlocked?'':'locked'}" data-reward-kind="${kind}" data-reward-id="${o.id}" data-reward-event="${!!o.event}" data-reward-earned="${unlocked}" data-reward-name="${esc(o.label)}" aria-pressed="${equipped}" ${unlocked?'':'disabled'} title="${esc(unlocked?'Equipar '+o.label:requirement)}"><span class="reward-card-state" aria-hidden="true">${equipped?'✓':unlocked?'':'🔒'}</span>${previaRecompensa(kind,o)}<strong>${esc(o.label)}</strong><span class="reward-card-cost">${equipped?'Equipado':unlocked?'Disponível · Equipar':esc(requirement)}</span></button>`;
      }).join('')}</div>`).join('')}
      <p id="rewardFilterStatus" role="status"></p>
      <p class="missoes-ajuda">Moldura e avatar aparecem no perfil e no menu. Os layouts mudam a biblioteca e os salvos. Os temas do site não alteram o papel do leitor. Suas escolhas acompanham sua conta.</p>
      <details class="permanent-missions"><summary>Missões permanentes <span>${EQReadingRewards.missions(state).filter(m=>m.unlocked).length}/${EQReadingRewards.MISSIONS.length} concluídas</span></summary><div class="missoes-grade">${EQReadingRewards.missions(state).map(m => {
        const unit = m.metric === 'seconds' ? 'min' : m.metric === 'completed' ? 'obras' : 'dias';
        const value = m.metric === 'seconds' ? Math.floor(m.current / 60) : m.current;
        const target = m.metric === 'seconds' ? m.target / 60 : m.target;
        return `<article class="missao-card ${m.unlocked ? 'concluida' : ''}"><span class="missao-icone" aria-hidden="true">${m.icon}</span><h4>${esc(m.title)}</h4><p>${esc(m.label)}</p><progress value="${m.current}" max="${m.target}" aria-label="${esc(m.title)}"></progress><small>${m.unlocked ? '✓ Recompensa desbloqueada' : `${value} / ${target} ${unit}`}</small></article>`;
      }).join('')}</div></details>
    </section>`;
  }
  function configurarMissoes() {
    $('#metaLeituraMinutos').onchange = e => { guardarRecompensas(EQReadingRewards.setGoal(estadoRecompensas(), Number(e.target.value), EQReadingRewards.dayKey())); renderPerfil(); };
    $('#rewardSearch').value=rewardSearchState.query;$('#rewardFilter').value=rewardSearchState.filter;
    function filterRewards() {
      const query=norm($('#rewardSearch').value),filter=$('#rewardFilter').value;
      rewardSearchState={query:$('#rewardSearch').value,filter};
      $$('[data-reward-name]').forEach(card=>{
        card.hidden=!norm(card.dataset.rewardName).includes(query)||(filter==='earned'&&card.dataset.rewardEarned!=='true')||(filter==='locked'&&card.dataset.rewardEarned==='true')||(filter==='event'&&card.dataset.rewardEvent!=='true');
      });
      const count=$$(`#reward-panel-${rewardTab} [data-reward-name]`).filter(c=>!c.hidden).length;
      $('#rewardFilterStatus').textContent=count?`${count} recompensa(s) nesta categoria.`:'Nenhuma recompensa corresponde ao filtro.';
    }
    $('#rewardSearch').oninput=filterRewards;$('#rewardFilter').onchange=filterRewards;
    const tabs = $$('[data-reward-tab]');
    function selectTab(kind) {
      rewardTab = kind;
      tabs.forEach(tab => { const active=tab.dataset.rewardTab===kind; tab.setAttribute('aria-selected',String(active)); tab.tabIndex=active?0:-1; $('#reward-panel-'+tab.dataset.rewardTab).hidden=!active; });
      filterRewards();
    }
    tabs.forEach((tab,index) => {
      tab.onclick=()=>selectTab(tab.dataset.rewardTab);
      tab.onkeydown=e=>{let target;if(e.key==='ArrowRight')target=(index+1)%tabs.length;else if(e.key==='ArrowLeft')target=(index+tabs.length-1)%tabs.length;else if(e.key==='Home')target=0;else if(e.key==='End')target=tabs.length-1;else return;e.preventDefault();selectTab(tabs[target].dataset.rewardTab);tabs[target].focus();};
    });
    $$('[data-reward-kind]', $('#aba-perfil')).forEach(button => {
      button.onclick = () => {
        try { guardarRecompensas(EQReadingRewards.equip(estadoRecompensas(), button.dataset.rewardKind, button.dataset.rewardId)); renderPerfil(); $(`[data-reward-kind="${button.dataset.rewardKind}"][data-reward-id="${button.dataset.rewardId}"]`)?.focus({preventScroll:true}); }
        catch (error) { toast(error.message); }
      };
    });
    $$('[data-quest-read]').forEach(button=>button.onclick=()=>{
      const candidates=[...REG.values()].filter(it=>conteudoPermitido(it) && (['local','hq','conto','interativa'].includes(it.tipo) || (it.tipo==='ext-hq' && (it.textoLore || it.paginas?.length))));
      const reading=historico.find(h=>h.prog<.95 && candidates.some(it=>it.id===h.id));
      const item=candidates.find(it=>it.id===reading?.id) || candidates.find(it=>!estadoRecompensas().books['work:'+(it.readingKey||it.id)]?.completed) || candidates[0];
      if (item) abrirLeitura(item.id); else toast('Adicione uma HQ permitida à sua biblioteca para começar a missão.');
    });
    filterRewards();
  }

  /* ---------------- Perfil do Usuário & Conquistas ---------------- */
  function calcularEstatisticasPerfil() {
    const lidos = historico.filter(h => h.prog >= 0.99).length;
    const emAndamento = historico.filter(h => h.prog > 0 && h.prog < 0.99).length;
    const nSalvos = Object.keys(salvos).length;
    const nFinais = Object.values(finais).reduce((acc, cur) => acc + (Array.isArray(cur) ? cur.length : 0), 0);

    const conquistas = [
      { id: 'primeiro_passo', icone: '🚀', nome: 'Primeiro Passo', desc: 'Iniciou sua primeira leitura no EleoQuadrinho.', liberada: historico.length > 0 },
      { id: 'maratonista', icone: '📚', nome: 'Devorador de Histórias', desc: 'Leu 3 ou mais obras até o fim.', liberada: lidos >= 3 },
      { id: 'multiverso', icone: '🌌', nome: 'Viajante Multiversal', desc: 'Leu obras de pelo menos 2 universos diferentes.', liberada: new Set(historico.map(h => universoDoItem(REG.get(h.id))?.id).filter(Boolean)).size >= 2 },
      { id: 'colecionador', icone: '🔖', nome: 'Colecionador', desc: 'Guardou 3 ou mais histórias na sua estante.', liberada: nSalvos >= 3 },
      { id: 'mestre_destino', icone: '🏆', nome: 'Mestre do Destino', desc: 'Descobriu um final em HQ ou conto interativo.', liberada: nFinais >= 1 },
      { id: 'cineasta', icone: '🎬', nome: 'Modo Cinema', desc: 'Utilizou o Modo Cinema no leitor.', liberada: !!prefs.hqCinema }
    ];

    return { lidos, emAndamento, nSalvos, nFinais, conquistas };
  }

  function renderPerfil() {
    atualizarUniversos();
    const el = $('#aba-perfil');
    if (!el) return;
    const u = Auth.usuario;

    if (!u) {
      el.innerHTML = `
        <div class="perfil-hero" style="justify-content:center;text-align:center;flex-direction:column;gap:14px;padding:48px 24px">
          <div class="perfil-avatar-wrap" style="width:84px;height:84px;font-size:38px;display:grid;place-items:center">👤</div>
          <h2>Crie seu Perfil de Leitor</h2>
          <p style="max-width:540px">Com uma conta no EleoQuadrinho, seu histórico de leitura, páginas salvas, estante e finais ficam protegidos e sincronizados, prontos para acessar na Vercel de qualquer dispositivo!</p>
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:8px">
            <button class="btn btn-pri" id="btnPerfilCadastrar">✨ Criar Conta Grátis</button>
            <button class="btn btn-sec" id="btnPerfilEntrar">🔑 Já tenho Conta / Entrar</button>
          </div>
        </div>`;
      $('#btnPerfilCadastrar')?.addEventListener('click', () => abrirModalAuth('cadastro'));
      $('#btnPerfilEntrar')?.addEventListener('click', () => abrirModalAuth('entrar'));
      return;
    }

    const st = calcularEstatisticasPerfil();
    const dataCriacao = new Date(u.criadoEm || Date.now()).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' });

    el.innerHTML = `
      <div class="perfil-hero">
        <div class="perfil-avatar-wrap" data-frame="${EQReadingRewards.appearance(estadoRecompensas()).frame}">${avatarRecompensa(u)}${EQReadingRewards.appearance(estadoRecompensas()).frame !== 'default' ? EQRewardArt.frame(EQReadingRewards.appearance(estadoRecompensas()).frame) : ''}</div>
        <div class="perfil-info">
          <h2>${esc(u.nome)} <small style="font-size:14px;color:var(--acento);font-weight:600">@${esc(u.login)}</small></h2>
          <p>${esc(u.bio || 'Leitor no EleoQuadrinho')}</p>
          <div class="perfil-meta">
            <span>${Auth.admin ? 'Administrador' : 'Leitor'}</span><span>📅 Membro desde ${dataCriacao}</span>
            <span>⭐ Leitor: ${st.lidos >= 10 ? 'Lendário' : st.lidos >= 3 ? 'Veterano' : 'Iniciante'}</span>
          </div>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sec" id="btnEditarPerfil" title="Alterar avatar, nome e bio">✏️ Editar Perfil</button>

          <button class="btn btn-sec" id="btnMigrarPerfil">Importar dados antigos deste navegador</button>
          <button class="btn btn-sec" id="btnBackupPerfil" title="Baixar backup deste perfil (.eleo)">💾 Backup (.eleo)</button>
          <button class="btn btn-sec" id="btnSairPerfil" style="color:#ff7777">🚪 Sair</button>
        </div>
      </div>

      <div class="grade-stats">
        <div class="stat-cartao"><span class="val">${st.lidos}</span><span class="rot">✓ Histórias Concluídas</span></div>
        <div class="stat-cartao"><span class="val">${st.emAndamento}</span><span class="rot">⚡ Em Andamento</span></div>
        <div class="stat-cartao"><span class="val">${st.nSalvos}</span><span class="rot">🔖 Obras Salvas</span></div>
        <div class="stat-cartao"><span class="val">${st.nFinais}</span><span class="rot">🏆 Finais Descobertos</span></div>
      </div>

      <nav class="profile-shortcuts" aria-label="Atalhos do perfil"><button data-profile-jump="tituloMissoes">🎯 Missões</button><button data-profile-jump="rewardSearch">✨ Recompensas</button><button data-profile-jump="userAccessPanel">⚙️ Preferências${Auth.admin?' e usuários':''}</button>${Auth.admin?'<button data-profile-jump="universeForm">🌌 Universos</button>':''}</nav>
      ${painelMissoes()}
      <div id="userAccessPanel"></div>
      ${centralNovidades()}
      ${gerenciadorUniversos()}

      ${historico.length ? `
        <div class="secao-cab" style="margin-top:24px">
          <div><small>Sua atividade recente</small><h3>📖 Lendo Recentemente</h3></div>
          <button class="ver-tudo" data-ir="historico">Histórico completo →</button>
        </div>
        <div class="grade larga">${historico.slice(0, 6).map(h => itemContinuar(h).replace('class="cont-item"', 'class="cont-item" style="flex:auto"')).join('')}</div>
      ` : ''}
    `;

    EQUserAccessUI.mount($('#userAccessPanel'), {
      user: u, prefs,
      universes: [...UNIVERSOS_BASE.map(v => ({id:v.id.replace(/^u-/,''),nome:v.nome})),...UNIVERSOS.flatMap(v=>v.cols.filter(EQUniverseTree.isCustom).map(id=>({id,nome:v.nome})))],
      save: hidden => { prefs.hiddenUniverses = hidden; salvarPrefs(); inicioPronto = false; Ex.uni = Ex.heroi = Ex.serie = null; },
      refresh: atualizarPermissoes
    });
    $$('[data-profile-jump]',el).forEach(button=>button.onclick=()=>{const target=document.getElementById(button.dataset.profileJump);if(!target)return;const details=target.closest('details');if(details)details.open=true;target.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});if(!target.matches('input,select,button,a'))target.setAttribute('tabindex','-1');target.focus({preventScroll:true});});
    configurarUniversos();
    configurarMissoes();
    $('#btnMigrarPerfil')?.addEventListener('click', importarDadosAntigos);
    $('#btnEditarPerfil')?.addEventListener('click', () => abrirModalAuth('editar'));
    $('#btnSairPerfil')?.addEventListener('click', () => { if (confirm('Deseja realmente sair da conta?')) Auth.sair(); });
    $('#btnBackupPerfil')?.addEventListener('click', () => {
      const dados = { versao: 4, app: 'EleoQuadrinho', usuario: u, historico, salvos, avaliacoes, finais };
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = `backup-${u.login}-eleoquadrinho.eleo`; a.click();
      toast('💾 Backup do perfil baixado (.eleo)!');
    });
  }

  // Old profiles were browser-only and cannot prove account ownership.
  // Explicit import copies reading data only; it never imports passwords or roles.
  function importarDadosAntigos() {
    if (!Auth.usuario) return;
    const legacy = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem('eq:' + key)) ?? fallback; } catch { return fallback; }
    };
    const oldUsers = legacy('usuarios', []);
    const list = Array.isArray(oldUsers) ? oldUsers.filter(u => u && typeof u.id === 'string') : [];
    abrirModalAuth('editar');
    const content = $('#authConteudo');
    content.innerHTML = `<h2>Importar dados deste navegador</h2>
      <p>Os perfis antigos eram locais. Escolha seus dados para copiar para a conta atual. Senhas e permissões antigas não serão importadas. Dados já existentes na nuvem terão prioridade.</p>
      <label for="legacyProfile">Perfil antigo</label><select id="legacyProfile"><option value="">Dados gerais do navegador</option>${list.map(u => `<option value="${esc(u.id)}">${esc(u.nome || u.login)}</option>`).join('')}</select>
      <button class="btn btn-pri" id="legacyImport">Copiar dados de leitura</button>
      ${Auth.admin ? '<p>O administrador também pode recuperar o catálogo antigo. Ele ficará disponível aos leitores após a sincronização.</p><button class="btn btn-sec" id="legacyCatalog">Importar catálogo antigo</button>' : ''}
      <p id="legacyNotice" role="status"></p>`;
    const mergeLists = (old, current) => [...new Map([...(Array.isArray(old) ? old : []), ...current].filter(x => x && typeof x.id === 'string').map(x => [x.id, x])).values()].slice(0, 5000);
    $('#legacyImport').onclick = async () => {
      const id = $('#legacyProfile').value;
      const prefix = id ? 'u:' + id + ':' : '';
      try {
        historico = mergeLists(legacy(prefix + 'historico', []), historico);
        salvos = { ...legacy(prefix + 'salvos', {}), ...salvos };
        avaliacoes = { ...legacy(prefix + 'avaliacoes', {}), ...avaliacoes };
        finais = { ...legacy(prefix + 'finais', {}), ...finais };
        Auth.salvarDadosPerfil(); await readerSync.flush();
        $('#legacyNotice').textContent = 'Dados de leitura importados e salvos na conta.';
      } catch (error) { $('#legacyNotice').textContent = error.message; }
    };
    $('#legacyCatalog')?.addEventListener('click', async () => {
      if (!Auth.admin || !confirm('Publicar o catálogo antigo deste navegador para os leitores?')) return;
      try {
        drive = mergeLists(legacy('drive', []), drive); externas = mergeLists(legacy('externas', []), externas);
        herois = mergeLists(legacy('herois', []), herois); series = mergeLists(legacy('series', []), series);
        catalogSync.update({ drive, externas, herois, series });
        await catalogSync.flush(); [...drive, ...externas, ...herois, ...series].forEach(reg);
        $('#legacyNotice').textContent = 'Catálogo importado. Arquivos locais PDF/CBZ continuam apenas neste navegador.';
      } catch (error) { $('#legacyNotice').textContent = error.message; }
    });
  }

  /* ---------------- Modal de Autenticação ---------------- */
  let authAvatarSelecionado = AVATARES_PADRAO[0].url;

  function abrirModalAuth(aba = 'entrar', obrigatorio = false) {
    const modal = $('#modalAuth');
    const conteudo = $('#authConteudo');
    conteudo.onclick = e => e.stopPropagation();
    const u = Auth.usuario;
    if (aba === 'perfis') aba = 'entrar';
    const edit = aba === 'editar' && !!u;
    const signup = aba === 'cadastro';
    authAvatarSelecionado = u?.avatar || AVATARES_PADRAO[0].url;
    modal.classList.toggle('auth-obrigatorio', !u || obrigatorio);
    modal.setAttribute('aria-hidden', 'false');
    modal.classList.add('aberta');
    document.body.style.overflow = 'hidden';
    conteudo.innerHTML = `
      <h2>${edit ? 'Editar meu perfil' : signup ? 'Criar conta de leitor' : 'Entrar no EleoQuadrinho'}</h2>
      <p id="authNotice" role="status" class="ajuda">${edit ? 'Seu perfil acompanha sua conta.' : 'Acesse seus dados de leitura em qualquer dispositivo.'}</p>
      ${!edit ? `<div class="auth-abas"><button type="button" data-conta-aba="entrar">Entrar</button><button type="button" data-conta-aba="cadastro">Criar conta</button></div>` : ''}
      <form class="auth-form" id="formConta">
        ${signup || edit ? `<label for="authNomeInput">Nome ou apelido</label><input id="authNomeInput" maxlength="80" required value="${esc(edit ? u.nome : '')}">` : ''}
        ${!edit ? `<label for="authLoginInput">${signup ? 'Login (letras, números, _ ou -)' : 'Login ou e-mail'}</label><input id="authLoginInput" autocomplete="username" required ${signup ? 'pattern="[A-Za-z0-9_-]{3,32}" maxlength="32"' : 'maxlength="254"'}>` : ''}
        ${signup ? '<label for="authEmailInput">E-mail para confirmação da conta</label><input id="authEmailInput" type="email" autocomplete="email" maxlength="254" required>' : ''}
        ${!edit ? `<label for="authSenhaInput">Senha</label><input id="authSenhaInput" type="password" minlength="10" maxlength="128" required autocomplete="${signup ? 'new-password' : 'current-password'}">` : ''}
        ${signup ? '<p class="ajuda">Use pelo menos 10 caracteres. Espaços fazem parte da senha. Novas contas têm permissão de leitor.</p>' : ''}
        ${edit ? `<label for="authBioInput">Bio</label><input id="authBioInput" maxlength="500" value="${esc(u.bio)}"><label for="authFotoInput">Foto do perfil</label><input id="authFotoInput" type="file" accept="image/*">` : ''}
        <button type="submit" class="btn btn-pri">${edit ? 'Salvar perfil' : signup ? 'Criar conta' : 'Entrar'}</button>
      </form>`;
    $$('[data-conta-aba]', conteudo).forEach(button => button.onclick = () => abrirModalAuth(button.dataset.contaAba));
    $('#authFotoInput')?.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (file) authAvatarSelecionado = await miniatura(file, 240) || authAvatarSelecionado;
    });
    $('#formConta').onsubmit = async e => {
      e.preventDefault();
      const button = e.target.querySelector('[type="submit"]'); button.disabled = true;
      const notice = $('#authNotice'); notice.textContent = 'Aguarde…';
      try {
        if (edit) {
          const result = await EQAccount.api('profile', 'PATCH', { nome: $('#authNomeInput').value, bio: $('#authBioInput').value, avatar: authAvatarSelecionado }, u.id);
          accountUser = result.user; Auth.atualizarHeader(); renderPerfil(); fecharModalAuth();
        } else if (signup) {
          await Auth.cadastrar({ nome: $('#authNomeInput').value, login: $('#authLoginInput').value, email: $('#authEmailInput').value, senha: $('#authSenhaInput').value });
        } else await Auth.entrar($('#authLoginInput').value, $('#authSenhaInput').value);
      } catch (error) { notice.textContent = error.message; }
      finally { button.disabled = false; }
    };
  }

  function fecharModalAuth() {
    if (!Auth.usuario) return;
    $('#modalAuth').classList.remove('aberta');
    $('#modalAuth').setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  function painelLocal() {
    return `<div class="painel" style="margin-bottom:20px;padding:16px"><h3>Adicionar arquivos neste dispositivo</h3>
      <p>Arquivos ficam só nesta conta e neste navegador, sem ocupar a nuvem. Mantenha um backup: limpar os dados do navegador pode apagá-los.</p>
      <label class="btn btn-sec">Guardar HQs apenas neste navegador<input id="localHQInput" type="file" accept=".pdf,.cbz,.cbr,.rar,.zip,.epub,.txt,.md,image/*" multiple hidden></label>
      <p>CBR/RAR é convertido para CBZ no navegador, preservando as imagens. Arquivos com senha ou divididos em volumes não são suportados.</p>
      <p id="localSpace" role="status"></p><button class="btn btn-sec" id="localBackupShortcut">Preparar backup das HQs locais</button>
      <details class="pacotes-hq"><summary>Transferir HQs entre dispositivos</summary>
      <p>Selecione arquivos salvos neste navegador. O pacote inclui HQs, capas e informações, sem perfil, histórico ou favoritos. Até 500 MB por pacote; prefira lotes pequenos no celular.</p>
      <label for="hqPackageSearch">Pesquisar HQs para transferir</label>
      <input id="hqPackageSearch" type="search" placeholder="Título, série, personagem ou formato" autocomplete="off" aria-controls="hqPackageSelection">
      <div class="package-filter-actions"><button type="button" class="btn btn-sec" id="hqPackageSelectResults">Selecionar resultados</button><button type="button" class="btn btn-sec" id="hqPackageClearSelection">Limpar seleção</button></div>
      <p id="hqPackageSearchStatus" role="status" aria-live="polite"></p>
      <select id="hqPackageSelection" multiple size="5" aria-label="HQs para compartilhar" style="width:100%"></select>
      <button class="btn btn-sec" id="exportHQPackage">Baixar pacote das HQs selecionadas</button>
      <button type="button" class="btn btn-sec" id="deleteHQSelection">Excluir selecionadas deste dispositivo</button>
      <button type="button" class="btn btn-sec hq-import-cancel" id="cancelHQBatch" hidden>Cancelar próximos pacotes</button><label class="btn btn-sec">Importar pacotes de HQs<input id="importHQPackage" type="file" multiple hidden></label>
      <p>Se o celular abriu o pacote como pasta, use uma das opções abaixo. Não importe os arquivos internos como HQs avulsas.</p>
      <label class="btn btn-sec">Importar pasta descompactada<input id="importHQFolder" type="file" webkitdirectory multiple hidden></label>
      <p>Selecione a pasta principal que contém manifest.json e a subpasta files.</p>
      <label class="btn btn-sec">Adicionar manifest.json e arquivos<input id="importHQParts" type="file" multiple hidden></label>
      <button type="button" class="btn btn-sec" id="clearHQParts">Limpar seleção de arquivos</button>
      <p>Se o celular não permitir selecionar a pasta: adicione manifest.json e depois use o mesmo botão para selecionar todos os arquivos dentro de files. A seleção é acumulada enquanto esta tela estiver aberta.</p>
      </details><p id="hqPackageStatus" role="status"></p></div>`;
  }
  function configurarLocal() {
    const input = $('#localHQInput');
    if (!input) return;
    configurarPacotes();
    input.onchange = async () => {
      input.disabled = true;
      try {
        await navigator.storage?.persist?.().catch(() => false);
        await Biblioteca.importar(input.files, { local: true, heroiId: '', heroiNome: '', serieId: '', serieNome: '', colecao: 'arquivo' });
      } finally { input.disabled = false; input.value = ''; }
    };
    const storageAccount=Auth.usuario?.id;
    $('#localBackupShortcut').onclick=()=>{const panel=$('.pacotes-hq');panel.open=true;panel.scrollIntoView({block:'start'});$('#hqPackageSelectResults').click();toast('Confira a seleção e toque em Baixar pacote. Para mais de 500 MB, use lotes menores.');};
    navigator.storage?.estimate?.().then(({ usage, quota }) => {
      if(Auth.usuario?.id!==storageAccount)return;
      const el = $('#localSpace');
      if(el){const ratio=quota>0?(usage||0)/quota:0;el.dataset.warning=String(ratio>=.8);el.textContent=quota>0?`Armazenamento local deste site: ${Math.ceil((usage||0)/1048576)} MB usados de aproximadamente ${Math.floor(quota/1048576)} MB (${Math.round(ratio*100)}%). ${ratio>=.9?'Espaço crítico: faça backup e remova cópias locais antes de importar mais.':ratio>=.8?'Espaço acabando: prepare um backup das suas HQs.':'A cota é estimada pelo navegador e pode variar.'}`:'Este navegador não informou a cota. Mantenha um backup das HQs locais.';}
    }).catch(() => {});
  }
  function configurarPacotes() {
    const selection = $('#hqPackageSelection'), status = $('#hqPackageStatus');
    const exportButton = $('#exportHQPackage'), importInput = $('#importHQPackage');
    const account = Auth.usuario.id;
    const search = $('#hqPackageSearch'), count = $('#hqPackageSearchStatus');
    let files = [];
    const selected = new Set();
    const results = () => files.filter(o => norm([o.nome, o.serieNome, o.heroiNome, o.formato].join(' ')).includes(norm(search.value.trim())));
    function renderOptions() {
      const visible = results();
      selection.innerHTML = visible.map(o => `<option value="${esc(o.id)}" ${selected.has(o.id) ? 'selected' : ''}>${esc(o.nome)}${o.serieNome ? ' · ' + esc(o.serieNome) : ''} (${esc(o.formato)})</option>`).join('');
      const hiddenSelected = [...selected].filter(id => !visible.some(o => o.id === id)).length;
      count.textContent = `${visible.length} de ${files.length} HQ(s) · ${selected.size} selecionada(s)${hiddenSelected ? ` (${hiddenSelected} fora do filtro)` : ''}.${!visible.length ? ' Nenhuma HQ encontrada.' : ''}`;
    }
    search.oninput = renderOptions;
    selection.onchange = () => {
      [...selection.options].forEach(o => { if (o.selected) selected.add(o.value); else selected.delete(o.value); });
      // Preserve choices outside the current filter.
      const visible = results();
      const hiddenSelected = [...selected].filter(id => !visible.some(o => o.id === id)).length;
      count.textContent = `${visible.length} de ${files.length} HQ(s) · ${selected.size} selecionada(s)${hiddenSelected ? ` (${hiddenSelected} fora do filtro)` : ''}.`;
    };
    $('#hqPackageSelectResults').onclick = () => { results().forEach(o => selected.add(o.id)); renderOptions(); };
    $('#hqPackageClearSelection').onclick = () => { selected.clear(); renderOptions(); };
    BD.todos().then(items => {
      if (Auth.usuario?.id !== account || !selection.isConnected) return;
      files = items.filter(o => o.hasFile);
      renderOptions();
      if (!files.length && !status.textContent) status.textContent = 'Nenhum arquivo local disponível para exportar.';
    }).catch(() => { status.textContent = 'Não foi possível carregar os arquivos locais.'; });
    const deleteButton=$('#deleteHQSelection');
    if(deleteButton)deleteButton.onclick=async()=>{
      if(Auth.usuario?.id!==account)return;
      const ids=[...selected];
      if(!ids.length){status.textContent='Selecione pelo menos uma HQ na lista.';return;}
      if(!confirm(`Tem certeza de que deseja excluir ${ids.length} HQ(s) selecionada(s) deste dispositivo, incluindo seleções fora do filtro?\n\nOs arquivos locais serão apagados e esta ação não pode ser desfeita. Baixe um pacote antes se precisar de backup. A nuvem, seu perfil, histórico e favoritos serão mantidos.`))return;
      deleteButton.disabled=true;
      try{
        await BD.apagarSelecionados(ids,account);
        if(Auth.usuario?.id!==account)return;
        for(const id of ids){const shared=externas.find(it=>it.id===id)||drive.find(it=>it.id===id);if(shared)reg(shared);else REG.delete(id);}
        await renderMinhasHQs();await renderBiblioteca();
        const result=$('#hqPackageStatus');result.textContent=`${ids.length} HQ(s) excluída(s) deste dispositivo.`;
        $('.pacotes-hq').open=true;
      }catch(error){if(Auth.usuario?.id===account)status.textContent='Não foi possível excluir: '+error.message;}
      finally{deleteButton.disabled=false;}
    };
    exportButton.onclick = async () => {
      exportButton.disabled = true;
      try {
        const ids = new Set(selected);
        if (!ids.size) throw new Error('Selecione pelo menos uma HQ na lista.');
        const items = (await Promise.all([...ids].map(id => BD.pegar(id)))).filter(Boolean);
        if (Auth.usuario?.id !== account) throw new Error('A conta mudou. Reabra a biblioteca.');
        status.textContent = 'Preparando pacote com os arquivos completos…';
        const bytes = await EQHQPackage.pack(items, JSZip);
        if (Auth.usuario?.id !== account) throw new Error('A conta mudou. Reabra a biblioteca.');
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/zip' }));
        const link = document.createElement('a'); link.href = url; link.download = 'hqs-' + new Date().toISOString().slice(0, 10) + '.eleohq'; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        status.textContent = 'Pacote pronto. Envie o arquivo .eleohq e importe-o na biblioteca do outro dispositivo.';
      } catch (error) { status.textContent = error.message; }
      finally { exportButton.disabled = false; }
    };
    const folderInput = $('#importHQFolder'), partsInput = $('#importHQParts'), pendingParts = new Map();
    $('#clearHQParts').onclick = () => { pendingParts.clear(); status.textContent = 'Seleção de arquivos descompactados limpa.'; };
    let batchRunning=false,batchCancelled=false;
    const cancel=$('#cancelHQBatch');cancel.onclick=()=>{batchCancelled=true;cancel.disabled=true;status.textContent='Cancelando a fila. O pacote já em gravação será preservado.';};
    async function importPackages(chosen){
      if(batchRunning)return;batchRunning=true;batchCancelled=false;
      importInput.disabled=folderInput.disabled=partsInput.disabled=true;cancel.hidden=false;cancel.disabled=false;
      let report;
      const totalBytes=chosen.reduce((sum,file)=>sum+file.size,0);
      status.textContent=`${chosen.length} pacote(s), ${(totalBytes/1048576).toFixed(1)} MB. Duplicatas serão ignoradas.`;
      try{
        report=await EQPackageBatch.run(chosen,{
          active:()=>!batchCancelled&&Auth.usuario?.id===account,
          progress:({index,total,name})=>{status.textContent=`Pacote ${index+1} de ${total} · ${(totalBytes/1048576).toFixed(1)} MB no lote: ${name} — conferindo e importando…`;},
          unpack:async file=>{if(file.name==='manifest.json')throw new Error('Pacote descompactado: use Importar pasta ou Adicionar manifest e arquivos.');if(file.size>EQHQPackage.LIMIT+12*1024*1024)throw new Error('Este pacote excede o limite de 500 MB de HQs.');return EQHQPackage.unpack(file,JSZip);},
          save:books=>BD.importarPacote(books,account)
        });
        if(Auth.usuario?.id!==account)return;
        if(report.results.some(r=>r.added)){await renderMinhasHQs();await renderBiblioteca();}
        const added=report.results.reduce((n,r)=>n+(r.added||0),0),duplicates=report.results.reduce((n,r)=>n+(r.duplicates||0),0);
        const target=$('#hqPackageStatus')||status;
        const panel=$('.pacotes-hq');if(panel)panel.open=true;
        target.textContent=`${added} HQ(s) importadas; ${duplicates} duplicada(s) ignoradas. ${report.remaining?report.remaining+' pacote(s) não processado(s). ':''}Perfil, histórico e favoritos preservados.\n`+report.results.map(r=>r.error?`⚠ ${r.name}: ${r.code==='QuotaExceededError'?'Navegador sem espaço. Libere armazenamento e tente novamente.':r.code==='NotReadableError'||r.code==='NotFoundError'?'Não foi possível ler o arquivo. Salve o pacote na pasta Downloads ou Arquivos do celular e tente novamente.':'Não foi possível importar: '+r.error}`:`✓ ${r.name}: ${r.added} importada(s), ${r.duplicates} duplicada(s).`).join('\n');
      }catch(error){if(Auth.usuario?.id===account)($('#hqPackageStatus')||status).textContent='A fila foi interrompida. Pacotes já importados estão salvos. '+error.message;}
      finally{batchRunning=false;importInput.disabled=folderInput.disabled=partsInput.disabled=false;cancel.hidden=true;importInput.value='';}
    }
    async function importPackage(source, mode) {
      const chosen = Array.from(source.files); if (!chosen.length) return;
      if(mode==='package')return importPackages(chosen);
      importInput.disabled = folderInput.disabled = partsInput.disabled = true;
      let imported = null;
      try {
        const file = chosen[0];
        if (mode === 'package' && file.name === 'manifest.json') throw new Error('Este pacote está descompactado. Use Importar pasta descompactada ou Adicionar manifest.json e arquivos.');
        if (mode === 'package' && file.size > EQHQPackage.LIMIT + 12 * 1024 * 1024) throw new Error('Pacote acima do limite de 500 MB de HQs. Divida a exportação em lotes menores.');
        status.textContent = 'Conferindo os arquivos do pacote… Mantenha esta página aberta.';
        if (mode === 'parts') {
          const next = new Map(pendingParts);
          chosen.forEach(file => next.set(file.name, file));
          if (next.size > 201 || [...next.values()].reduce((sum, file) => sum + file.size, 0) > EQHQPackage.LIMIT + 10 * 1024 * 1024) throw new Error('Seleção acima do limite do pacote. Limpe a seleção e importe um pacote menor.');
          pendingParts.clear(); next.forEach((file, name) => pendingParts.set(name, file));
        }
        const books = mode === 'package' ? await EQHQPackage.unpack(file, JSZip)
          : await EQHQPackage.unpackFiles(mode === 'parts' ? [...pendingParts.values()] : chosen);
        const added = await BD.importarPacote(books, account);
        imported = added;
        if (Auth.usuario?.id !== account) return;
        await renderMinhasHQs();
        await renderBiblioteca();
        $('#hqPackageStatus').textContent = `${added} HQ(s) importadas somente neste navegador; ${books.length - added} já importadas foram ignoradas. Perfil, histórico e favoritos preservados.`;
      } catch (error) {
        const message = error.name === 'NotReadableError' || error.name === 'NotFoundError'
          ? 'Não foi possível ler o arquivo. Salve o pacote na pasta Downloads ou Arquivos do celular e selecione essa cópia.'
          : error.name === 'QuotaExceededError'
            ? 'O navegador está sem espaço. Libere armazenamento ou importe um pacote menor.'
            : error instanceof RangeError
              ? 'O pacote exige mais memória do que este navegador tem disponível. Exporte lotes menores e tente novamente.'
              : error.message;
        const target = $('#hqPackageStatus') || status;
        if (Auth.usuario?.id === account) target.textContent = imported !== null
          ? `${imported} HQ(s) foram salvas neste navegador, mas a lista não atualizou. Reabra a biblioteca.`
          : 'Não foi possível importar: ' + message;
      }
      finally { importInput.disabled = folderInput.disabled = partsInput.disabled = false; source.value = ''; }
    }
    importInput.onchange = () => importPackage(importInput, 'package');
    folderInput.onchange = () => importPackage(folderInput, 'folder');
    partsInput.onchange = () => importPackage(partsInput, 'parts');
  }

  async function atualizarEspacoNuvem() {
    const el = $('#cloudSpace');
    if (!el || !Auth.admin) return;
    try {
      const s = await EQAccount.api('storage-status', 'POST', {}, Auth.usuario.id);
      el.textContent = `Nuvem: ${(s.used / 1000000).toFixed(1)} MB usados de ${(s.limit / 1000000).toFixed(0)} MB. ` +
        (s.reserved ? `${(s.reserved / 1000000).toFixed(1)} MB reservados para envios em andamento. ` : '') +
        (s.blocked ? 'Novos envios bloqueados. Use a biblioteca neste navegador.' : s.warning ? 'Atenção: espaço acabando. Os envios param antes de ultrapassar 90% da cota.' : 'Aviso em 80%; bloqueio de novos envios em 90%.');
      el.dataset.warning=String(s.warning||s.blocked);
      const button = $('#btnPublicarLocais');
      if (button) button.disabled = s.blocked;
    } catch { el.textContent = 'Não foi possível verificar o espaço da nuvem. Você pode guardar HQs apenas neste navegador.'; }
  }

  let bibliotecaOrigem = 'cloud';
  function abasBiblioteca() {
    return `<h2>Biblioteca</h2><div class="biblioteca-abas" role="tablist" aria-label="Local dos arquivos">
      <button id="tabCloud" role="tab" data-bib-origem="cloud" aria-controls="bibCloud">☁️ Na nuvem</button>
      <button id="tabDevice" role="tab" data-bib-origem="device" aria-controls="bibDevice">📱 Neste dispositivo</button>
    </div>`;
  }
  function configurarAbasBiblioteca() {
    const buttons = [...document.querySelectorAll('[data-bib-origem]')];
    function select(origin, focus = false) {
      bibliotecaOrigem = origin;
      buttons.forEach(button => {
        const active = button.dataset.bibOrigem === origin;
        button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
        document.getElementById(button.getAttribute('aria-controls')).hidden = !active;
        if (active && focus) button.focus();
      });
    }
    buttons.forEach(button => {
      button.onclick = () => select(button.dataset.bibOrigem);
      button.onkeydown = e => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault();
        select(e.key === 'Home' ? 'cloud' : e.key === 'End' ? 'device' : bibliotecaOrigem === 'cloud' ? 'device' : 'cloud', true);
      };
    });
    select(itemParaEditar ? 'cloud' : bibliotecaOrigem);
  }
  const libraryViews={};
  function libraryPanel(items,origin) {
    const old=libraryViews[origin];
    const state=libraryViews[origin]={items:items.filter(it=>conteudoPermitido(it)),query:old?.query||'',status:old?.status||'all',sort:old?.sort||'recent',limit:60};
    return `<div class="library-browser" data-library="${origin}"><div class="library-toolbar"><label class="library-search">Buscar nesta biblioteca<input type="search" data-library-query value="${esc(state.query)}" placeholder="Título, personagem ou série…"></label><label>Leitura<select data-library-status><option value="all">Todas</option><option value="reading">Em andamento</option><option value="unread">Não lidas</option><option value="finished">Concluídas</option></select></label><label>Ordenar<select data-library-sort><option value="recent">Ordem da biblioteca</option><option value="title">Título A–Z</option><option value="progress">Maior progresso</option></select></label></div><p class="library-count" role="status" data-library-count></p><div class="grade" ${origin==='device'?'data-device-library':''} data-library-grid></div><div class="library-empty" data-library-empty hidden><span>📚</span><h3>Nenhuma obra nesta seleção</h3><p>Use outro título ou limpe os filtros. Se a biblioteca estiver vazia, importe uma HQ na aba Neste dispositivo.</p><button class="btn btn-sec" data-library-reset>Limpar filtros</button></div><button class="btn btn-sec library-more" ${origin==='device'?'data-device-more':''} data-library-more>Mostrar mais</button></div>`;
  }
  function updateLibrary(origin,append=false) {
    const box=$(`[data-library="${origin}"]`),s=libraryViews[origin];if(!box||!s)return;
    box.querySelector('[data-library-status]').value=s.status;box.querySelector('[data-library-sort]').value=s.sort;
    const list=EQLibraryView.select(s.items,s,historico),end=Math.min(s.limit,list.length),start=append?Math.max(0,s.limit-60):0;
    const html=list.slice(start,end).map(it=>cartao(origin==='device'?{...it,localOnly:true}:reg(it))).join('');
    const grid=box.querySelector('[data-library-grid]');if(append)grid.insertAdjacentHTML('beforeend',html);else grid.innerHTML=html;
    box.querySelector('[data-library-count]').textContent=`${end} de ${list.length} obra(s)${list.length!==s.items.length?' · '+s.items.length+' na biblioteca':''}`;
    box.querySelector('[data-library-empty]').hidden=!!list.length;
    const more=box.querySelector('[data-library-more]');more.disabled=false;more.hidden=end>=list.length;more.textContent=`Mostrar mais (${end} de ${list.length})`;
  }
  function setupLibraryViews(){for(const origin of ['cloud','device'])updateLibrary(origin);}
  document.addEventListener('input',e=>{
    const box=e.target.closest('[data-library]');if(!box||!e.target.matches('[data-library-query]'))return;
    const s=libraryViews[box.dataset.library];s.query=e.target.value;s.limit=60;box.querySelector('[data-library-more]').disabled=true;clearTimeout(s.timer);s.timer=setTimeout(()=>updateLibrary(box.dataset.library),150);
  });
  document.addEventListener('change',e=>{
    const box=e.target.closest('[data-library]');if(!box)return;const s=libraryViews[box.dataset.library];
    if(e.target.matches('[data-library-status]'))s.status=e.target.value;else if(e.target.matches('[data-library-sort]'))s.sort=e.target.value;else return;
    s.limit=60;updateLibrary(box.dataset.library);
  });
  document.addEventListener('click',e=>{
    const button=e.target.closest('[data-library-more],[data-library-reset]');if(!button)return;
    const box=button.closest('[data-library]'),s=libraryViews[box.dataset.library];clearTimeout(s.timer);
    if(button.hasAttribute('data-library-more')){s.limit+=60;updateLibrary(box.dataset.library,true);}
    else{s.query='';s.status='all';s.sort='recent';s.limit=60;box.querySelector('[data-library-query]').value='';updateLibrary(box.dataset.library);box.querySelector('[data-library-query]').focus();}
  });
  function listaDispositivo(items) {
    return `<p class="biblioteca-ajuda">Arquivos guardados nesta conta e neste navegador. Use um pacote de HQs para levar sua biblioteca a outro dispositivo.</p>`+libraryPanel(items,'device');
  }

  function configurarOrganizadorSeries(localItems = null) {
    const localMode = localItems !== null;
    const panelId = localMode ? 'organizarSeriesLocal' : 'organizarSeries';
    const panel = $('#' + panelId);
    const field = name => $('#series' + name + (localMode ? 'Local' : ''), panel);
    const account = Auth.usuario?.id;
    if (!panel || !Auth.admin) return;
    const selected = new Set();
    const items = (localMode ? localItems.filter(it => !externas.some(shared => shared.id === it.id) && !drive.some(shared => shared.id === it.id)) : [...externas, ...drive]).sort((a, b) => a.titulo.localeCompare(b.titulo, 'pt-BR', { numeric: true }));
    let dragging = [], busy = false;
    panel.innerHTML = `<summary>📁 Organizar várias HQs em uma série</summary>
      <p>Selecione as HQs e arraste uma delas para a série desejada. No celular, escolha a série e toque em Mover selecionadas. ${localMode ? 'A organização é salva apenas neste navegador, sem upload. Cópias de HQs já publicadas são organizadas na aba Na nuvem.' : 'Apenas o catálogo da nuvem é alterado.'}</p>
      ${series.length ? `<div class="series-destinos">${series.map(s => `<button type="button" class="btn btn-sec" data-series-target="${esc(s.id)}">📁 ${esc(s.titulo)}</button>`).join('')}</div>
      <div class="series-acoes"><label>Buscar HQ<input id="seriesBusca${localMode ? 'Local' : ''}" type="search" placeholder="Título ou série atual"></label>
      <label>Série de destino<select id="seriesDestino${localMode ? 'Local' : ''}">${series.map(s => `<option value="${esc(s.id)}">${esc(s.titulo)}</option>`).join('')}</select></label>
      <button type="button" class="btn btn-sec" id="seriesSelecionar${localMode ? 'Local' : ''}">Selecionar resultados</button><button type="button" class="btn btn-sec" id="seriesLimpar${localMode ? 'Local' : ''}">Limpar seleção</button>
      <button type="button" class="btn btn-pri" id="seriesMover${localMode ? 'Local' : ''}" disabled>Mover selecionadas</button></div>
      <p id="seriesContagem${localMode ? 'Local' : ''}" role="status">0 HQs selecionadas</p><div class="series-itens"></div>
      <p>As HQs recebem números após a última edição da série, na ordem dos títulos. Obras que já estão nessa série permanecem como estão. Arquivos, histórico e favoritos são preservados.</p>` : '<p>Crie uma série na aba Na nuvem para começar. Vincular arquivos locais à série não publica as HQs.</p>'}`;
    if (!series.length) return;
    const visible = () => items.filter(it => norm(it.titulo + ' ' + (it.serieNome || '')).includes(norm(field('Busca').value)));
    function refresh() {
      $('.series-itens', panel).innerHTML = visible().map(it => `<label class="series-item" draggable="true" data-series-item="${esc(it.id)}"><input type="checkbox" ${selected.has(it.id) ? 'checked' : ''} value="${esc(it.id)}"><span>${esc(it.titulo)}<small>${esc(it.serieNome || 'Sem série')}</small></span><span aria-hidden="true">⠿</span></label>`).join('') || '<p>Nenhuma HQ encontrada.</p>';
      field('Contagem').textContent = `${selected.size} HQ(s) selecionada(s)`;
      field('Mover').disabled = !selected.size || busy;
    }
    async function move(target, ids) {
      if (busy || !Auth.admin || !ids.length || Auth.usuario?.id !== account) return;
      if (!localMode && catalogSync.conflict) return toast('Resolva o conflito de sincronização antes de mover as HQs.');
      const destination = series.find(s => s.id === target);
      if (!destination) return;
      const chosen = new Set(ids);
      let number = Math.max(0, ...edicoesDaSerie(destination).map(it => Number(it.edicaoNum) || 0));
      const changes = new Map(items.filter(it => chosen.has(it.id) && it.serieId !== target).map(it => [it.id, {
        ...it, serieId: target, serieNome: destination.titulo, edicaoNum: ++number,
        colecao: destination.colecao || it.colecao, heroiId: destination.heroiId || '', heroiNome: destination.heroiNome || ''
      }]));
      if (!changes.size) return toast('As HQs selecionadas já estão nesta série.');
      busy = true; refresh();
      try {
        if (localMode) {
          await BD.organizarSeries(changes, account);
          if (Auth.usuario?.id !== account) return;
          changes.forEach(reg);
        } else {
          const nextExternal = externas.map(it => changes.get(it.id) || it);
          const nextDrive = drive.map(it => changes.get(it.id) || it);
          catalogSync.update({ externas: nextExternal, drive: nextDrive });
          externas = nextExternal; drive = nextDrive;
          for (const item of changes.values()) {
            const local = await BD.pegar(item.id).catch(() => null);
            if (local) await BD.salvar({ ...local, serieId: item.serieId, serieNome: item.serieNome, edicaoNum: item.edicaoNum, colecao: item.colecao, heroiId: item.heroiId, heroiNome: item.heroiNome }).catch(() => {});
            reg(item);
          }
        }
        await renderBiblioteca();
        $('#' + panelId).open = true;
        renderMinhasHQs();
        toast(`${changes.size} HQ(s) movida(s) para ${destination.titulo}. ${localMode ? 'Salvas somente neste dispositivo, sem ocupar a nuvem.' : 'Alteração aguardando sincronização.'}`);
      } catch (error) { toast('Não foi possível organizar as HQs: ' + error.message); }
      finally { busy = false; }
    }
    field('Busca').oninput = refresh;
    field('Selecionar').onclick = () => { visible().forEach(it => selected.add(it.id)); refresh(); };
    field('Limpar').onclick = () => { selected.clear(); refresh(); };
    field('Mover').onclick = () => move(field('Destino').value, [...selected]);
    panel.onchange = e => { if (e.target.matches('.series-item input')) { e.target.checked ? selected.add(e.target.value) : selected.delete(e.target.value); refresh(); } };
    panel.ondragstart = e => {
      const row = e.target.closest('[data-series-item]'); if (!row || busy) return;
      dragging = selected.has(row.dataset.seriesItem) ? [...selected] : [row.dataset.seriesItem];
      e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', dragging.join('\n'));
    };
    panel.ondragend = () => { dragging = []; $$('.series-drop-active', panel).forEach(el => el.classList.remove('series-drop-active')); };
    panel.ondragover = e => { const target = e.target.closest('[data-series-target]'); if (target && dragging.length) { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; target.classList.add('series-drop-active'); } };
    panel.ondragleave = e => e.target.closest('[data-series-target]')?.classList.remove('series-drop-active');
    panel.ondrop = e => { const target = e.target.closest('[data-series-target]'); if (!target || !dragging.length) return; e.preventDefault(); target.classList.remove('series-drop-active'); move(target.dataset.seriesTarget, dragging); dragging = []; };
    $$('[data-series-target]', panel).forEach(button => { button.onclick = () => { field('Destino').value = button.dataset.seriesTarget; }; });
    refresh();
  }

  async function renderBiblioteca() {
    const el = $('#aba-biblioteca');
    if (!Auth.admin) {
      let pessoais;
      try { pessoais = (await BD.todos()).map(o => Biblioteca.item(o)); }
      catch (error) { el.innerHTML = `<h2>Biblioteca</h2><p role="alert">${esc(error.message)}</p>`; return; }
      const nuvem = [...externas, ...drive, ...series];
      el.innerHTML = abasBiblioteca() +
        `<section id="bibCloud" role="tabpanel" aria-labelledby="tabCloud"><p class="biblioteca-ajuda">Obras compartilhadas pelo administrador, disponíveis na sua conta em outros dispositivos. A leitura usa internet.</p>${libraryPanel(nuvem,'cloud')}</section>` +
        `<section id="bibDevice" role="tabpanel" aria-labelledby="tabDevice">${painelLocal()}${listaDispositivo(pessoais)}</section>`;
      configurarLocal(); configurarAbasBiblioteca(); setupLibraryViews();
      return;
    }
    // Garante que campeões do LoL já estejam disponíveis na lista de heróis
    Dados.lol().then(() => { atualizarSelectHerois(); atualizarResumoHeroiSelecionado(); }).catch(() => {});

    const opcoesCol = opcoesUniversoConteudo();

    el.innerHTML = abasBiblioteca() + `<section id="bibDevice" role="tabpanel" aria-labelledby="tabDevice">${painelLocal()}<details id="organizarSeriesLocal" class="series-organizador"></details><div id="bibLocais"></div></section><section id="bibCloud" role="tabpanel" aria-labelledby="tabCloud">
      <p class="biblioteca-ajuda">Catálogo compartilhado com os leitores. Publique aqui as HQs que devem aparecer em outras contas e dispositivos.</p>
      <details id="organizarSeries" class="series-organizador"></details>
      <p id="cloudSpace" role="status">Conferindo espaço da nuvem…</p>
      <div class="secao-cab"><div><p>Arquivos enviados aqui ficam disponíveis a todos os leitores após a publicação (até 500 MB por HQ).</p>
        <button class="btn btn-pri" id="btnPublicarLocais">Publicar HQs já salvas neste navegador</button>
      </div></div>
      <div class="secao-cab">
        <div><small>Cadastre ou edite HQs, Mangás, Lores, crie Subpastas de Coleções/Séries (ex.: Ultimate Wolverine #1 a #16) e vincule a um Herói</small><h3 style="font-size:28px">Central de Importação, Coleções/Séries, Heróis & Biblioteca</h3></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap">
          <button class="btn btn-sec" id="btnExportarJSON" title="Baixar backup das suas Coleções, HQs e Heróis">💾 Exportar Backup (.eleo / .json)</button>
          <label class="btn btn-sec" style="cursor:pointer" title="Importar backup de Coleções, HQs e Heróis">📂 Importar Backup<input type="file" id="inpImportarJSON" accept=".json,.eleo" hidden></label>
        </div>
      </div>

      <div class="painel" id="painelFormObra" style="margin-bottom:20px;border:1px solid rgba(245,179,1,.28)">
        <div id="bannerEdicaoObra" class="modo-edicao-banner" style="display:none">
          <div>✏️ <b>Modo de Edição:</b> <span id="txtEditandoObra"></span></div>
          <button type="button" class="btn btn-sec" id="btnCancelarEdicaoObra">✕ Cancelar Edição</button>
        </div>
        <h4 id="tituloFormObra" style="margin-bottom:6px;font-size:18px;color:var(--acento)">➕ Adicionar Nova Obra (HQ, Mangá, Lore...) · Vincular Herói & Coleção/Série (Subpasta)</h4>
        <p class="ajuda" style="margin-bottom:14px">Escolha o <b>Tipo da Obra</b>, vincule a um <b>Herói</b>, agrupe opcionalmente dentro de uma <b>Coleção / Série (Subpasta como "Ultimate Wolverine" de #1 a #16)</b> e envie a <b>Capa pelo seu computador</b>:</p>

        <!-- 1. Seleção do Tipo da Obra -->
        <div style="margin-bottom:12px">
          <small class="ajuda" style="display:block;margin-bottom:6px;font-weight:700;color:var(--txt)">1. Qual é o tipo da obra?</small>
          <div class="chips" id="chipsFormato">
            <button type="button" class="chip ativo" data-formato="HQ">🗯️ HQ (Quadrinho)</button>
            <button type="button" class="chip" data-formato="Mangá">🎌 Mangá</button>
            <button type="button" class="chip" data-formato="Lore">📜 Lore / História</button>
            <button type="button" class="chip" data-formato="Conto">📖 Conto / Crônica</button>
            <button type="button" class="chip" data-formato="Manhwa">🔥 Manhwa / Webtoon</button>
            <button type="button" class="chip" data-formato="Outros">✨ Outros</button>
          </div>
          <input type="hidden" id="extFormato" value="HQ">
        </div>

        <!-- 2. Seleção ou Criação de Herói / Personagem -->
        <div style="margin-bottom:14px">
          <small class="ajuda" style="display:block;margin-bottom:6px;font-weight:700;color:var(--txt)">2. Herói ou Personagem Principal (Vincular história ao herói):</small>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <div class="campo" style="flex:1;min-width:250px">
              <select id="extHeroiSelect" style="width:100%;background:var(--bg2);border:0;color:var(--txt);padding:10px;outline:0;border-radius:8px"></select>
            </div>
            <button type="button" class="btn btn-sec" id="btnToggleNovoHeroi">🦸 + Criar Novo Herói / Personagem</button>
          </div>

          <!-- Resumo em tempo real de quantas HQs, Lores e Histórias o Herói selecionado possui -->
          <div id="resumoHeroiVinculado"></div>

          <!-- Painel expansível para criar ou editar um herói -->
          <div class="heroi-painel" id="painelNovoHeroi" style="display:none">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
              <h5 id="tituloPainelHeroi" style="font-size:15px;color:var(--acento);margin:0">🦸 Cadastrar Novo Herói / Personagem</h5>
              <small class="ajuda">Ele ficará salvo na estante e mostrará quantas Coleções, HQs, Mangás, Lores e Histórias tem vinculadas!</small>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px">
              <div class="campo"><input type="text" id="novoHeroiNome" placeholder="Nome do Herói (ex.: Wolverine, Goku, Spawn, Kratos)"></div>
              <div class="campo"><input type="text" id="novoHeroiSub" placeholder="Título / Epíteto (ex.: O Melhor no que Faz)"></div>
              <div class="campo"><select id="novoHeroiColecao" style="width:100%;background:var(--bg2);border:0;color:var(--txt);padding:10px;outline:0">${opcoesCol}</select></div>
            </div>
            <div class="capa-upload-wrap" style="margin-bottom:10px">
              <div class="capa-preview" id="novoHeroiPreview">🦸</div>
              <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <label class="btn btn-sec" style="cursor:pointer;margin:0">🖼️ Enviar Foto/Capa do Computador<input type="file" id="novoHeroiCapaFile" accept="image/*" hidden></label>
                  <button type="button" class="btn btn-sec" id="novoHeroiLimparCapa" style="display:none">✕ Limpar foto</button>
                </div>
                <div class="campo"><input type="url" id="novoHeroiCapaUrl" placeholder="Ou cole a URL da imagem do herói (opcional)"></div>
              </div>
            </div>
            <div class="campo" style="margin-bottom:10px;align-items:stretch">
              <textarea id="novoHeroiBio" rows="3" style="width:100%;background:transparent;border:0;color:var(--txt);padding:10px;font-size:13px;resize:vertical;outline:0" placeholder="Biografia / Origem / Lore inicial do Herói (opcional — você também pode ler no perfil dele)..."></textarea>
            </div>
            <div style="display:flex;justify-content:flex-end;gap:8px">
              <button type="button" class="btn btn-sec" id="btnCancelarHeroi">Cancelar</button>
              <button type="button" class="btn btn-pri" id="btnSalvarNovoHeroi">✅ Salvar Herói & Selecionar</button>
            </div>
          </div>
        </div>

        <!-- 3. Coleção / Série (Subpasta Opcional — ex.: Ultimate Wolverine com edições de 1 a 16) -->
        <div style="margin-bottom:14px">
          <small class="ajuda" style="display:block;margin-bottom:6px;font-weight:700;color:var(--txt)">3. 📁 Coleção / Série — Subpasta Opcional (ex.: "Ultimate Wolverine" para agrupar as HQs de #1 a #16):</small>
          <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
            <div class="campo" style="flex:2;min-width:240px">
              <select id="extSerieSelect" style="width:100%;background:var(--bg2);border:0;color:var(--txt);padding:10px;outline:0;border-radius:8px"></select>
            </div>
            <div class="campo" style="width:170px;min-width:140px" title="Número da edição ou volume dentro da série (ex.: 1, 2... 16)">
              <span style="font-size:12px;color:var(--txt2);white-space:nowrap">Edição #</span>
              <input type="number" id="extEdicaoNum" min="1" max="9999" placeholder="Ex.: 1" style="width:100%">
            </div>
            <button type="button" class="btn btn-sec" id="btnToggleNovaSerie">📁 + Criar Nova Coleção / Série (Subpasta)</button>
          </div>

          <!-- Resumo da Subpasta de Série selecionada -->
          <div id="resumoSerieVinculada"></div>

          <!-- Painel expansível para criar ou editar uma Coleção / Série (Subpasta) -->
          <div class="heroi-painel" id="painelNovaSerie" style="display:none;border-color:rgba(14,165,233,.45)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;flex-wrap:wrap;gap:8px">
              <h5 id="tituloPainelSerie" style="font-size:15px;color:#38bdf8;margin:0">📁 Criar Nova Coleção / Série (Subpasta de HQs)</h5>
              <small class="ajuda">Funciona como uma subpasta: ao clicar nela na estante, abre todas as edições numeradas (ex.: #1 a #16)!</small>
            </div>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:10px">
              <div class="campo"><input type="text" id="novaSerieTitulo" placeholder="Nome da Coleção / Série (ex.: Ultimate Wolverine)"></div>
              <div class="campo"><input type="text" id="novaSerieSub" placeholder="Subtítulo / Autor (ex.: Série Completa · Marvel Ultimate)"></div>
              <div class="campo"><select id="novaSerieColecao" style="width:100%;background:var(--bg2);border:0;color:var(--txt);padding:10px;outline:0">${opcoesCol}</select></div>
            </div>
            <div class="capa-upload-wrap" style="margin-bottom:10px">
              <div class="capa-preview" id="novaSeriePreview">📁</div>
              <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px">
                <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                  <label class="btn btn-sec" style="cursor:pointer;margin:0">🖼️ Enviar Capa da Série (Computador)<input type="file" id="novaSerieCapaFile" accept="image/*" hidden></label>
                  <button type="button" class="btn btn-sec" id="novaSerieLimparCapa" style="display:none">✕ Limpar capa</button>
                </div>
                <div class="campo"><input type="url" id="novaSerieCapaUrl" placeholder="Ou cole a URL da imagem de capa da Coleção/Série (opcional)"></div>
              </div>
            </div>
            <div class="campo" style="margin-bottom:10px">
              <input type="text" id="novaSerieResumo" placeholder="Sinopse ou descrição da Coleção / Série (ex.: A saga completa de Ultimate Wolverine nas edições 1 a 16)">
            </div>

            <!-- Gerador opcional de múltiplas edições (ex.: de 1 a 16 de uma só vez!) -->
            <div id="blocoGeradorLoteSerie" style="background:rgba(14,165,233,.08);border:1px dashed rgba(14,165,233,.35);border-radius:10px;padding:12px;margin-bottom:10px">
              <div style="font-weight:700;font-size:13px;color:#7dd3fc;margin-bottom:6px">⚡ Opcional: Gerar várias edições numeradas de uma só vez (ex.: Edição #1 até #16)</div>
              <p class="ajuda" style="margin-bottom:8px">Se você preencher o intervalo abaixo (ex.: de <b>1</b> até <b>16</b>), o sistema já cria automaticamente todas as edições numeradas dentro desta subpasta! Você pode editar ou adicionar as páginas de cada edição quando quiser.</p>
              <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
                <div class="campo" style="width:155px">
                  <span style="font-size:12px;color:var(--txt2)">Da Edição #</span>
                  <input type="number" id="novaSerieEdIni" min="1" max="999" value="1" style="width:100%">
                </div>
                <div class="campo" style="width:165px">
                  <span style="font-size:12px;color:var(--txt2)">Até Edição #</span>
                  <input type="number" id="novaSerieEdFim" min="0" max="999" placeholder="Ex.: 16 (opcional)" style="width:100%">
                </div>
                <div class="campo" style="flex:1;min-width:240px">
                  <input type="text" id="novaSeriePadraoUrl" placeholder="Opcional: Padrão de URL das páginas (use {ED} p/ nº da edição e {01..24} p/ págs)">
                </div>
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;gap:8px">
              <button type="button" class="btn btn-sec" id="btnCancelarSerie">Cancelar</button>
              <button type="button" class="btn btn-pri" id="btnSalvarNovaSerie">✅ Salvar Coleção / Série (Subpasta)</button>
            </div>
          </div>
        </div>

        <!-- 4. URL de outro site (opcional) -->
        <div class="campo" id="blocoSiteUrl" style="margin-bottom:10px">
          <input type="url" id="extSiteUrl" placeholder="4. (Opcional) Link da página da HQ/Mangá/Lore em outro site ou Archive.org / PDF...">
          <button type="button" class="btn btn-sec" id="extExtrairBtn">🔍 Extrair páginas da URL</button>
        </div>

        <!-- 5. Dados principais da Obra / Edição -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:10px">
          <div class="campo"><input type="text" id="extTitulo" placeholder="Título da Obra ou Edição (ex.: Ultimate Wolverine #1)"></div>
          <div class="campo"><input type="text" id="extSub" placeholder="Autor / Edição (ex.: Edição #1 · Parte 1)"></div>
          <div class="campo"><select id="extColecao" style="width:100%;background:var(--bg2);border:0;color:var(--txt);padding:10px;outline:0">${opcoesCol}</select></div>
        </div>

        <!-- 6. Capa da Obra: Upload Local ou URL -->
        <div style="margin-bottom:12px">
          <small class="ajuda" style="display:block;margin-bottom:6px;font-weight:700;color:var(--txt)">5. Capa da Obra / Edição (Envie do seu computador, cole um link ou deixe vazio para usar a 1ª página do PDF):</small>
          <div class="capa-upload-wrap">
            <div class="capa-preview" id="extCapaPreview">🖼️</div>
            <div style="flex:1;min-width:220px;display:flex;flex-direction:column;gap:8px">
              <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">
                <label class="btn btn-sec" style="cursor:pointer;margin:0">📁 Fazer Upload da Capa (Local)<input type="file" id="extCapaFile" accept="image/*" hidden></label>
                <button type="button" class="btn btn-sec" id="extLimparCapa" style="display:none">✕ Remover capa enviada</button>
                <small class="ajuda" id="extCapaNome">Se não enviar capa, o sistema usa automaticamente a <b>1ª página do PDF/HQ</b>!</small>
              </div>
              <div class="campo"><input type="url" id="extCapa" placeholder="Ou cole a URL da imagem da capa (opcional — usa a 1ª página do PDF se vazio)"></div>
            </div>
          </div>
        </div>

        <div class="campo" style="margin-bottom:10px">
          <input type="text" id="extResumo" placeholder="Sinopse ou descrição da edição/história (opcional)">
        </div>

        <!-- 6.5 Upload Direto de Arquivo PDF / CBZ / EPUB no Formulário -->
        <div id="blocoArquivoObra" style="background:rgba(245,179,1,.06);border:1px dashed rgba(245,179,1,.32);border-radius:10px;padding:12px;margin-bottom:10px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px">
          <div>
            <div style="font-weight:700;font-size:13px;color:var(--txt)">📄 Subir HQ em PDF, CBZ, CBR ou EPUB do Computador (Abre no Leitor Padrão do Sistema)</div>
            <small class="ajuda" id="extArquivoObraInfo">Se você subir um PDF sem adicionar capa acima, a <b>1ª página do PDF vira a capa automaticamente</b>!</small>
          </div>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <label class="btn btn-sec" style="cursor:pointer;margin:0">📄 Escolher Arquivo PDF / CBZ / CBR<input type="file" id="extArquivoObraInput" accept=".pdf,.cbz,.cbr,.rar,.zip,.epub,.txt" hidden></label>
            <button type="button" class="btn btn-sec" id="extLimparArquivoObra" style="display:none">✕ Remover arquivo</button>
          </div>
        </div>

        <!-- 7. Páginas de Imagem (HQ / Mangá / Manhwa) -->
        <div class="campo" id="blocoPaginasHQ" style="margin-bottom:10px;align-items:stretch">
          <textarea id="extPaginas" rows="4" style="width:100%;background:transparent;border:0;color:var(--txt);padding:10px;font-family:monospace;font-size:12px;resize:vertical;outline:0" placeholder="URLs das imagens das páginas da HQ / Mangá (1 por linha) OU use padrão automático como:&#10;https://meusite.com/hqs/edicao-1/pagina-{01..24}.jpg&#10;(Deixe em branco se você escolheu um arquivo PDF/CBZ acima, Lore em texto ou link externo)"></textarea>
        </div>

        <!-- 8. Texto de Lore / Conto -->
        <div class="campo" id="blocoTextoLore" style="margin-bottom:10px;align-items:stretch">
          <textarea id="extTextoLore" rows="5" style="width:100%;background:transparent;border:0;color:var(--txt);padding:10px;font-size:13px;resize:vertical;outline:0" placeholder="📜 Texto completo da Lore / Conto / História (separe capítulos com uma linha começando por # Título do Capítulo).&#10;Se você preencher este campo e escolher o tipo Lore ou Conto, a obra abrirá no Leitor Literário com narração em voz!"></textarea>
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:10px">
          <small class="ajuda" id="extStatus">💡 Dica: HQs em PDF abrem no Leitor Padrão do sistema e usam a 1ª página como capa automaticamente!</small>
          <div style="display:flex;gap:8px">
            <button type="button" class="btn btn-pri" id="extSalvarBtn">➕ Salvar na Estante & Vincular</button>
          </div>
        </div>
      </div>

      <div class="duas-col">
        <div class="painel">
          <h4 style="margin-bottom:12px">📁 Importar arquivos em lote (PDF, CBZ, CBR, EPUB, Imagens)</h4>
          <label class="drop" id="drop"><div class="em">⬆️</div><b>Arraste seus PDFs / CBZs / CBRs aqui ou clique</b><br><small>A 1ª página de cada PDF vira a capa automaticamente e abre no Leitor Padrão</small>
            <input type="file" id="arqInput" multiple hidden accept=".cbz,.cbr,.rar,.zip,.pdf,.epub,.txt,.md,image/*"></label>
          <p class="ajuda">Dica: Se você selecionar um <b>Herói</b> ou uma <b>Coleção/Série (Subpasta)</b> no formulário acima antes de soltar vários PDFs aqui, todos já serão vinculados automaticamente!</p>
          <button class="btn btn-sec" id="pastaBtn" style="margin-top:10px">🗂 Importar pasta de imagens</button>
          <input type="file" id="pastaInput" webkitdirectory hidden>
        </div>
        <div class="painel">
          <h4 style="margin-bottom:12px">☁️ Adicionar do Google Drive</h4>
          <div class="campo"><input type="url" id="driveUrl" placeholder="Cole o link do arquivo ou pasta do Google Drive"></div>
          <div class="campo" style="margin-top:8px"><input type="text" id="driveNome" placeholder="Nome da HQ ou pasta (opcional)"><button class="btn btn-pri" id="driveAdd">Adicionar</button></div>
          <p class="ajuda">Funciona com PDFs de HQs, pastas cheias de quadrinhos, imagens e Google Docs.<br>O link precisa estar como <code>Qualquer pessoa com o link</code>.<br>Ex.: <code>https://drive.google.com/file/d/ID/view</code> ou <code>https://drive.google.com/drive/folders/ID</code></p>
        </div>
      </div>
      <div id="bibSeries"></div>
      <div id="bibHerois"></div>
      <div id="bibLista">${carregando()}</div></section>`;

    // Estado local de capas em DataURL (upload do computador), arquivo PDF/CBZ anexado e IDs em edição
    let capaObraDataUrl = '';
    let capaExtraidaPdf = '';
    let arquivoObraSelecionado = null;
    let qtdPaginasArquivoObra = 0;
    let capaHeroiDataUrl = '';
    let capaSerieDataUrl = '';
    let editandoObraId = null;
    let editandoHeroiId = null;
    let editandoSerieId = null;

    // Popula o <select> de Heróis agrupando por categoria e exibindo quantas HQs/Lores/Histórias cada herói já possui
    function atualizarSelectHerois(selecionarId) {
      const sel = $('#extHeroiSelect'); if (!sel) return;
      const lista = todosHerois();
      const grupos = new Map();
      lista.forEach(h => {
        if (!grupos.has(h.grupo)) grupos.set(h.grupo, []);
        grupos.get(h.grupo).push(h);
      });

      const alvo = selecionarId !== undefined ? selecionarId : (preHeroiSelecionado || sel.value || '');
      let html = `<option value="">— Sem herói específico (ou escolha abaixo) —</option>
        <option value="__novo__">➕ Criar um Novo Herói / Personagem agora...</option>`;
      for (const [nomeGrupo, itens] of grupos.entries()) {
        html += `<optgroup label="${esc(nomeGrupo)} (${itens.length})">` +
          itens.map(h => {
            const cv = contagemVinculosHeroi(h.id);
            const sufixo = cv.total > 0 ? ` — 📚 ${cv.textoCurto}` : '';
            return `<option value="${esc(h.id)}" data-nome="${esc(h.nome)}">${esc(h.nome)}${esc(sufixo)}</option>`;
          }).join('') +
          `</optgroup>`;
      }
      sel.innerHTML = html;

      if (alvo && sel.querySelector(`option[value="${CSS.escape(alvo)}"]`)) {
        sel.value = alvo;
      }
      if (preHeroiSelecionado) preHeroiSelecionado = null;
    }

    // Popula o <select> de Coleções / Séries (Subpastas)
    function atualizarSelectSeries(selecionarSerieId) {
      const sel = $('#extSerieSelect'); if (!sel) return;
      const alvo = selecionarSerieId !== undefined ? selecionarSerieId : (preSerieSelecionada || sel.value || '');
      let html = `<option value="">— Sem coleção/série (Obra avulsa) —</option>
        <option value="__nova__">📁 + Criar Nova Coleção / Série (Subpasta) agora...</option>`;
      if (series.length) {
        html += `<optgroup label="📁 Minhas Coleções & Séries (${series.length})">` +
          series.map(s => {
            const eds = edicoesDaSerie(s.id);
            const hTxt = s.heroiNome ? ` · 🦸 ${s.heroiNome}` : '';
            return `<option value="${esc(s.id)}" data-nome="${esc(s.titulo)}">📁 ${esc(s.titulo)} (${eds.length} ed.)${esc(hTxt)}</option>`;
          }).join('') +
          `</optgroup>`;
      }
      sel.innerHTML = html;

      if (alvo && sel.querySelector(`option[value="${CSS.escape(alvo)}"]`)) {
        sel.value = alvo;
      }
      if (preSerieSelecionada) {
        const sObj = REG.get(preSerieSelecionada) || series.find(s => s.id === preSerieSelecionada);
        preSerieSelecionada = null;
        if (sObj) {
          if (sObj.heroiId) atualizarSelectHerois(sObj.heroiId);
          if (sObj.colecao) $('#extColecao').value = sObj.colecao;
          const proxNum = edicoesDaSerie(sObj.id).length + 1;
          $('#extEdicaoNum').value = proxNum;
          if (!$('#extTitulo').value.trim()) $('#extTitulo').value = `${sObj.titulo} #${proxNum}`;
          if (!$('#extSub').value.trim()) $('#extSub').value = `${sObj.titulo} · Edição #${proxNum}`;
        }
      }
    }

    // Mostra o card de resumo em tempo real da Subpasta de Coleção/Série selecionada
    function atualizarResumoSerieSelecionada() {
      const box = $('#resumoSerieVinculada'); if (!box) return;
      const sId = $('#extSerieSelect')?.value;
      if (!sId || sId === '__nova__') { box.innerHTML = ''; return; }
      const sIt = REG.get(sId) || series.find(s => s.id === sId);
      if (!sIt) { box.innerHTML = ''; return; }
      const eds = edicoesDaSerie(sIt);
      box.innerHTML = `
        <div class="heroi-resumo-card" style="border-color:rgba(14,165,233,.4);background:linear-gradient(135deg,rgba(14,165,233,.12),rgba(19,24,36,.95))">
          <div class="esq-heroi">
            ${sIt.capa ? `<img src="${esc(sIt.capa)}" alt="">` : `<div class="mini-av">📁</div>`}
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--txt)">📁 ${esc(sIt.titulo)} <small style="color:var(--txt2);font-weight:500">(Subpasta · ${eds.length} edição(ões))</small></div>
              <div style="font-size:12px;color:var(--txt2);margin-top:2px">
                ${sIt.heroiNome ? `Herói vinculado: <b style="color:var(--acento)">🦸 ${esc(sIt.heroiNome)}</b> · ` : ''}
                Próxima edição sugerida: <b style="color:#38bdf8">#${eds.length + 1}</b>
              </div>
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-sec" data-id="${esc(sIt.id)}">📁 Abrir Subpasta (${eds.length} ed.)</button>
            <button type="button" class="btn btn-sec" data-editar="${esc(sIt.id)}">✏️ Editar Subpasta</button>
          </div>
        </div>`;
    }

    // Mostra o card de resumo em tempo real com a contagem de HQs, Mangás, Lores e Histórias do Herói selecionado
    function atualizarResumoHeroiSelecionado() {
      const box = $('#resumoHeroiVinculado'); if (!box) return;
      const hId = $('#extHeroiSelect')?.value;
      if (!hId || hId === '__novo__') { box.innerHTML = ''; return; }
      const hIt = REG.get(hId);
      if (!hIt) { box.innerHTML = ''; return; }
      const cv = contagemVinculosHeroi(hIt);
      box.innerHTML = `
        <div class="heroi-resumo-card">
          <div class="esq-heroi">
            ${hIt.capa ? `<img src="${esc(hIt.capa)}" alt="">` : `<div class="mini-av">🦸</div>`}
            <div>
              <div style="font-weight:800;font-size:15px;color:var(--txt)">🦸 ${esc(hIt.titulo)} <small style="color:var(--txt2);font-weight:500">(${esc(col(hIt.colecao)?.nome || hIt.sub || 'Herói')})</small></div>
              <div style="font-size:12px;color:var(--txt2);margin-top:2px">Vínculos atuais deste personagem: <b style="color:var(--acento)">${esc(cv.textoCurto)}</b></div>
              ${cv.badgesHTML}
            </div>
          </div>
          <div style="display:flex;gap:8px;flex-wrap:wrap">
            <button type="button" class="btn btn-sec" data-id="${esc(hIt.id)}">👁️ Ver Perfil & Obras (${cv.total})</button>
            ${hIt.id.startsWith('heroi:') ? `<button type="button" class="btn btn-sec" data-editar="${esc(hIt.id)}">✏️ Editar Herói</button>` : ''}
          </div>
        </div>`;
    }

    atualizarSelectHerois();
    atualizarSelectSeries();
    atualizarResumoHeroiSelecionado();
    atualizarResumoSerieSelecionada();

    // Seleção do Tipo da Obra (HQ, Mangá, Lore, Conto, Manhwa, Outros)
    const selecionarFormatoObra = (fmt) => {
      fmt = fmt || 'HQ';
      $('#extFormato').value = fmt;
      $$('#chipsFormato .chip').forEach(c => c.classList.toggle('ativo', c.dataset.formato === fmt));
    };
    $('#chipsFormato').onclick = (e) => {
      const b = e.target.closest('[data-formato]'); if (!b) return;
      selecionarFormatoObra(b.dataset.formato);
    };

    // Botão e select para abrir painel de Novo/Editar Herói
    const limparFormHeroi = () => {
      editandoHeroiId = null;
      $('#tituloPainelHeroi').textContent = '🦸 Cadastrar Novo Herói / Personagem';
      $('#btnSalvarNovoHeroi').textContent = '✅ Salvar Herói & Selecionar';
      $('#novoHeroiNome').value = '';
      $('#novoHeroiSub').value = '';
      $('#novoHeroiBio').value = '';
      $('#novoHeroiCapaUrl').value = '';
      capaHeroiDataUrl = '';
      atualizarPreviewHeroi('');
    };
    const toggleHeroi = (mostrar) => {
      const p = $('#painelNovoHeroi');
      p.style.display = mostrar ? 'block' : 'none';
      if (mostrar) $('#novoHeroiNome').focus();
      else limparFormHeroi();
    };
    $('#btnToggleNovoHeroi').onclick = () => {
      limparFormHeroi();
      toggleHeroi($('#painelNovoHeroi').style.display === 'none');
    };
    $('#btnCancelarHeroi').onclick = () => {
      toggleHeroi(false);
      if ($('#extHeroiSelect').value === '__novo__') $('#extHeroiSelect').value = '';
      atualizarResumoHeroiSelecionado();
    };
    $('#extHeroiSelect').onchange = (e) => {
      if (e.target.value === '__novo__') {
        limparFormHeroi();
        toggleHeroi(true);
      } else {
        atualizarResumoHeroiSelecionado();
      }
    };

    // Upload local de capa para o Novo/Editado Herói
    const atualizarPreviewHeroi = (src) => {
      const prev = $('#novoHeroiPreview');
      prev.innerHTML = src ? `<img src="${esc(src)}" alt="Preview">` : '🦸';
      $('#novoHeroiLimparCapa').style.display = (capaHeroiDataUrl || $('#novoHeroiCapaUrl').value.trim()) ? 'inline-flex' : 'none';
    };
    $('#novoHeroiCapaFile').onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const dataUrl = await miniatura(f, 380);
      if (dataUrl) {
        capaHeroiDataUrl = dataUrl;
        atualizarPreviewHeroi(dataUrl);
        toast('🖼️ Foto do herói carregada do computador!');
      }
    };
    $('#novoHeroiLimparCapa').onclick = () => {
      capaHeroiDataUrl = '';
      $('#novoHeroiCapaFile').value = '';
      $('#novoHeroiCapaUrl').value = '';
      atualizarPreviewHeroi('');
    };
    $('#novoHeroiCapaUrl').oninput = (e) => {
      if (!capaHeroiDataUrl) atualizarPreviewHeroi(e.target.value.trim());
    };

    // Salvar Novo Herói ou Atualizar Herói Existente
    const criarOuEditarHeroi = () => {
      const nome = $('#novoHeroiNome').value.trim();
      if (!nome) { toast('Digite o nome do Herói / Personagem.'); $('#novoHeroiNome').focus(); return null; }
      const sub = $('#novoHeroiSub').value.trim() || 'Herói & Personagem';
      const colecao = $('#novoHeroiColecao').value || 'originais';
      const capa = capaHeroiDataUrl || $('#novoHeroiCapaUrl').value.trim() || '';
      const bio = $('#novoHeroiBio').value.trim();
      const id = editandoHeroiId || ('heroi:' + norm(nome).replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4));
      const estavaEditando = !!editandoHeroiId;
      const novoH = reg({
        id,
        tipo: 'heroi',
        formatoObra: 'Herói',
        titulo: nome,
        sub,
        colecao,
        capa,
        banner: capa,
        resumo: bio || `Perfil e histórias vinculadas de ${nome}.`,
        bio
      });
      herois = [snap(novoH), ...herois.filter(h => h.id !== novoH.id)];
      Store.set('herois', herois);

      if (estavaEditando) {
        series.forEach(s => { if (s.heroiId === id) { s.heroiNome = nome; reg(s); } });
        externas.forEach(x => { if (x.heroiId === id) { x.heroiNome = nome; reg(x); } });
        drive.forEach(d => { if (d.heroiId === id) { d.heroiNome = nome; reg(d); } });
        Store.set('series', series);
        Store.set('externas', externas);
        Store.set('drive', drive);
      }

      atualizarSelectHerois(novoH.id);
      atualizarResumoHeroiSelecionado();
      $('#extColecao').value = colecao;
      toggleHeroi(false);
      renderMinhasHQs();
      renderHeroisBiblioteca();
      const cv = contagemVinculosHeroi(novoH);
      toast(estavaEditando
        ? `✅ Herói "${nome}" atualizado! (${cv.textoCurto})`
        : `🦸 Herói "${nome}" criado e selecionado!`);
      return novoH;
    };
    $('#btnSalvarNovoHeroi').onclick = criarOuEditarHeroi;

    /* ---- Gerenciamento de Coleção / Série (Subpasta Opcional, ex.: Ultimate Wolverine) ---- */
    const limparFormSerie = () => {
      editandoSerieId = null;
      $('#tituloPainelSerie').textContent = '📁 Criar Nova Coleção / Série (Subpasta de HQs)';
      $('#btnSalvarNovaSerie').textContent = '✅ Salvar Coleção / Série (Subpasta)';
      $('#blocoGeradorLoteSerie').style.display = '';
      $('#novaSerieTitulo').value = '';
      $('#novaSerieSub').value = '';
      $('#novaSerieResumo').value = '';
      $('#novaSerieCapaUrl').value = '';
      $('#novaSerieEdIni').value = '1';
      $('#novaSerieEdFim').value = '';
      $('#novaSeriePadraoUrl').value = '';
      capaSerieDataUrl = '';
      atualizarPreviewSerie('');
    };
    const toggleSerie = (mostrar) => {
      const p = $('#painelNovaSerie');
      p.style.display = mostrar ? 'block' : 'none';
      if (mostrar) {
        const colAtualForm = $('#extColecao')?.value;
        if (colAtualForm) $('#novaSerieColecao').value = colAtualForm;
        $('#novaSerieTitulo').focus();
      } else {
        limparFormSerie();
      }
    };
    $('#btnToggleNovaSerie').onclick = () => {
      limparFormSerie();
      toggleSerie($('#painelNovaSerie').style.display === 'none');
    };
    $('#btnCancelarSerie').onclick = () => {
      toggleSerie(false);
      if ($('#extSerieSelect').value === '__nova__') $('#extSerieSelect').value = '';
      atualizarResumoSerieSelecionada();
    };
    $('#extSerieSelect').onchange = (e) => {
      const v = e.target.value;
      if (v === '__nova__') {
        limparFormSerie();
        toggleSerie(true);
        return;
      }
      atualizarResumoSerieSelecionada();
      if (v) {
        const sObj = REG.get(v) || series.find(s => s.id === v);
        if (sObj) {
          if (sObj.heroiId && !$('#extHeroiSelect').value) {
            atualizarSelectHerois(sObj.heroiId);
            atualizarResumoHeroiSelecionado();
          }
          if (sObj.colecao) $('#extColecao').value = sObj.colecao;
          if (!editandoObraId) {
            const prox = edicoesDaSerie(sObj.id).length + 1;
            $('#extEdicaoNum').value = prox;
            if (!$('#extTitulo').value.trim() || /^.+\s+#\d+$/.test($('#extTitulo').value.trim())) {
              $('#extTitulo').value = `${sObj.titulo} #${prox}`;
            }
            if (!$('#extSub').value.trim() || /^.+\s+·\s+Edição\s+#\d+$/i.test($('#extSub').value.trim())) {
              $('#extSub').value = `${sObj.titulo} · Edição #${prox}`;
            }
          }
        }
      }
    };
    $('#extEdicaoNum').oninput = (e) => {
      const num = +e.target.value;
      const sId = $('#extSerieSelect').value;
      if (!num || !sId || sId === '__nova__') return;
      const sObj = REG.get(sId) || series.find(s => s.id === sId);
      if (!sObj) return;
      const tAtual = $('#extTitulo').value.trim();
      if (!tAtual || new RegExp(`^${ sObj.titulo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }\\s*#\\d+$`, 'i').test(tAtual)) {
        $('#extTitulo').value = `${sObj.titulo} #${num}`;
        $('#extSub').value = `${sObj.titulo} · Edição #${num}`;
      }
    };

    const atualizarPreviewSerie = (src) => {
      const prev = $('#novaSeriePreview');
      prev.innerHTML = src ? `<img src="${esc(src)}" alt="Preview">` : '📁';
      $('#novaSerieLimparCapa').style.display = (capaSerieDataUrl || $('#novaSerieCapaUrl').value.trim()) ? 'inline-flex' : 'none';
    };
    $('#novaSerieCapaFile').onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const dataUrl = await miniatura(f, 400);
      if (dataUrl) {
        capaSerieDataUrl = dataUrl;
        atualizarPreviewSerie(dataUrl);
        toast('🖼️ Capa da Coleção/Série carregada do computador!');
      }
    };
    $('#novaSerieLimparCapa').onclick = () => {
      capaSerieDataUrl = '';
      $('#novaSerieCapaFile').value = '';
      $('#novaSerieCapaUrl').value = '';
      atualizarPreviewSerie('');
    };
    $('#novaSerieCapaUrl').oninput = (e) => {
      if (!capaSerieDataUrl) atualizarPreviewSerie(e.target.value.trim());
    };

    // Criar ou Editar Subpasta de Coleção / Série (e opcionalmente gerar as edições #1 a #N!)
    const criarOuEditarSerie = () => {
      if ($('#painelNovoHeroi').style.display !== 'none' && $('#novoHeroiNome').value.trim()) {
        criarOuEditarHeroi();
      }
      const titulo = $('#novaSerieTitulo').value.trim();
      if (!titulo) { toast('Digite o nome da Coleção / Série (ex.: Ultimate Wolverine).'); $('#novaSerieTitulo').focus(); return null; }

      const selHeroi = $('#extHeroiSelect');
      const heroiId = selHeroi.value && selHeroi.value !== '__novo__' ? selHeroi.value : '';
      const hItem = heroiId ? REG.get(heroiId) : null;
      const heroiNome = hItem?.titulo || selHeroi.selectedOptions?.[0]?.dataset?.nome || '';

      const colecao = $('#novaSerieColecao').value || $('#extColecao').value || hItem?.colecao || 'marvel';
      const sub = $('#novaSerieSub').value.trim() || (heroiNome ? `${heroiNome} · Coleção / Série` : 'Coleção / Série de HQs');
      const capa = capaSerieDataUrl || $('#novaSerieCapaUrl').value.trim() || hItem?.capa || '';
      const resumo = $('#novaSerieResumo').value.trim() || `Subpasta da coleção/série ${titulo}${heroiNome ? ` (${heroiNome})` : ''}.`;
      const formatoObra = $('#extFormato').value || 'HQ';
      const id = editandoSerieId || ('serie:' + norm(titulo).replace(/[^a-z0-9]+/g, '-') + '-' + Date.now().toString(36).slice(-4));
      const estavaEditando = !!editandoSerieId;

      const novaS = reg({
        id,
        tipo: 'serie-pasta',
        formatoObra,
        heroiId,
        heroiNome,
        titulo,
        sub,
        colecao,
        capa,
        banner: capa,
        resumo
      });
      series = [snap(novaS), ...series.filter(s => s.id !== novaS.id)];
      Store.set('series', series);

      if (estavaEditando) {
        externas.forEach(x => {
          if (x.serieId === id) {
            x.serieNome = titulo;
            if (heroiId && !x.heroiId) { x.heroiId = heroiId; x.heroiNome = heroiNome; }
            reg(x);
          }
        });
        Store.set('externas', externas);
      }

      // Verifica se o usuário pediu geração em lote de edições (ex.: de 1 até 16)
      const edIni = parseInt($('#novaSerieEdIni').value, 10) || 1;
      const edFim = parseInt($('#novaSerieEdFim').value, 10) || 0;
      const padraoUrl = $('#novaSeriePadraoUrl').value.trim();
      let geradas = 0;

      if (!estavaEditando && edFim >= edIni && (edFim - edIni) <= 200) {
        const existentesNums = new Set(edicoesDaSerie(id).map(e => +e.edicaoNum));
        const novasEdicoes = [];
        for (let n = edIni; n <= edFim; n++) {
          if (existentesNums.has(n)) continue;
          const nPad2 = String(n).padStart(2, '0');
          const nPad3 = String(n).padStart(3, '0');
          let pagsEd = [];
          if (padraoUrl) {
            const padraoEd = padraoUrl
              .replace(/\{ED3\}/gi, nPad3)
              .replace(/\{ED2\}/gi, nPad2)
              .replace(/\{ED\}/gi, String(n));
            pagsEd = Fontes.expandirPadraoURL(padraoEd);
          }
          const capaEd = pagsEd[0] || capa || '';
          const edItem = reg({
            id: `ext:${id.replace('serie:', '')}-ed-${n}-${Date.now().toString(36).slice(-3)}`,
            tipo: 'ext-hq',
            formatoObra,
            heroiId,
            heroiNome,
            serieId: id,
            serieNome: titulo,
            edicaoNum: n,
            titulo: `${titulo} #${n}`,
            sub: `${titulo} · Edição #${n}`,
            colecao,
            capa: capaEd,
            banner: capaEd,
            resumo: `Edição #${n} da série ${titulo}${heroiNome ? ` (${heroiNome})` : ''}.`,
            url: '',
            embed: '',
            paginas: pagsEd,
            textoLore: ''
          });
          novasEdicoes.push(snap(edItem));
          geradas++;
        }
        if (novasEdicoes.length) {
          externas = [...novasEdicoes, ...externas];
          Store.set('externas', externas);
        }
      }

      atualizarSelectSeries(novaS.id);
      atualizarResumoSerieSelecionada();
      atualizarResumoHeroiSelecionado();
      $('#extColecao').value = colecao;

      // Prepara os campos do formulário para a próxima edição da série
      const proxEd = edicoesDaSerie(novaS.id).length + 1;
      $('#extEdicaoNum').value = proxEd;
      if (!$('#extTitulo').value.trim()) {
        $('#extTitulo').value = `${titulo} #${proxEd}`;
        $('#extSub').value = `${titulo} · Edição #${proxEd}`;
      }

      toggleSerie(false);
      renderMinhasHQs();
      configurarOrganizadorSeries();
      BD.todos().then(files => configurarOrganizadorSeries(files.map(o => Biblioteca.item(o))));
      renderSeriesBiblioteca();
      renderHeroisBiblioteca();
      renderListaBiblioteca();

      if (geradas > 0) {
        toast(`📁 Subpasta "${titulo}" criada com ${geradas} edições (#${edIni} a #${edFim})!`);
      } else {
        toast(estavaEditando
          ? `✅ Subpasta "${titulo}" atualizada!`
          : `📁 Subpasta "${titulo}" criada e selecionada! Adicione as edições abaixo.`);
      }
      return novaS;
    };
    $('#btnSalvarNovaSerie').onclick = criarOuEditarSerie;

    // Upload local de capa para a Obra (HQ / Mangá / Lore)
    const atualizarPreviewObra = (src, rotulo) => {
      const prev = $('#extCapaPreview');
      prev.innerHTML = src ? `<img src="${esc(src)}" alt="Preview">` : '🖼️';
      $('#extLimparCapa').style.display = (capaObraDataUrl || $('#extCapa').value.trim()) ? 'inline-flex' : 'none';
      if (rotulo) $('#extCapaNome').textContent = rotulo;
    };
    $('#extCapaFile').onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      const dataUrl = await miniatura(f, 400);
      if (dataUrl) {
        capaObraDataUrl = dataUrl;
        atualizarPreviewObra(dataUrl, `✅ Capa local: ${f.name}`);
        toast('🖼️ Capa carregada do seu computador!');
      }
    };
    $('#extLimparCapa').onclick = () => {
      capaObraDataUrl = '';
      $('#extCapaFile').value = '';
      $('#extCapa').value = '';
      if (capaExtraidaPdf) {
        atualizarPreviewObra(capaExtraidaPdf, '📄 Usando automaticamente a 1ª página do PDF enviado como capa');
      } else {
        atualizarPreviewObra('', 'Nenhuma imagem local selecionada (usará a 1ª página do PDF/HQ, a capa da série ou a URL abaixo)');
      }
    };
    $('#extCapa').oninput = (e) => {
      if (!capaObraDataUrl) {
        const v = e.target.value.trim();
        if (v) atualizarPreviewObra(v, 'Usando URL da capa abaixo');
        else if (capaExtraidaPdf) atualizarPreviewObra(capaExtraidaPdf, '📄 Usando automaticamente a 1ª página do PDF enviado como capa');
        else atualizarPreviewObra('');
      }
    };

    // Upload direto de arquivo PDF / CBZ no formulário principal (extrai 1ª página como capa automaticamente)
    $('#extArquivoObraInput').onchange = async (e) => {
      let f = e.target.files?.[0];
      if (!f) return;
      if (/\.(cbr|rar)$/i.test(f.name)) {
        arquivoObraSelecionado = null;
        const input = e.target, save = $('#extSalvarBtn'), account = Auth.usuario?.id;
        input.disabled = true; save.disabled = true; $('#extLimparArquivoObra').disabled = true;
        $('#extArquivoObraInfo').textContent = 'Abrindo CBR e preparando as páginas…';
        try { f = await EQCBR.convert(f); if (!input.isConnected || Auth.usuario?.id !== account) return; }
        catch (error) { $('#extArquivoObraInfo').textContent = error.message; input.value = ''; return; }
        finally { input.disabled = false; save.disabled = false; $('#extLimparArquivoObra')?.removeAttribute('disabled'); }
      }
      arquivoObraSelecionado = f;
      capaExtraidaPdf = '';
      qtdPaginasArquivoObra = 0;
      $('#extLimparArquivoObra').style.display = 'inline-flex';
      const infoEl = $('#extArquivoObraInfo');
      const nomeLimpo = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      if (!$('#extTitulo').value.trim()) {
        $('#extTitulo').value = nomeLimpo;
      }
      const n = f.name.toLowerCase();
      if (n.endsWith('.pdf') || f.type === 'application/pdf') {
        infoEl.textContent = `⏳ Lendo PDF "${f.name}" e extraindo a 1ª página como capa...`;
        const infoPdf = await PDFUtil.extrairCapaEPaginas(f);
        capaExtraidaPdf = infoPdf.capa || '';
        qtdPaginasArquivoObra = infoPdf.numPaginas || 0;
        infoEl.innerHTML = `✅ PDF pronto: <strong>${esc(f.name)}</strong> (${qtdPaginasArquivoObra ? `${qtdPaginasArquivoObra} páginas · ` : ''}Modo Leitor Padrão do Sistema · 1ª página extraída como capa)`;
        if (!capaObraDataUrl && !$('#extCapa').value.trim() && capaExtraidaPdf) {
          atualizarPreviewObra(capaExtraidaPdf, `📄 Capa gerada automaticamente da 1ª página de "${f.name}"`);
        }
        toast(`📄 PDF "${f.name}" carregado (${qtdPaginasArquivoObra} págs.) — 1ª página definida como capa!`);
      } else if (n.endsWith('.cbz') || n.endsWith('.zip')) {
        infoEl.textContent = `⏳ Extraindo 1ª página do CBZ "${f.name}"...`;
        try {
          if (window.JSZip) {
            const z = await JSZip.loadAsync(f);
            const arqs = Object.keys(z.files).filter(k => !z.files[k].dir && /\.(jpe?g|png|webp)$/i.test(k)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
            qtdPaginasArquivoObra = arqs.length;
            if (arqs[0]) {
              const b = await z.files[arqs[0]].async('blob');
              capaExtraidaPdf = await miniatura(b);
            }
          }
        } catch {}
        infoEl.innerHTML = `✅ CBZ pronto: <strong>${esc(f.name)}</strong> (${qtdPaginasArquivoObra ? `${qtdPaginasArquivoObra} páginas · ` : ''}1ª página extraída como capa)`;
        if (!capaObraDataUrl && !$('#extCapa').value.trim() && capaExtraidaPdf) {
          atualizarPreviewObra(capaExtraidaPdf, `📦 Capa gerada da 1ª página de "${f.name}"`);
        }
        toast(`📦 CBZ "${f.name}" carregado!`);
      } else {
        infoEl.innerHTML = `✅ Arquivo selecionado: <strong>${esc(f.name)}</strong>`;
      }
    };

    $('#extLimparArquivoObra').onclick = () => {
      arquivoObraSelecionado = null;
      capaExtraidaPdf = '';
      qtdPaginasArquivoObra = 0;
      $('#extArquivoObraInput').value = '';
      $('#extLimparArquivoObra').style.display = 'none';
      $('#extArquivoObraInfo').textContent = 'Nenhum arquivo PDF/CBZ anexado (você também pode colar URLs abaixo ou arrastar vários PDFs no fim da página).';
      if (!capaObraDataUrl && !$('#extCapa').value.trim()) {
        atualizarPreviewObra('', 'Nenhuma imagem local selecionada (usará a 1ª página do PDF/HQ, a capa da série ou a URL abaixo)');
      }
    };

    // Cancelar modo de edição de obra
    const sairModoEdicaoObra = () => {
      editandoObraId = null;
      arquivoObraSelecionado = null;
      capaExtraidaPdf = '';
      qtdPaginasArquivoObra = 0;
      $('#extArquivoObraInput').value = '';
      $('#extLimparArquivoObra').style.display = 'none';
      $('#extArquivoObraInfo').textContent = 'Nenhum arquivo PDF/CBZ anexado (você também pode colar URLs abaixo ou arrastar vários PDFs no fim da página).';
      $('#bannerEdicaoObra').style.display = 'none';
      $('#tituloFormObra').textContent = '➕ Adicionar Nova Obra (HQ, Mangá, Lore...) · Vincular Herói & Coleção/Série (Subpasta)';
      $('#extSalvarBtn').textContent = '➕ Salvar na Estante & Vincular';
      $('#blocoPaginasHQ').style.display = '';
      $('#blocoTextoLore').style.display = '';
      $('#blocoSiteUrl').style.display = '';
      selecionarFormatoObra('HQ');
      $('#extTitulo').value = '';
      $('#extSub').value = '';
      $('#extResumo').value = '';
      $('#extSiteUrl').value = '';
      $('#extPaginas').value = '';
      $('#extTextoLore').value = '';
      $('#extCapa').value = '';
      $('#extEdicaoNum').value = '';
      capaObraDataUrl = '';
      atualizarPreviewObra('', 'Nenhuma imagem local selecionada (usará a 1ª página do PDF/HQ, a capa da série ou a URL abaixo)');
    };
    $('#btnCancelarEdicaoObra').onclick = sairModoEdicaoObra;

    // Carregar um item (Obra, Série, Herói, Drive ou Arquivo Local) no formulário para Edição
    async function carregarItemParaEdicao(id) {
      let it = REG.get(id);
      if (!it && id.startsWith('local:')) {
        const o = await BD.pegar(id);
        if (o) it = Biblioteca.item(o);
      }
      if (!it) return toast('Item não encontrado para edição.');

      if (it.tipo === 'heroi') {
        toggleHeroi(true);
        editandoHeroiId = it.id;
        $('#tituloPainelHeroi').textContent = `✏️ Editando Herói / Personagem: ${it.titulo}`;
        $('#btnSalvarNovoHeroi').textContent = '💾 Salvar Alterações do Herói';
        $('#novoHeroiNome').value = it.titulo || '';
        $('#novoHeroiSub').value = it.sub || '';
        if (it.colecao) $('#novoHeroiColecao').value = it.colecao;
        $('#novoHeroiBio').value = it.bio || it.resumo || '';
        if (it.capa?.startsWith('data:')) {
          capaHeroiDataUrl = it.capa;
          $('#novoHeroiCapaUrl').value = '';
        } else {
          capaHeroiDataUrl = '';
          $('#novoHeroiCapaUrl').value = it.capa || '';
        }
        atualizarPreviewHeroi(it.capa || '');
        $('#painelNovoHeroi').scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast(`✏️ Editando herói "${it.titulo}"`);
        return;
      }

      if (it.tipo === 'serie-pasta') {
        if (it.heroiId) {
          atualizarSelectHerois(it.heroiId);
          atualizarResumoHeroiSelecionado();
        }
        toggleSerie(true);
        editandoSerieId = it.id;
        $('#tituloPainelSerie').textContent = `✏️ Editando Subpasta de Coleção / Série: ${it.titulo}`;
        $('#btnSalvarNovaSerie').textContent = '💾 Salvar Alterações da Subpasta';
        $('#blocoGeradorLoteSerie').style.display = 'none';
        $('#novaSerieTitulo').value = it.titulo || '';
        $('#novaSerieSub').value = it.sub || '';
        if (it.colecao) $('#novaSerieColecao').value = it.colecao;
        $('#novaSerieResumo').value = it.resumo || '';
        if (it.capa?.startsWith('data:')) {
          capaSerieDataUrl = it.capa;
          $('#novaSerieCapaUrl').value = '';
        } else {
          capaSerieDataUrl = '';
          $('#novaSerieCapaUrl').value = it.capa || '';
        }
        atualizarPreviewSerie(it.capa || '');
        $('#painelNovaSerie').scrollIntoView({ behavior: 'smooth', block: 'center' });
        toast(`✏️ Editando coleção/série "${it.titulo}"`);
        return;
      }

      // Edição de Obra / Edição (ext-hq, drive ou local)
      editandoObraId = it.id;
      $('#bannerEdicaoObra').style.display = 'flex';
      $('#txtEditandoObra').textContent = `${it.titulo} (${it.serieNome ? `📁 ${it.serieNome} #${it.edicaoNum || '?'} · ` : ''}${it.formatoObra || it.tipo.toUpperCase()})`;
      $('#tituloFormObra').textContent = `✏️ Editando: ${it.titulo}`;
      $('#extSalvarBtn').textContent = '💾 Salvar Alterações';

      selecionarFormatoObra(it.formatoObra || 'HQ');
      atualizarSelectHerois(it.heroiId || '');
      atualizarSelectSeries(it.serieId || '');
      $('#extEdicaoNum').value = it.edicaoNum || '';
      atualizarResumoHeroiSelecionado();
      atualizarResumoSerieSelecionada();

      $('#extTitulo').value = it.titulo || '';
      $('#extSub').value = it.sub || '';
      if (it.colecao && $('#extColecao').querySelector(`option[value="${CSS.escape(it.colecao)}"]`)) {
        $('#extColecao').value = it.colecao;
      }
      $('#extResumo').value = it.resumo || '';
      $('#extSiteUrl').value = it.url || '';
      $('#extPaginas').value = (it.paginas || []).join('\n');
      $('#extTextoLore').value = it.textoLore || '';

      if (it.capa?.startsWith('data:')) {
        capaObraDataUrl = it.capa;
        $('#extCapa').value = '';
        atualizarPreviewObra(it.capa, '✅ Capa salva localmente');
      } else {
        capaObraDataUrl = '';
        $('#extCapa').value = it.capa || '';
        atualizarPreviewObra(it.capa || '', it.capa ? 'Usando URL da capa abaixo' : 'Nenhuma imagem local selecionada');
      }

      const ehLocal = it.tipo === 'local';
      $('#blocoPaginasHQ').style.display = ehLocal ? 'none' : '';
      $('#blocoSiteUrl').style.display = ehLocal ? 'none' : '';

      $('#painelFormObra').scrollIntoView({ behavior: 'smooth', block: 'start' });
      toast(`✏️ Editando "${it.titulo}"`);
    }

    // Eventos de Extração de HQ de Outro Site
    $('#extExtrairBtn').onclick = async () => {
      const url = $('#extSiteUrl').value.trim();
      if (!url) return toast('Cole a URL da página da HQ primeiro.');
      const st = $('#extStatus');
      st.textContent = '⏳ Vasculhando a página em busca das imagens da HQ...';
      try {
        const res = await Fontes.extrairImagensSite(url);
        if (res.titulo && !$('#extTitulo').value) $('#extTitulo').value = res.titulo;
        if (res.resumo && !$('#extResumo').value) $('#extResumo').value = res.resumo;
        if (res.capa && !$('#extCapa').value) {
          $('#extCapa').value = res.capa;
          if (!capaObraDataUrl) atualizarPreviewObra(res.capa);
        }
        if (res.paginas?.length) {
          $('#extPaginas').value = res.paginas.join('\n');
          st.textContent = `✅ ${res.paginas.length} páginas encontradas! Confira os dados e clique em "Salvar".`;
          toast(`🎉 ${res.paginas.length} páginas extraídas com sucesso!`);
        } else {
          st.textContent = '⚠️ Nenhuma imagem solta detectada — você pode salvar mesmo assim para abrir no leitor integrado (Iframe) ou colar as URLs das páginas abaixo.';
          toast('Página lida — sem imagens diretas detectadas.');
        }
      } catch (e) {
        st.textContent = '⚠️ ' + e.message;
        toast(e.message);
      }
    };

    // Salvar Nova Obra/Edição ou Salvar Alterações de Obra Existente
    $('#extSalvarBtn').onclick = async () => {
      // Se o painel de novo herói estiver aberto com nome preenchido, salva o herói primeiro
      if ($('#painelNovoHeroi').style.display !== 'none' && $('#novoHeroiNome').value.trim()) {
        criarOuEditarHeroi();
      }
      // Se o painel de nova série estiver aberto com nome preenchido, salva a série primeiro
      if ($('#painelNovaSerie').style.display !== 'none' && $('#novaSerieTitulo').value.trim()) {
        const serieCriada = criarOuEditarSerie();
        // Se o usuário usou o gerador em lote (ex.: #1 a #16) e não preencheu páginas/arquivo avulsos abaixo, já encerra aqui
        if (serieCriada && !arquivoObraSelecionado && !$('#extPaginas').value.trim() && !$('#extTextoLore').value.trim() && !$('#extSiteUrl').value.trim()) {
          return;
        }
      }

      const formatoObra = $('#extFormato').value || 'HQ';
      const selSerie = $('#extSerieSelect');
      const serieId = selSerie.value && selSerie.value !== '__nova__' ? selSerie.value : '';
      const serieObj = serieId ? (REG.get(serieId) || series.find(s => s.id === serieId)) : null;
      const serieNome = serieObj?.titulo || '';
      const edicaoNum = $('#extEdicaoNum').value ? parseInt($('#extEdicaoNum').value, 10) : (serieObj ? edicoesDaSerie(serieObj.id).length + 1 : null);

      let titulo = $('#extTitulo').value.trim();
      if (!titulo && arquivoObraSelecionado) {
        titulo = arquivoObraSelecionado.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ');
      }
      if (!titulo && serieNome) {
        titulo = `${serieNome} #${edicaoNum || 1}`;
      }
      const siteUrl = $('#extSiteUrl').value.trim();
      const paginas = Fontes.expandirPadraoURL($('#extPaginas').value);
      const textoLore = $('#extTextoLore').value.trim();

      if (!titulo) return toast(`Informe pelo menos o Título da ${formatoObra}.`);

      const selHeroi = $('#extHeroiSelect');
      let heroiId = selHeroi.value && selHeroi.value !== '__novo__' ? selHeroi.value : (serieObj?.heroiId || '');
      let heroiNome = '';
      if (heroiId) {
        const hItem = REG.get(heroiId);
        heroiNome = hItem?.titulo || selHeroi.selectedOptions?.[0]?.dataset?.nome || serieObj?.heroiNome || '';
      }

      const colecao = $('#extColecao').value || serieObj?.colecao || 'arquivo';
      const hItemRef = heroiId ? REG.get(heroiId) : null;
      // Prioridade da capa: 1) Upload de capa customizada, 2) URL da capa, 3) 1ª página extraída do PDF/CBZ, 4) 1ª página das URLs, 5) Capa da série/herói
      const capa = capaObraDataUrl || $('#extCapa').value.trim() || capaExtraidaPdf || paginas[0] || serieObj?.capa || hItemRef?.capa || '';
      const resumo = $('#extResumo').value.trim() || (textoLore ? textoLore.slice(0, 220) + (textoLore.length > 220 ? '…' : '') : '');

      // Caso 0: Usuário anexou um arquivo PDF/CBZ diretamente no formulário principal (novo ou substituindo arquivo local)
      if (arquivoObraSelecionado) {
        const nArq = arquivoObraSelecionado.name.toLowerCase();
        const formatoArq = (nArq.endsWith('.cbz') || nArq.endsWith('.zip')) ? 'cbz'
          : (nArq.endsWith('.pdf') || arquivoObraSelecionado.type === 'application/pdf') ? 'pdf'
          : nArq.endsWith('.epub') ? 'epub'
          : (nArq.endsWith('.txt') || nArq.endsWith('.md')) ? 'txt' : 'img';
        let textoArq = '';
        if (formatoArq === 'txt') {
          textoArq = await arquivoObraSelecionado.text();
        }
        const idLocal = (editandoObraId && editandoObraId.startsWith('local:'))
          ? editandoObraId
          : `local:${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const objLocal = {
          id: idLocal,
          nome: titulo,
          sub: $('#extSub').value.trim(),
          resumo,
          formato: formatoArq,
          formatoObra,
          colecao,
          heroiId,
          heroiNome,
          serieId,
          serieNome,
          edicaoNum,
          paginas: qtdPaginasArquivoObra || 0,
          capa,
          texto: textoArq,
          blob: arquivoObraSelecionado,
          criado: Date.now()
        };
        if (!await Biblioteca.publicar(objLocal)) return;
        if (serieObj && !serieObj.capa && capa) {
          serieObj.capa = capa;
          serieObj.banner = capa;
          reg(serieObj);
          series = [snap(serieObj), ...series.filter(s => s.id !== serieObj.id)];
          Store.set('series', series);
        }
        if (heroiId) preHeroiSelecionado = heroiId;
        if (serieId) preSerieSelecionada = serieId;
        renderMinhasHQs();
        toast(`📄 "${titulo}" salvo com capa da 1ª página e Leitor Padrão ativado!`);
        return renderBiblioteca();
      }

      // Caso 1: Editando um arquivo local do IndexedDB (local:)
      if (editandoObraId && editandoObraId.startsWith('local:')) {
        const known = REG.get(editandoObraId);
        const o = await BD.pegar(editandoObraId) || (known?.storagePath ? { ...known, nome: known.titulo, paginas: known.paginasCount } : null);
        if (!o) return toast('Arquivo local não encontrado.');
        o.nome = titulo;
        o.sub = $('#extSub').value.trim();
        o.resumo = resumo;
        o.colecao = colecao;
        o.formatoObra = formatoObra;
        o.heroiId = heroiId;
        o.heroiNome = heroiNome;
        o.serieId = serieId;
        o.serieNome = serieNome;
        o.edicaoNum = edicaoNum;
        if (capa) o.capa = capa;
        if (!await Biblioteca.publicar(o)) return;
        if (heroiId) preHeroiSelecionado = heroiId;
        if (serieId) preSerieSelecionada = serieId;
        renderMinhasHQs();
        toast(`💾 "${titulo}" atualizado!`);
        return renderBiblioteca();
      }

      // Caso 2: Editando um item do Google Drive (drive:)
      if (editandoObraId && editandoObraId.startsWith('drive:')) {
        const l = siteUrl ? linkDrive(siteUrl) : null;
        const ant = REG.get(editandoObraId) || {};
        const att = reg({
          ...ant,
          id: editandoObraId,
          tipo: 'drive',
          formatoObra,
          heroiId,
          heroiNome,
          serieId,
          serieNome,
          edicaoNum,
          titulo,
          sub: $('#extSub').value.trim() || ant.sub || 'Google Drive',
          colecao,
          capa: capa || ant.capa || '',
          banner: capa || ant.capa || '',
          resumo,
          url: siteUrl || ant.url,
          embed: l ? l.embed : (ant.embed || siteUrl)
        });
        drive = [snap(att), ...drive.filter(d => d.id !== att.id)];
        Store.set('drive', drive);
        if (heroiId) preHeroiSelecionado = heroiId;
        if (serieId) preSerieSelecionada = serieId;
        renderMinhasHQs();
        toast(`💾 "${titulo}" atualizado!`);
        return renderBiblioteca();
      }

      // Caso 3: Nova Obra/Edição ou Editando Obra (ext:)
      // Permite salvar sem páginas quando faz parte de uma Série/Subpasta (para o usuário poder cadastrar os números #1 a #16 e colocar páginas depois se quiser)
      if (!paginas.length && !textoLore && !siteUrl && !serieId) {
        return toast('Envie um arquivo PDF/CBZ, informe as URLs das páginas, o Texto da Lore/Conto, o link externo ou selecione uma Coleção/Série.');
      }

      // Se a URL do site aponta diretamente para um arquivo .pdf e não há capa definida, tenta extrair a 1ª página do PDF como capa
      let capaFinal = capa;
      let numPagPdfUrl = 0;
      if (!capaFinal && siteUrl && /\.pdf($|\?|#)/i.test(siteUrl)) {
        try {
          toast('⏳ Extraindo 1ª página do PDF remoto como capa...');
          const infoRemoto = await PDFUtil.extrairCapaEPaginas(siteUrl);
          if (infoRemoto.capa) capaFinal = infoRemoto.capa;
          if (infoRemoto.numPaginas) numPagPdfUrl = infoRemoto.numPaginas;
        } catch {}
      }

      const subPadrao = serieNome
        ? `${serieNome} · Edição #${edicaoNum || 1}${paginas.length ? ` (${paginas.length} págs.)` : numPagPdfUrl ? ` (${numPagPdfUrl} págs. PDF)` : ''}`
        : paginas.length
          ? `${formatoObra} · ${paginas.length} páginas`
          : numPagPdfUrl
            ? `${formatoObra} (PDF) · ${numPagPdfUrl} páginas`
            : textoLore
              ? `${formatoObra} Completa em Português`
              : `${formatoObra} · Site Externo`;
      const sub = $('#extSub').value.trim() || (heroiNome && !serieNome ? `${heroiNome} · ${subPadrao}` : subPadrao);
      const idObra = editandoObraId || ('ext:' + Date.now().toString(36));
      const estavaEditando = !!editandoObraId;

      const novo = reg({
        id: idObra,
        tipo: 'ext-hq',
        formatoObra,
        heroiId,
        heroiNome,
        serieId,
        serieNome,
        edicaoNum,
        titulo,
        sub,
        colecao,
        capa: capaFinal,
        banner: capaFinal,
        resumo,
        url: siteUrl,
        embed: siteUrl,
        paginas,
        textoLore
      });
      externas = [snap(novo), ...externas.filter(x => x.id !== novo.id)];
      Store.set('externas', externas);

      // Se a série ainda não tinha capa e esta edição tem capa, atualiza a capa da subpasta da série
      if (serieObj && !serieObj.capa && capaFinal) {
        serieObj.capa = capaFinal;
        serieObj.banner = capaFinal;
        reg(serieObj);
        series = [snap(serieObj), ...series.filter(s => s.id !== serieObj.id)];
        Store.set('series', series);
      }

      if (heroiId) preHeroiSelecionado = heroiId;
      if (serieId) preSerieSelecionada = serieId;
      renderMinhasHQs();
      const cv = heroiId ? contagemVinculosHeroi(heroiId) : null;
      const totalEdSerie = serieId ? edicoesDaSerie(serieId).length : 0;
      toast(estavaEditando
        ? `💾 "${titulo}" atualizada!${serieNome ? ` (📁 ${serieNome}: ${totalEdSerie} ed.)` : ''}`
        : `📚 "${titulo}" salva!${serieNome ? ` 📁 ${serieNome} agora tem ${totalEdSerie} edição(ões)!` : ''}${cv ? ` · 🦸 ${heroiNome}: ${cv.textoCurto}` : ''}`);
      renderBiblioteca();
    };

    // Exportar e Importar Backup (.eleo / .json) (inclui series, externas, herois e drive)
    $('#btnExportarJSON').onclick = () => {
      const dados = { versao: 4, app: 'EleoQuadrinho', exportadoEm: new Date().toISOString(), series, herois, externas, drive };
      const blob = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'backup-minhas-hqs-eleoquadrinho.eleo';
      a.click();
      toast('💾 Catálogo exportado. Para incluir arquivos, use o pacote de HQs.');
    };
    $('#inpImportarJSON').onchange = async (e) => {
      const f = e.target.files?.[0]; if (!f) return;
      try {
        const j = JSON.parse(await f.text());
        const listaSeries = j.series || [];
        const listaHerois = j.herois || [];
        const listaExt = Array.isArray(j) ? j : (j.externas || []);
        const listaDrv = j.drive || [];
        let cont = 0;
        listaSeries.forEach(s => {
          const it = reg({
            id: s.id?.startsWith('serie:') ? s.id : ('serie:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
            tipo: 'serie-pasta',
            formatoObra: s.formatoObra || 'HQ',
            heroiId: s.heroiId || '',
            heroiNome: s.heroiNome || '',
            titulo: s.titulo || 'Coleção / Série',
            sub: s.sub || 'Coleção / Série de HQs',
            colecao: s.colecao || 'arquivo',
            capa: s.capa || '',
            banner: s.capa || '',
            resumo: s.resumo || ''
          });
          series = [snap(it), ...series.filter(x => x.id !== it.id)];
          cont++;
        });
        listaHerois.forEach(h => {
          const it = reg({
            id: h.id?.startsWith('heroi:') ? h.id : ('heroi:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
            tipo: 'heroi',
            formatoObra: 'Herói',
            titulo: h.titulo || h.nome || 'Herói',
            sub: h.sub || 'Herói & Personagem',
            colecao: h.colecao || 'originais',
            capa: h.capa || '',
            banner: h.capa || '',
            resumo: h.resumo || h.bio || '',
            bio: h.bio || h.resumo || ''
          });
          herois = [snap(it), ...herois.filter(x => x.id !== it.id)];
          cont++;
        });
        listaExt.forEach(raw => {
          const paginas = Array.isArray(raw.paginas) ? raw.paginas : Fontes.expandirPadraoURL(raw.paginas || '');
          const it = reg({
            id: raw.id?.startsWith('ext:') ? raw.id : ('ext:' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5)),
            tipo: 'ext-hq',
            formatoObra: raw.formatoObra || 'HQ',
            heroiId: raw.heroiId || '',
            heroiNome: raw.heroiNome || '',
            serieId: raw.serieId || '',
            serieNome: raw.serieNome || '',
            edicaoNum: raw.edicaoNum || null,
            titulo: raw.titulo || raw.title || 'Obra Importada',
            sub: raw.sub || `${paginas.length} páginas`,
            colecao: raw.colecao || 'arquivo',
            capa: raw.capa || raw.cover || paginas[0] || '',
            banner: raw.capa || raw.cover || paginas[0] || '',
            resumo: raw.resumo || raw.description || '',
            url: raw.url || '',
            embed: raw.embed || raw.url || '',
            paginas,
            textoLore: raw.textoLore || ''
          });
          externas = [snap(it), ...externas.filter(x => x.id !== it.id)];
          cont++;
        });
        listaDrv.forEach(d => {
          const it = reg(d);
          drive = [snap(it), ...drive.filter(x => x.id !== it.id)];
          cont++;
        });
        Store.set('series', series);
        Store.set('herois', herois);
        Store.set('externas', externas);
        Store.set('drive', drive);
        renderMinhasHQs();
        toast(`📥 ${cont} item(ns) importado(s) com sucesso!`);
        renderBiblioteca();
      } catch (err) {
        toast('Erro ao ler JSON: ' + err.message);
      }
    };

    const drop = $('#drop'), inp = $('#arqInput');
    inp.onchange = () => Biblioteca.importar(inp.files);
    $('#pastaBtn').onclick = () => $('#pastaInput').click();
    $('#pastaInput').onchange = (e) => Biblioteca.importar(e.target.files);
    ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('sobre'); }));
    ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('sobre'); }));
    drop.addEventListener('drop', e => Biblioteca.importar(e.dataTransfer.files));
    $('#driveAdd').onclick = () => {
      const l = linkDrive($('#driveUrl').value);
      if (!l) return toast('Link do Drive inválido');
      const nomes = { pasta: 'Pasta de HQs (Drive)', arquivo: 'HQ do Drive', document: 'Documento Google', presentation: 'Apresentação Google', spreadsheets: 'Planilha Google' };
      const it = reg({ id: 'drive:' + l.fid, tipo: 'drive', titulo: $('#driveNome').value.trim() || nomes[l.tipo], sub: 'Google Drive · ' + l.tipo, url: $('#driveUrl').value.trim(), embed: l.embed });
      drive = [snap(it), ...drive.filter(d => d.id !== it.id)]; Store.set('drive', drive);
      renderMinhasHQs();
      toast('☁️ Adicionado do Drive'); renderBiblioteca();
    };

    let locais = [];
    try { locais = (await BD.todos()).sort((a, b) => b.adicionado - a.adicionado).map(o => Biblioteca.item(o)); } catch (e) { console.warn(e); toast(e.message); }

    // Shared metadata remains authoritative after loading this device's file copies.
    [...externas, ...drive].forEach(reg);

    function renderSeriesBiblioteca() {
      const bs = $('#bibSeries'); if (!bs) return;
      const listaS = series.map(s => REG.get(s.id) || reg(s));
      if (!listaS.length) { bs.innerHTML = ''; return; }
      bs.innerHTML = secao('📁 Minhas Coleções & Séries (Subpastas de HQs)', `${listaS.length} subpasta(s) · Clique em qualquer série para abrir as edições numeradas (ex.: #1 a #16) ou clique em "➕ +Ed"`,
        `<div class="grade">${listaS.map(i => cartao(i)).join('')}</div>`);
    }

    function renderHeroisBiblioteca() {
      const bh = $('#bibHerois'); if (!bh) return;
      const listaH = herois.map(h => REG.get(h.id) || reg(h));
      if (!listaH.length) { bh.innerHTML = ''; return; }
      bh.innerHTML = secao('🦸 Meus Heróis & Personagens Cadastrados', `${listaH.length} herói(s) · Veja quantas Coleções/Séries, HQs, Mangás, Lores e Histórias estão vinculadas a cada um`,
        `<div class="grade">${listaH.map(i => cartao(i)).join('')}</div>`);
    }

    function renderListaBiblioteca() {
      const extIts = externas.map(x => REG.get(x.id) || reg(x));
      const driveIts = drive.map(d => REG.get(d.id) || reg(d));
      const todos = [...new Map([...extIts, ...driveIts].map(it => [it.id, it])).values()];
      $('#bibLocais').innerHTML = listaDispositivo(locais);
      $('#bibLista').innerHTML = secao('Seu catálogo na nuvem', `${todos.length} obra(s) publicada(s)`, libraryPanel(todos,'cloud'));
      setupLibraryViews();
    }

    configurarLocal();
    atualizarEspacoNuvem();
    $('#btnPublicarLocais').onclick = e => Biblioteca.publicarPendentes(e.currentTarget);
    configurarOrganizadorSeries();
    renderSeriesBiblioteca();
    renderHeroisBiblioteca();
    renderListaBiblioteca();
    configurarOrganizadorSeries(locais);
    configurarAbasBiblioteca();

    // Se o usuário clicou em "✏️ Editar" em algum cartão ou detalhe, abre o item imediatamente no formulário
    if (itemParaEditar) {
      const alvoEdicao = itemParaEditar;
      itemParaEditar = null;
      carregarItemParaEdicao(alvoEdicao);
    }
  }

  /* ---------------- Eventos globais ---------------- */
  document.addEventListener('click', async (e) => {
    const t = e.target;
    // Cliques no modal de autenticação são tratados internamente pelo próprio modal
    if (t.closest('#modalAuth')) {
      if (t.closest('[data-fechar="modalAuth"]') || t.id === 'modalAuth') {
        if (!Auth.usuario) {
          toast('⚠️ Crie ou acesse seu perfil de leitor para desbloquear.');
        } else {
          fecharModalAuth();
        }
      }
      return;
    }

    if (!Auth.usuario) {
      e.preventDefault();
      e.stopPropagation();
      abrirModalAuth('entrar', true);
      toast('⚠️ Crie uma conta ou faça login para acessar o EleoQuadrinho.');
      return;
    }
    const queueButton=t.closest('[data-queue], [data-queue-first], [data-personal-add]');
    if(queueButton){
      e.stopPropagation();const id=queueButton.dataset.queue||queueButton.dataset.queueFirst||queueButton.dataset.personalAdd;
      const item=REG.get(id);if(!item||!conteudoPermitido(item))return;
      if(queueButton.hasAttribute('data-personal-add')){
        const groups=prefs.personalShelves||{},names=Object.keys(groups);
        if(!names.length)return toast('Crie uma coleção pessoal primeiro.');
        const name=prompt('Digite o nome da coleção: '+names.join(', '));if(!Object.hasOwn(groups,name))return;
        groups[name]=groups[name].includes(id)?groups[name].filter(x=>x!==id):[...groups[name],id];prefs.personalShelves=groups;salvos[id]=snap(item);Auth.salvarDadosPerfil();toast('Coleção atualizada.');
      }else{
        const ids=prefs.readQueue||[];
        prefs.readQueue=queueButton.hasAttribute('data-queue-first')?[id,...ids.filter(x=>x!==id)]:ids.includes(id)?ids.filter(x=>x!==id):[...ids,id];
        salvos[id]=snap(item);Auth.salvarDadosPerfil();queueButton.textContent=prefs.readQueue.includes(id)?'✓ Na fila':'+ Quero ler';queueButton.setAttribute('aria-pressed',String(prefs.readQueue.includes(id)));
      }
      salvarPrefs();if(abaAtual==='salvos')renderSalvos();return;
    }
    if(t.closest('[data-news-missions]')){$('#tituloMissoes')?.scrollIntoView({block:'start'});return;}
    const localDelete = t.closest('[data-device-library] [data-apagar]');
    if (localDelete) {
      if (!Auth.admin) return;
      if (!confirm('Remover somente a cópia deste dispositivo? A versão publicada na nuvem será mantida.')) return;
      const id = localDelete.dataset.apagar;
      await BD.apagar(id);
      const shared = externas.find(item => item.id === id);
      if (shared) reg(shared); else REG.delete(id);
      renderMinhasHQs();
      return renderBiblioteca();
    }
    const localRead = t.closest('[data-device-library] [data-ler]');
    if (localRead) {
      try { await atualizarPermissoes(); } catch (error) { return toast(error.message); }
      const item = REG.get(localRead.dataset.ler);
      if (!conteudoPermitido(item)) return toast('Este conteúdo não está disponível no seu perfil ou está oculto.');
      if (item) return Biblioteca.abrir({ ...item, storagePath: '' });
    }
    const addSerie = t.closest('[data-add-serie]');
    if (addSerie) {
      e.stopPropagation();
      preSerieSelecionada = addSerie.dataset.addSerie;
      fecharCamada();
      if (leitorAberto()) fecharLeitores();
      if (abaAtual === 'biblioteca') renderBiblioteca();
      else ir('biblioteca');
      setTimeout(() => $('#painelFormObra')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
      toast('📁 Subpasta selecionada! Preencha os dados da nova edição abaixo.');
      return;
    }
    const addHeroi = t.closest('[data-add-heroi]');
    if (addHeroi) {
      e.stopPropagation();
      preHeroiSelecionado = addHeroi.dataset.addHeroi;
      fecharCamada();
      if (leitorAberto()) fecharLeitores();
      if (abaAtual === 'biblioteca') renderBiblioteca();
      else ir('biblioteca');
      toast('🦸 Herói selecionado! Preencha os dados da HQ, Coleção/Série, Mangá ou Lore abaixo.');
      return;
    }
    const editar = t.closest('[data-editar]');
    if (editar) {
      e.stopPropagation();
      itemParaEditar = editar.dataset.editar;
      fecharCamada();
      if (leitorAberto()) fecharLeitores();
      if (abaAtual === 'biblioteca') renderBiblioteca();
      else ir('biblioteca');
      return;
    }
    const salvar = t.closest('[data-salvar]'); if (salvar) { e.stopPropagation(); return alternarSalvo(salvar.dataset.salvar); }
    const apagar = t.closest('[data-apagar]');
    if (apagar) {
      e.stopPropagation(); const id = apagar.dataset.apagar;
      const ehSerie = id.startsWith('serie:');
      const edsVinculadas = ehSerie ? edicoesDaSerie(id) : [];
      const msgConfirm = ehSerie && edsVinculadas.length
        ? `Remover esta subpasta de Coleção/Série?\n\n(Ela possui ${edsVinculadas.length} edição(ões). Clique em OK para continuar.)`
        : 'Remover este item da biblioteca?';
      if (!confirm(msgConfirm)) return;
      if (ehSerie) {
        if (edsVinculadas.length && confirm(`Deseja remover também as ${edsVinculadas.length} edição(ões) que estão dentro desta subpasta?\n\n(OK = Apagar subpasta e edições / Cancelar = Apagar só a subpasta e manter as edições avulsas)`)) {
          const idsEds = new Set(edsVinculadas.map(x => x.id));
          externas = externas.filter(x => !idsEds.has(x.id));
          idsEds.forEach(eid => REG.delete(eid));
        } else {
          externas.forEach(x => { if (x.serieId === id) { x.serieId = ''; x.serieNome = ''; reg(x); } });
        }
        Store.set('externas', externas);
        series = series.filter(s => s.id !== id);
        Store.set('series', series);
      } else if (id.startsWith('drive:')) { drive = drive.filter(d => d.id !== id); Store.set('drive', drive); }
      else if (id.startsWith('ext:')) { externas = externas.filter(x => x.id !== id); Store.set('externas', externas); }
      else if (id.startsWith('heroi:')) { herois = herois.filter(h => h.id !== id); Store.set('herois', herois); }
      else {
        externas = externas.filter(x => x.id !== id); Store.set('externas', externas);
        await BD.apagar(id);
      }
      REG.delete(id);
      if ($('#detalhe').classList.contains('aberta')) fecharCamada();
      renderMinhasHQs();
      if (abaAtual === 'biblioteca') renderBiblioteca();
      toast('🗑 Item removido da biblioteca.');
      return;
    }
    const rem = t.closest('[data-remover-hist]');
    if (rem) { e.stopPropagation(); historico = historico.filter(h => h.id !== rem.dataset.removerHist); Auth.salvarDadosPerfil(); renderContinuar(); if (abaAtual === 'historico') renderHistorico(); return; }
    const rolar = t.closest('[data-rolar]'); if (rolar) { const tr = rolar.parentElement.querySelector('.trilho'); tr.scrollBy({ left: tr.clientWidth * 0.8 * +rolar.dataset.rolar }); return; }
    const zoom = t.closest('[data-zoom]'); if (zoom) return zoomImagem(zoom.dataset.zoom, zoom.dataset.legenda);
    const ouvir = t.closest('[data-ouvir]'); if (ouvir) { await abrirLeitura(ouvir.dataset.ouvir); setTimeout(() => Voz.iniciar($('#ltTexto')), 400); return; }
    const ler = t.closest('[data-ler]');
    if (ler) {
      e.stopPropagation();
      if (leitorAberto()) fecharLeitores();
      return abrirLeitura(ler.dataset.ler, ler.dataset.cap != null ? +ler.dataset.cap : undefined);
    }
    const colecao = t.closest('[data-colecao]'); if (colecao) { fecharCamada(); if (leitorAberto()) fecharLeitores(); return ir('colecao/' + colecao.dataset.colecao); }
    const card = t.closest('[data-id]');
    if (card && !t.closest('.leitor-barra')) { if (leitorAberto()) fecharLeitores(); return abrirDetalhe(card.dataset.id); }
    const nav = t.closest('[data-ir]'); if (nav) { fecharCamada(); return ir(nav.dataset.ir); }
    if (t.closest('#btnPerfilTopo')) {
      if (Auth.usuario) ir('perfil');
      else abrirModalAuth('entrar');
      return;
    }
    if (t.closest('[data-fechar="detalhe"]') || t.id === 'detalhe') return fecharCamada();
    if (t.closest('[data-fechar-leitor]')) return fecharLeitores();
    // leitor de texto
    const est = t.closest('.estrelas span');
    if (est) { const id = est.parentElement.dataset.avaliar; avaliacoes[id] = +est.dataset.n; Auth.salvarDadosPerfil(); $$('span', est.parentElement).forEach(s => s.classList.toggle('on', +s.dataset.n <= avaliacoes[id])); return toast('Obrigado pela avaliação! ' + '★'.repeat(avaliacoes[id])); }
    const int = t.closest('[data-int]'); if (int) return Interativa.acao(int.dataset.int);
    const cap = t.closest('[data-ir-cap]'); if (cap) { const a = $('#cap-' + cap.dataset.irCap); $('#ltCorpo').scrollTop = a.offsetTop - 20; $('#ltPainelCapitulos').classList.remove('on'); return; }
    if (t.closest('#ltCapitulos')) { $('#ltPainelCapitulos').classList.toggle('on'); $('#ltPainelAjustes').classList.remove('on'); return; }
    if (t.closest('#ltAjustes')) { $('#ltPainelAjustes').classList.toggle('on'); $('#ltPainelCapitulos').classList.remove('on'); return; }
    if (t.closest('#ltOuvir')) { Voz.ativo ? Voz.parar() : Voz.iniciar($('#ltTexto')); return; }
    if (t.closest('#ltTela')) return alternarTela($('#leitorTexto'));
    const tema = t.closest('[data-tema]'); if (tema) { prefs.tema = tema.dataset.tema; salvarPrefs(); return Leitor.aplicarPrefs(); }
    const fonte = t.closest('[data-fonte]'); if (fonte) { prefs.fonte = fonte.dataset.fonte; salvarPrefs(); return Leitor.aplicarPrefs(); }
    const tam = t.closest('[data-tam]'); if (tam) { prefs.tam = Math.max(14, Math.min(30, prefs.tam + +tam.dataset.tam)); salvarPrefs(); return Leitor.aplicarPrefs(); }
    const larg = t.closest('[data-larg]'); if (larg) { prefs.larg = Math.max(520, Math.min(1100, prefs.larg + 120 * +larg.dataset.larg)); salvarPrefs(); return Leitor.aplicarPrefs(); }
    if (Voz.ativo && t.closest('#ltTexto p')) return Voz.iniciar($('#ltTexto'), t.closest('p'));
    // leitor de HQ
    const esc2 = t.closest('[data-hq-escolha]'); if (esc2) return LeitorHQ.escolher(esc2.dataset.hqEscolha, esc2.dataset.txt);
    const hqAcao = t.closest('[data-hq]');
    if (hqAcao) { if (hqAcao.dataset.hq === 'reiniciar') return LeitorHQ.abrirRamificada(LeitorHQ.it, LeitorHQ.h); return fecharLeitores(); }
    const hqIr = t.closest('[data-hq-ir]'); if (hqIr) return LeitorHQ.ir(+hqIr.dataset.hqIr);
    if (t.closest('#hqProx')) return prefs.hqRTL ? LeitorHQ.ant() : LeitorHQ.prox();
    if (t.closest('#hqAnt')) return prefs.hqRTL ? LeitorHQ.prox() : LeitorHQ.ant();
    if (t.closest('#hqSentido')) return LeitorHQ.alternarSentido();
    if (t.closest('#hqSom')) return LeitorHQ.alternarSom();
    if (t.closest('#hqCinema')) return LeitorHQ.alternarCinema();
    if (t.closest('#hqAjudaAtalhos')) return LeitorHQ.ajudaAtalhos();
    if (t.closest('#hqZoomMais') || t.closest('#hqZoomMenos')) {
      aplicarZoomHQ(LeitorHQ.zoom + (t.closest('#hqZoomMais') ? 0.25 : -0.25));
      return;
    }
    if (t.closest('#hqZoomBadge')) {
      aplicarZoomHQ(1);
      return;
    }
    if (t.closest('#hqTela')) return alternarTela($('#leitorHQ'));
    if (t.closest('#hqMiniaturasBtn')) return $('#hqMiniaturas').classList.toggle('on');
    if (t.closest('#hqPalco') && LeitorHQ.modo !== 'rolagem' && !t.closest('button, select, input')) {
      if (prefs.hqGestures===false || zoomHQAmpliado() || houveArrasto || toqueHQRecente(e)) return;
      const x = e.clientX / window.innerWidth;
      if (prefs.hqRTL) {
        if (x < 0.35) LeitorHQ.prox(); else if (x > 0.65) LeitorHQ.ant();
      } else {
        if (x < 0.35) LeitorHQ.ant(); else if (x > 0.65) LeitorHQ.prox();
      }
      return;
    }
    if (t.closest('#btnSorteio')) return sortear();
    if (!t.closest('#ltPainelAjustes')) $('#ltPainelAjustes').classList.remove('on');
  });

  document.addEventListener('keydown', (e) => {
    if (!Auth.usuario) {
      if (e.key === 'Escape') {
        toast('⚠️ Crie uma conta ou faça login para acessar o sistema.');
        return;
      }
      if (!e.target.closest('#modalAuth')) {
        e.preventDefault();
        return;
      }
      return;
    }
    if (e.key === 'Enter' && e.target.matches('.cartao')) return e.target.click();
    if (e.key === '/' && !e.target.matches('input, textarea')) { e.preventDefault(); $('#buscaRapida').focus(); return; }
    if (e.key === 'Escape') {
      if ($('.zoom-img')) return $('.zoom-img').remove();
      if ($('#modalAuth')?.classList.contains('aberta')) return fecharModalAuth();
      if (leitorAberto()) return fecharLeitores();
      return fecharCamada();
    }
    if ($('#leitorHQ').classList.contains('aberto') && !e.target.matches('input, select')) {
      if (['ArrowRight', 'PageDown', ' '].includes(e.key)) {
        e.preventDefault();
        (prefs.hqRTL && e.key === 'ArrowRight') ? LeitorHQ.ant() : LeitorHQ.prox();
        return;
      }
      if (['ArrowLeft', 'PageUp'].includes(e.key)) {
        e.preventDefault();
        (prefs.hqRTL && e.key === 'ArrowLeft') ? LeitorHQ.prox() : LeitorHQ.ant();
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'f') { e.preventDefault(); return alternarTela($('#leitorHQ')); }
      if (k === 'm') {
        e.preventDefault();
        const modos = ['pagina', 'dupla', 'rolagem'];
        const proxModo = modos[(modos.indexOf(prefs.hqModo) + 1) % modos.length];
        prefs.hqModo = proxModo; salvarPrefs();
        const sel = $('#hqModo'); if (sel) sel.value = proxModo;
        toast(`Modo de Leitura: ${proxModo.toUpperCase()}`);
        return LeitorHQ.render();
      }
      if (k === 'c') { e.preventDefault(); return LeitorHQ.alternarCinema(); }
      if (k === 's') { e.preventDefault(); return LeitorHQ.alternarSom(); }
      if (k === 'r') { e.preventDefault(); return LeitorHQ.alternarSentido(); }
      if (k === 'z' || k === '0') { e.preventDefault(); return aplicarZoomHQ(1); }
      if (e.key === '+' || e.key === '=') { e.preventDefault(); return aplicarZoomHQ(LeitorHQ.zoom + 0.25); }
      if (e.key === '-' || e.key === '_') { e.preventDefault(); return aplicarZoomHQ(LeitorHQ.zoom - 0.25); }
      if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); return LeitorHQ.ajudaAtalhos(); }
    }
  });

  function alternarTela(el) { if (document.fullscreenElement) document.exitFullscreen(); else el.requestFullscreen?.(); }

  // Zoom e Navegação por Mouse Wheel no Leitor
  let arrastandoPalco = false, inicioPanX = 0, inicioPanY = 0, scrollInicioX = 0, scrollInicioY = 0, houveArrasto = false;

  function mostrarBadgeZoom(txt) {
    const b = $('#hqZoomBadge'); if (!b) return;
    b.textContent = txt;
    b.classList.add('visivel');
    clearTimeout(b._t);
    b._t = setTimeout(() => b.classList.remove('visivel'), 1300);
  }

  function aplicarZoomHQ(novoZoom, centroX, centroY) {
    const palco = $('#hqPalco'); if (!palco) return;
    novoZoom = Math.max(0.5, Math.min(4, Math.round(novoZoom * 100) / 100));
    const zoomAnt = LeitorHQ.zoom || 1;
    if (Math.abs(novoZoom - zoomAnt) < 0.005) return;

    const rect = palco.getBoundingClientRect();
    const cX = centroX != null ? centroX - rect.left : palco.clientWidth / 2;
    const cY = centroY != null ? centroY - rect.top : palco.clientHeight / 2;

    const scrollX = palco.scrollLeft;
    const scrollY = palco.scrollTop;

    LeitorHQ.zoom = novoZoom;
    palco.style.setProperty('--zoom', novoZoom);
    palco.classList.toggle('zoom-ativo', novoZoom > 1.05);

    // Mantém o ponto onde o mouse estava fixo sob o cursor após o zoom
    const razao = novoZoom / zoomAnt;
    palco.scrollLeft = (scrollX + cX) * razao - cX;
    palco.scrollTop = (scrollY + cY) * razao - cY;

    mostrarBadgeZoom(`🔍 ${Math.round(novoZoom * 100)}%`);
  }

  function fecharOpcoesHQ(focus = false) {
    $('#hqOpcoes').setAttribute('aria-expanded', 'false');
    $('#hqControles').classList.remove('opcoes-abertas');
    if (focus) $('#hqOpcoes').focus();
  }
  $('#hqOpcoes').onclick = () => {
    const open = $('#hqOpcoes').getAttribute('aria-expanded') !== 'true';
    $('#hqOpcoes').setAttribute('aria-expanded', String(open));
    $('#hqControles').classList.toggle('opcoes-abertas', open);
  };
  document.addEventListener('pointerdown', e => {
    if (!e.target.closest('#hqControles, #hqOpcoes')) fecharOpcoesHQ();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && $('#hqOpcoes').getAttribute('aria-expanded') === 'true') {
      e.preventDefault(); e.stopImmediatePropagation(); fecharOpcoesHQ(true);
    }
  }, true);
  const leitorMobile = matchMedia('(max-width: 900px)');
  leitorMobile.addEventListener('change', () => fecharOpcoesHQ());

  // Zoom ao rolar o scroll do mouse no Leitor de HQ / PDF
  $('#hqPalco').addEventListener('wheel', (e) => {
    // No modo de rolagem contínua vertical, se não estiver com Ctrl, permite ler a história normalmente para baixo
    if (LeitorHQ.modo === 'rolagem' && !e.ctrlKey) return;

    e.preventDefault();
    // deltaY negativo = rolou para cima (aumentar zoom); deltaY positivo = rolou para baixo (diminuir zoom)
    const passo = e.deltaY < 0 ? 0.15 : -0.15;
    aplicarZoomHQ(LeitorHQ.zoom + passo, e.clientX, e.clientY);
  }, { passive: false });

  // Zoom no texto segurando Ctrl + Scroll do mouse
  $('#ltCorpo').addEventListener('wheel', (e) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    const delta = e.deltaY < 0 ? 1 : -1;
    prefs.tam = Math.max(14, Math.min(36, prefs.tam + delta));
    salvarPrefs();
    Leitor.aplicarPrefs();
    toast(`🔎 Tamanho do texto: ${prefs.tam}px`);
  }, { passive: false });

  const zoomHQAmpliado = () => LeitorHQ.zoom > 1.05 || (window.visualViewport?.scale || 1) > 1.05;
  let bloquearCliqueHQAte = 0;
  const toqueHQRecente = e => e.pointerType === 'touch' || e.sourceCapabilities?.firesTouchEvents || performance.now() < bloquearCliqueHQAte;

  // Duplo clique de mouse; no celular preserva o zoom nativo do navegador.
  $('#hqPalco').addEventListener('dblclick', (e) => {
    if (toqueHQRecente(e) || e.target.closest('button, select, input')) return;
    if (LeitorHQ.zoom > 1.05) {
      aplicarZoomHQ(1);
    } else {
      aplicarZoomHQ(1.8, e.clientX, e.clientY);
    }
  });

  // Arrastar com o mouse (pan) para navegar na página quando estiver com zoom ampliado
  $('#hqPalco').addEventListener('mousedown', (e) => {
    if (LeitorHQ.zoom <= 1.05 && LeitorHQ.modo !== 'rolagem') return;
    if (e.button !== 0 || e.target.closest('button, select, input')) return;
    arrastandoPalco = true;
    houveArrasto = false;
    inicioPanX = e.clientX;
    inicioPanY = e.clientY;
    scrollInicioX = $('#hqPalco').scrollLeft;
    scrollInicioY = $('#hqPalco').scrollTop;
    $('#hqPalco').classList.add('arrastando');
  });

  window.addEventListener('mousemove', (e) => {
    if (!arrastandoPalco) return;
    const dx = e.clientX - inicioPanX;
    const dy = e.clientY - inicioPanY;
    if (Math.abs(dx) > 4 || Math.abs(dy) > 4) houveArrasto = true;
    const palco = $('#hqPalco');
    palco.scrollLeft = scrollInicioX - dx;
    palco.scrollTop = scrollInicioY - dy;
  });

  window.addEventListener('mouseup', () => {
    if (arrastandoPalco) {
      arrastandoPalco = false;
      $('#hqPalco')?.classList.remove('arrastando');
      setTimeout(() => { houveArrasto = false; }, 60);
    }
  });

  $('#ltCorpo').addEventListener('scroll', () => Leitor.aoRolar(), { passive: true });
  $('#ltVoz').onchange = (e) => { prefs.voz = e.target.value; salvarPrefs(); };
  $('#ltVelocidade').oninput = (e) => { prefs.vel = +e.target.value; salvarPrefs(); };
  $('#hqBrightness').oninput=e=>{prefs.hqBrightness=Number(e.target.value);$('#hqPalco').style.filter=`brightness(${prefs.hqBrightness}%)`;salvarPrefs();};
  $('#hqGestures').onchange=e=>{prefs.hqGestures=e.target.checked;salvarPrefs();};
  $('#hqModo').onchange = (e) => { prefs.hqModo = e.target.value; salvarPrefs(); LeitorHQ.render(); };
  $('#hqSlider').oninput = (e) => LeitorHQ.ir(+e.target.value - 1);

  // Scrubber Preview flutuante acima da barra de páginas
  const hqSlider = $('#hqSlider');
  const hqPreview = $('#hqSliderPreview');
  if (hqSlider && hqPreview) {
    const atualizarPreview = (e) => {
      if (!LeitorHQ.paginas.length || LeitorHQ.ramificada) return;
      const rect = hqSlider.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const idx = Math.min(LeitorHQ.paginas.length - 1, Math.max(0, Math.round(pct * (LeitorHQ.paginas.length - 1))));
      const pg = LeitorHQ.paginas[idx];
      const thumbSrc = pg?.thumb || pg?.src || (idx === 0 ? LeitorHQ.it?.capa : '');
      const thumbHtml = thumbSrc ? `<img src="${esc(thumbSrc)}" alt="">` : '';
      hqPreview.innerHTML = `${thumbHtml}<span>Página ${idx + 1} / ${LeitorHQ.paginas.length}</span>`;
      const xClamped = Math.max(12, Math.min(window.innerWidth - 130, e.clientX));
      hqPreview.style.left = `${xClamped}px`;
      hqPreview.classList.add('visivel');
    };
    hqSlider.addEventListener('mousemove', atualizarPreview);
    hqSlider.addEventListener('mouseenter', atualizarPreview);
    hqSlider.addEventListener('mouseleave', () => hqPreview.classList.remove('visivel'));
  }

  // Modo Cinema: auto-fade com movimento do mouse
  let cinemaTimer = null;
  $('#leitorHQ').addEventListener('mousemove', () => {
    if (!prefs.hqCinema || !$('#leitorHQ').classList.contains('aberto')) return;
    $('#leitorHQ').classList.add('mostrar-barras');
    clearTimeout(cinemaTimer);
    cinemaTimer = setTimeout(() => {
      $('#leitorHQ').classList.remove('mostrar-barras');
    }, 2400);
  });

  $('#hqPalco').addEventListener('scroll', () => {
    if (LeitorHQ.modo !== 'rolagem') return;
    const palco = $('#hqPalco'); const pgs = $$('.hq-pagina', palco);
    const i = pgs.findIndex(p => p.getBoundingClientRect().bottom > palco.getBoundingClientRect().top + palco.clientHeight / 2);
    if (i >= 0 && i !== LeitorHQ.idx) { LeitorHQ.idx = i; clearTimeout(LeitorHQ.t); LeitorHQ.t = setTimeout(() => LeitorHQ.atualizarInfo(), 300); }
  }, { passive: true });

  // Um toque na arte nunca vira a página no celular. Pinça, pan e gestos
  // cancelados não podem se tornar um swipe ao retirar o último dedo.
  let gestoHQ = null;
  $('#hqPalco').addEventListener('touchstart', e => {
    bloquearCliqueHQAte = performance.now() + 1000;
    if (e.touches.length !== 1 || gestoHQ) { if (gestoHQ) gestoHQ.blocked = true; return; }
    const t = e.touches[0];
    gestoHQ = { id: t.identifier, x: t.clientX, y: t.clientY, at: performance.now(),
      blocked: zoomHQAmpliado() || !!e.target.closest('button, select, input, a') };
  }, { passive: true });
  $('#hqPalco').addEventListener('touchmove', e => {
    if (gestoHQ && (e.touches.length !== 1 || zoomHQAmpliado())) gestoHQ.blocked = true;
  }, { passive: true });
  $('#hqPalco').addEventListener('touchcancel', () => {
    gestoHQ = null; bloquearCliqueHQAte = performance.now() + 1000;
  }, { passive: true });
  $('#hqPalco').addEventListener('touchend', e => {
    bloquearCliqueHQAte = performance.now() + 1000;
    if (e.touches.length) { if (gestoHQ) gestoHQ.blocked = true; return; }
    const gesture = gestoHQ; gestoHQ = null;
    if (prefs.hqGestures===false || !gesture || gesture.blocked || zoomHQAmpliado() || LeitorHQ.modo === 'rolagem' || performance.now() - gesture.at > 700) return;
    const t = [...e.changedTouches].find(t => t.identifier === gesture.id); if (!t) return;
    const dx = t.clientX - gesture.x, dy = t.clientY - gesture.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (prefs.hqRTL) dx < 0 ? LeitorHQ.ant() : LeitorHQ.prox();
      else dx < 0 ? LeitorHQ.prox() : LeitorHQ.ant();
    }
  }, { passive: true });

  // efeito 3D e brilho holográfico nas capas
  let ultimo = null;
  if (matchMedia('(pointer:fine)').matches) document.addEventListener('mousemove', (e) => {
    const c = e.target.closest?.('.cartao');
    if (ultimo && ultimo !== c) {
      const capaAnt = $('.capa', ultimo);
      if (capaAnt) {
        capaAnt.style.transform = '';
        const b = $('.capa-brilho', capaAnt);
        if (b) b.style.opacity = '0';
      }
      ultimo = null;
    }
    if (!c) return;
    const capa = $('.capa', c);
    if (!capa) return;
    const r = capa.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5;
    capa.style.transform = `rotateY(${x * 16}deg) rotateX(${-y * 16}deg) translateY(-6px) scale(1.03)`;
    let brilho = $('.capa-brilho', capa);
    if (!brilho) {
      brilho = document.createElement('div');
      brilho.className = 'capa-brilho';
      capa.appendChild(brilho);
    }
    brilho.style.setProperty('--gx', `${Math.round((x + 0.5) * 100)}%`);
    brilho.style.setProperty('--gy', `${Math.round((y + 0.5) * 100)}%`);
    brilho.style.opacity = '1';
    ultimo = c;
  });

  // busca rápida no topo
  $('#buscaRapida').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.target.value.trim()) { const v = e.target.value; e.target.value = ''; e.target.blur(); if (abaAtual !== 'busca') { location.hash = 'busca'; setTimeout(() => renderBusca(v), 30); } else renderBusca(v); }
  });

  async function sortear() {
    const button = $('#btnSorteio');
    if (!Auth.usuario || button.disabled) return;
    const account = Auth.usuario.id;
    button.disabled = true;
    try {
      await Promise.all([Dados.lol().catch(() => {}), Dados.cronicas().catch(() => {})]);
      if (Auth.usuario?.id !== account) return;
      await atualizarPermissoes();
      const pool = [...REG.values()].filter(i =>
        ['riot-serie', 'riot-hq', 'riot-conto', 'ia', 'lol', 'conto', 'interativa', 'hq', 'regiao'].includes(i.tipo) && conteudoPermitido(i));
      if (!pool.length) return toast('Nenhuma leitura disponível para sortear nos seus universos e categorias atuais.');
      const it = pool[Math.floor(Math.random() * pool.length)];
      toast('🎲 Que tal ler... ' + it.titulo + '?');
      await abrirDetalhe(it.id);
    } catch (error) { toast(error.message); }
    finally { button.disabled = false; }
  }

  /* ---------------- Início ---------------- */
  // Supabase confirmation links may include an access token in the fragment.
  // Never persist it: this application establishes sessions via HttpOnly cookies.
  if (/^#(?:access_token|error|type)=/.test(location.hash)) history.replaceState(null, '', location.pathname);
  Auth.atualizarHeader();
  abrirModalAuth('entrar', true);
  $('#authNotice').textContent = 'Verificando sessão…';
  (async () => {
    try {
      const result = await EQAccount.api('session');
      await Auth.carregarConta(result.user);
    } catch (error) {
      $('#authNotice').textContent = error.status === 401 ? 'Entre com seu login ou e-mail e senha.' : error.message;
    }
  })();
  $('#syncRetry').onclick = async () => {
    try { await readerSync?.flush(); if (Auth.admin) await catalogSync?.flush(); }
    catch (error) { syncStatus(error.message, true); }
  };
  $('#syncBackup').onclick = () => {
    if (!Auth.usuario) return;
    const data = { usuario: Auth.usuario, leitura: readerSync?.data, ...(Auth.admin ? { catalogo: catalogSync?.data } : {}) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a'); a.href = url; a.download = 'eleoquadrinho-pendente.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  $('#syncReload').onclick = () => {
    if (!confirm('As alterações pendentes serão descartadas. Baixou o backup? Carregar a versão da nuvem?')) return;
    if (readerSync) localStorage.removeItem(readerSync.key);
    if (catalogSync) localStorage.removeItem(catalogSync.key);
    location.reload();
  };
  window.addEventListener('online', () => $('#syncRetry').click());
  window.addEventListener('beforeunload', e => {
    if (!Auth.sessaoEncerrada && (readerSync?.dirty || (Auth.admin && catalogSync?.dirty))) { e.preventDefault(); e.returnValue = ''; }
  });
})();
