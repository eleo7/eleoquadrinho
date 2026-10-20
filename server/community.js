'use strict';
const { HttpError, request } = require('./backend');
const operations = new Set(['people','friends','request','accept','remove','block','unblock','feed','send','delete','status']);
async function communityAction(method, body, user) {
  if (method !== 'POST') throw new HttpError(405, 'Método não permitido.');
  if (!operations.has(body.operation)) throw new HttpError(400, 'Operação inválida.');
  const payload = body.payload || {};
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) || JSON.stringify(payload).length > 6000) throw new HttpError(400, 'Dados inválidos.');
  try {
    return { data: await request('/rest/v1/rpc/community_action', { method: 'POST', admin: true,
      body: { actor: user.id, operation: body.operation, payload } }) };
  } catch (error) {
    if (error.providerCode === 'PGRST202') throw new HttpError(503, 'A Comunidade aguarda ativação no banco. O administrador precisa executar o script community.sql no Supabase.');
    const messages = { 'Accepted friendship required':'O chat privado exige uma amizade aceita e sem bloqueio.', 'Recipient required':'Somente quem recebeu o pedido pode aceitá-lo.', 'Relationship already exists':'Já existe um pedido ou vínculo com esse usuário.', 'Wait before sending again':'Aguarde 3 segundos antes de enviar outra mensagem.', 'Daily message limit':'Você atingiu o limite de 500 mensagens hoje.', 'Daily request limit':'Você atingiu o limite de 30 pedidos de amizade hoje.', 'Not allowed':'Você não pode excluir essa mensagem.', 'Admin required':'Somente o administrador pode alterar o status da sugestão.' };
    if (messages[error.providerMessage]) throw new HttpError(400, messages[error.providerMessage]);
    if (error.status === 400) throw new HttpError(400, 'Operação não concluída. Confira a amizade e os dados; aguarde alguns segundos entre envios. Se a comunidade ainda não foi ativada, peça ao administrador para configurar o banco.');
    throw error;
  }
}
module.exports = { communityAction };
