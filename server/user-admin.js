'use strict';
const { request, HttpError, publicProfile } = require('./backend');
const Access = require('../js/content-access');
async function usersAction(method, body, actor, query) {
  if (actor.role !== 'admin') throw new HttpError(403, 'Somente o administrador pode gerenciar usuários.');
  if (method === 'GET') {
    const page = Number(query.page || 1);
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000) throw new HttpError(400, 'Página inválida.');
    const result = await request(`/auth/v1/admin/users?page=${page}&per_page=50`, { admin:true });
    const users = result.users || [];
    const ids = users.map(u=>u.id).filter(id=>/^[a-f0-9-]{36}$/.test(id));
    const profiles = ids.length ? await request(`/rest/v1/profiles?id=in.(${ids.join(',')})&select=id,login,nome,bio,avatar,role,created_at`, {admin:true}) : [];
    return { page, hasMore:users.length===50, users:profiles.map(p=> {
      const user = users.find(u=>u.id===p.id);
      return { ...publicProfile(p), email:user.email || '', access:Access.normalize(user.app_metadata?.content_access) };
    }) };
  }
  if (method !== 'PATCH') throw new HttpError(405, 'Método não permitido.');
  if (Object.keys(body).some(k=>!['id','nome','bio','access'].includes(k)) || !/^[a-f0-9-]{36}$/.test(body.id || '')) throw new HttpError(400, 'Campos inválidos.');
  if (typeof body.nome !== 'string' || !body.nome.trim() || body.nome.length>80 || typeof body.bio !== 'string' || body.bio.length>500) throw new HttpError(400, 'Nome ou bio inválidos.');
  const a=body.access;
  if (!a || !['standard','alternative','initial'].includes(a.mode) || !Array.isArray(a.universes) || !Array.isArray(a.categories) || a.universes.some(x=>!Access.validUniverse(x)) || a.categories.some(x=>!Access.categories.includes(x))) throw new HttpError(400, 'Permissões inválidas.');
  const rows=await request(`/rest/v1/profiles?id=eq.${body.id}&select=*`,{admin:true});
  if (!rows[0]) throw new HttpError(404,'Usuário não encontrado.');
  if (rows[0].role === 'admin' && a.mode !== 'standard') throw new HttpError(400,'O administrador mantém acesso completo.');
  const user=await request(`/auth/v1/admin/users/${body.id}`,{admin:true});
  // Only app_metadata is trusted; editable user_metadata never grants access.
  await request(`/auth/v1/admin/users/${body.id}`,{admin:true,method:'PUT',body:{app_metadata:{...user.app_metadata,content_access:Access.normalize(a)}}});
  const updated=await request(`/rest/v1/profiles?id=eq.${body.id}`,{admin:true,method:'PATCH',body:{nome:body.nome.trim(),bio:body.bio},prefer:'return=representation'});
  return {user:{...publicProfile(updated[0]),email:user.email || '',access:Access.normalize(a)}};
}
module.exports={usersAction};
