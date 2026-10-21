# Universos e subpastas

A navegação inicial reúne Grega, Nórdica, Egípcia, Japonesa, Folclore Brasileiro, Iorubá, Asteca, Hindu e Celta em **Mitologias**. Cada tradição mantém sua própria subpasta, obras e identificadores.

Em **Perfil → Administrar universos e subpastas**, o administrador pode:

- Criar um universo com classificação própria, na raiz ou dentro de outro.
- Renomear uma pasta e transferi-la usando o campo **Dentro de**.
- Unificar uma origem com um destino: as coleções e subpastas passam para o destino; a pasta de origem é removida.
- Excluir pastas vazias. Para remover uma pasta com conteúdo, primeiro transfira suas subpastas e unifique suas coleções com outro destino.

Depois de salvar, o universo fica selecionado e oferece atalhos para criar personagens, séries/subpastas, HQs e lore/contos. Os formulários abrem com o universo preenchido. Também é possível selecionar várias HQs do catálogo e vinculá-las ao universo: a classificação muda e vínculos com personagens/séries de outro universo são removidos. Os arquivos e IDs das obras são mantidos.

Cada universo novo recebe uma classificação estável `custom-*`, disponível nas permissões do administrador e nas preferências de ocultação dos leitores. Contas padrão veem todos; contas alternativas precisam receber acesso à classificação nova. Unificar pastas preserva as classificações e permissões de origem. Uma pasta com várias classificações mostra somente as obras permitidas para cada conta. Pastas antigas sem classificação passam a receber uma ao usar os atalhos de conteúdo.

A estrutura é salva em `catalog.data.universes`, pelo fluxo de sincronização do catálogo com revisão e proteção contra conflitos. O servidor aceita alterações somente do administrador e valida ciclos, IDs, duplicatas e preservação de todas as coleções. Nenhuma migração SQL é necessária.

Não são movidos arquivos de Storage ou IndexedDB, nem modificados IDs de obras, histórico, perfis, progresso ou recompensas. O botão de retorno e as migalhas de navegação respeitam os níveis das pastas.
