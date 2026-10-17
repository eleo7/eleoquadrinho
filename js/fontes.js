/* =========================================================
   EleoQuadrinho — Fontes externas (APIs públicas em PT-BR)
   - Riot Games Universe (universe-meeps): Biografias completas,
     243+ contos e crônicas de Runeterra e dossiês de regiões
   - Riot Games Comics (universe-comics): HQs oficiais completas
     de League of Legends em português (páginas em alta resolução)
   - Riot Games Data Dragon (LoL & LoR): Campeões, artes e cartas
   - Internet Archive (BookReader & Metadata API): Dezenas de HQs
     reais e completas da Marvel, DC, Vertigo e clássicos em PT-BR
     com extração nativa de páginas e múltiplos volumes/edições
   - Wikipédia em português: Verbetes e capas de apoio
   ========================================================= */
const Fontes = (() => {
  const memoria = new Map();
  const DD = 'https://ddragon.leagueoflegends.com';
  const UNI = 'https://universe-meeps.leagueoflegends.com/v1/pt_br';
  const COMIC_CDN = 'https://universe-comics.leagueoflegends.com/comics/pt_br';

  async function json(url, { cacheLocal = false, ttlHoras = 24 } = {}) {
    if (memoria.has(url)) return memoria.get(url);
    const chave = 'eq:cache:' + url;
    if (cacheLocal) {
      try {
        const c = JSON.parse(localStorage.getItem(chave) || 'null');
        if (c && Date.now() - c.t < ttlHoras * 3600e3) { memoria.set(url, c.d); return c.d; }
      } catch { }
    }
    const pr = fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
    memoria.set(url, pr);
    try {
      const d = await pr;
      memoria.set(url, d);
      if (cacheLocal) { try { localStorage.setItem(chave, JSON.stringify({ t: Date.now(), d })); } catch { } }
      return d;
    } catch (e) { memoria.delete(url); throw e; }
  }

  async function texto(url) {
    if (memoria.has(url)) return memoria.get(url);
    const pr = fetch(url).then(r => { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); });
    memoria.set(url, pr);
    try { const t = await pr; memoria.set(url, t); return t; }
    catch (e) { memoria.delete(url); throw e; }
  }

  /* ---------------- League of Legends (Data Dragon) ---------------- */
  const TAGS = { Fighter: 'Lutador', Tank: 'Tanque', Mage: 'Mago', Assassin: 'Assassino', Marksman: 'Atirador', Support: 'Suporte' };
  let versao = null;
  async function lolVersao() {
    if (versao) return versao;
    const v = await json(DD + '/api/versions.json', { cacheLocal: true, ttlHoras: 6 });
    return (versao = v[0]);
  }
  async function lolCampeoes() {
    const v = await lolVersao();
    const d = await json(`${DD}/cdn/${v}/data/pt_BR/champion.json`, { cacheLocal: true });
    return Object.values(d.data).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  }
  async function lolCampeao(id) {
    const v = await lolVersao();
    const d = await json(`${DD}/cdn/${v}/data/pt_BR/champion/${id}.json`);
    return d.data[id];
  }
  const lolImg = {
    loading: (id, n = 0) => `${DD}/cdn/img/champion/loading/${id}_${n}.jpg`,
    splash: (id, n = 0) => `${DD}/cdn/img/champion/splash/${id}_${n}.jpg`,
    feitico: (file) => `${DD}/cdn/${versao}/img/spell/${file}`,
    passiva: (file) => `${DD}/cdn/${versao}/img/passive/${file}`,
    icone: (id) => `${DD}/cdn/${versao}/img/champion/${id}.png`
  };

  /* ---------------- Riot Universe (Lore Oficial & Contos) ---------------- */
  function slugUniverse(cid) {
    return String(cid || '').toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  // Biografia completa + lista de contos e HQs oficiais do campeão
  async function universoCampeao(cid) {
    const slug = slugUniverse(cid);
    const d = await json(`${UNI}/champions/${slug}/index.json`, { cacheLocal: true, ttlHoras: 48 });
    const ch = d.champion || {};
    const bioHtml = ch.biography?.full || '';
    const citacao = ch.biography?.quote || '';
    const contos = [];
    const hqs = [];
    const galeria = [];
    (d.modules || []).forEach(m => {
      if (m.type === 'story-preview' && m.url) {
        const sSlug = m['story-slug'] || m.url.replace(/^.*\/story\//, '').replace(/\/$/, '');
        contos.push({
          slug: sSlug,
          titulo: m.title,
          sub: m.subtitle || 'Conto de Runeterra',
          resumo: (m.description || '').replace(/<[^>]+>/g, ''),
          minutos: m['minutes-to-read'] || 6,
          imagem: m['featured-image']?.uri || m.background?.uri || ch.image?.uri
        });
      } else if (m.type === 'link-out' && /\/comic\//i.test(m.url || '')) {
        const cPath = m.url.replace(/^\/pt_br\/comic\//i, '').replace(/^\//, '');
        hqs.push({
          caminho: cPath,
          titulo: m.title,
          sub: m.subtitle || 'HQ Oficial · Universo LoL',
          resumo: (m.description || '').replace(/<[^>]+>/g, ''),
          imagem: m['featured-image']?.uri || m.background?.uri
        });
      } else if (m.type === 'image-gallery' && Array.isArray(m.assets)) {
        m.assets.forEach(a => { if (a.uri) galeria.push({ uri: a.uri, titulo: a.title || a.description || '' }); });
      }
    });
    const relacionados = (d['related-champions'] || []).map(r => ({
      slug: r.slug || (r.url || '').split('/').pop(),
      nome: r.name || r.title,
      titulo: r.subtitle || '',
      img: r.image?.uri || r.background?.uri
    }));
    return {
      slug,
      nome: ch.name || d.name,
      titulo: ch.title || d.title,
      faccao: ch['associated-faction-slug'] || '',
      funcao: ch.role?.name || '',
      raca: (ch.races || []).map(r => r.name).join(', '),
      imagem: ch.image?.uri || ch.background?.uri,
      bioHtml,
      citacao,
      contos,
      hqs,
      galeria,
      relacionados
    };
  }

  // Catálogo com 240+ contos oficiais de Runeterra (explore2)
  let _catalogoContos = null;
  async function universoCatalogoContos() {
    if (_catalogoContos) return _catalogoContos;
    const d = await json(`${UNI}/explore2/index.json`);
    const vistos = new Set();
    const lista = [];
    (d.modules || []).forEach(m => {
      if (m.type !== 'story-preview') return;
      const slug = m['story-slug'] || (m.url || '').replace(/^.*\/story\//, '').replace(/\/$/, '');
      if (!slug || vistos.has(slug)) return;
      vistos.add(slug);
      const camps = (m['featured-champions'] || []).map(c => c.name || c.title || c.slug).filter(Boolean);
      lista.push({
        slug,
        titulo: m.title || slug,
        autor: m.subtitle || '',
        resumo: (m.description || '').replace(/<[^>]+>/g, '').trim(),
        minutos: m['minutes-to-read'] || 6,
        campeoes: camps,
        data: m['release-date'] || '',
        imagem: m['featured-image']?.uri || m.background?.uri || (m['featured-champions']?.[0]?.image?.uri) || null
      });
    });
    return (_catalogoContos = lista);
  }

  // Lê um conto completo do Universe (inclusive contos em múltiplos capítulos como Marés Ardentes e Sombra e Fortuna)
  async function universoConto(slug) {
    const d = await json(`${UNI}/story/${slug}/index.json`, { cacheLocal: true, ttlHoras: 72 });
    const st = d.story || {};
    const secoes = [];
    let imagemTopo = null;
    (st['story-sections'] || []).forEach((sec, idx) => {
      const bg = sec['background-image']?.uri;
      if (bg && !imagemTopo) imagemTopo = bg;
      const subs = sec['story-subsections'] || [];
      subs.forEach((sub, sIdx) => {
        const html = sub.content || '';
        if (!html.trim()) return;
        const paragrafos = extrairParagrafosHTML(html);
        if (!paragrafos.length) return;
        if (bg && sIdx === 0 && idx > 0) paragrafos.unshift({ img: bg });
        const tSec = sec.title || sub.title || (st['story-sections'].length > 1 || subs.length > 1 ? `Parte ${secoes.length + 1}` : 'História');
        secoes.push({ titulo: tSec, paragrafos });
      });
    });
    return {
      slug,
      titulo: st.title || d.id || slug,
      sub: st.subtitle || 'Crônica de Runeterra',
      minutos: d['minutes-to-read'] || Math.max(3, Math.round(( d['word-count'] || 1200) / 200)),
      palavras: d['word-count'] || 0,
      imagem: imagemTopo,
      secoes: secoes.length ? secoes : [{ titulo: 'História', paragrafos: ['Conteúdo indisponível.'] }]
    };
  }

  // Facção / Região completa no Universe
  async function universoFaccao(slug) {
    const d = await json(`${UNI}/factions/${slug}/index.json`, { cacheLocal: true, ttlHoras: 72 });
    const f = d.faction || {};
    const paragrafos = extrairParagrafosHTML(f.overview?.short || '');
    const galeria = [];
    (d.modules || []).forEach(m => {
      if (m.type === 'image-gallery' && Array.isArray(m.assets)) {
        m.assets.forEach(a => { if (a.uri) galeria.push({ uri: a.uri, titulo: a.title || '', desc: (a.description || '').replace(/<[^>]+>/g, '') }); });
      }
    });
    return {
      slug,
      nome: f.name || d.name,
      imagem: f.image?.uri || f.headerImage?.uri,
      paragrafos,
      galeria,
      campeoes: (d['associated-champions'] || []).map(c => ({
        slug: c.slug,
        nome: c.name || c.title,
        sub: c.subtitle || '',
        img: c.image?.uri || c.background?.uri
      }))
    };
  }

  /* ---------------- HQs Oficiais do Universo LoL ---------------- */
  async function universoSerieHQ(serieSlug) {
    const d = await json(`${UNI}/comics/${serieSlug}/index.json`, { cacheLocal: true, ttlHoras: 72 });
    return {
      slug: serieSlug,
      nome: d.name || d.subject || serieSlug,
      descricao: (d.description || '').replace(/<[^>]+>/g, '').trim(),
      banner: d['header-image']?.uri || d.background?.uri,
      edicoes: (d.issues || []).map((iss, idx) => {
        const caminho = (iss.url || '').replace(/^\/pt_br\/comic\//i, '').replace(/^\//, '');
        return {
          caminho,
          numero: idx + 1,
          titulo: iss['comic-title'] ? `${iss.title} — ${iss['comic-title']}` : (iss.title || `Edição #${idx + 1}`),
          capa: iss['cover-image']?.uri || iss[' desktop-background']?.uri || d['header-image']?.uri,
          descricao: (iss.description || d.description || '').replace(/<[^>]+>/g, '').trim()
        };
      })
    };
  }

  async function universoEdicaoHQ(caminho) {
    const limpo = caminho.replace(/^\/?pt_br\/comic\//i, '').replace(/^\/+|\/+$/g, '');
    const d = await json(`${COMIC_CDN}/${limpo}/index.json`, { cacheLocal: true, ttlHoras: 72 });
    const grupos = d['desktop-pages'] || d['mobile-pages'] || [];
    const paginas = [];
    grupos.forEach(g => {
      (Array.isArray(g) ? g : [g]).forEach(p => {
        const u = p['2x'] || p.uri;
        if (u) paginas.push(u);
      });
    });
    return {
      titulo: d.title || limpo,
      descricao: (d.description || '').replace(/<[^>]+>/g, ''),
      creditos: (d.creditsTopCopy || '').replace(/<[^>]+>/g, ''),
      paginas
    };
  }

  function extrairParagrafosHTML(html) {
    if (!html) return [];
    const doc = new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
    const out = [];
    const blocos = doc.querySelectorAll('p, blockquote, h2, h3, h4, li');
    if (blocos.length) {
      blocos.forEach(el => {
        const txt = el.textContent.replace(/\s+/g, ' ').trim();
        if (!txt) return;
        const tag = el.tagName.toLowerCase();
        if (tag === 'blockquote') out.push({ citacao: txt });
        else if (tag === 'h2' || tag === 'h3' || tag === 'h4') out.push({ sub: txt });
        else out.push(txt);
      });
      return out;
    }
    return html.replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]+>/g, '').split(/\n+/).map(s => s.trim()).filter(Boolean);
  }

  /* ---------------- Legends of Runeterra ---------------- */
  const LOR_SETS = [
    ['set1', 'Fundamentos'], ['set2', 'Ascensão das Marés'], ['set3', 'Chamado da Montanha'], ['set4', 'Império dos Ascendidos'],
    ['set5', 'Além de Bandópolis'], ['set6', 'Mundos Despertos'], ['set6cde', 'Caminho dos Campeões'], ['set7', 'Tempestade Celestial'],
    ['set7b', 'Lendas Despertas'], ['set8', 'Glória em Navori'], ['set9', 'Herança']
  ];
  async function lorSet(set) {
    const d = await json(`https://dd.b.pvp.net/latest/${set}/pt_br/data/${set}-pt_br.json`);
    return d.filter(c => c.collectible !== false);
  }

  /* ---------------- Internet Archive (HQs Reais em PT-BR) ---------------- */
  // Retorna metadados e lista de volumes/edições (_jp2.zip ou .pdf) dentro de um item do Archive.org
  async function arquivoMetadados(ident) {
    const d = await json(`https://archive.org/metadata/${encodeURIComponent(ident)}`, { cacheLocal: true, ttlHoras: 72 });
    const srv = d.d1 || d.server || 'archive.org';
    const dir = d.dir || '';
    const files = d.files || [];
    const jp2s = files.filter(f => f.name.endsWith('_jp2.zip')).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const pdfs = files.filter(f => /\.pdf$/i.test(f.name) && !/_text\.pdf$/i.test(f.name)).sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));
    const volumes = jp2s.map((f, idx) => {
      const prefixo = f.name.slice(0, -8);
      const nomeLimpo = prefixo.replace(/_/g, ' ').replace(/\s*\[.*?\]\s*/g, ' ').trim();
      const paginasCount = parseInt(f.filecount, 10) || parseInt(d.metadata?.pages, 10) || 0;
      return {
        indice: idx,
        prefixo,
        nome: nomeLimpo || `Volume ${idx + 1}`,
        zip: f.name,
        paginasCount,
        scandata: `${prefixo}_scandata.xml`,
        pdf: pdfs.find(p => p.name.slice(0, -4) === prefixo)?.name || pdfs[idx]?.name || null
      };
    });
    return {
      ident,
      servidor: srv,
      dir,
      titulo: d.metadata?.title || ident,
      descricao: (Array.isArray(d.metadata?.description) ? d.metadata.description.join('\n') : (d.metadata?.description || '')).replace(/<[^>]+>/g, '').trim(),
      ano: d.metadata?.date || d.metadata?.year || '',
      criador: Array.isArray(d.metadata?.creator) ? d.metadata.creator.join(', ') : (d.metadata?.creator || ''),
      volumes,
      pdfs: pdfs.map(p => ({ nome: p.name.replace(/\.pdf$/i, ''), arquivo: p.name, url: `https://archive.org/download/${encodeURIComponent(ident)}/${encodeURIComponent(p.name)}` }))
    };
  }

  // Extrai todas as páginas de um volume do Archive.org como URLs de imagem diretas para o LeitorHQ
  async function arquivoPaginasVolume(ident, indiceVol = 0, escala = 2) {
    const meta = await arquivoMetadados(ident);
    const vol = meta.volumes[indiceVol] || meta.volumes[0];
    if (!vol) throw new Error('Volume sem páginas processadas');
    let total = vol.paginasCount || 0;
    if (!total) {
      try {
        const xml = await texto(`https://archive.org/download/${encodeURIComponent(ident)}/${encodeURIComponent(vol.scandata)}`);
        const m = xml.match(/<leafCount>\s*(\d+)\s*<\/leafCount>/i);
        total = m ? parseInt(m[1], 10) : (xml.match(/<page\s/gi) || []).length;
      } catch {
        total = 36;
      }
    }
    if (!total || total < 1) total = 36;
    const zipPath = `${meta.dir}/${encodeURIComponent(vol.zip)}`;
    const paginas = [];
    for (let i = 0; i < total; i++) {
      const num = String(i).padStart(4, '0');
      const filePath = encodeURIComponent(`${vol.prefixo}_jp2/${vol.prefixo}_${num}.jp2`);
      paginas.push(`https://${meta.servidor}/BookReader/BookReaderImages.php?zip=${zipPath}&file=${filePath}&id=${encodeURIComponent(ident)}&scale=${escala}&rotate=0`);
    }
    return { meta, vol, paginas };
  }

  async function arquivoBuscar(q, pagina = 1, linhas = 36) {
    const url = 'https://archive.org/advancedsearch.php?' + [
      'q=' + encodeURIComponent(q), 'fl[]=identifier', 'fl[]=title', 'fl[]=creator', 'fl[]=year', 'fl[]=language', 'fl[]=downloads',
      'sort[]=downloads+desc', 'rows=' + linhas, 'page=' + pagina, 'output=json'
    ].join('&');
    const d = await json(url);
    return { total: d.response.numFound, docs: d.response.docs };
  }

  /* ---------------- Wikipédia PT ---------------- */
  const WP = 'https://pt.wikipedia.org/w/api.php';
  const WEN = 'https://en.wikipedia.org/w/api.php';
  const qs = (o) => Object.entries({ format: 'json', origin: '*', ...o }).map(([k, v]) => k + '=' + encodeURIComponent(v)).join('&');

  async function wikiMiniaturas(titulos) {
    const res = {};
    for (let i = 0; i < titulos.length; i += 45) {
      const lote = titulos.slice(i, i + 45);
      try {
        const d = await json(WP + '?' + qs({ action: 'query', titles: lote.join('|'), prop: 'pageimages|description|langlinks', pithumbsize: 500, pilicense: 'any', lllang: 'en', lllimit: 'max', redirects: 1 }), { cacheLocal: true, ttlHoras: 72 });
        const mapa = {};
        (d.query.normalized || []).forEach(n => mapa[n.to] = n.from);
        (d.query.redirects || []).forEach(r => mapa[r.to] = mapa[r.from] || r.from);
        const semImg = [];
        Object.values(d.query.pages || {}).forEach(p => {
          const orig = mapa[p.title] || p.title;
          res[orig] = { thumb: p.thumbnail?.source || null, desc: p.description || '', titulo: p.title, falta: 'missing' in p };
          if (!res[orig].thumb && p.langlinks?.[0]) semImg.push([orig, p.langlinks[0]['*']]);
        });
        if (semImg.length) {
          const en = await json(WEN + '?' + qs({ action: 'query', titles: semImg.map(x => x[1]).join('|'), prop: 'pageimages', pithumbsize: 500, pilicense: 'any', redirects: 1 }), { cacheLocal: true, ttlHoras: 72 });
          const m2 = {};
          (en.query.normalized || []).forEach(n => m2[n.to] = n.from);
          (en.query.redirects || []).forEach(r => m2[r.to] = m2[r.from] || r.from);
          const porEn = {};
          Object.values(en.query.pages || {}).forEach(p => { if (p.thumbnail) porEn[m2[p.title] || p.title] = p.thumbnail.source; });
          semImg.forEach(([orig, enT]) => { if (porEn[enT]) res[orig].thumb = porEn[enT]; });
        }
      } catch (e) { console.warn('Wikipédia miniaturas', e); }
    }
    return res;
  }

  async function wikiArtigo(titulo) {
    const d = await json(WP + '?' + qs({ action: 'query', titles: titulo, prop: 'extracts|pageimages|description|info', explaintext: 1, exsectionformat: 'wiki', pithumbsize: 1200, pilicense: 'any', inprop: 'url', redirects: 1 }));
    const p = Object.values(d.query.pages)[0];
    if (!p || 'missing' in p) throw new Error('Verbete não encontrado');
    const pular = /^(Referências|Ligações externas|Bibliografia|Ver também|Notas|Leitura adicional|Galeria|Fontes|Notas e referências|Leitura recomendada|Notas de rodapé)$/i;
    const secoes = [];
    let atual = { titulo: 'Introdução', paragrafos: [] };
    let ignorando = false;
    (p.extract || '').split('\n').forEach(l => {
      const m = l.match(/^(={2,})\s*(.+?)\s*={2,}$/);
      if (m) {
        if (m[1].length === 2) {
          if (atual.paragrafos.length) secoes.push(atual);
          ignorando = pular.test(m[2]);
          atual = { titulo: m[2], paragrafos: [] };
        } else if (!ignorando) atual.paragrafos.push({ sub: m[2] });
        return;
      }
      if (!ignorando && l.trim().length > 1) atual.paragrafos.push(l.trim());
    });
    if (atual.paragrafos.length && !ignorando) secoes.push(atual);
    secoes.forEach(s => s.paragrafos = s.paragrafos.filter((x, i, a) => typeof x === 'string' || (a[i + 1] && typeof a[i + 1] === 'string')));
    return { titulo: p.title, desc: p.description || '', imagem: p.thumbnail?.source || null, url: p.fullurl, secoes: secoes.filter(s => s.paragrafos.length) };
  }

  async function wikiBuscar(termo, limite = 24) {
    const d = await json(WP + '?' + qs({ action: 'query', list: 'search', srsearch: termo, srlimit: limite, srnamespace: 0 }));
    return d.query.search.map(s => ({ titulo: s.title, trecho: s.snippet.replace(/<[^>]+>/g, '') }));
  }

  /* ---------------- Importador de HQs de Outros Sites ---------------- */
  // Expande padrões como https://site.com/hq/{01..24}.jpg ou [01-24] ou lista de URLs
  function expandirPadraoURL(entrada) {
    const bruto = String(entrada || '').trim();
    if (!bruto) return [];
    // Se for um JSON array de strings
    if (bruto.startsWith('[')) {
      try {
        const arr = JSON.parse(bruto);
        if (Array.isArray(arr)) return arr.map(x => String(x).trim()).filter(Boolean);
      } catch {}
    }
    const linhas = bruto.split(/[\r\n]+/).map(l => l.trim()).filter(Boolean);
    const saida = [];
    const padraoRe = /(?:\{(\d+)\.\.(\d+)\}|\[(\d+)-(\d+)\])/;
    for (const linha of linhas) {
      const m = linha.match(padraoRe);
      if (m) {
        const iniStr = m[1] ?? m[3];
        const fimStr = m[2] ?? m[4];
        const pad = iniStr.length > 1 && iniStr.startsWith('0') ? iniStr.length : 0;
        const ini = parseInt(iniStr, 10), fim = parseInt(fimStr, 10);
        if (!isNaN(ini) && !isNaN(fim) && Math.abs(fim - ini) <= 500) {
          const passo = ini <= fim ? 1 : -1;
          for (let i = ini; passo > 0 ? i <= fim : i >= fim; i += passo) {
            const num = pad ? String(Math.abs(i)).padStart(pad, '0') : String(i);
            saida.push(linha.replace(padraoRe, num));
          }
          continue;
        }
      }
      saida.push(linha);
    }
    return saida;
  }

  // Busca uma página de outro site e extrai automaticamente as imagens das páginas da HQ
  async function extrairImagensSite(url) {
    url = String(url || '').trim();
    if (!url) throw new Error('Informe a URL da página.');
    // Caso especial: link do Internet Archive
    const mIA = url.match(/archive\.org\/(?:details|embed|download)\/([^/?#]+)/i);
    if (mIA) {
      const { meta, paginas } = await arquivoPaginasVolume(mIA[1], 0);
      return {
        titulo: meta.titulo,
        resumo: meta.descricao,
        capa: `https://archive.org/services/img/${mIA[1]}`,
        paginas,
        ident: mIA[1]
      };
    }

    // Tenta buscar HTML diretamente ou via proxies CORS públicos
    const tentativas = [
      url,
      `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`
    ];
    let html = '';
    for (const u of tentativas) {
      try {
        const r = await fetch(u);
        if (r.ok) {
          const t = await r.text();
          if (t && t.length > 100) { html = t; break; }
        }
      } catch {}
    }
    if (!html) throw new Error('Não foi possível acessar a página automaticamente (bloqueio CORS do site). Use a opção "Colar URLs das Páginas" ou "Padrão Numérico".');

    const doc = new DOMParser().parseFromString(html, 'text/html');
    const titulo = (doc.querySelector('meta[property="og:title"]')?.content || doc.title || '').replace(/\s*[-|–].*$/, '').trim();
    const resumo = (doc.querySelector('meta[property="og:description"], meta[name="description"]')?.content || '').trim();
    const ogImg = doc.querySelector('meta[property="og:image"]')?.content || '';

    const resolver = (src) => {
      if (!src) return '';
      src = src.trim().replace(/^\\+|\\+$/g, '');
      if (src.startsWith('data:') || src.endsWith('.svg')) return '';
      try { return new URL(src, url).href; } catch { return ''; }
    };

    const ignorar = /logo|icon|avatar|favicon|banner-ad|sprite|button|emoji|analytics|pixel|tracker|gravatar|badge|thumb-small|loading\.gif/i;
    const vistas = new Set();
    const paginas = [];
    const adicionar = (u) => {
      const abs = resolver(u);
      if (!abs || vistas.has(abs) || ignorar.test(abs)) return;
      if (!/\.(jpe?g|png|webp|avif)(\?|$)/i.test(abs) && !/blogspot|googleusercontent|wp\.com|imgur|cdn|manga|comic|hq|chap|page/i.test(abs)) return;
      vistas.add(abs);
      paginas.push(abs);
    };

    // 1. Imagens no DOM (priorizando atributos lazy-load comuns em leitores de HQ/mangá)
    doc.querySelectorAll('img').forEach(img => {
      const cand = img.getAttribute('data-src') || img.getAttribute('data-lazy-src') || img.getAttribute('data-original') || img.getAttribute('data-pagespeed-lazy-src') || img.getAttribute('src');
      adicionar(cand);
    });

    // 2. Arrays de imagens dentro de scripts da página
    const regexScriptImgs = /https?:\\?\/\\?\/[^"'\s<>\\]+?\.(?:jpe?g|png|webp)(?:\?[^"'\s<>\\]*)?/gi;
    let m;
    while ((m = regexScriptImgs.exec(html)) !== null) {
      adicionar(m[0].replace(/\\\//g, '/'));
    }

    return {
      titulo,
      resumo,
      capa: resolver(ogImg) || paginas[0] || '',
      paginas
    };
  }

  return {
    json, lolVersao, lolCampeoes, lolCampeao, lolImg, TAGS,
    universoCampeao, universoCatalogoContos, universoConto, universoFaccao,
    universoSerieHQ, universoEdicaoHQ, extrairParagrafosHTML,
    LOR_SETS, lorSet,
    arquivoMetadados, arquivoPaginasVolume, arquivoBuscar,
    wikiMiniaturas, wikiArtigo, wikiBuscar,
    expandirPadraoURL, extrairImagensSite
  };
})();

