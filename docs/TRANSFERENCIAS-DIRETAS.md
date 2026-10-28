# Solicitações e transferência direta

## Ativação

Execute `supabase/transfers.sql` inteiro no SQL Editor do projeto. Pode executar novamente. A migração cria apenas ofertas, pedidos e uma RPC restrita ao servidor autenticado. Não altera contas, catálogo, histórico nem arquivos existentes. O administrador pode baixar o SQL pelo painel de pedidos.

## Uso

1. Administrador abre **Pedidos → Oferecer HQs deste dispositivo**, seleciona uma HQ ou edições de uma série e publica uma oferta com título. Somente identificação, categoria e a primeira capa são guardadas no Supabase.
2. Leitor vê **Coleções e HQs para solicitar** no Início, toca em uma capa, confere as edições e confirma **Solicitar HQ/série**.
3. O administrador recebe o contador de pedidos no topo (atualização a cada 20 segundos enquanto o site está visível). Pode filtrar os pedidos por leitor. Em **Aceitar e enviar**, abre o pacote no navegador que possui os arquivos e aprova o pedido.
4. Leitor toca em **Receber neste dispositivo**. Ambos mantêm a página aberta. A transferência usa WebRTC com canal ordenado e criptografado; o destinatário confere e importa o pacote atomicamente no IndexedDB.
5. Ao terminar, o pedido aparece como recebido. Repetições de arquivos são ignoradas pelo hash. Perfil, histórico e favoritos não entram no pacote.

Limites: 200 HQs e 500 MB por oferta/pacote, 30 pedidos ativos por leitor, 200 ofertas por administrador. Arquivos grandes exigem memória e espaço disponíveis no navegador. Reiniciar um envio começa o pacote novamente; partes incompletas não são importadas. O servidor não armazena nem retransmite os PDFs. Capas e sinalização ocupam um pequeno espaço no banco.

## Conexão e validação

O recurso usa STUN público para descobrir a rota, sem serviço TURN de retransmissão. Certas redes corporativas, operadoras ou navegadores podem bloquear a conexão direta; nesses casos, tente outra rede ou use o compartilhamento de pacote já existente. Não há notificação push quando o site está fechado. As duas pontas precisam ficar online.

O ambiente Codex bloqueia WebRTC UDP por política do Chromium. Foram validados o banco, permissões e o fluxo completo de solicitação/importação com transporte RTC simulado; uma transferência real entre redes externas ainda precisa ser validada após ativar o SQL.

Também é possível solicitar diretamente nos detalhes de séries e HQs do catálogo compartilhado. O botão funciona mesmo quando as edições só estão no dispositivo do administrador. Sem uma oferta existente, o pedido é encaminhado ao primeiro administrador cadastrado. No envio da série, o sistema busca os arquivos locais pelo identificador da subpasta. Não é necessário executar novamente o SQL para esse fluxo.
