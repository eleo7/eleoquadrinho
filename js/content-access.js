/* Shared classification for server authorization and reader navigation. */
(function(root) {
  'use strict';
  const universes = ['lol','marvel','dc','originais','grega','nordica','egipcia','japonesa','folclore','ioruba','asteca','hindu','celta','arquivo'];
  const categories = ['hq','manga','lore','historia'];
  function normalize(value) {
    const v = value || {};
    const mode = ['standard','alternative','initial'].includes(v.mode) ? v.mode : 'standard';
    return { mode, universes: Array.isArray(v.universes) ? universes.filter(x=>v.universes.includes(x)) : [...universes], categories: Array.isArray(v.categories) ? categories.filter(x=>v.categories.includes(x)) : [...categories] };
  }
  const clean = s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function category(o) {
    const f = clean(o.formatoObra);
    if (/mang|manhw|webtoon/.test(f)) return 'manga';
    if (f.includes('lore') || ['lol','wiki','regiao','heroi','lor'].includes(o.tipo)) return 'lore';
    if (/conto|hist|outro/.test(f) || ['riot-conto','conto','interativa'].includes(o.tipo)) return 'historia';
    if (['txt','epub'].includes(o.formato) && !f) return 'lore';
    // The bundled archive has no format field for its manga titles.
    if (!f && /akira|naruto|one piece|dragon ball|death note|berserk/.test(clean(o.titulo))) return 'manga';
    return 'hq';
  }
  function universe(o) { return ['hqs-lol','cronicas-lol','lol','runeterra','lor'].includes(o.colecao) || ['lol','riot-conto','riot-serie','riot-hq'].includes(o.tipo) ? 'lol' : o.colecao || 'arquivo'; }
  function allowed(o, policy, role) {
    if (!o) return false;
    if (role === 'admin') return true;
    const p = normalize(policy);
    if (p.mode === 'standard') return true;
    if (p.mode === 'initial') return category(o) === 'hq';
    return p.universes.includes(universe(o)) && p.categories.includes(category(o));
  }
  function filterCatalog(data, policy, role) {
    if (role === 'admin' || normalize(policy).mode === 'standard') return data;
    return Object.fromEntries(Object.entries(data || {}).map(([key, list])=>[key, Array.isArray(list) ? list.filter(it=>allowed(it,policy,role)) : list]));
  }
  const api = { universes, categories, normalize, category, universe, allowed, filterCatalog };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EQContentAccess = api;
})(globalThis);
