# Ativar contas na Vercel com Supabase

A aplicação usa Supabase Auth para senhas e sessões, PostgreSQL para os dados e uma função `/api/account` na Vercel. As chaves e os tokens de sessão não ficam no JavaScript público. A sessão usa cookies HttpOnly, SameSite=Lax e Secure em produção. Novos cadastros são leitores; somente o administrador pode criar, editar ou excluir conteúdo do catálogo compartilhado. Leitores podem alterar o próprio nome, bio e foto e manter seu histórico, favoritos, avaliações, finais e preferências.

## 1. Criar o Supabase

1. Crie um projeto Supabase e execute `supabase/schema.sql` uma vez no SQL Editor. O script é transacional: não o execute novamente sobre tabelas já existentes. Ele cria os perfis, o catálogo, os dados privados, a proteção de acesso e o controle de versões.
2. Em Authentication, mantenha o provedor Email habilitado e a confirmação de e-mail ativada. Configure a Site URL com o endereço HTTPS real da aplicação na Vercel e restrinja as URLs de redirecionamento aos domínios usados pelo projeto.
3. Configure SMTP para enviar confirmações aos seus leitores. O remetente padrão do Supabase tem restrições e não é apropriado para cadastro público geral. Ajuste os limites de tentativa de login e envio de e-mail no Supabase.
4. Em Settings → API, obtenha a URL do projeto e as chaves `anon` e `service_role` (JWT legadas). Este código espera essas chaves. Nunca exponha `service_role` no frontend ou em variáveis públicas.

O esquema não concede acesso direto às tabelas para `anon` ou `authenticated`. A função Vercel valida o usuário com o Supabase Auth antes de acessar dados, verifica o papel no banco e usa o ID autenticado, não um ID arbitrário enviado pelo navegador. A função de escrita SQL também verifica a permissão de administrador para o catálogo. O login `eleo7` é reservado tanto na API quanto no banco.

## 2. Configurar a Vercel

Defina em Project Settings → Environment Variables, para os ambientes desejados:

- `SUPABASE_URL`: URL HTTPS do projeto Supabase.
- `SUPABASE_ANON_KEY`: chave anon.
- `SUPABASE_SERVICE_ROLE_KEY`: chave service_role, somente no servidor.

Configure Node.js 22 ou superior. O `vercel.json` usa `npm run build` e publica somente `dist`. As funções em `api/` são executadas pela Vercel. Não configure um deployment somente de arquivos estáticos que ignore essas funções. Não exponha `.env`, SQL, testes ou scripts administrativos como conteúdo estático.

Faça o deployment do código após configurar as variáveis. Não execute o antigo servidor Python para testar login: ele não executa a API.

## 3. Criar o administrador Eleo7

O provisionamento **não acontece automaticamente ao abrir o site**. É uma operação administrativa única, feita fora do navegador. Você precisará de um e-mail real do administrador e da senha escolhida. A senha não está no repositório.

Em uma máquina confiável, configure as três variáveis Supabase no ambiente ou em `.env.local` (ignorado pelo Git). Execute em Bash:

```bash
read -r -p 'E-mail do administrador: ' ADMIN_EMAIL
read -r -s -p 'Senha do administrador: ' ADMIN_PASSWORD
printf '\n'
export ADMIN_EMAIL ADMIN_PASSWORD
node --env-file-if-exists=.env.local scripts/create-admin.js
unset ADMIN_EMAIL ADMIN_PASSWORD
```

Digite a senha solicitada pelo proprietário sem publicá-la em arquivos, logs ou chat. Espaços são significativos: os espaços antes/depois da senha não são removidos. O script cria a conta com um login temporário e, usando a chave administrativa, atribui o login normalizado `eleo7`, nome `Eleo7` e papel `admin`. Isso mantém a reserva do login mesmo quando o Supabase aplica os metadados administrativos depois do gatilho de criação. A entrada aceita `Eleo7` ou `eleo7`. O e-mail é marcado como confirmado por ser provisionado pelo administrador. Se o login já existir, o script para sem redefinir senha ou promover outra conta.

Não salve `ADMIN_PASSWORD` como variável permanente na Vercel. O script precisa dela somente durante a execução. Não use a senha real em testes.

## 4. Verificar após o deployment

1. Entre como Eleo7. Confirme que a Biblioteca oferece edição e exclusão.
2. Cadastre um leitor com outro e-mail, confirme a mensagem recebida e entre com o login exato ou e-mail e senha. Senhas vazias, erradas e nomes aproximados não dão acesso.
3. Salve uma obra como leitor e entre na mesma conta em outro dispositivo. Confirme o favorito e o histórico. A sincronização ocorre após cerca de 600 ms sem novas alterações; aguarde a mensagem de sucesso antes de fechar a página.
4. Confirme que leitores não veem controles de edição/exclusão e que uma tentativa direta de `PUT /api/account?action=catalog&account=<id>` retorna 403 com sessão de leitor.
5. Saia e confirme que dados privados da API deixam de estar acessíveis. A conta de outro leitor deve começar com dados próprios.
6. Faça um recarregamento completo após atualizar a versão antiga do site/PWA, para substituir o service worker antigo.

## Desenvolvimento e testes

```bash
npm ci
npm test
npm run dev
```

`npm run dev` gera `dist` e inicia servidor local na porta 8001, com a mesma API. Copie `.env.example` para `.env.local` e preencha os valores apenas nesse arquivo ignorado. Sem as variáveis, a API retorna 503 e o formulário informa que contas ainda não foram configuradas. Reexecute o build depois de alterar arquivos estáticos.

`npm test` valida autorização, sessões, isolamento de contas e conflitos com respostas Supabase simuladas, além de executar o SQL em PostgreSQL embarcado (PGlite). Com Python Playwright e Chromium disponíveis, inicie o servidor e rode `python3 tests/browser_smoke.py`; esse teste usa API simulada e não exige credenciais. Esses testes não substituem a verificação no projeto Supabase e no deployment reais.

## Dados antigos, conflitos e limites

- Perfis antigos eram locais, não contas verificadas. Cada leitor precisa criar sua conta real e confirmar o e-mail. Em Perfil → Importar dados antigos deste navegador, pode copiar explicitamente histórico, favoritos, avaliações e finais para a conta conectada. Nenhuma senha ou permissão antiga é reaproveitada. O administrador também pode publicar o catálogo antigo do navegador. Dados já existentes na conta têm prioridade. Os dados antigos não são apagados automaticamente.
- Arquivos PDF/CBZ/EPUB/TXT enviados pelo administrador são publicados em um bucket privado `comics` do Supabase Storage, até 500 MB por HQ. Álbuns de imagens são convertidos para CBZ antes do envio. A API entrega URLs temporárias de upload somente ao administrador e URLs de leitura somente para arquivos presentes no catálogo de usuários autenticados. Os binários vão diretamente ao Storage, sem atravessar o limite de corpo das funções Vercel.
- Para criar o bucket em um novo projeto, execute `npm run setup-storage` com as credenciais administrativas configuradas. No Codex com proxy, use `node --use-env-proxy --env-file-if-exists=.env.local scripts/setup-storage.js`. O script preserva buckets existentes e recusa considerar um bucket público como pronto.
- Para HQs anteriores à publicação em nuvem, entre como administrador no navegador onde foram enviadas e clique em **Biblioteca → Publicar HQs já salvas neste navegador**. Os arquivos locais são preservados em caso de erro. Arquivos do IndexedDB anterior às contas ainda precisam ser reenviados. A plataforma não consegue recuperar arquivos que só existem em outro navegador.
- Excluir uma obra remove sua publicação do catálogo; URLs de leitura já emitidas expiram em até uma hora. Os objetos no Storage são retidos para recuperação e precisam de limpeza administrativa quando não forem mais necessários. Não apague um objeto ainda referenciado pelo catálogo. O uso de armazenamento e tráfego segue os limites/plano do seu projeto Supabase.
- Alterações pendentes são mantidas no navegador sob o ID da conta. Falhas de rede ficam visíveis. Há botões para tentar novamente, baixar backup e carregar a versão da nuvem. Se outro dispositivo já alterou os dados, o servidor retorna 409: não sobrescreve silenciosamente. Baixe o backup antes de descartar as alterações pendentes. A importação automática/mesclagem do backup de conflito não foi implementada.
- A sincronização tem limite de 2 MB por documento e 5.000 itens por lista. Catálogos com imagens base64 grandes devem usar URLs de imagens. O backend retorna erro em vez de afirmar que salvou.
- O aplicativo não inclui recuperação/troca de senha por autoatendimento nesta alteração. O proprietário pode administrar credenciais no painel seguro do Supabase. Não há remoção de contas por leitores; editar/excluir conteúdo é reservado ao administrador.


## Ambiente Codex com proxy de rede

Nesta máquina, Node.js 24 precisa usar o proxy fornecido pelo ambiente para acessar o Supabase. Para iniciar a API conectada ao projeto, execute:

```bash
npm run build
node --use-env-proxy --env-file-if-exists=.env.local scripts/dev.js
```

Para provisionar o administrador nesta máquina, use também `--use-env-proxy`:

```bash
node --use-env-proxy --env-file-if-exists=.env.local scripts/create-admin.js
```

O segredo `ADMIN_PASSWORD` pode ser fornecido pelo campo seguro de mesmo nome nas configurações do ambiente Codex, com destino restrito ao projeto Supabase. Após criar e verificar a conta, remova esse segredo temporário nas configurações. Nunca copie os valores de segredos para o repositório. A Vercel não precisa desse segredo administrativo nem dessa configuração de proxy.

HQs acima de 4 MB são divididas em objetos privados de até 4 MB e reunidas em ordem pelo navegador na leitura. O catálogo só recebe a HQ depois do envio de todas as partes. O limite de cada objeto no bucket continua em 50 MB; a cota total do plano não muda. Uma tentativa interrompida preserva a cópia local, mas pode deixar partes órfãs no Storage; a limpeza deve conferir as referências do catálogo antes de remover objetos. Arquivos grandes exigem mais memória do dispositivo durante a leitura.

### Cota e biblioteca local

O orçamento configurado do projeto é `STORAGE_QUOTA_BYTES` (padrão conservador: 1.000.000.000 bytes). Ele não é consultado automaticamente no plano de cobrança: revise-o se mudar de plano ou compartilhar a cota da organização com outros projetos. O painel administrativo avisa aos 80% e a API rejeita um envio se o total projetado ultrapassar 90%. O cálculo lista todos os buckets do projeto, incluindo arquivos órfãos; não mede banco de dados nem tráfego de downloads.

Reservas no diretório privado `comics/quota` impedem que envios simultâneos comprometam o mesmo espaço. O cálculo desconta das reservas as partes já recebidas. Envios interrompidos reservam o restante por até três horas; as partes já recebidas continuam ocupando espaço. Não remova reservas ativas. A criação sem sobrescrita de `quota/upload-lock.json` serializa a verificação e reserva. Se uma função for encerrada antes de liberar esse arquivo, os envios falham de modo seguro: depois de confirmar que nenhuma função de preparação está ativa, um operador pode remover somente esse lock para recuperar os envios. A leitura das HQs existentes não depende do lock ou da cota.

Todos os usuários têm a opção **Guardar HQs apenas neste navegador**, sempre disponível. Os arquivos ficam no IndexedDB separado por conta, sem upload ou publicação no catálogo. Essas importações são excluídas da publicação em lote do administrador. O site solicita armazenamento persistente, mas o navegador pode negar; limpar dados, navegar em modo privado ou ficar sem espaço pode causar perda. Mantenha os arquivos originais como backup. A capacidade local não é ilimitada e as HQs locais não aparecem em outro dispositivo.

### Transferência de HQs entre dispositivos

Em **Biblioteca → Transferir HQs para outro dispositivo**, selecione as HQs que têm arquivos neste navegador e baixe um pacote `.eleohq`. O pacote ZIP contém os binários completos (álbuns de imagens viram CBZ), capas locais e informações descritivas. Não contém conta, senha, sessão, histórico, favoritos ou referências de armazenamento da nuvem. Para HQs que só existem na nuvem, obtenha primeiro o arquivo original no dispositivo; esta função exporta cópias locais.

O destinatário entra na própria conta e usa **Importar pacote de HQs**. A validação de formato, tamanho e SHA-256 ocorre antes de qualquer gravação. Uma transação IndexedDB adiciona todos os arquivos ou nenhum se faltar espaço. Cada HQ recebe um novo identificador local, e pacotes repetidos não duplicam conteúdo anteriormente importado. Nenhum catálogo é publicado e nenhum perfil ou progresso é restaurado. Os nomes de série e herói são preservados como descrições; não se alteram as coleções compartilhadas.

Limite: 200 HQs e 500 MB de arquivos por pacote, além do manifesto. A geração/validação usa memória do navegador; faça pacotes menores em dispositivos com pouca RAM. Guarde o pacote fora do navegador e transfira por arquivo, pendrive ou serviço de sua escolha. A importação local continua sujeita à capacidade do dispositivo. O backup antigo `.eleo/.json` permanece sendo somente de informações; use `.eleohq` para incluir os arquivos.

### Saída da conta com alterações pendentes

Sair tenta salvar os documentos, mas erros de tamanho, conflito ou sincronização não impedem o encerramento da sessão. As alterações pendentes permanecem sob a chave local da conta original para recuperação no próximo acesso. A saída confirmada não dispara o aviso de navegação com alterações pendentes. Se o Supabase estiver indisponível, a API ainda remove os cookies deste navegador; a revogação no provedor é tentada separadamente. Sem conexão com a API do site, a tela informa a falha e permite tentar novamente, sem afirmar que a sessão foi encerrada.

### Catálogo e capas sem imagens embutidas

Antes de sincronizar o catálogo, o cliente extrai imagens `data:image` e envia cada capa diretamente ao bucket privado `comics` usando URLs temporárias autorizadas para o administrador. Capa e banner idênticos reutilizam o envio na sessão. O catálogo passa a guardar referências pequenas em vez de Base64. O limite de segurança de 2 MB do corpo da API permanece; os binários não transitam no JSON de sincronização. As capas entram no cálculo de cota do Storage.

Catálogos antigos e alterações locais pendentes são convertidos no próximo acesso do administrador ou em **Tentar sincronizar**, respeitando a revisão existente. A atualização só é confirmada depois de todas as capas serem enviadas e o banco aceitar a revisão. Não descarte o backup/pendências para migrar. Se houver conflito entre dispositivos, o fluxo de conflito existente continua protegendo as alterações.

A leitura das capas exige sessão válida e uma referência publicada no catálogo; o endpoint redireciona para um endereço assinado de uma hora. Os arquivos continuam privados. O backend não aceita caminhos arbitrários para leitura. A saída da conta continua independente de falhas de sincronização.

### Navegação e origem das HQs

A Biblioteca separa **Na nuvem** (catálogo compartilhado e publicação pelo administrador) de **Neste dispositivo** (arquivos da conta guardados no navegador). As cópias locais de HQs já publicadas também aparecem na aba do dispositivo; o botão Ler dessa aba usa o arquivo local, sem solicitar novo download da nuvem. Isso não representa um modo offline completo: autenticação e bibliotecas auxiliares ainda podem precisar de conexão.

A importação local e os pacotes ficam em **Neste dispositivo**; expanda **Transferir HQs entre dispositivos** para exportar/importar pacotes. As abas aceitam clique e teclado (setas, Home e End). No celular, o cabeçalho tem duas linhas, mantém perfil e busca acessíveis, e o acesso à biblioteca continua no menu inferior.

O administrador pode remover uma cópia na aba **Neste dispositivo** sem excluir a HQ correspondente do catálogo da nuvem. A exclusão do conteúdo compartilhado continua na aba **Na nuvem**.

### Missões de leitura e personalização

Em **Perfil → Missões de leitura**, cada conta escolhe uma meta diária de 5, 10, 20, 30 ou 60 minutos. Nove missões desbloqueiam avatares, molduras e temas do site por tempo acumulado, obras concluídas e dias com a meta cumprida. O layout da biblioteca pode ser confortável ou compacto desde o início. As recompensas são cosméticas e não concedem permissões administrativas.

O contador considera somente os leitores internos, com a página visível e em foco, e pausa depois de 90 segundos sem interação. Uma obra exige pelo menos 60 segundos de leitura ativa e 95% de progresso para contar como concluída, uma única vez por identificador. Links em leitores externos não contam. Os dias seguem America/Sao_Paulo; alterar uma meta já cumprida muda o objetivo dos próximos dias, preservando a conquista de hoje.

O progresso começa nesta atualização, sem converter o histórico antigo em recompensas. Estado e aparência ficam em `reader_state.data.prefs.readingRewards`, com a sincronização e a proteção contra conflitos já existentes. Não há migração SQL. Limpar o histórico não apaga conquistas. Pacotes de HQs não exportam nem importam recompensas; a mesma HQ de um pacote mantém sua identidade de leitura ao ser reimportada. O tema do papel no leitor de texto permanece independente do tema do site.

### Coleção por XP e caçada semanal

O painel do perfil exibe uma caçada de 60 minutos de leitura ativa por semana, de segunda a domingo no horário de Brasília, e a meta diária. O XP soma 10 pontos por minuto, 100 por obra concluída, 50 por meta diária cumprida e 300 por caçada semanal concluída. O bônus semanal é concedido automaticamente durante a leitura e uma única vez por semana; o registro `weeklyWins` preserva os bônus anteriores. O nível avança a cada 1.000 XP.

A coleção oferece 23 opções de moldura (incluindo padrão e recompensas antigas), 10 de avatar, sete de tema e quatro layouts. Molduras e retratos vetoriais são fornecidos pelo próprio aplicativo. Vitrine amplia os cartões; Estante acrescenta prateleiras à biblioteca e aos salvos. Cada item bloqueado informa o XP ou a missão necessários; equipar não gasta XP. Aço e Sentinela estão disponíveis desde o início.

Progresso já registrado nas missões conta para o XP e desbloqueios antigos continuam válidos. A nova galeria usa as mesmas preferências sincronizadas da conta, sem migração SQL. As recompensas são cosméticas e não constituem um ranking competitivo validado pelo servidor. O botão Continuar lendo respeita os universos, categorias e preferências do leitor.

### Organizar HQs em séries em lote

O administrador acessa **Biblioteca → Na nuvem → Organizar várias HQs em uma série**. Pode buscar títulos ou séries atuais, selecionar os resultados e arrastar uma HQ selecionada para um dos destinos. O grupo inteiro é movido. Em telas sensíveis ao toque ou com teclado, escolha a série e use **Mover selecionadas**. Arrastar uma HQ não selecionada move apenas ela.

A operação altera os metadados do catálogo em uma única atualização, sem reenviar arquivos ou modificar histórico, favoritos e recompensas. As novas edições recebem números após o maior número existente no destino, na ordem natural dos títulos. HQs que já estão no destino mantêm seus números. Coleção e herói passam a acompanhar a série de destino. A seleção inclui somente o catálogo compartilhado; arquivos exclusivos do dispositivo não são publicados por esta ação. Leitores não têm acesso ao organizador e a API continua exigindo administrador para alterar o catálogo. Conflitos de sincronização precisam ser resolvidos antes de mover.

O mesmo organizador está disponível em **Neste dispositivo** para o administrador. Nesse modo, a seleção inclui HQs locais que não pertencem ao catálogo compartilhado; cópias de obras já publicadas continuam sendo organizadas em **Na nuvem**. O vínculo com uma série existente é salvo somente no IndexedDB da conta, em uma transação para todo o lote. Nenhum arquivo é enviado e nenhum documento do catálogo ou do perfil é atualizado. A organização permanece neste navegador; limpar seus dados pode apagá-la, portanto mantenha um pacote de backup das HQs.

### Administração de usuários e acesso ao conteúdo

Em **Perfil → Administração de usuários**, somente o administrador consulta nome, login e e-mail, em páginas de 50 contas, e edita nome, bio e perfil de conteúdo. Senhas, hashes, tokens e metadados internos do Auth nunca são retornados ao navegador. A função não altera senha, e-mail, login ou papel administrativo.

Novos usuários e contas sem configuração usam **Padrão**, com todo o conteúdo. **Inicial** permite somente a categoria HQ. **Alternativo** aplica a interseção dos universos e categorias selecionados; por exemplo, Marvel e DC com HQs, ou todos os universos com apenas Mangás. Seleção vazia bloqueia o respectivo grupo. Esses tipos de acesso não concedem direitos de edição/exclusão: o papel `profiles.role` continua separado, e administradores conservam acesso completo.

A política é salva pelo servidor em `auth.users.raw_app_meta_data.content_access` usando a API administrativa do Supabase. Não exige migração SQL. A API confere o perfil e o `app_metadata` atual do usuário autenticado, ignorando `user_metadata` e preferências enviadas pelo leitor. O catálogo e a emissão de URLs assinadas para arquivos/capas aplicam a política. URLs já emitidas continuam válidas até expirar (uma hora); arquivos já baixados não são revogados. Links externos e textos estáticos do aplicativo não se tornam privados: a interface restringe sua navegação/leitura, mas esse controle não é DRM.

A classificação usa `colecao`, `formatoObra`, tipo e formato do arquivo. Cadastre corretamente HQ/Mangá/Lore/História nas obras; PDFs não informam por si só qual categoria contêm. O acervo estático identifica também seu título de mangá Akira. Para perfis restritos, a busca usa apenas obras classificadas da estante, sem resultados externos sem classificação.

Em **Perfil → Universos que quero ver**, o leitor oculta universos dentre os permitidos. A preferência vai para `reader_state.data.prefs.hiddenUniverses`, acompanha a conta e não apaga histórico, favoritos, arquivos ou recompensas, nem amplia permissões. O app verifica a sessão ao retomar a janela e antes de abrir detalhes/leitura; os endpoints de arquivos verificam cada solicitação. Contas em outros dispositivos precisam retomar/recarregar o app para renovar a interface.

### Importação e leitura de CBR/RAR

Os seletores de arquivos locais, importação em lote/arraste e formulário administrativo aceitam `.cbr` e `.rar`. O navegador usa o decodificador UnRAR em WebAssembly, dentro de um Worker separado, para converter o arquivo em CBZ. As imagens são copiadas sem recompressão, recebem nomes seguros e mantêm a ordem natural das páginas (1, 2, 10). A primeira página gera a capa. O CBZ resultante usa o leitor de HQs existente, com progresso, séries e exportação em pacotes `.eleohq`.

Em **Neste dispositivo**, a conversão e a gravação são locais, sem enviar o CBR ou CBZ à nuvem. Na publicação administrativa, somente o CBZ convertido é enviado, usando a mesma cota e divisão de arquivos já existentes. O resultado pode ser maior que o CBR original; a cota não aumenta e o limite publicado continua sendo 500 MB. A primeira carga do decodificador exige conexão; seus arquivos ficam no cache do aplicativo.

Limites da conversão: entrada e saída até 500 MB, conteúdo descompactado total até 500 MB, no máximo 50 MB por arquivo interno e 2.000 páginas. Arquivos com senha e RAR dividido em volumes não são suportados. Conversões que excedem dois minutos são interrompidas. O uso de memória pode limitar arquivos menores em celulares; nesses casos, divida a HQ. O original permanece no dispositivo do usuário, e falhas de conversão não criam uma HQ incompleta.

Dependências fixadas no lockfile: `node-unrar-js` e `esbuild`. O build gera `dist/js/cbr-worker.js`, copia `unrar.wasm` e a licença do wrapper. A licença do UnRAR está em `assets/UNRAR-LICENSE.txt`. O worker contém também JSZip. Os testes de navegador constroem pequenos arquivos RAR4/RAR5 com imagens próprias e verificam o conteúdo, a ordem, a importação local e a publicação como CBZ.

### Importação de pacotes no celular

O seletor de pacotes aceita arquivos sem depender do reconhecimento da extensão `.eleohq` pelo Android/iOS. A validação continua verificando o manifesto, os formatos, os tamanhos e o SHA-256 de cada HQ antes de gravar na conta. Pacotes exportados pelo aplicativo são lidos por partes: diretório ZIP e depois uma HQ por vez, sem carregar uma cópia adicional de todo o pacote na memória. Pacotes recomprimidos com DEFLATE mantêm o caminho compatível via JSZip.

A leitura dispõe de fallback FileReader. Erros de arquivo indisponível, memória e cota têm orientações específicas; uma falha ao atualizar a interface depois de gravar não é apresentada como importação perdida. O seletor não registra uma associação automática no gerenciador de arquivos do sistema: abra Biblioteca → Neste dispositivo → Transferir HQs entre dispositivos → Importar pacote de HQs. Salve primeiro os anexos em Downloads/Arquivos. Pacotes grandes ainda dependem da memória e do espaço do aparelho; prefira lotes pequenos.

Quando o gerenciador do celular mostrar uma pasta com `manifest.json` e `files`, use **Importar pasta descompactada**, selecionando a pasta principal. Como alternativa, **Adicionar manifest.json e arquivos** acumula seleções: escolha o manifesto e depois todos os arquivos de `files`, em qualquer ordem. A seleção permanece somente enquanto o painel estiver aberto e pode ser descartada em **Limpar seleção de arquivos**. Nenhuma HQ é gravada até que todo o pacote seja validado; tamanho, hash, metadados permitidos e proteção contra duplicatas continuam iguais aos da importação `.eleohq`.

### Gestos no leitor de HQ no celular

Toques na arte não mudam a página em telas sensíveis ao toque. Use as setas ou um deslize horizontal rápido com um dedo, sem zoom. Gestos com dois dedos, movimentos verticais, gestos cancelados e arrastos quando o zoom do leitor ou do navegador está ampliado não acionam a navegação. O clique sintetizado depois de um gesto é ignorado, evitando avançar duas páginas. O zoom nativo por pinça é preservado. A navegação por mouse, teclado, setas e o sentido de leitura de mangás continuam disponíveis.

### Comunidade, sugestões e amizades

A aba **Comunidade** no menu inferior oferece conversa geral, sugestões e amizades. Procure leitores pelo prefixo do login (mínimo de três caracteres); a busca retorna somente ID, nome e login, sem e-mail. Pedidos exigem aceitação do destinatário para habilitar o chat privado. Remover ou bloquear uma amizade impede consultar/enviar mensagens privadas até que exista novamente uma amizade aceita. Desbloquear não aceita automaticamente uma amizade. Mensagens de usuários bloqueados são ocultadas também nos canais públicos.

Ativação única: execute **todo o conteúdo** de `supabase/community.sql` no SQL Editor do projeto. O build disponibiliza uma cópia em `/assets/community.sql` e o administrador pode baixá-la em Comunidade → Configuração inicial do banco. O script é transacional e pode ser executado novamente. Não apaga o catálogo, contas ou progresso. Cria `community_friends`, `community_messages`, `community_limits` e as funções de acesso. Antes da ativação, a API informa a pendência em vez de fingir que mensagens foram salvas.

O servidor reutiliza a autenticação HttpOnly e exige correspondência da conta aberta. O RPC recebe a identidade exclusivamente do servidor; tabelas e funções não ficam acessíveis a `anon`/`authenticated`. As verificações de amizade, autoria, bloqueio e administração ocorrem no banco. O administrador modera mensagens públicas e marca sugestões Recebida/Planejada/Concluída; não obtém acesso especial a chats privados. Isso é controle de acesso, não criptografia ponta a ponta.

Mensagens têm até 2.000 caracteres e não aceitam anexos. Cada conta pode enviar até 500 mensagens e 30 pedidos por dia UTC; envios de mensagens têm intervalo mínimo de três segundos. Contadores permanecem mesmo após exclusões. Consultas trazem as 50 mensagens mais recentes e permitem carregar anteriores. A tela atualiza por consulta a cada 15 segundos somente enquanto está aberta e visível; não há notificações push. Rascunhos ficam apenas na memória enquanto a seção está aberta; não há fila de envio offline. Conversas são independentes de `reader_state`, histórico e pacotes de HQs. Ocupam espaço do banco Supabase, não do bucket de arquivos; não há expiração automática.

### Leitor móvel e índice da biblioteca local

Em telas de até 900 px, o botão Opções do leitor abre os controles de modo de leitura, sentido, som, cinema, zoom e tela cheia, com rótulos e áreas de toque maiores. Toque fora para fechar ou use Escape para fechar apenas o painel. Em telas maiores, os controles continuam na barra.

A base IndexedDB de cada conta passa à versão 2. O store `arquivos` conserva os registros e seus bytes; um novo store `metadados` reúne os campos usados pelas listas, presença de arquivo e tamanho. Na primeira abertura, um cursor cria o índice dentro da própria transação de atualização. Gravação, exclusão, importação de pacotes e organização em séries atualizam ambos os stores atomicamente. A listagem consulta somente os metadados. Leitura e exportação buscam os arquivos selecionados, e publicação em lote busca uma HQ por vez. PDFs antigos sem capa não são mais processados automaticamente ao entrar; os fluxos de detalhes/leitura continuam podendo gerar a capa sob demanda.

A biblioteca do dispositivo renderiza 60 cartões por vez, com Mostrar mais; a busca geral continua encontrando todas as obras permitidas registradas. A migração usa espaço para metadados/capas, mas não duplica os arquivos. Se outra aba antiga bloquear a atualização, a interface orienta fechar as outras abas; nunca apague dados do navegador para atualizar.

O arquivo `.vercelignore` inclui explicitamente `supabase/community.sql`, necessário para o build gerar o download de ativação da Comunidade. Os demais arquivos SQL continuam fora do envio.
