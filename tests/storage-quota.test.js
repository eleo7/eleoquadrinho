'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { storageStatus, reserveUpload } = require('../server/storage-quota');
const original = global.fetch;
afterEach(() => { global.fetch = original; delete process.env.STORAGE_QUOTA_BYTES; });
function mock(files, locked = false) {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'anon'; process.env.SUPABASE_SERVICE_ROLE_KEY = 'service';
  const calls = [];
  global.fetch = async (url, options) => {
    const path = new URL(url).pathname; calls.push({ path, options });
    if (path === '/storage/v1/bucket') return Response.json([{ id: 'comics' }, { id: 'other' }]);
    if (path.startsWith('/storage/v1/object/list/')) {
      const { prefix, offset } = JSON.parse(options.body);
      return Response.json(offset ? [] : files[path.endsWith('/other') ? 'other' : prefix] || []);
    }
    if (path.endsWith('upload-lock.json') && locked) return Response.json({}, { status: 409 });
    return Response.json({});
  }; return calls;
}
const file = (name, size) => ({ name, id: name, metadata: { size } });
test('usage includes other buckets, warns at 80%, and reserves only missing bytes', async () => {
  const id = '00000000-0000-4000-8000-000000000001';
  mock({ '': [file(id + '-0.pdf', 100000000), { name: 'quota', id: null, metadata: null }], 'quota/': [file(`${id}_200000000_${Date.now() + 100000}.json`, 2)], other: [file('old.pdf', 610000000)] });
  const s = await storageStatus();
  assert.equal(s.used, 710000002); assert.equal(s.reserved, 100000000);
  assert.equal(s.warning, true); assert.equal(s.blocked, false);
});
test('projected upload exceeding 90% is blocked before any reservation and releases lock', async () => {
  const calls = mock({ '': [file('old.pdf', 850000000)] });
  await assert.rejects(reserveUpload(60000000, 'id'), e => e.status === 413);
  assert.equal(calls.filter(c => c.path.includes('/quota/') && !c.path.includes('upload-lock')).length, 0);
  assert.ok(calls.some(c => c.options.method === 'DELETE'));
});
test('concurrent upload cannot acquire an existing lock or delete it', async () => {
  const calls = mock({}, true);
  await assert.rejects(reserveUpload(1, 'id'), e => e.status === 423);
  assert.equal(calls.length, 1);
});
test('expired reservations stop consuming the upload budget; 90% blocks uploads', async () => {
  mock({ '': [file('old.pdf', 900000000), { name: 'quota', id: null, metadata: null }], 'quota/': [file('00000000-0000-4000-8000-000000000001_100000000_1.json', 2)] });
  const s = await storageStatus(); assert.equal(s.reserved, 0); assert.equal(s.blocked, true);
});
test('unknown object sizes fail closed', async () => {
  mock({ '': [{ name: 'unknown.pdf', id: 'id', metadata: {} }] });
  await assert.rejects(storageStatus(), e => e.status === 503);
});
