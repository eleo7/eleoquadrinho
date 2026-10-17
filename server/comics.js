'use strict';
const { storageStatus, reserveUpload } = require('./storage-quota');
const { randomUUID } = require('node:crypto');
const { request, configuration, HttpError } = require('./backend');
const BUCKET = 'comics';
const MAX_BYTES = 500 * 1024 * 1024;
const PART_BYTES = 4 * 1024 * 1024;
const OBJECT_BYTES = 50 * 1024 * 1024;
const FILE_PATH = /^[a-f0-9-]{36}(?:-\d{1,3})?\.(pdf|cbz|epub|txt)$/;
function signedURL(result) {
  const value = result.url || result.signedURL || result.signedUrl;
  if (typeof value !== 'string') throw new HttpError(503, 'Não foi possível preparar o arquivo.');
  const base = configuration().url;
  const url = new URL(value.startsWith('http') ? value : base + '/storage/v1' + value);
  if (url.origin !== new URL(base).origin) throw new HttpError(503, 'Destino de armazenamento inválido.');
  return url.href;
}
async function comicsAction(action, body, profile) {
  if (action === 'storage-status') {
    if (profile.role !== 'admin') throw new HttpError(403, 'Somente o administrador pode consultar o espaço da nuvem.');
    return storageStatus();
  }
  if (action === 'file-upload') {
    if (profile.role !== 'admin') throw new HttpError(403, 'Somente o administrador pode enviar HQs.');
    if (!['pdf', 'cbz', 'epub', 'txt'].includes(body.format)) throw new HttpError(400, 'Formato não suportado.');
    if (!Number.isSafeInteger(body.size) || body.size < 1 || body.size > MAX_BYTES) throw new HttpError(400, 'Cada HQ deve ter até 500 MB.');
    const uploadId = randomUUID();
    await reserveUpload(body.size, uploadId);
    const count = Math.ceil(body.size / PART_BYTES);
    const parts = [];
    for (let i = 0; i < count; i++) {
      const path = uploadId + '-' + i + '.' + body.format;
      const result = await request(`/storage/v1/object/upload/sign/${BUCKET}/${path}`, { admin: true, method: 'POST', body: {} });
      parts.push({ path, url: signedURL(result), size: count === 1 ? body.size : Math.min(PART_BYTES, body.size - i * PART_BYTES) });
    }
    return { ...parts[0], parts };
  }
  if (action === 'file-read') {
    if (typeof body.id !== 'string') throw new HttpError(400, 'HQ inválida.');
    const rows = await request('/rest/v1/catalog?id=eq.1&select=data', { admin: true });
    const item = rows[0]?.data?.externas?.find(item => item.id === body.id);
    // Only files actually published in the shared catalog can be signed for readers.
    if (!item || !FILE_PATH.test(item.storagePath || '')) throw new HttpError(404, 'O administrador ainda não publicou o arquivo desta HQ.');
    const paths = item.storageParts === undefined ? [item.storagePath] : item.storageParts;
    if (!Array.isArray(paths) || !paths.length || paths.length > Math.ceil(MAX_BYTES / PART_BYTES)
      || paths[0] !== item.storagePath || paths.some(path => typeof path !== 'string' || !FILE_PATH.test(path))
      || new Set(paths).size !== paths.length) throw new HttpError(404, 'Arquivo publicado inválido.');
    const urls = [];
    for (const path of paths) {
      const result = await request(`/storage/v1/object/sign/${BUCKET}/${path}`, { admin: true, method: 'POST', body: { expiresIn: 3600 } });
      urls.push(signedURL(result));
    }
    return { url: urls[0], urls, size: item.storageSize };
  }
  throw new HttpError(404, 'Operação não encontrada.');
}
module.exports = { comicsAction, BUCKET, MAX_BYTES, OBJECT_BYTES };
