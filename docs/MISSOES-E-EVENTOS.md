# Missões e eventos temáticos

A coleção inclui 12 conjuntos inspirados em personagens: Flash, Batman, Homem-Aranha, Mulher-Maravilha, Homem de Ferro, Hulk, Thor, Pantera Negra, Doutor Estranho, Superman, Naruto e Goku. Cada conjunto tem moldura, ícone e tema, com versões permanente e de evento: 72 novos itens e 36 novas missões permanentes, preservando as recompensas anteriores.

Os eventos mudam às segundas-feiras, no horário de Brasília. O ciclo começa com Flash em 19/10/2026 e retorna após 12 semanas. A rotação é automática; criar artes e conjuntos inéditos exige atualizar `js/reward-seasons.js` e, para novos símbolos, `js/reward-art.js`.

- Moldura de evento: 20–40 minutos de leitura ativa durante a semana.
- Ícone de evento: concluir 2–4 obras durante a semana; exige pelo menos 60 segundos na obra e alcançar 95% de progresso.
- Tema de evento: cumprir os dois objetivos e ler ao menos cinco minutos em 2–3 dias da semana.

Obras locais e da nuvem contam, respeitando os acessos da conta. Não é obrigatório possuir obras do personagem. Releituras contam uma vez por obra em cada evento. Progresso anterior ao evento não completa suas metas automaticamente.

As conquistas permanecem nas preferências da conta, inclusive após a mudança de semana. Histórico, perfil e conquistas anteriores são preservados. Não é necessária migração SQL. A contagem cosmética ocorre no cliente e não serve como validação antifraude para competições ou prêmios financeiros.

A galeria permite buscar personagem/nome e filtrar itens desbloqueados, bloqueados ou de evento. Temas alteram as cores do sistema; os layouts existentes continuam disponíveis separadamente.

## Molduras épicas e novidades

Cinco novos estilos inspirados na referência visual: Titã Esmeralda, Tempestade Escarlate, Ceifador Glacial, Armadura Arcana e Guardião Celestial. As artes são vetoriais, com centro transparente, e aparecem tanto na galeria quanto no perfil equipado.

- Desafio épico semanal: 30 minutos de leitura ativa e duas obras concluídas durante a semana. Cada obra exige ao menos um minuto no período e 95% de progresso. Os cinco estilos alternam semanalmente.
- Desafio mensal: duas horas de leitura ativa e oito dias com pelo menos cinco minutos de leitura. São 12 edições com cores próprias, programadas de outubro de 2026 a setembro de 2027, repetindo o ciclo anualmente.
- Conquistas permanecem na conta; o progresso do desafio reinicia no novo período, no horário de Brasília. Tempo anterior à implementação não é convertido retroativamente em progresso épico.

O aviso de novidades aparece ao abrir a conta, com HQs/mangás publicados no catálogo e recompensas novas. Só considera conteúdo permitido e não oculto. Na primeira utilização apresenta o catálogo disponível, sem afirmar que obras antigas acabaram de ser publicadas. Nas seguintes compara os IDs com os já apresentados, sincronizados nas preferências da conta. Renomear uma obra não produz aviso novo. Arquivos privados de outro dispositivo nunca entram no aviso.

Para publicar mais artes inéditas, acrescente opções/estilos em `js/epic-rewards.js` e suas artes em `js/reward-art.js`. A rotação automática usa a coleção programada; não gera ilustrações inéditas indefinidamente. Novos IDs de recompensa entram automaticamente no aviso após publicação (respeitando `release`, quando informada).

### Janela de lançamento das conquistas

Ao abrir a conta, as recompensas recém-lançadas recebem uma janela de destaque com troféu, prévias e acesso ao Perfil. As molduras épicas existentes também apresentam esta janela uma vez na estreia do novo formato, mesmo para quem já viu o aviso antigo.

“Depois”, o X e Escape deixam o lançamento pendente para a próxima abertura. “Não mostrar novamente este lançamento” seguido de fechar, ou “Ver meu perfil”, registra que aquelas recompensas já foram apresentadas. Esse registro acompanha a conta; novas recompensas com outros IDs continuam gerando avisos. As edições mensais só entram após sua data de lançamento. Os avisos de HQs permanecem no painel de novidades, sem repetir as recompensas da janela.

A janela usa diálogo nativo, navegação por teclado, foco contido, restauração de foco e rolagem própria em telas pequenas. Respeita movimento reduzido. Ela anuncia recompensas disponíveis para conquistar, sem conceder itens nem alterar as metas de leitura.
