# Refinamento da interface e da biblioteca

As bibliotecas da nuvem e do dispositivo usam uma barra comum de busca por título, personagem ou série, filtros de andamento e ordenação por título ou progresso. A ordem original continua disponível. A busca ignora acentos; a ordenação de títulos respeita números (Edição 2 antes de Edição 10).

A grade começa com até 60 cartões e carrega os próximos lotes por solicitação. A busca considera todos os metadados já carregados, inclusive os itens ainda não exibidos. O índice local continua sem carregar os PDFs/CBRs para listar arquivos. As regras de acesso e universos ocultos são aplicadas antes de apresentar resultados. Filtros são mantidos durante a sessão e reiniciados ao carregar outra conta.

O Perfil tem atalhos para missões, recompensas, preferências e administração de universos. Equipar uma recompensa mantém o texto e o filtro da galeria. Foram refinados espaçamentos, estados vazios, controles de toque, navegação inferior em desktop e celular, foco por teclado e áreas seguras da tela.

O destaque automático pausa fora do início, com a página oculta e quando o dispositivo solicita redução de movimento. As capas são decodificadas de forma assíncrona. Animações respeitam a preferência de movimento reduzido.

Validação: projeção/filtros sem mutar o catálogo; biblioteca de 125 itens; navegação e ausência de transbordamento horizontal de 320 a 1440px; preservação dos arquivos locais; leitor por toque e manutenção dos temas, recompensas e permissões.
