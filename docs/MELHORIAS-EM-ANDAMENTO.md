# Melhorias da biblioteca e comunidade

Implementado:
- Continuar lendo no topo, fila Quero ler, coleções pessoais e densidade visual.
- Brilho das páginas, opção de desativar gestos e próxima edição em séries vinculadas.
- Importação em lote com tamanho total e resultados visíveis.
- Aviso de armazenamento local em 80%/90%, separado da cota da nuvem, e atalho de backup.
- Seleção múltipla em Salvos para adicionar a coleções e marcar como lidas. A marcação manual não concede XP; histórico mantém o limite de 80 registros.
- Central de novidades no perfil, acessível após fechar os avisos.
- Denúncias de mensagens públicas, bloqueio no chat e lista de moderação administrativa.

## Ativação das denúncias

Execute o arquivo completo `supabase/community.sql` no SQL Editor do projeto existente. O arquivo também pode ser baixado na Comunidade, em Configuração inicial do banco. A migração é idempotente, mantém mensagens/amizades e bloqueia acesso direto às denúncias. Somente o servidor autenticado pode chamar a RPC. Conversas privadas não são incluídas na lista de denúncias públicas.

Validado em PostgreSQL local (PGlite): migração repetida, denúncia duplicada, restrição administrativa, resolução e impedimento de denunciar conversas privadas por este fluxo.

## Eventos, universos e orientação

- Perfil → Eventos da comunidade → Programar evento: o administrador define título, início/fim (datas inclusivas em Brasília), minutos de leitura ativa e uma recompensa de evento existente (moldura, avatar ou tema). Até 50 eventos no catálogo. O painel não gera novas artes. Cancelar remove o evento, preservando recompensas já conquistadas. Para alterar regras, cancele e crie outro evento com progresso novo.
- O progresso começa com leituras durante a janela de datas, usa os mesmos controles de atividade do leitor e fica nas preferências da conta. Marcar manualmente como lida não soma minutos. Eventos usam o catálogo existente e não precisam de SQL adicional.
- Biblioteca → Organizar HQs em séries e universos: selecione várias HQs, escolha o universo e confirme. Vínculos anteriores com séries/personagens são removidos. A opção está disponível ao administrador tanto no catálogo quanto para HQs exclusivamente locais, sem publicar seus arquivos.
- Leitor → Opções → Orientação: automática, retrato ou paisagem. O navegador pode exigir tela cheia ou não oferecer suporte. Nesse caso, a interface orienta usar a rotação do dispositivo. Fechar o leitor libera o bloqueio.

A ativação da tabela de denúncias no Supabase continua sendo a única etapa externa descrita acima.
