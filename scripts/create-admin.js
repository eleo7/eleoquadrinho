'use strict';
const { randomUUID } = require('node:crypto');
const { request, password } = require('../server/backend');
(async () => {
  const email = process.env.ADMIN_EMAIL;
  const senha = process.env.ADMIN_PASSWORD;
  if (!email || !senha) throw new Error('Defina ADMIN_EMAIL e ADMIN_PASSWORD apenas no ambiente desta execução.');
  password(senha);
  const existing = await request('/rest/v1/profiles?login=eq.eleo7&select=id', { admin: true });
  if (existing.length) throw new Error('Eleo7 já existe. Nenhuma senha ou permissão foi alterada.');
  // Auth can apply app_metadata after its INSERT trigger. Reserve the final login
  // through the service-only profiles table after the user has been created.
  const bootstrap = 'bootstrap-' + randomUUID().slice(0, 8);
  const created = await request('/auth/v1/admin/users', { admin: true, method: 'POST', body: {
    email, password: senha, email_confirm: true,
    user_metadata: { login: bootstrap, nome: 'Eleo7' }
  } });
  if (!created?.id) throw new Error('Não foi possível confirmar a criação da conta.');
  try {
    const rows = await request(`/rest/v1/profiles?id=eq.${encodeURIComponent(created.id)}&login=eq.${bootstrap}`, {
      admin: true, method: 'PATCH', body: { login: 'eleo7', role: 'admin' }, prefer: 'return=representation'
    });
    if (rows?.length !== 1 || rows[0].role !== 'admin') throw new Error('Perfil administrativo não confirmado.');
    await request(`/auth/v1/admin/users/${encodeURIComponent(created.id)}`, {
      admin: true, method: 'PUT', body: { user_metadata: { login: 'eleo7', nome: 'Eleo7' }, app_metadata: { role: 'admin' } }
    });
  } catch {
    throw new Error('A conta foi criada, mas a configuração administrativa não terminou. Verifique o perfil no painel Supabase antes de executar novamente.');
  }
  console.log('Administrador Eleo7 criado. Entre com Eleo7 e a senha configurada.');
})().catch(error => { console.error(error.message); process.exitCode = 1; });
