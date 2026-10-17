'use strict';
const { request, HttpError } = require('./backend');
const BUCKET = 'comics';
const LOCK = 'quota/upload-lock.json';
async function inventory() {
  const buckets = await request('/storage/v1/bucket', { admin: true });
  const files = [];
  let pages = 0;
  for (const bucket of buckets) {
    const prefixes = [''];
    while (prefixes.length) {
      const prefix = prefixes.pop();
      for (let offset = 0; ; offset += 1000) {
        if (++pages > 1000) throw new HttpError(503, 'Não foi possível conferir o espaço. Use a biblioteca local.');
        const rows = await request('/storage/v1/object/list/' + encodeURIComponent(bucket.id), { admin: true, method: 'POST', body: { prefix, limit: 1000, offset, sortBy: { column: 'name', order: 'asc' } } });
        if (!Array.isArray(rows)) throw new HttpError(503, 'Não foi possível conferir o espaço.');
        for (const row of rows) {
          const path = prefix + row.name;
          if (row.id == null && row.metadata == null) prefixes.push(path + '/');
          else {
            const size = Number(row.metadata?.size);
            if (!Number.isFinite(size) || size < 0) throw new HttpError(503, 'Não foi possível conferir o tamanho dos arquivos.');
            files.push({ bucket: bucket.id, path, size });
          }
        }
        if (rows.length < 1000) break;
      }
    }
  }
  return files;
}
async function storageStatus() {
  const limit = Number(process.env.STORAGE_QUOTA_BYTES || 1000000000);
  if (!Number.isSafeInteger(limit) || limit <= 0) throw new HttpError(503, 'Cota de armazenamento inválida.');
  const files = await inventory();
  const used = files.reduce((n, f) => n + f.size, 0);
  let reserved = 0;
  for (const f of files.filter(f => f.bucket === BUCKET)) {
    const match = /^quota\/([a-f0-9-]{36})_(\d+)_(\d+)\.json$/.exec(f.path);
    if (!match || Number(match[3]) <= Date.now()) continue;
    const stored = files.filter(p => p.bucket === BUCKET && p.path.startsWith(match[1] + '-')).reduce((n, p) => n + p.size, 0);
    reserved += Math.max(0, Number(match[2]) - stored);
  }
  const stopAt = Math.floor(limit * .9);
  return { used, reserved, limit, stopAt, available: Math.max(0, stopAt - used - reserved), warning: used + reserved >= limit * .8, blocked: used + reserved >= stopAt };
}
async function reserveUpload(size, id) {
  // Storage creation without upsert is atomic across Vercel instances.
  // Keep a failed/crashed lock closed; never expire a live lock automatically.
  try { await request('/storage/v1/object/' + BUCKET + '/' + LOCK, { admin: true, method: 'POST', body: {} }); }
  catch { throw new HttpError(423, 'Outro envio está sendo preparado ou a verificação de espaço está indisponível. Tente novamente ou salve apenas no navegador.'); }
  try {
    const status = await storageStatus();
    if (size > status.available) throw new HttpError(413, 'Esta HQ ultrapassaria a margem de segurança da nuvem (90%). Guarde-a apenas no navegador.');
    // Signed upload URLs expire after 2 hours. Reserve for 3 hours, including interrupted uploads.
    const path = `quota/${id}_${size}_${Date.now() + 3 * 3600000}.json`;
    await request('/storage/v1/object/' + BUCKET + '/' + path, { admin: true, method: 'POST', body: {} });
    return status;
  } finally {
    await request('/storage/v1/object/' + BUCKET, { admin: true, method: 'DELETE', body: { prefixes: [LOCK] } });
  }
}
module.exports = { storageStatus, reserveUpload };
