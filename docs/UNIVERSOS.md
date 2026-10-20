# Universos e subpastas

A navegação inicial reúne Grega, Nórdica, Egípcia, Japonesa, Folclore Brasileiro, Iorubá, Asteca, Hindu e Celta em **Mitologias**. Cada tradição mantém sua própria subpasta, obras e identificadores.

Em **Perfil → Administrar universos e subpastas**, o administrador pode:

- Criar uma pasta de universo, na raiz ou dentro de outra.
- Renomear uma pasta e transferi-la usando o campo **Dentro de**.
- Unificar uma origem com um destino: as coleções e subpastas passam para o destino; a pasta de origem é removida.
- Excluir pastas vazias. Para remover uma pasta com conteúdo, primeiro transfira suas subpastas e unifique suas coleções com outro destino.

Pastas novas começam vazias e recebem conteúdo transferindo outras pastas ou unificando universos existentes nelas. Esta organização não cria uma nova classificação de acesso: as classificações de origem continuam sendo usadas nas permissões e nas preferências de ocultação. Uma pasta com várias classificações mostra somente as obras permitidas para cada conta.

A estrutura é salva em `catalog.data.universes`, pelo fluxo de sincronização do catálogo com revisão e proteção contra conflitos. O servidor aceita alterações somente do administrador e valida ciclos, IDs, duplicatas e preservação de todas as coleções. Nenhuma migração SQL é necessária.

Não são movidos arquivos de Storage ou IndexedDB, nem modificados IDs de obras, histórico, perfis, progresso ou recompensas. O botão de retorno e as migalhas de navegação respeitam os níveis das pastas.
