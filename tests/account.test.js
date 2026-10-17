'use strict';
const { test, beforeEach, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/account');
const originalFetch = global.fetch;
let requests;
beforeEach(() => {
  process.env.SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_ANON_KEY = 'test-anon';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-server';
  requests = [];
});
afterEach(() => { global.fetch = originalFetch; });
function backend(overrides = {}) {
  global.fetch = async (url, options) => {
    const path = new URL(url).pathname + new URL(url).search;
    requests.push({ path, options });
    if (overrides[path]) return overrides[path](options);
    if (path === '/storage/v1/bucket') return Response.json([]);
    if (path.startsWith('/storage/v1/object/comics/quota/') || (path === '/storage/v1/object/comics' && options.method === 'DELETE')) return Response.json({});
    if (path === '/auth/v1/user') return Response.json({ id: 'reader-id' });
    if (path.startsWith('/rest/v1/profiles?id=')) return Response.json([{ id: 'reader-id', role: 'reader', login: 'reader', nome: 'Leitor' }]);
    if (path.startsWith('/rest/v1/reader_state')) return Response.json([{ data: { salvos: { book: true } }, revision: 2 }]);
    throw new Error('Unexpected upstream request: ' + path);
  };
}
async function call(action, method = 'GET', body = {}, headers = {}, account = 'reader-id') {
  const req = { method, body, query: { action, account }, headers: { host: 'site.test', origin: 'https://site.test', 'content-type': 'application/json', cookie: 'eq_access=test-access', ...headers } };
  const result = { headers: {}, status: 200 };
  const res = { setHeader(k, v) { result.headers[k] = v; }, status(code) { result.status = code; return this; }, json(value) { result.body = value; return this; } };
  await handler(req, res); return result;
}
test('missing configuration returns a useful unavailable error without credentials', async () => {
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  const result = await call('session');
  assert.equal(result.status, 503); assert.match(result.body.error, /não configuradas/);
});
test('login rejects a blank password and never queries accounts', async () => {
  backend(); const result = await call('login', 'POST', { login: 'reader', senha: '' });
  assert.equal(result.status, 400); assert.equal(requests.length, 0);
});
test('invalid password cannot fall back to the only saved user', async () => {
  backend({
    '/rest/v1/profiles?login=eq.reader&select=email': () => Response.json([{ email: 'reader@example.org' }]),
    '/auth/v1/token?grant_type=password': () => Response.json({ error: 'invalid' }, { status: 400 })
  });
  const result = await call('login', 'POST', { login: 'reader', senha: 'wrong-password' });
  assert.equal(result.status, 401); assert.equal(result.headers['Set-Cookie'], undefined);
});
test('login sets HttpOnly cookies and returns no tokens or password; whitespace preserved', async () => {
  backend({
    '/auth/v1/token?grant_type=password': options => {
      assert.equal(JSON.parse(options.body).password, ' password-with-spaces ');
      return Response.json({ access_token: 'access', refresh_token: 'refresh', user: { id: 'reader-id' }, expires_in: 3600 });
    }
  });
  const result = await call('login', 'POST', { login: 'reader@example.org', senha: ' password-with-spaces ' });
  assert.equal(result.status, 200);
  assert.equal(result.headers['Set-Cookie'].length, 2);
  assert.ok(result.headers['Set-Cookie'].every(c => c.includes('HttpOnly') && c.includes('SameSite=Lax')));
  assert.deepEqual(Object.keys(result.body), ['user']);
  assert.ok(!JSON.stringify(result.body).includes('refresh'));
});
test('administrator login is reserved regardless of capitalization', async () => {
  backend(); const result = await call('signup', 'POST', { login: 'Eleo7', senha: 'test-password', email: 'x@example.org', role: 'admin' });
  assert.equal(result.status, 400); assert.equal(requests.length, 0);
});
test('signup does not pass privilege claims to Supabase', async () => {
  backend({ '/auth/v1/signup': options => {
    const body = JSON.parse(options.body);
    assert.deepEqual(body.data, { login: 'reader', nome: 'Leitor' });
    assert.equal(body.app_metadata, undefined);
    return Response.json({ user: { id: 'reader-id' } });
  } });
  const result = await call('signup', 'POST', { login: 'Reader', nome: 'Leitor', email: 'x@example.org', senha: 'test-password', role: 'admin' });
  assert.equal(result.status, 200); assert.match(result.body.message, /confirmar/);
});
test('anonymous reads cannot see saved state', async () => {
  backend(); const result = await call('state', 'GET', {}, { cookie: '' });
  assert.equal(result.status, 401); assert.equal(requests.length, 0);
});
test('readers cannot modify catalog even with a forged role', async () => {
  backend(); const result = await call('catalog', 'PUT', { role: 'admin', data: { externas: [] }, revision: 0 });
  assert.equal(result.status, 403); assert.ok(requests.every(r => !r.path.includes('/rpc/')));
});
test('a cookie changed in another tab cannot save one account into another', async () => {
  backend(); const result = await call('state', 'PUT', { data: {}, revision: 0 }, {}, 'another-id');
  assert.equal(result.status, 403); assert.ok(requests.every(r => !r.path.includes('/rpc/')));
});
test('state is always scoped to the verified identity', async () => {
  backend({ '/rest/v1/rpc/save_account_data': options => {
    const body = JSON.parse(options.body);
    assert.equal(body.account_id, 'reader-id'); assert.equal(body.is_catalog, false);
    return Response.json(3);
  } });
  const result = await call('state', 'PUT', { user_id: 'victim', data: { salvos: {} }, revision: 2 });
  assert.equal(result.status, 200); assert.equal(result.body.revision, 3);
});
test('stale revision returns a conflict instead of claiming a save', async () => {
  backend({ '/rest/v1/rpc/save_account_data': () => Response.json(null) });
  const result = await call('state', 'PUT', { data: { salvos: {} }, revision: 0 });
  assert.equal(result.status, 409);
});
test('admin may modify catalog', async () => {
  backend({
    '/rest/v1/profiles?id=eq.reader-id&select=*': () => Response.json([{ id: 'reader-id', role: 'admin' }]),
    '/rest/v1/rpc/save_account_data': options => { assert.equal(JSON.parse(options.body).is_catalog, true); return Response.json(1); }
  });
  const result = await call('catalog', 'PUT', { data: { externas: [] }, revision: 0 });
  assert.equal(result.status, 200);
});
test('cross-origin writes are rejected before contacting Supabase', async () => {
  backend(); const result = await call('state', 'PUT', {}, { origin: 'https://attacker.test' });
  assert.equal(result.status, 403); assert.equal(requests.length, 0);
});
test('profile editing cannot change role, account ID or login', async () => {
  backend(); const result = await call('profile', 'PATCH', { nome: 'Leitor', role: 'admin' });
  assert.equal(result.status, 400); assert.equal(requests.length, 2);
});
test('expired session refreshes without exposing tokens', async () => {
  backend({
    '/auth/v1/user': () => Response.json({}, { status: 401 }),
    '/auth/v1/token?grant_type=refresh_token': () => Response.json({ access_token: 'new-access', refresh_token: 'new-refresh', user: { id: 'reader-id' } })
  });
  const result = await call('session', 'GET', {}, { cookie: 'eq_access=expired; eq_refresh=refresh' });
  assert.equal(result.status, 200); assert.ok(result.headers['Set-Cookie'][0].includes('new-access'));
  assert.equal(result.headers['Cache-Control'], 'no-store, private');
});
test('logout refreshes an expired session, revokes it and clears both cookies', async () => {
  backend({
    '/auth/v1/user': () => Response.json({}, { status: 401 }),
    '/auth/v1/token?grant_type=refresh_token': () => Response.json({ access_token: 'renewed', refresh_token: 'rotated', user: { id: 'reader-id' } }),
    '/auth/v1/logout?scope=local': options => { assert.equal(options.headers.Authorization, 'Bearer renewed'); return new Response(null, { status: 204 }); }
  });
  const result = await call('logout', 'POST', {}, { cookie: 'eq_access=expired; eq_refresh=old' });
  assert.equal(result.status, 200); assert.ok(result.headers['Set-Cookie'].every(c => c.includes('Max-Age=0')));
});
test('readers cannot request an upload URL', async () => {
  backend();
  const result = await call('file-upload', 'POST', { format: 'pdf', size: 100, role: 'admin' });
  assert.equal(result.status, 403);
  assert.ok(requests.every(r => !r.path.includes('/storage/')));
});
test('upload rejects unsupported formats and oversize files before reaching storage', async () => {
  backend({ '/rest/v1/profiles?id=eq.reader-id&select=*': () => Response.json([{ id: 'reader-id', role: 'admin' }]) });
  assert.equal((await call('file-upload', 'POST', { format: 'html', size: 100 })).status, 400);
  assert.equal((await call('file-upload', 'POST', { format: 'pdf', size: 501 * 1024 * 1024 })).status, 400);
  assert.ok(requests.every(r => !r.path.includes('/storage/')));
});
test('file reading requires a published catalog entry, not a client supplied storage path', async () => {
  backend({ '/rest/v1/catalog?id=eq.1&select=data': () => Response.json([{ data: { externas: [] } }]) });
  const result = await call('file-read', 'POST', { id: 'missing', storagePath: 'private.pdf' });
  assert.equal(result.status, 404);
  assert.ok(requests.every(r => !r.path.includes('/storage/')));
});
test('signed reading works for a published file without requiring a local browser copy', async () => {
  const path = '00000000-0000-4000-8000-000000000001.pdf';
  backend({
    '/rest/v1/catalog?id=eq.1&select=data': () => Response.json([{ data: { externas: [{ id: 'local:book', storagePath: path }] } }]),
    ['/storage/v1/object/sign/comics/' + path]: options => {
      assert.equal(JSON.parse(options.body).expiresIn, 3600);
      return Response.json({ signedURL: '/object/sign/comics/' + path + '?token=test-signed' });
    }
  });
  const result = await call('file-read', 'POST', { id: 'local:book' });
  assert.equal(result.status, 200);
  assert.equal(result.body.url, 'https://example.supabase.co/storage/v1/object/sign/comics/' + path + '?token=test-signed');
});
test('unpublished or malformed paths cannot escape the comics bucket', async () => {
  backend({ '/rest/v1/catalog?id=eq.1&select=data': () => Response.json([{ data: { externas: [{ id: 'local:book', storagePath: '../other/secret.pdf' }] } }]) });
  assert.equal((await call('file-read', 'POST', { id: 'local:book' })).status, 404);
});
test('large HQ upload is split into bounded objects without losing bytes', async () => {
  backend({ '/rest/v1/profiles?id=eq.reader-id&select=*': () => Response.json([{ id: 'reader-id', role: 'admin' }]) });
  const upstream = global.fetch;
  global.fetch = async (url, options) => new URL(url).pathname.startsWith('/storage/v1/object/upload/sign/comics/')
    ? Response.json({ url: new URL(url).pathname.replace('/storage/v1', '') + '?token=test' }) : upstream(url, options);
  for (const mb of [50, 51, 500]) {
    const result = await call('file-upload', 'POST', { format: 'pdf', size: mb * 1024 * 1024 });
    assert.equal(result.status, 200);
    assert.equal(result.body.parts.length, Math.ceil(mb / 4));
    assert.equal(result.body.parts.reduce((n, p) => n + p.size, 0), mb * 1024 * 1024);
    assert.ok(result.body.parts.every(p => p.size <= 4 * 1024 * 1024));
    assert.equal(new Set(result.body.parts.map(p => p.path)).size, result.body.parts.length);
  }
});
test('multipart reading preserves catalog order and ignores client supplied paths', async () => {
  const paths = [1, 2, 3].map(n => `00000000-0000-4000-8000-00000000000${n}.pdf`);
  backend({
    '/rest/v1/catalog?id=eq.1&select=data': () => Response.json([{ data: { externas: [{ id: 'book', storagePath: paths[0], storageParts: paths, storageSize: 123 }] } }]),
    ...Object.fromEntries(paths.map(path => ['/storage/v1/object/sign/comics/' + path, () => Response.json({ signedURL: '/object/sign/comics/' + path })]))
  });
  const result = await call('file-read', 'POST', { id: 'book', storageParts: ['secret'] });
  assert.equal(result.status, 200);
  assert.deepEqual(result.body.urls, paths.map(p => 'https://example.supabase.co/storage/v1/object/sign/comics/' + p));
  assert.equal(result.body.size, 123);
});
test('malformed multipart manifests never reach storage', async () => {
  const path = '00000000-0000-4000-8000-000000000001.pdf';
  for (const parts of [[], [path, '../secret'], [path, path], Array(126).fill(path), 'not-an-array']) {
    backend({ '/rest/v1/catalog?id=eq.1&select=data': () => Response.json([{ data: { externas: [{ id: 'book', storagePath: path, storageParts: parts }] } }]) });
    assert.equal((await call('file-read', 'POST', { id: 'book' })).status, 404);
  }
  assert.ok(requests.every(r => !r.path.includes('/storage/')));
});
test('logout clears browser credentials even when provider revocation is unavailable', async () => {
  backend({ '/auth/v1/logout?scope=local': () => Response.json({}, { status: 503 }) });
  const result = await call('logout', 'POST');
  assert.equal(result.status, 200); assert.equal(result.body.revoked, false);
  assert.ok(result.headers['Set-Cookie'].every(c => c.includes('Max-Age=0')));
});
test('logout clears credentials when user verification itself is unavailable', async () => {
  backend({ '/auth/v1/user': () => Response.json({}, { status: 503 }) });
  const result = await call('logout', 'POST');
  assert.equal(result.status, 200);
  assert.ok(result.headers['Set-Cookie'].every(c => c.includes('Max-Age=0')));
});
