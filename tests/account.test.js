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
