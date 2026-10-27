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

## Ainda pendente

- Painel para criar e programar eventos e recompensas sem alterar código.
- Transferência em lote entre universos no organizador geral (já existem vinculação no gerenciador de universos e organização por série).
- Orientação de tela do leitor, dependente de suporte do navegador.
