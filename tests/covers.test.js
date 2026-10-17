'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { prepareCatalog, SyncDocument } = require('../js/account-client');
const { readCover, uploadCover } = require('../server/covers');
test('catalog above 2 MB becomes small references, uploading identical cover/banner only once', async () => {
  const value = 'data:image/png;base64,' + Buffer.alloc(900000, 23).toString('base64');
  const original = { externas: [{ id: 'book', capa: value, banner: value, storageParts: ['existing.pdf'] }] };
  assert.ok(JSON.stringify(original).length > 2000000);
  let uploads = 0, signatures = 0;
  const reference = '/api/account?action=cover-read&path=test.png';
  const output = await prepareCatalog(original, 'oversized-admin', async (action, method, body, account) => {
    assert.equal(action, 'cover-upload'); assert.equal(body.size, 900000); assert.equal(account, 'oversized-admin'); signatures++;
    return { uploadURL: 'https://example.test/upload', reference };
  }, async (url, options) => { uploads++; assert.equal(options.body.length, 900000); return { ok: true }; });
  assert.equal(uploads, 1); assert.equal(signatures, 1);
  assert.ok(JSON.stringify(output).length < 500);
  assert.equal(output.externas[0].capa, reference); assert.equal(output.externas[0].banner, reference);
  assert.equal(original.externas[0].capa, value);
  assert.deepEqual(output.externas[0].storageParts, ['existing.pdf']);
});
test('failed cover upload leaves original catalog intact for retry', async () => {
  const original = { series: [{ id: 's', capa: 'data:image/png;base64,YQ==' }] };
  await assert.rejects(prepareCatalog(original, 'failure', async () => ({ uploadURL: 'https://example.test', reference: '/api/account?action=cover-read&path=x' }), async () => ({ ok: false })));
  assert.equal(original.series[0].capa, 'data:image/png;base64,YQ==');
});
test('readers cannot upload covers and private paths require publication in catalog', async () => {
  await assert.rejects(uploadCover({ type: 'image/png', size: 10 }, { role: 'reader' }), e => e.status === 403);
  await assert.rejects(readCover('../secret'), e => e.status === 404);
  process.env.SUPABASE_URL = 'https://example.supabase.co'; process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  const path = '00000000-0000-4000-8000-000000000001-0.png';
  const previous = global.fetch; let published = false;
  global.fetch = async url => {
    if (url.includes('/rest/v1/catalog')) return Response.json([{ data: { externas: [{ id: 'book', capa: published ? '/api/account?action=cover-read&path=' + path : '' }] } }]);
    assert.ok(published); return Response.json({ signedURL: '/object/sign/comics/' + path });
  };
  try {
    await assert.rejects(readCover(path), e => e.status === 404); published = true;
    assert.equal(await readCover(path), 'https://example.supabase.co/storage/v1/object/sign/comics/' + path);
  } finally { global.fetch = previous; }
});
test('old inline catalogs are automatically queued without changing revision', async () => {
  const data = { externas: [{ id: 'book', capa: 'data:image/png;base64,YQ==' }] };
  const cache = new Map(); const storage = { getItem: k => cache.get(k), setItem: (k,v) => cache.set(k,v) };
  const doc = new SyncDocument('catalog', 'migration', () => {}, async () => ({ data, revision: 19 }), storage);
  await doc.load(); clearTimeout(doc.timer);
  assert.equal(doc.dirty, true); assert.equal(doc.revision, 19);
  assert.deepEqual(JSON.parse(cache.get(doc.key)).data, data);
});
test('pending oversized catalog syncs through the unchanged 2 MB API budget', async () => {
  const cache = new Map(); const storage = { getItem: k => cache.get(k), setItem: (k,v) => cache.set(k,v), removeItem: k => cache.delete(k) };
  const value = 'data:image/png;base64,' + Buffer.alloc(900000, 44).toString('base64');
  const previous = global.fetch; global.fetch = async () => ({ ok: true });
  const doc = new SyncDocument('catalog', 'pending-migration', () => {}, async (action, method, body) => {
    if (action === 'cover-upload') return { uploadURL: 'https://example.test/upload', reference: '/api/account?action=cover-read&path=small.png' };
    if (method === 'GET') return { data: {}, revision: 19 };
    assert.ok(JSON.stringify(body).length < 2000000); assert.equal(body.revision, 19);
    return { revision: 20 };
  }, storage);
  try {
    await doc.load(); doc.update({ externas: [{ id: 'book', capa: value, banner: value }] });
    assert.ok(cache.get(doc.key).length > 2000000);
    await doc.flush();
    assert.equal(doc.revision, 20); assert.equal(doc.dirty, false); assert.equal(cache.has(doc.key), false);
    assert.ok(doc.data.externas[0].capa.startsWith('/api/account?'));
  } finally { clearTimeout(doc.timer); global.fetch = previous; }
});
