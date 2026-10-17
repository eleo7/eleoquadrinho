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
      return this.data;
    }
    update(patch) {
      if (!this.loaded) throw new Error('Aguarde o carregamento da conta.');
      this.data = { ...this.data, ...JSON.parse(JSON.stringify(patch)) };
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
          const snapshot = this.data;
          try {
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
  const exported = { api, SyncDocument };
  if (typeof module !== 'undefined') module.exports = exported;
  else root.EQAccount = exported;
})(typeof window !== 'undefined' ? window : globalThis);
