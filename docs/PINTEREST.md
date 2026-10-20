# Capas e papéis de parede

Todo universo recebe uma capa: imagem personalizada, capa original ou ilustração local de reserva. O administrador pode informar uma URL HTTPS em Perfil → Administrar universos. Se a imagem remota falhar, a ilustração de reserva continua no fundo.

Cada usuário pode aplicar uma imagem HTTPS em Perfil → Papel de parede do sistema. A escolha é sincronizada nas preferências da conta e pode ser removida para voltar ao tema conquistado. A camada escura preserva a legibilidade. Não são copiados arquivos para o Supabase.

## Conectar Pinterest

A integração usa `GET https://api.pinterest.com/v5/boards/{board_id}/pins`, com um painel previamente selecionado, e não pesquisa irrestrita em todo o Pinterest.

1. Configure um aplicativo em https://developers.pinterest.com/ e obtenha autorização oficial para ler o painel e seus Pins (`boards:read` e `pins:read`). O acesso depende das permissões e da modalidade de acesso aprovadas pelo Pinterest.
2. Na Vercel, em Settings → Environment Variables, adicione `PINTEREST_ACCESS_TOKEN` como segredo de servidor e `PINTEREST_BOARD_ID` com o ID numérico do painel autorizado.
3. Publique novamente e use “Buscar papéis de parede no Pinterest” no Perfil.

Não cole o token no chat, no código ou na URL do navegador. Renove a credencial conforme sua validade; esta versão não implementa renovação OAuth automática. Sem configuração, o sistema informa que a conexão está pendente e mantém o recurso de URL manual funcional.

A consulta retorna até 50 Pins com imagens, mantém cache por cinco minutos e preserva um link para cada Pin. Os arquivos continuam hospedados no Pinterest e podem deixar de estar disponíveis. Use imagens que tenha autorização para utilizar; salvar um Pin não concede licença sobre a imagem.
