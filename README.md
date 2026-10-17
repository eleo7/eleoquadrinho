# 📖 EleoQuadrinho — Ambiente de Leitura

Ambiente de leitura de alta imersão para HQs, Mangás, Lores e Contos em Português.

## 🚀 Recursos
- **Leitor Nativo**: Suporte a CBZ, PDF, ZIP e imagens com layout em Página Única, Dupla e Rolagem Vertical.
- **Modo Mangá (RTL)**: Inversão de sentido de leitura direita para a esquerda.
- **Efeito Sonoro Acústico**: Simulação de virada de folha de papel sintetizada via Web Audio API.
- **Modo Cinema**: Foco na arte com esmaecimento automático dos controles.
- **Autenticação & Múltiplos Perfis**: Histórico, obras salvas e estatísticas preservados individualmente por leitor.
- **PWA & Offline**: Totalmente instalável no celular e computador via Service Worker.

## 🌐 Deploy na Vercel
Para publicar este projeto na Vercel:

1. **Via GitHub (Recomendado)**:
   - Crie um repositório no seu GitHub e suba este código:
     ```bash
     git init
     git add .
     git commit -m "feat: EleoQuadrinho com login, perfis e leitor imersivo"
     git branch -M main
     git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
     git push -u origin main
     ```
   - No painel da [Vercel](https://vercel.com/), clique em **Add New... > Project**, importe o repositório e clique em **Deploy**.

2. **Via Vercel CLI**:
   ```bash
   npm i -g vercel
   vercel
   ```


## Contas, administrador e sincronização

O login agora depende de Supabase Auth e da API da Vercel. Cadastros são leitores; o administrador `Eleo7` é provisionado por um script seguro. Histórico, favoritos e preferências ficam associados à conta. PDFs, CBZs, EPUBs e textos publicados pelo administrador ficam em armazenamento privado compartilhado com os leitores (até 50 MB por arquivo).

Siga [a configuração de contas na Vercel](docs/CONTAS-VERCEL.md) para criar o banco, configurar as variáveis, provisionar o administrador e validar o deployment. Não inclua senhas ou chaves no código.

Para desenvolvimento: `npm ci`, `npm test` e `npm run dev` (Node.js 22+). O build gera apenas os arquivos públicos em `dist`.
