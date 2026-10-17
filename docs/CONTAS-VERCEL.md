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
