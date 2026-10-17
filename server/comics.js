'use strict';
const { randomUUID } = require('node:crypto');
const { request, configuration, HttpError } = require('./backend');
const BUCKET = 'comics';
const MAX_BYTES = 50 * 1024 * 1024;
const FILE_PATH = /^[a-f0-9-]{36}\.(pdf|cbz|epub|txt)$/;
function signedURL(result) {
  const value = result.url || result.signedURL || result.signedUrl;
  if (typeof value !== 'string') throw new HttpError(503, 'Não foi possível preparar o arquivo.');
  const base = configuration().url;
  const url = new URL(value.startsWith('http') ? value : base + '/storage/v1' + value);
  if (url.origin !== new URL(base).origin) throw new HttpError(503, 'Destino de armazenamento inválido.');
  return url.href;
}
async function comicsAction(action, body, profile) {
  if (action === 'file-upload') {
    if (profile.role !== 'admin') throw new HttpError(403, 'Somente o administrador pode enviar HQs.');
    if (!['pdf', 'cbz', 'epub', 'txt'].includes(body.format)) throw new HttpError(400, 'Formato não suportado.');
    if (!Number.isSafeInteger(body.size) || body.size < 1 || body.size > MAX_BYTES) throw new HttpError(400, 'Cada arquivo deve ter até 50 MB.');
    const path = randomUUID() + '.' + body.format;
    const result = await request(`/storage/v1/object/upload/sign/${BUCKET}/${path}`, { admin: true, method: 'POST', body: {} });
    return { path, url: signedURL(result) };
  }
  if (action === 'file-read') {
    if (typeof body.id !== 'string') throw new HttpError(400, 'HQ inválida.');
    const rows = await request('/rest/v1/catalog?id=eq.1&select=data', { admin: true });
    const item = rows[0]?.data?.externas?.find(item => item.id === body.id);
    // Only files actually published in the shared catalog can be signed for readers.
    if (!item || !FILE_PATH.test(item.storagePath || '')) throw new HttpError(404, 'O administrador ainda não publicou o arquivo desta HQ.');
    const result = await request(`/storage/v1/object/sign/${BUCKET}/${item.storagePath}`, { admin: true, method: 'POST', body: { expiresIn: 3600 } });
    return { url: signedURL(result) };
  }
  throw new HttpError(404, 'Operação não encontrada.');
}
module.exports = { comicsAction, BUCKET, MAX_BYTES };
