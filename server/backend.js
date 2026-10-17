'use strict';

class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
function configuration() {
  const { SUPABASE_URL: url, SUPABASE_ANON_KEY: anon, SUPABASE_SERVICE_ROLE_KEY: service } = process.env;
  if (!url || !anon || !service) throw new HttpError(503, 'Contas ainda não configuradas. Contate o administrador.');
  if (!/^https:\/\/[^/]+\/?$/.test(url)) throw new HttpError(503, 'Configuração de contas inválida.');
  return { url: url.replace(/\/$/, ''), anon, service };
}
async function request(path, { method = 'GET', body, token, admin = false, prefer } = {}) {
  const config = configuration();
  let response;
  try {
    response = await fetch(config.url + path, {
      method,
      headers: {
        apikey: admin ? config.service : config.anon,
        Authorization: `Bearer ${token || (admin ? config.service : config.anon)}`,
        'Content-Type': 'application/json',
        ...(prefer ? { Prefer: prefer } : {})
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: AbortSignal.timeout(15000)
    });
  } catch { throw new HttpError(503, 'Serviço de contas indisponível. Tente novamente.'); }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    // Never return provider payloads, keys or account existence details to clients.
    if (response.status === 429) throw new HttpError(429, 'Muitas tentativas. Aguarde antes de tentar novamente.');
    if (response.status >= 500) throw new HttpError(503, 'Serviço de contas indisponível.');
    throw new HttpError(response.status === 401 || response.status === 403 ? 401 : 400, 'Não foi possível concluir a operação. Confira os dados informados.');
  }
  return data;
}
function loginName(value) {
  const login = String(value || '').trim().toLowerCase();
  if (!/^[a-z0-9_-]{3,32}$/.test(login)) throw new HttpError(400, 'Use um login de 3 a 32 letras, números, _ ou -.');
  return login;
}
function password(value) {
  if (typeof value !== 'string' || value.length < 10 || value.length > 128) throw new HttpError(400, 'A senha deve ter entre 10 e 128 caracteres.');
  return value; // Password whitespace is significant.
}
function publicProfile(row) {
  return { id: row.id, login: row.login, nome: row.nome, bio: row.bio, avatar: row.avatar, role: row.role, criadoEm: row.created_at };
}
module.exports = { HttpError, configuration, request, loginName, password, publicProfile };
