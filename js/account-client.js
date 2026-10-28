/* Account transport and durable, account-scoped synchronization. No passwords or tokens in storage. */
'use strict';
(function (root) {
  async function api(action, method = 'GET', body, account) {
    let response;
    try {
      response = await fetch('/api/account?action=' + action + (account ? '&account=' + encodeURIComponent(account) : ''), {
        method, credentials: 'same-origin', cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        signal: AbortSignal.timeout(20000)
      });
    } catch { throw new Error('Sem conexão. Suas alterações continuam pendentes neste dispositivo.'); }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) { const error = new Error(data.error || 'Não foi possível acessar sua conta.'); error.status = response.status; throw error; }
    return data;
  }
  const coverCache = new Map();
  function hasInlineImages(value) {
    if (typeof value === 'string') return value.startsWith('data:image/');
    return !!value && typeof value === 'object' && Object.values(value).some(hasInlineImages);
  }
  async function prepareCatalog(data, account, transport = api, upload = fetch) {
    if (!hasInlineImages(data)) return data;
    async function replace(value) {
      if (typeof value === 'string' && value.startsWith('data:image/')) {
        const match = /^data:(image\/(?:jpeg|png|webp|gif|avif));base64,([a-z0-9+/=\s]+)$/i.exec(value);
        if (!match) throw new Error('Uma capa tem formato inválido. Use JPEG, PNG, WebP, GIF ou AVIF.');
        const key = account + ':' + value;
        if (coverCache.has(key)) return coverCache.get(key);
        const bytes = Uint8Array.from(atob(match[2]), ch => ch.charCodeAt(0));
        const signed = await transport('cover-upload', 'POST', { type: match[1].toLowerCase(), size: bytes.length }, account);
        const response = await upload(signed.uploadURL, { method: 'PUT', headers: { 'Content-Type': match[1].toLowerCase() }, body: bytes, signal: AbortSignal.timeout(60000) });
        if (!response.ok) throw new Error('Não foi possível enviar uma capa. As alterações continuam pendentes.');
        if (typeof signed.reference !== 'string' || !signed.reference.startsWith('/api/account?action=cover-read&path=')) throw new Error('Referência de capa inválida.');
        coverCache.set(key, signed.reference);
        return signed.reference;
      }
      if (Array.isArray(value)) { const result = []; for (const item of value) result.push(await replace(item)); return result; }
      if (value && typeof value === 'object') { const result = {}; for (const [key, item] of Object.entries(value)) result[key] = await replace(item); return result; }
      return value;
    }
    return replace(data);
  }
  // Reader snapshots are bookmarks, not a second copy of the local book payload.
  function prepareReaderState(data) {
    if(!data||typeof data!=='object')return data;
    function bookmark(item){
      if(!item||typeof item!=='object'||Array.isArray(item))return item;
      const local=String(item.id||'').startsWith('local:')||item.localOnly===true;
      const payload=new Set(['blob','blobs','pdfDoc','pdfBytes','arrayBuffer','texto','textoLore','paginas','pages','urls','arquivo','conteudo']);
      const out={};
      for(const [key,value]of Object.entries(item)){
        if(local&&payload.has(key))continue;
        if(['blob','blobs','pdfDoc','pdfBytes','arrayBuffer'].includes(key))continue;
        if(typeof value==='string'&&(/^(data:image\/|blob:)/.test(value)))continue;
        // Page images are resolved from the catalog or IndexedDB when a book opens.
        if(Array.isArray(value)&&value.some(v=>typeof v==='string'&&/^(data:|blob:)/.test(v)))continue;
        out[key]=value;
      }
      return out;
    }
    const next={...data};
    if(Array.isArray(data.historico))next.historico=data.historico.map(h=>({...h,item:bookmark(h.item)}));
    if(data.salvos&&typeof data.salvos==='object')next.salvos=Object.fromEntries(Object.entries(data.salvos).map(([id,item])=>[id,bookmark(item)]));
    return JSON.stringify(next)===JSON.stringify(data)?data:next;
  }
  class SyncDocument {
    constructor(kind, account, notify, transport = api, storage = localStorage) {
      this.kind = kind; this.account = account; this.notify = notify; this.transport = transport; this.storage = storage;
      this.key = `eq:pending:${account}:${kind}`;
      this.data = {}; this.revision = 0; this.dirty = false; this.loaded = false; this.conflict = false;
    }
    async load() {
      const cloud = await this.transport(this.kind, 'GET', undefined, this.account);
      let pending;
      try { pending = JSON.parse(this.storage.getItem(this.key) || 'null'); } catch { /* Invalid local cache is not authoritative. */ }
      this.data = cloud.data; this.revision = cloud.revision; this.loaded = true;
      if (pending && pending.data && Number.isSafeInteger(pending.revision)) {
        this.data = pending.data; this.revision = pending.revision; this.dirty = true;
        this.conflict = pending.revision !== cloud.revision;
        if (this.conflict) this.notify('Há alterações pendentes e uma versão mais recente na nuvem. Baixe o backup antes de recarregar.', true);
        else this.schedule();
      }
      if(this.kind==='state'){const prepared=prepareReaderState(this.data);if(prepared!==this.data){this.data=prepared;this.dirty=true;this.persist();if(!this.conflict)this.schedule();}}
      if (this.kind === 'catalog' && !this.dirty && hasInlineImages(this.data)) { this.dirty = true; this.persist(); this.schedule(); }
      return this.data;
    }
    update(patch) {
      if (!this.loaded) throw new Error('Aguarde o carregamento da conta.');
      this.data = { ...this.data, ...JSON.parse(JSON.stringify(patch)) };
      if(this.kind==='state')this.data=prepareReaderState(this.data);
      this.dirty = true;
      this.persist(); this.schedule();
    }
    persist() {
      try { this.storage.setItem(this.key, JSON.stringify({ data: this.data, revision: this.revision })); }
      catch { this.notify('Não foi possível guardar as alterações neste dispositivo. Mantenha a página aberta e baixe um backup.', true); }
    }
    schedule() {
      this.notify(this.conflict ? 'Conflito de sincronização. Baixe suas alterações pendentes.' : 'Alterações aguardando sincronização.', this.conflict);
      clearTimeout(this.timer);
      if (!this.conflict) this.timer = setTimeout(() => this.flush().catch(() => {}), 600);
    }
    async flush() {
      clearTimeout(this.timer);
      if (this.running) return this.running;
      if (!this.dirty) return;
      if (this.conflict) throw new Error('Resolva o conflito de sincronização antes de continuar.');
      this.running = (async () => {
        while (this.dirty) {
          let snapshot = this.data;
          try {
            if(this.kind==='state'){const prepared=prepareReaderState(snapshot);if(this.data===snapshot)this.data=prepared;snapshot=prepared;}
            if (this.kind === 'catalog') {
              const prepared = await prepareCatalog(snapshot, this.account, this.transport);
              if (this.data === snapshot) this.data = prepared;
              snapshot = prepared;
              this.persist();
            }
            const result = await this.transport(this.kind, 'PUT', { data: snapshot, revision: this.revision }, this.account);
            this.revision = result.revision;
            this.dirty = snapshot !== this.data;
            if (this.dirty) this.persist();
            else this.storage.removeItem(this.key);
          } catch (error) {
            this.conflict = error.status === 409;
            this.persist(); this.notify(error.message, true); throw error;
          }
        }
        this.notify('Alterações salvas na nuvem.', false);
      })();
      try { return await this.running; } finally { this.running = null; }
    }
  }
  const exported = { api, SyncDocument, prepareCatalog, prepareReaderState };
  if (typeof module !== 'undefined') module.exports = exported;
  else root.EQAccount = exported;
})(typeof window !== 'undefined' ? window : globalThis);
