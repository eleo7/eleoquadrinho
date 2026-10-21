'use strict';
const UniverseTree = require('../js/universe-tree');
const Access = require('../js/content-access');
const { communityAction } = require('../server/community');
const { usersAction } = require('../server/user-admin');
const { uploadCover, readCover } = require('../server/covers');
const { comicsAction } = require('../server/comics');
const { HttpError, configuration, request, loginName, password, publicProfile } = require('../server/backend');

function cookies(req) {
  return Object.fromEntries(String(req.headers.cookie || '').split(';').map(part => {
    const i = part.indexOf('=');
    return i < 0 ? ['', ''] : [part.slice(0, i).trim(), part.slice(i + 1)];
  }));
}
function setSession(res, session) {
  const secure = process.env.VERCEL || process.env.NODE_ENV === 'production' ? '; Secure' : '';
  const attrs = `; HttpOnly; SameSite=Lax; Path=/api/account${secure}`;
  res.setHeader('Set-Cookie', [
    `eq_access=${session?.access_token || ''}; Max-Age=${session ? session.expires_in || 3600 : 0}${attrs}`,
    `eq_refresh=${session?.refresh_token || ''}; Max-Age=${session ? 2592000 : 0}${attrs}`
  ]);
}
async function authenticate(req, res) {
  const jar = cookies(req);
  if (jar.eq_access) {
    try {
      const user = await request('/auth/v1/user', { token: jar.eq_access });
      req.authToken = jar.eq_access;
      return user;
    }
    catch (error) { if (![400, 401].includes(error.status)) throw error; }
  }
  if (jar.eq_refresh) {
    try {
      const session = await request('/auth/v1/token?grant_type=refresh_token', { method: 'POST', body: { refresh_token: jar.eq_refresh } });
      setSession(res, session);
      req.authToken = session.access_token;
      return session.user;
    } catch (error) { if (![400, 401].includes(error.status)) throw error; }
  }
  setSession(res, null);
  throw new HttpError(401, 'Entre na sua conta para continuar.');
}
async function profile(id) {
  const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(id)}&select=*`, { admin: true });
  if (!rows?.[0]) throw new HttpError(403, 'Perfil indisponível. Contate o administrador.');
  return rows[0];
}
function object(value) { return value && typeof value === 'object' && !Array.isArray(value); }
function validateState(data, catalog) {
  const allowed = catalog ? ['externas', 'drive', 'herois', 'series', 'universes'] : ['historico', 'salvos', 'avaliacoes', 'finais', 'prefs'];
  if (!object(data) || Object.keys(data).some(key => !allowed.includes(key))) throw new HttpError(400, 'Dados inválidos.');
  for (const [key, value] of Object.entries(data)) {
    if (catalog && key === 'universes') { try { UniverseTree.validate(value); } catch(e) { throw new HttpError(400, e.message); } continue; }
    if (catalog || key === 'historico') {
      if (!Array.isArray(value) || value.length > 5000 || value.some(item => !object(item) || typeof item.id !== 'string')) throw new HttpError(400, 'Lista inválida.');
    } else if (!object(value)) throw new HttpError(400, 'Dados inválidos.');
  }
  if(catalog){
    const assigned=new Set((data.universes||[]).flatMap(n=>n.cols));
    for(const key of ['externas','drive','herois','series'])for(const item of data[key]||[])if(UniverseTree.isCustom(item.colecao)&&!assigned.has(item.colecao))throw new HttpError(400,'Transfira o conteúdo antes de excluir seu universo.');
  }
}
async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, private');
  res.setHeader('Vary', 'Cookie');
  try {
    if (!['GET', 'POST', 'PUT', 'PATCH'].includes(req.method)) throw new HttpError(405, 'Método não permitido.');
    if (req.method !== 'GET') {
      let origin;
      try { origin = new URL(req.headers.origin); } catch { throw new HttpError(403, 'Origem inválida.'); }
      if (origin.host !== req.headers.host || !['https:', 'http:'].includes(origin.protocol)) throw new HttpError(403, 'Origem inválida.');
      if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new HttpError(415, 'Envie JSON.');
    }
    configuration();
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
    if (!object(body) || Buffer.byteLength(JSON.stringify(body)) > 2_000_000) throw new HttpError(413, 'Dados muito grandes. Limite de 2 MB por sincronização.');
    const action = req.query?.action || 'session';
    if (req.method === 'POST' && action === 'signup') {
      const login = loginName(body.login);
      if (login === 'eleo7') throw new HttpError(400, 'Este login está reservado.');
      const email = String(body.email || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) throw new HttpError(400, 'Informe um e-mail válido.');
      const nome = String(body.nome || '').trim();
      if (!nome || nome.length > 80) throw new HttpError(400, 'Informe um nome de até 80 caracteres.');
      // The database trigger assigns reader permissions, ignoring user-supplied roles.
      await request('/auth/v1/signup', { method: 'POST', body: {
        email, password: password(body.senha), data: { login, nome }
      } });
      return res.status(200).json({ message: 'Confira seu e-mail para confirmar o cadastro. Depois entre com seu e-mail ou login e senha.' });
    }
    if (req.method === 'POST' && action === 'login') {
      const termo = String(body.login || '').trim();
      const senha = password(body.senha);
      let email = termo;
      if (!termo.includes('@')) {
        const login = loginName(termo);
        const rows = await request(`/rest/v1/profiles?login=eq.${encodeURIComponent(login)}&select=email`, { admin: true });
        // Still call Auth for unknown logins; never expose profile lookup results.
        email = rows?.[0]?.email || 'unknown@invalid.invalid';
      }
      let session;
      try { session = await request('/auth/v1/token?grant_type=password', { method: 'POST', body: { email, password: senha } }); }
      catch (error) {
        if ([400, 401].includes(error.status)) throw new HttpError(401, 'Login ou senha inválidos, ou e-mail ainda não confirmado.');
        throw error;
      }
      const user = { ...publicProfile(await profile(session.user.id)), access: Access.normalize(session.user.app_metadata?.content_access) };
      setSession(res, session);
      return res.status(200).json({ user });
    }
    if (req.method === 'POST' && action === 'logout') {
      let revoked = false;
      try {
        await authenticate(req, res);
        await request('/auth/v1/logout?scope=local', { method: 'POST', token: req.authToken });
        revoked = true;
      } catch { /* Provider downtime must not prevent clearing this browser's credentials. */ }
      finally { setSession(res, null); }
      return res.status(200).json({ ok: true, revoked });
    }
    const identity = await authenticate(req, res);
    if (['community', 'users', 'state', 'catalog', 'profile', 'file-upload', 'file-read', 'storage-status', 'cover-upload'].includes(action) && req.query.account !== identity.id) throw new HttpError(403, 'A conta mudou em outra aba. Recarregue a página antes de continuar.');
    const row = await profile(identity.id);
    row.access = Access.normalize(identity.app_metadata?.content_access);
    if (action === 'community') return res.status(200).json(await communityAction(req.method, body, row));
    if (action === 'users') return res.status(200).json(await usersAction(req.method, body, row, req.query));
    if (action === 'cover-upload' && req.method === 'POST') return res.status(200).json(await uploadCover(body, row));
    if (action === 'cover-read' && req.method === 'GET') {
      res.setHeader('Location', await readCover(req.query.path, row));
      res.status(307); return res.end();
    }
    if (['file-upload', 'file-read', 'storage-status'].includes(action) && req.method === 'POST') return res.status(200).json(await comicsAction(action, body, row));
    if (action === 'session' && req.method === 'GET') return res.status(200).json({ user: { ...publicProfile(row), access: row.access } });
    if (action === 'profile' && req.method === 'PATCH') {
      if (Object.keys(body).some(k => !['nome', 'bio', 'avatar'].includes(k))) throw new HttpError(400, 'Campos de perfil inválidos.');
      const nome = String(body.nome || '').trim();
      const bio = String(body.bio || '');
      const avatar = String(body.avatar || '');
      if (!nome || nome.length > 80 || bio.length > 500 || avatar.length > 150000 || (avatar && !/^(https:\/\/|data:image\/(jpeg|png|webp);base64,)/.test(avatar))) throw new HttpError(400, 'Nome, bio ou avatar inválidos.');
      const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(identity.id)}`, { admin: true, method: 'PATCH', body: { nome, bio, avatar }, prefer: 'return=representation' });
      return res.status(200).json({ user: { ...publicProfile(rows[0]), access: row.access } });
    }
    if (['state', 'catalog'].includes(action)) {
      const catalog = action === 'catalog';
      if (req.method === 'PUT' && catalog && row.role !== 'admin') throw new HttpError(403, 'Somente administradores podem alterar o catálogo.');
      if (req.method === 'GET') {
        const table = catalog ? 'catalog?id=eq.1' : `reader_state?user_id=eq.${encodeURIComponent(identity.id)}`;
        const rows = await request(`/rest/v1/${table}&select=data,revision`, { admin: true });
        const snapshot = rows[0] || { data: {}, revision: 0 };
        return res.status(200).json(catalog ? { ...snapshot, data: Access.filterCatalog(snapshot.data, row.access, row.role) } : snapshot);
      }
      if (req.method === 'PUT') {
        validateState(body.data, catalog);
        if (!Number.isSafeInteger(body.revision) || body.revision < 0) throw new HttpError(400, 'Revisão inválida.');
        const result = await request('/rest/v1/rpc/save_account_data', { admin: true, method: 'POST', body: {
          account_id: identity.id, is_catalog: catalog, expected_revision: body.revision, new_data: body.data
        } });
        if (result === null) throw new HttpError(409, 'Os dados mudaram em outro dispositivo. Baixe suas alterações pendentes antes de carregar a versão da nuvem.');
        return res.status(200).json({ revision: result });
      }
    }
    throw new HttpError(404, 'Operação não encontrada.');
  } catch (error) {
    const status = error instanceof SyntaxError ? 400 : (error.status || 500);
    res.status(status).json({ error: status === 500 ? 'Erro interno. Tente novamente.' : error.message });
  }
}
module.exports = handler;
