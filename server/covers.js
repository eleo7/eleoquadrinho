'use strict';
const { randomUUID } = require('node:crypto');
const { request, configuration, HttpError } = require('./backend');
const { reserveUpload } = require('./storage-quota');
const PREFIX = '/api/account?action=cover-read&path=';
const formats = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
function url(result) {
  const value = result.url || result.signedURL;
  if (typeof value !== 'string') throw new HttpError(503, 'Não foi possível acessar a capa.');
  const base = configuration().url;
  const parsed = new URL(value.startsWith('http') ? value : base + '/storage/v1' + value);
  if (parsed.origin !== new URL(base).origin) throw new HttpError(503, 'Destino de capa inválido.');
  return parsed.href;
}
async function uploadCover(body, profile) {
  if (profile.role !== 'admin') throw new HttpError(403, 'Somente o administrador pode publicar capas.');
  if (!formats[body.type] || !Number.isSafeInteger(body.size) || body.size < 1 || body.size > 10 * 1024 * 1024) throw new HttpError(400, 'Capa inválida. Use JPEG, PNG, WebP, GIF ou AVIF de até 10 MB.');
  const id = randomUUID();
  await reserveUpload(body.size, id);
  const path = id + '-0.' + formats[body.type];
  const result = await request('/storage/v1/object/upload/sign/comics/' + path, { admin: true, method: 'POST', body: {} });
  return { uploadURL: url(result), reference: PREFIX + path };
}
async function readCover(path, profile = {}) {
  if (typeof path !== 'string' || !/^[a-f0-9-]{36}-0\.(jpg|png|webp|gif|avif)$/.test(path)) throw new HttpError(404, 'Capa não encontrada.');
  const rows = await request('/rest/v1/catalog?id=eq.1&select=data', { admin: true });
  const reference = PREFIX + path;
  function contains(value) {
    return value === reference || (value && typeof value === 'object' && Object.values(value).some(contains));
  }
  if (!contains(require('../js/content-access').filterCatalog(rows[0]?.data, profile.access, profile.role))) throw new HttpError(404, 'Capa não publicada.');
  return url(await request('/storage/v1/object/sign/comics/' + path, { admin: true, method: 'POST', body: { expiresIn: 3600 } }));
}
module.exports = { uploadCover, readCover };
