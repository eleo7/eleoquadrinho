/* =========================================================
   EleoQuadrinho — Conteúdo e Catálogo Curado (100% em Português)
   - HQs Oficiais do Universo League of Legends (séries + edições únicas)
   - Catálogo de HQs Reais e Completas da Marvel, DC, Vertigo e Clássicos (PT-BR)
   - Regiões de Runeterra mapeadas para a API Universe da Riot
   - Contos de Mitologia, Aventuras Interativas e HQ Interativa Original
   ========================================================= */

/* ---------- Coleções exibidas na estante ---------- */
const COLECOES = [
  { id: 'hqs-lol', nome: 'HQs League of Legends', sub: 'Quadrinhos oficiais da Riot Games e Marvel em português (Lux, Zed, Ashe, Guardiãs Estelares, Sentinelas e mais)', fonte: 'Riot Games · Universe Comics', cor: ['#091c3a', '#e2b049'], emblema: '🗯️' },
  { id: 'cronicas-lol', nome: 'Crônicas de Runeterra', sub: 'Mais de 240 contos, novelas e acontecimentos canônicos do Universo de League of Legends', fonte: 'Riot Games · Universe', cor: ['#0d2438', '#3dd6d0'], emblema: '📜' },
  { id: 'lol', nome: 'Lendas de Runeterra (Lore)', sub: 'Biografias completas, contos ligados e histórias de origem dos 170+ campeões', fonte: 'Riot Games · Universe & Data Dragon', cor: ['#0a1428', '#c89b3c'], emblema: '⚔️' },
  { id: 'marvel', nome: 'HQs da Marvel', sub: 'Edições completas em português: Guerra Civil, Dinastia M, X-Men, Homem-Aranha, Demolidor, Wolverine, Thor e Vingadores', fonte: 'Acervo Digital PT-BR + Enciclopédia', cor: ['#5c0a0a', '#ec1d24'], emblema: 'M' },
  { id: 'dc', nome: 'HQs da DC Comics', sub: 'Edições completas em português: Cavaleiro das Trevas, Reino do Amanhã, Crise nas Infinitas Terras, Batman, Superman, Lanterna Verde e Watchmen', fonte: 'Acervo Digital PT-BR + Enciclopédia', cor: ['#04204a', '#0476f2'], emblema: 'DC' },
  { id: 'runeterra', nome: 'Regiões de Runeterra', sub: 'História, cultura, conflitos e crônicas de Demacia, Noxus, Ionia, Freljord, Shurima e além', fonte: 'Riot Games · Universe', cor: ['#1b2a3a', '#4fb3bf'], emblema: '🗺️' },
  { id: 'originais', nome: 'HQs & Contos Interativos', sub: 'Quadrinhos e aventuras onde suas decisões mudam o rumo da história', fonte: 'EleoQuadrinho Original', capa: 'assets/capas/guardia.jpg', cor: ['#061a3a', '#29c4ff'], emblema: '⚡' },
  { id: 'grega', nome: 'Mitologia Grega', sub: 'Contos épicos dos Deuses do Olimpo, Titãs e Heróis', fonte: 'Contos Completos + Enciclopédia', capa: 'assets/capas/grega.jpg', cor: ['#1d2a4d', '#e0a43a'], emblema: '⚡' },
  { id: 'nordica', nome: 'Mitologia Nórdica', sub: 'Sagas de Asgard, os Nove Mundos, Yggdrasil e o Ragnarök', fonte: 'Contos Completos + Enciclopédia', capa: 'assets/capas/nordica.jpg', cor: ['#0c2a2a', '#5fe3b0'], emblema: 'ᚦ' },
  { id: 'egipcia', nome: 'Mitologia Egípcia', sub: 'A barca de Rá, o trono de Osíris, Ísis e o julgamento no Duat', fonte: 'Contos Completos + Enciclopédia', capa: 'assets/capas/egipcia.jpg', cor: ['#3a2306', '#f2b134'], emblema: '𓂀' },
  { id: 'japonesa', nome: 'Mitologia Japonesa', sub: 'Amaterasu, Susanoo, Yokai e as lendas do Sol Nascente', fonte: 'Contos Completos + Enciclopédia', capa: 'assets/capas/japonesa.jpg', cor: ['#3a0b12', '#ff5a5f'], emblema: '⛩️' },
  { id: 'folclore', nome: 'Folclore Brasileiro', sub: 'Contos da floresta e dos rios: Curupira, Iara, Boitatá, Saci e mitos Tupi-Guarani', fonte: 'Contos Completos + Enciclopédia', capa: 'assets/capas/folclore.jpg', cor: ['#062a14', '#3fd47a'], emblema: '🌿' },
  { id: 'ioruba', nome: 'Mitologia Iorubá', sub: 'Os Orixás, os reinos de Oyó e Ifé e as lendas das águas e do trovão', fonte: 'Contos Completos + Enciclopédia', cor: ['#2a0a2e', '#ffcf3f'], emblema: '🌊' },
  { id: 'asteca', nome: 'Mitologia Asteca', sub: 'A Lenda dos Cinco Sóis, Quetzalcóatl e a descida a Mictlān', fonte: 'Contos Completos + Enciclopédia', cor: ['#0a2a26', '#e8573c'], emblema: '🐍' },
  { id: 'hindu', nome: 'Mitologia Hindu', sub: 'Os épicos Ramayana e Mahabharata, Shiva, Vishnu e os avatares divinos', fonte: 'Contos Completos + Enciclopédia', cor: ['#3a1406', '#ff9f1c'], emblema: 'ॐ' },
  { id: 'celta', nome: 'Mitologia Celta & Arturiana', sub: 'Tuatha Dé Danann, Cú Chulainn, Camelot, Merlin e Excalibur', fonte: 'Contos Completos + Enciclopédia', cor: ['#0d2a12', '#9ad35a'], emblema: '☘️' },
  { id: 'lor', nome: 'Cartas de Runeterra (LoR)', sub: 'Artes completas e textos de ambientação de Legends of Runeterra', fonte: 'Riot Games · Data Dragon LoR', cor: ['#1a0f2e', '#d4a24c'], emblema: '🃏' },
  { id: 'arquivo', nome: 'Vertigo, Mangás & Clássicos', sub: 'Sandman, Hellboy, Invencível, The Walking Dead, Akira, Holy Avenger e mais em PT-BR', fonte: 'Acervo Digital · Internet Archive', cor: ['#1a1a1a', '#f5f5f5'], emblema: '📚' }
];

/* ---------- HQs Oficiais do Universo League of Legends (PT-BR) ---------- */
const HQS_RIOT_SERIES = [
  {
    slug: 'lux', titulo: 'Lux (Marvel & Riot Games)', sub: 'Série completa em 5 edições · Demacia',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/57d1e7d4df30962a4617f613d89a3c7d02fa45de-712x1079.jpg',
    resumo: 'Em Demacia, a magia é proibida. Quando Luxanna Stemmaguarda tenta controlar seus próprios poderes luminosos em segredo, ela acaba atraída até as masmorras dos Caçadores de Magos — e até o prisioneiro mais perigoso do reino: Sylas de Dregbourne.'
  },
  {
    slug: 'zed', titulo: 'Zed (Marvel & Riot Games)', sub: 'Série completa em 6 edições · Ionia',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/e929640c1a137ed2a4c7143b5a69d5bc5e713019-712x1080.jpg',
    resumo: 'Zed, o Mestre das Sombras, é atraído de volta a uma aldeia onde ele e seu antigo irmão de armas, Shen, enfrentaram um assassino brutal no passado: o psicopata artístico Khada Jhin, agora livre novamente.'
  },
  {
    slug: 'ashewarmother', titulo: 'Ashe: Mãe de Guerra (Marvel & Riot Games)', sub: 'Série completa em 4 edições · Freljord',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/a465bfbe8e40b5575ffab64a2232c191a70ae0f1-712x1078.jpg',
    resumo: 'Criada nas terras gélidas de Freljord, a jovem Ashe é enviada pela mãe fanática em busca do lendário trono de Avarosa — uma jornada que mudará seu destino e o de sua irmã de juramento, Sejuani.'
  },
  {
    slug: 'sentinelsoflight', titulo: 'Sentinelas da Luz: Coração Inabalável', sub: 'Série completa em 6 edições · A Ruína',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/7eb65c19df8e0919e96166a50ec7da0ec51153ea-1920x1080.jpg',
    resumo: 'Quando o Rei Destruído Viego retorna espalhando a Névoa Negra por toda Runeterra, Lucian, Senna e Akshan precisam reunir novos Sentinelas da Luz antes que o mundo sucumba à Ruína.'
  },
  {
    slug: 'star-guardian', titulo: 'Guardiãs Estelares: Destinos Cruzados', sub: 'Série completa em 5 edições · Universo Alternativo',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/69b5536c4179110d477bac6676dd808df79d42a1-2400x1320.jpg',
    resumo: 'Determinada a resgatar Rakan da escuridão, Xayah atravessa a galáxia reunindo uma nova equipe de Guardiãs Estelares para enfrentar o caos cósmico.'
  },
  {
    slug: 'kdacomic', titulo: 'K/DA: Harmonias', sub: 'Série completa em 5 edições · Akali, Seraphine, Evelynn, Kai\'Sa e Ahri',
    capa: 'https://cmsassets.rgpub.io/sanity/images/dsfx7636/universe/c70e819a6fd13075f56ca248ee49d800ca63d02d-1920x1080.jpg',
    resumo: 'Os bastidores, sonhos e desafios pessoais de Akali, Seraphine, Evelynn, Kai\'Sa e Ahri enquanto gravam seu novo álbum mundial.'
  }
];

const HQS_RIOT_ONESHOTS = [
  { caminho: 'darius/bloodofnoxus', titulo: 'Darius: Sangue de Noxus', sub: 'HQ Oficial · Noxus · 12 páginas', campeao: 'Darius', resumo: 'Darius, a Mão de Noxus, marcha sobre a cidade rebelde de Basilich ao lado de seu irmão Draven e da jovem capitã Quiletta.' },
  { caminho: 'missfortune/fortune-smiles', titulo: 'Miss Fortune: A Sorte Sorri', sub: 'HQ Oficial · Águas de Sentina · 22 páginas', campeao: 'MissFortune', resumo: 'Sarah Fortune retorna às docas ensanguentadas de Águas de Sentina para derrubar os tenentes remanescentes de Gangplank.' },
  { caminho: 'nami/intotheabyss', titulo: 'Nami: No Abismo', sub: 'HQ Oficial · Marai & Targon · 50 páginas', campeao: 'Nami', resumo: 'Para salvar seu povo submarino da escuridão do Vazio, a jovem Marai Nami mergulha na fenda abissal em busca da pérola sagrada.' },
  { caminho: 'jinx-ziggs/paint-the-town', titulo: 'Ziggs & Jinx: Pintando o Sete', sub: 'HQ Oficial · Piltover & Zaun · 13 páginas', campeao: 'Jinx', resumo: 'O especialista em Hexplosivos Ziggs descobre que a maníaca Jinx tem planos ainda mais barulhentos para as ruas de Piltover e Zaun.' },
  { caminho: 'varus/issue-1', titulo: 'Varus: Almas Gêmeas (Ato I)', sub: 'HQ Oficial · Ionia · 15 páginas', campeao: 'Varus', resumo: 'Durante a invasão noxiana a Ionia, os caçadores Valmar e Kai fazem um sacrifício desesperado no poço do templo de Pallas, despertando o Darkin Varus.' },
  { caminho: 'varus/issue-2', titulo: 'Varus: Vingança (Ato II)', sub: 'HQ Oficial · Ionia · 14 páginas', campeao: 'Varus', resumo: 'Três mentes dividem um único corpo mortal enquanto o arco Darkin de Varus busca retribuição implacável.' },
  { caminho: 'ryze/ryze-comic', titulo: 'Ryze: As Terras em Chamas', sub: 'HQ Oficial · Runeterra · 16 páginas', campeao: 'Ryze', resumo: 'O Mago Rúnico percorre reinos devastados para impedir que as Runas Globais caiam nas mãos da ambição humana.' }
];

/* ---------- HQs Reais e Completas em Português (Marvel, DC e Clássicos via Archive.org) ---------- */
const HQS_ACERVO = {
  marvel: [
    { ident: 'guerra-civil-marvel-deluxe', titulo: 'Guerra Civil — Edição Marvel Deluxe', sub: 'Mark Millar & Steve McNiven · Saga Completa (202 págs.)', resumo: 'Após uma tragédia envolvendo jovens super-heróis em Stamford, o governo aprova a Lei de Registro de Super-Humanos. Homem de Ferro lidera os favoráveis à lei, enquanto o Capitão América comanda a resistência clandestina, dividindo o Universo Marvel ao meio.' },
    { ident: 'dinastia-m-marvel-deluxe', titulo: 'Dinastia M — Edição Marvel Deluxe', sub: 'Brian Michael Bendis & Olivier Coipel · Saga Completa', resumo: 'Quando a Feiticeira Escarlate perde o controle sobre seus poderes de alteração da realidade, Vingadores e X-Men despertam em um mundo governado por Magneto e pela Casa de M — até que três palavras mudam os mutantes para sempre.' },
    { ident: 'x-men-a-saga-da-fenix-negra', titulo: 'X-Men: A Saga da Fênix Negra', sub: 'Chris Claremont & John Byrne · Clássico Absoluto', resumo: 'Corrompida pelo Clube do Inferno e pelo poder cósmico ilimitado da Força Fênix, Jean Grey torna-se a Fênix Negra, forçando os X-Men a lutar pela alma de sua maior aliada diante do Império Shi\'ar.' },
    { ident: 'x-men-dias-de-um-futuro-esquecido_202511', titulo: 'X-Men: Dias de um Futuro Esquecido', sub: 'Chris Claremont & John Byrne · Edição em Português', resumo: 'Em um futuro distópico onde os robôs Sentinelas exterminaram ou aprisionaram os mutantes, a mente de Kitty Pryde é enviada de volta ao passado para impedir o assassinato que desencadeou o apocalipse.' },
    { ident: 'vingadores-vs-x-men-marvel-deluxe', titulo: 'Vingadores vs. X-Men — Marvel Deluxe', sub: 'Bendis, Brubaker, Aaron, Fraction & Romita Jr.', resumo: 'A Força Fênix retorna à Terra em busca de Esperança Summers. Os Vingadores querem protegê-la do poder destrutivo; Ciclope e os X-Men acreditam que a Fênix trará o renascimento mutante.' },
    { ident: 'vingadore-a-queda-marvel-deluxe', titulo: 'Vingadores: A Queda — Marvel Deluxe', sub: 'Brian Michael Bendis & David Finch', resumo: 'O pior dia da história dos Heróis Mais Poderosos da Terra: a Mansão dos Vingadores é destruída, aliados caem um a um e a equipe se desfaz em meio ao caos.' },
    { ident: 'wolverine-arma-x-edicao-de-luxo', titulo: 'Wolverine: Arma X — Edição de Luxo', sub: 'Barry Windsor-Smith · Origem Definitiva', resumo: 'Sequestrado por um programa clandestino do governo, Logan tem seu esqueleto fundido ao metal indestrutível adamantium e sua mente reduzida a uma fera letal.' },
    { ident: 'eu-wolverine', titulo: 'Eu, Wolverine (Saga do Japão)', sub: 'Chris Claremont & Frank Miller · Edição Completa', resumo: 'No Japão, Logan luta pela honra e pelo amor de Mariko Yashida contra o clã ninja Tentáculo e o impiedoso Lorde Shingen.' },
    { ident: 'marvel-deluxe-capitao-america-vol-01-soldado-invernal', titulo: 'Capitão América: O Soldado Invernal (Vols. 1 e 2)', sub: 'Ed Brubaker & Steve Epting · Marvel Deluxe', resumo: 'Steve Rogers descobre que um assassino soviético lendário da Guerra Fria, o Soldado Invernal, é na verdade seu antigo parceiro Bucky Barnes.' },
    { ident: 'demolidor-a-queda-de-murdock', titulo: 'Demolidor: A Queda de Murdock', sub: 'Frank Miller & David Mazzucchelli · Obra-Prima', resumo: 'O Rei do Crime descobre a identidade secreta de Matt Murdock e destrói sistematicamente sua carreira, sua casa e sua sanidade — mas descobre que um homem sem esperança é um homem sem medo.' },
    { ident: 'demolidor-o-homem-sem-medo', titulo: 'Demolidor: O Homem Sem Medo', sub: 'Frank Miller & John Romita Jr. · Origem', resumo: 'A história definitiva da infância de Matt Murdock na Cozinha do Inferno, seu treinamento com Stick e seu primeiro encontro com Elektra e Wilson Fisk.' },
    { ident: 'demolidor-amarelo-jeph-loeb-e-tim-sale', titulo: 'Demolidor: Amarelo', sub: 'Jeph Loeb & Tim Sale · Edição Completa', resumo: 'Através de cartas escritas para seu grande amor perdido, Karen Page, Matt Murdock relembra os primeiros dias vestindo o uniforme amarelo e vermelho do Demolidor.' },
    { ident: 'thor-vol-3-o-cerco-marvel-deluxe', titulo: 'Thor: O Renascer dos Deuses & Em Nome do Pai (Vols. 1 e 2)', sub: 'J. Michael Straczynski & Olivier Coipel · Marvel Deluxe', resumo: 'Após o Ragnarök, Thor retorna do vazio e reconstrói Asgard pairando sobre os campos de Oklahoma, trazendo de volta os deuses nórdicos.' },
    { ident: 'thor-vol-3-o-cerco-marvel-deluxe_202511', titulo: 'Thor: O Cerco & Os Devoradores de Mundos (Vols. 3 e 4)', sub: 'Kieron Gillen, Matt Fraction & Billy Tan · Marvel Deluxe', resumo: 'Norman Osborn lidera um ataque direto contra Asgard no evento O Cerco, levando os deuses à guerra total.' },
    { ident: 'supremos-i-edicao-definitiva-panini', titulo: 'Os Supremos I e II — Edição Definitiva', sub: 'Mark Millar & Bryan Hitch · Panini', resumo: 'A reinvenção cinematográfica dos Vingadores no Universo Ultimate: Nick Fury reúne Homem de Ferro, Capitão América, Thor e Hulk para enfrentar ameaças globais.' },
    { ident: 'marvel-essenciais-homem-de-ferro-os-cinco-pesadelos', titulo: 'Coleção Marvel Essenciais (7 Volumes Completos)', sub: 'Homem de Ferro, Marvels, Guerra Civil, Dinastia M, Demolidor e Quarteto', resumo: 'Pacote especial com 7 encadernados completos em português: Homem de Ferro: Os Cinco Pesadelos, Marvels (Alex Ross), Guerra Civil, Dinastia M, Demolidor: A Queda de Murdock, O Homem Sem Medo e Quarteto Fantástico.' },
    { ident: 'pinkcomics-ultimate-spider-man-2024', titulo: 'Ultimate Homem-Aranha (2024) — 22 Edições', sub: 'Jonathan Hickman & Marco Checchetto · Série em Português', resumo: 'No novo Universo Ultimate, um Peter Parker adulto, casado com Mary Jane e pai de dois filhos, recebe a chance de aceitar o destino que lhe foi roubado e se tornar o Homem-Aranha.' },
    { ident: 'a-historia-do-universo-marvel', titulo: 'A História do Universo Marvel', sub: 'Mark Waid & Javier Rodríguez · Edição Completa', resumo: 'Do Big Bang ao crepúsculo do cosmos: Galactus narra a Franklin Richards todos os grandes acontecimentos cronológicos do Universo Marvel em artes deslumbrantes.' },
    { ident: 'amazing-fantasy-015-1962', titulo: 'Amazing Fantasy #15 (1962) — A Estreia do Homem-Aranha', sub: 'Stan Lee & Steve Ditko · Edição Histórica em Português', resumo: 'A história original onde o jovem Peter Parker é picado por uma aranha radioativa e aprende a lição imortal: com grandes poderes vêm grandes responsabilidades.' },
    { ident: 'x-men-v-1-001-edicao-fac-simile-pt-br', titulo: 'X-Men #1 (1963) — Edição Fac-Símile PT-BR', sub: 'Stan Lee & Jack Kirby · 1ª Aparição dos X-Men e Magneto', resumo: 'A primeira missão de Ciclope, Garota Marvel, Fera, Anjo e Homem de Gelo sob a tutela do Professor Xavier contra Magneto.' },
    { ident: 'vingadores-v-1-001-facsimle', titulo: 'Os Vingadores #1 (1963) — Edição Fac-Símile PT-BR', sub: 'Stan Lee & Jack Kirby · A União dos Heróis', resumo: 'Quando Loki manipula o Incrível Hulk, Thor, Homem de Ferro, Homem-Formiga e Vespa se unem pela primeira vez, dando origem aos Vingadores.' },
    { ident: 'o-incrivel-hulk-v-1-001-fac-simile', titulo: 'O Incrível Hulk #1 (1962) — Edição Fac-Símile PT-BR', sub: 'Stan Lee & Jack Kirby · Origem do Gigante Esmeralda', resumo: 'O Dr. Bruce Banner salva o jovem Rick Jones da explosão da Bomba Gama e se transforma pela primeira vez no monstruoso Hulk.' },
    { ident: 'tales-of-suspense-39-ptbr-facsimile-remasterizado', titulo: 'Tales of Suspense #39 (1963) — Origem do Homem de Ferro', sub: 'Stan Lee, Larry Lieber & Don Heck · PT-BR', resumo: 'Ferido no peito e capturado, o inventor Tony Stark constrói em cativeiro a primeira armadura do Invencível Homem de Ferro.' },
    { ident: 'biblioteca-historica-marvel-quarteto-fantastico-vol.-01', titulo: 'Biblioteca Histórica Marvel: Quarteto Fantástico Vol. 1', sub: 'Stan Lee & Jack Kirby · As Primeiras Histórias', resumo: 'O voo espacial que transformou Reed Richards, Sue Storm, Johnny Storm e Ben Grimm na Primeira Família da Marvel, enfrentando Toupeira, Namor e Doutor Destino.' }
  ],
  dc: [
    { ident: 'cavaleiro-das-trevas-edicao-definitiva', titulo: 'Batman: O Cavaleiro das Trevas — Edição Definitiva', sub: 'Frank Miller, Klaus Janson & Lynn Varley · Obra-Prima Completa', resumo: 'Dez anos após se aposentar, um Bruce Wayne de 55 anos vê Gotham afundar na barbárie da gangue Mutante. Ele veste novamente o manto do morcego, desencadeando um acerto de contas final com o Coringa e com o próprio Superman.' },
    { ident: 'reino-do-amanha-ed.-definitiva-panini', titulo: 'Reino do Amanhã (Kingdom Come) — Edição Definitiva', sub: 'Mark Waid & Alex Ross · Pintada à Mão', resumo: 'Em um futuro onde uma nova geração de meta-humanos violentos substituiu os heróis clássicos, uma catástrofe no Kansas força o retorno de Superman, Mulher-Maravilha e Batman para evitar o Apocalipse.' },
    { ident: 'Watchmen_201906', titulo: 'Watchmen — Edição Completa em Português', sub: 'Alan Moore & Dave Gibbons · 4 Volumes Completos', resumo: 'Em um 1985 alternativo à beira da guerra nuclear, o assassinato do Comediante leva Rorschach, Coruja, Espectral, Ozymandias e o quase divino Dr. Manhattan a desvendar uma conspiração que questiona: quem vigia os vigilantes?' },
    { ident: 'crise-nas-infinitas-terras-edicao-definitiva', titulo: 'Crise nas Infinitas Terras — Edição Definitiva', sub: 'Marv Wolfman & George Pérez · A Maior Saga do Multiverso', resumo: 'O Anti-Monitor destrói universos inteiros com uma onda de antimatéria. Heróis e vilões de todas as Terras e épocas precisam lutar juntos para salvar o que resta da existência.' },
    { ident: 'batman-ano-um_202511', titulo: 'Batman: Ano Um', sub: 'Frank Miller & David Mazzucchelli · A Origem Definitiva', resumo: 'Os primeiros doze meses de Bruce Wayne como vigilante mascarado e a chegada do tenente James Gordon a uma Gotham City dominada pela corrupção policial e pela máfia.' },
    { ident: 'batman-o-longo-dia-das-bruxas-edicao-definitiva', titulo: 'Batman: O Longo Dia das Bruxas — Edição Definitiva', sub: 'Jeph Loeb & Tim Sale · Mistério Noir', resumo: 'Um assassino misterioso conhecido como Feriado executa membros da família mafiosa Falcone a cada data comemorativa, enquanto Batman, Gordon e o promotor Harvey Dent tentam detê-lo antes que Dent perca a própria alma.' },
    { ident: 'batman-asilo-arkham', titulo: 'Batman: Asilo Arkham — Uma Séria Casa em um Sério Mundo', sub: 'Grant Morrison & Dave McKean · Graphic Novel', resumo: 'No Dia da Mentira, os internos liderados pelo Coringa assumem o controle do Asilo Arkham e exigem que Batman entre sozinho na instituição para enfrentar seus próprios demônios psicológicos.' },
    { ident: 'batman-noir-a-corte-das-corujas', titulo: 'Batman: A Corte das Corujas', sub: 'Scott Snyder & Greg Capullo · Edição Completa', resumo: 'Batman descobre que uma sociedade secreta ancestral — a Corte das Corujas — governa Gotham das sombras há séculos e enviou seu assassino imortal, o Garra, para caçá-lo.' },
    { ident: 'AQuedaDoMorcegoCompletaPt-br', titulo: 'Batman: A Queda do Morcego (Saga Completa)', sub: 'Vários Autores · 19 Edições em Português', resumo: 'Bane liberta todos os prisioneiros de Arkham para levar Batman à exaustão física e mental antes de quebrá-lo na Batcaverna — dando início à era de Azrael.' },
    { ident: 'grandes-astros-superman', titulo: 'Grandes Astros: Superman (All-Star Superman)', sub: 'Grant Morrison & Frank Quitely · Edição Completa', resumo: 'Envenenado por uma sobrecarga de radiação solar causada por Lex Luthor, o Homem de Aço tem pouco tempo de vida e decide realizar doze grandes feitos finais para a humanidade e para Lois Lane.' },
    { ident: 'a-morte-do-superman-especial-30-anos', titulo: 'A Morte do Superman — Especial 30 Anos', sub: 'Dan Jurgens & Equipe · Edição Comemorativa', resumo: 'A criatura imparável conhecida como Apocalypse marcha deixando um rastro de destruição até Metrópolis, onde apenas o Superman pode detê-lo em uma batalha até o último suspiro.' },
    { ident: 'super.-homem.-paz.na.-terra.-hq.-br.-09-mai-04.-obiwan.-gibihq', titulo: 'Super-Homem: Paz na Terra', sub: 'Paul Dini & Alex Ross · Graphic Novel', resumo: 'Com todo o seu poder divino, o Superman decide passar um dia tentando acabar com a fome mundial — descobrindo que os maiores obstáculos não são físicos, mas humanos.' },
    { ident: 'batman-guerra-ao-crime-alex-ross', titulo: 'Batman: Guerra ao Crime', sub: 'Paul Dini & Alex Ross · Graphic Novel', resumo: 'Ao encontrar um garoto órfão nas ruas de Gotham que está prestes a seguir o caminho do crime, Batman vê o reflexo de sua própria tragédia.' },
    { ident: 'mulher-maravilha-espirito-da-verdade', titulo: 'Mulher-Maravilha: O Espírito da Verdade', sub: 'Paul Dini & Alex Ross · Graphic Novel', resumo: 'A princesa amazona Diana tenta levar sua mensagem de paz ao mundo dos homens, enfrentando a desconfiança e o medo daqueles que ela jurou proteger.' },
    { ident: 'shazam-o-poder-da-esperanca', titulo: 'Shazam! O Poder da Esperança', sub: 'Paul Dini & Alex Ross · Graphic Novel', resumo: 'Billy Batson usa a sabedoria de Salomão e a força de Hércules para levar esperança às crianças de um hospital infantil.' },
    { ident: 'justica-edicao-definitiva', titulo: 'Justiça (Justice) — Edição Definitiva', sub: 'Alex Ross, Jim Krueger & Doug Braithwaite', resumo: 'Quando os vilões da Legião do Mal têm visões da destruição da Terra e começam a agir como salvadores da humanidade, a Liga da Justiça descobre uma armadilha mortal.' },
    { ident: 'liga-da-justica-a-nova-fronteira-edicao-definitiva', titulo: 'Liga da Justiça: A Nova Fronteira — Edição Definitiva', sub: 'Darwyn Cooke · Obra Premiada', resumo: 'Nos anos 1950, da Guerra Fria à corrida espacial, uma geração de heróis liderada por Hal Jordan, Flash e Caçador de Marte se une pela primeira vez contra a entidade conhecida como O Centro.' },
    { ident: 'dc-deluxe-lanterna-verde-vol-03-a-vinganca-dos-lanternas-verdes_202511', titulo: 'Lanterna Verde por Geoff Johns (3 Volumes DC Deluxe)', sub: 'Renascimento, Sem Medo & A Vingança dos Lanternas Verdes', resumo: 'A fase lendária de Geoff Johns: o retorno triunfal de Hal Jordan como Lanterna Verde, a verdade sobre Parallax e a reconstrução da Tropa dos Lanternas Verdes.' },
    { ident: 'mulher-maravilha-historia-as-amazonas-vol-1', titulo: 'Mulher-Maravilha — História: As Amazonas', sub: 'Kelly Sue DeConnick & Phil Jimenez · DC Black Label', resumo: 'Um épico mitológico monumental narrando o nascimento das sete tribos de Amazonas criadas pelas deusas do Olimpo e a jornada de Hipólita.' },
    { ident: 'absolute-batman-2024', titulo: 'Absolute Batman (2024) — 18 Edições', sub: 'Scott Snyder & Nick Dragotta · Universo Absolute em PT-BR', resumo: 'Sem mansão, sem bilhões, sem mordomo: neste novo universo DC, Bruce Wayne é um engenheiro da classe trabalhadora que enfrenta o crime em Gotham com pura força bruta e engenhosidade.' },
    { ident: 'absolute-wonder-woman-2024', titulo: 'Absolute Mulher-Maravilha (2024) — 16 Edições', sub: 'Kelly Thompson & Hayden Sherman · Universo Absolute em PT-BR', resumo: 'Criada no Submundo por Circe em vez da Ilha Paraíso, a última Amazona Diana empunha feitiçaria e uma espada colossal para salvar os mortais.' },
    { ident: 'detective-comics-27-1a-aparicao-de-batman-1939-dc-comics', titulo: 'Detective Comics #27 (1939) — A 1ª Aparição do Batman', sub: 'Bob Kane & Bill Finger · Edição Histórica em Português', resumo: 'O Caso da Sociedade Química: a revista histórica de maio de 1939 que apresentou o Homem-Morcego ao mundo pela primeira vez.' }
  ],
  arquivo: [
    { ident: 'sandman-edicao-definitiva-vol-01', titulo: 'Sandman — Edição Definitiva (Vols. 1 a 4 + Morte)', sub: 'Neil Gaiman · Vertigo / DC · Obra Completa em Português', resumo: 'Após 70 anos aprisionado por um ritual ocultista, Morfeus — o Senhor dos Sonhos e um dos sete Perpétuos — escapa para reconstruir seu reino do Sonhar. Inclui os volumes definitivos e a edição especial da Morte.' },
    { ident: 'pinkcomics-hellblazer-1988', titulo: 'John Constantine: Hellblazer (Coleção 1988)', sub: 'Jamie Delano, Garth Ennis e outros · Vertigo PT-BR', resumo: 'As histórias clássicas do mago vigarista de sobretudo amarelo John Constantine caminhando pelas sombras ocultas de Londres.' },
    { ident: 'pinkcomics-invencivel-2003', titulo: 'Invencível (Invincible) — Coleção Completa (145 Edições)', sub: 'Robert Kirkman, Cory Walker & Ryan Ottley · PT-BR', resumo: 'Mark Grayson é um adolescente normal — exceto pelo fato de que seu pai é Omni-Man, o super-herói mais poderoso do planeta. Quando seus poderes Viltrumitas despertam, ele descobre a verdade brutal sobre sua herança.' },
    { ident: 'hellboy-omnibus-vol-02-paragens-exoticas', titulo: 'Hellboy Omnibus (Vols. 1 e 2) — Sementes da Destruição', sub: 'Mike Mignola · Edição em Português', resumo: 'Invocado do inferno por ocultistas em 1944 e criado pelo Professor Bruttenholm no B.P.D.P., Hellboy investiga folclores sombrios, monstros antigos e seu próprio destino apocalíptico.' },
    { ident: 'fabulas-vol-20-camelot', titulo: 'Fábulas (Fables) — Coleção Vols. 1 a 22', sub: 'Bill Willingham & Mark Buckingham · Vertigo PT-BR', resumo: 'Expulsos de suas terras natais pelo misterioso Adversário, os personagens dos contos de fadas vivem clandestinamente na Cidade das Fábulas, em Nova York, sob a vigilância do xerife Lobo Mau (Bigby Wolf) e de Branca de Neve.' },
    { ident: 'sin-city-obnibusao_202506', titulo: 'Sin City — Edição Omnibus', sub: 'Frank Miller · Noir em Preto e Branco', resumo: 'Nas ruas corruptas e chuvosas de Basin City, anti-heróis como Marv, Dwight e Hartigan cruzam caminhos de violência, honra e redenção.' },
    { ident: '300-de-esparta', titulo: '300 de Esparta', sub: 'Frank Miller & Lynn Varley · Graphic Novel Completa', resumo: 'O rei Leônidas e trezentos guerreiros espartanos marcham até o desfiladeiro das Termópilas para deter o exército colossal do imperador persa Xerxes.' },
    { ident: 'akira-13-janeiro-1992', titulo: 'Akira — Coleção Completa (38 Edições Editora Globo)', sub: 'Katsuhiro Otomo · Clássico Cyberpunk em Português', resumo: 'Em Neo-Tóquio, reconstruída após a Terceira Guerra Mundial, os jovens motoqueiros Kaneda e Tetsuo se envolvem em um projeto militar secreto que desperta poderes psíquicos capazes de destruir o mundo.' },
    { ident: 'colecaoholyavenger', titulo: 'Holy Avenger — Coleção Completa (50 Edições)', sub: 'Marcelo Cassaro & Érica Awano · Quadrinho Nacional de Fantasia', resumo: 'No mundo de Arton, o jovem Sandro Galtran e a meio-dragoa Lisandra partem em busca dos vinte Rubis da Virtude para ressuscitar o Paladino de Arton.' },
    { ident: 'asterix-v-34-o-aniversario-de-asterix-e-obelix', titulo: 'Asterix & Obelix — Coleção Completa (46 Álbuns em Português)', sub: 'René Goscinny & Albert Uderzo · Clássico Franco-Belga', resumo: 'No ano 50 a.C., toda a Gália foi ocupada pelos romanos... toda? Não! Uma aldeia povoada por irredutíveis gauleses ainda resiste ao invasor graças à poção mágica do druida Panoramix.' },
    { ident: 'the-walking-dead-2003', titulo: 'The Walking Dead — Coleção Completa (193 Edições)', sub: 'Robert Kirkman, Tony Moore & Charlie Adlard · PT-BR', resumo: 'O policial Rick Grimes acorda de um coma em um mundo devastado pelos mortos-vivos e lidera um grupo de sobreviventes em uma jornada onde os vivos são mais perigosos que os mortos.' },
    { ident: 'lucifer-75-hqonline.com.br_202412', titulo: 'Lúcifer — Coleção Completa (75 Edições)', sub: 'Mike Carey · Universo de Sandman (Vertigo PT-BR)', resumo: 'Após entregar as chaves do Inferno a Morfeus em Sandman, Lúcifer Estrela da Manhã busca criar seu próprio cosmos livre da predestinação.' }
  ]
};

/* ---------- Verbetes da Wikipédia (PT) por coleção (apoio enciclopédico) ---------- */
const VERBETES = {
  marvel: ['Homem-Aranha', 'Homem de Ferro', 'Capitão América', 'Thor (Marvel Comics)', 'Hulk', 'Wolverine', 'X-Men', 'Vingadores', 'Pantera Negra (Marvel Comics)', 'Viúva Negra', 'Doutor Estranho', 'Demolidor', 'Deadpool', 'Quarteto Fantástico', 'Thanos', 'Magneto (Marvel Comics)', 'Loki (Marvel Comics)', 'Carol Danvers', 'Motoqueiro Fantasma', 'Justiceiro', 'Feiticeira Escarlate', 'Venom', 'Guardiões da Galáxia', 'Doutor Destino', 'Tempestade (Marvel Comics)', 'Mística', 'Gavião Arqueiro', 'Visão (Marvel Comics)', 'Galactus', 'Surfista Prateado', 'Miles Morales', 'Ciclope (Marvel Comics)', 'Jean Grey', 'Professor X', 'Homem-Formiga', 'Vespa (Marvel Comics)', 'Nick Fury', 'Duende Verde', 'Kang, o Conquistador', 'Ultron'],
  dc: ['Batman', 'Superman', 'Mulher-Maravilha', 'Flash (DC Comics)', 'Lanterna Verde', 'Aquaman', 'Liga da Justiça', 'Coringa (DC Comics)', 'Arlequina', 'Mulher-Gato', 'Robin (DC Comics)', 'Asa Noturna', 'Ciborgue (DC Comics)', 'Shazam (DC Comics)', 'Arqueiro Verde', 'Supergirl', 'Lex Luthor', 'Darkseid', 'Batgirl', 'Besouro Azul', 'John Constantine', 'Jovens Titãs', 'Esquadrão Suicida', 'Ravena (DC Comics)', 'Estelar', 'Mutano', 'Hera Venenosa', 'Duas-Caras', 'Pinguim (DC Comics)', 'Charada (DC Comics)', 'Espantalho (DC Comics)', 'Bane (DC Comics)', 'Lanterna Verde (Hal Jordan)', 'Caçador de Marte', 'Zatanna', 'Sandman (Vertigo)', 'Monstro do Pântano', 'Adão Negro', 'Brainiac', 'Apocalypse (DC Comics)'],
  grega: ['Zeus', 'Hera', 'Poseidon', 'Hades', 'Atena', 'Apolo', 'Ártemis', 'Afrodite', 'Ares', 'Hermes', 'Hefesto', 'Deméter', 'Dionísio', 'Héracles', 'Perseu', 'Aquiles', 'Medusa', 'Prometeu', 'Cronos', 'Odisseu', 'Pandora', 'Minotauro', 'Ícaro', 'Gaia (mitologia)', 'Titãs (mitologia)'],
  nordica: ['Odin', 'Thor', 'Loki', 'Freyja', 'Frigg', 'Balder', 'Tyr', 'Heimdall', 'Hel (mitologia)', 'Fenrir', 'Jörmungandr', 'Yggdrasil', 'Ragnarök', 'Valquíria', 'Sleipnir', 'Asgard', 'Valhala', 'Mjölnir', 'Ymir', 'Huginn e Muninn'],
  egipcia: ['Rá', 'Osíris', 'Ísis', 'Hórus', 'Anúbis', 'Set (mitologia)', 'Tot', 'Bastet', 'Sekhmet', 'Maat', 'Amon', 'Ptá', 'Hator', 'Sobek', 'Néftis', 'Apófis', 'Livro dos Mortos', 'Esfinge', 'Atum', 'Khepri'],
  japonesa: ['Amaterasu', 'Susanoo', 'Tsukuyomi', 'Izanagi', 'Izanami', 'Raijin', 'Fujin', 'Inari (mitologia)', 'Kitsune', 'Yamata no Orochi', 'Tengu', 'Kappa (folclore)', 'Oni (folclore)', 'Yōkai', 'Kusanagi', 'Hachiman', 'Ryūjin', 'Momotarō'],
  folclore: ['Curupira', 'Saci', 'Iara (mitologia)', 'Boitatá', 'Mula sem cabeça', 'Boto-cor-de-rosa (lenda)', 'Cuca', 'Caipora', 'Lobisomem', 'Tupã', 'Jaci', 'Guaraci', 'Mapinguari', 'Negrinho do Pastoreio', 'Vitória-régia (lenda)', 'Boi-bumbá', 'Matinta Pereira', 'Corpo-seco', 'Cabra-cabriola', 'Pisadeira'],
  ioruba: ['Orixá', 'Xangô', 'Iemanjá', 'Oxum', 'Ogum', 'Iansã', 'Exu', 'Oxóssi', 'Oxalá', 'Obaluaiê', 'Nanã', 'Ossaim', 'Oxumaré', 'Olodumarê', 'Ifá', 'Logunedé', 'Obá (orixá)', 'Ewá'],
  asteca: ['Quetzalcóatl', 'Huitzilopochtli', 'Tezcatlipoca', 'Tlaloc', 'Xipe Totec', 'Mictlantecuhtli', 'Coatlicue', 'Chalchiuhtlicue', 'Xochiquetzal', 'Mictlān', 'Tenochtitlán', 'Pedra do Sol', 'Coyolxāuhqui', 'Tonatiuh'],
  hindu: ['Brahma', 'Vishnu', 'Shiva', 'Ganesha', 'Krishna', 'Rama', 'Hanuman', 'Lakshmi', 'Saraswati', 'Parvati', 'Durga', 'Kali', 'Indra', 'Agni', 'Ramayana', 'Mahabharata', 'Bhagavad Gita', 'Garuda', 'Naga'],
  celta: ['Mitologia celta', 'Tuatha Dé Danann', 'Dagda', 'Morrigan', 'Lugh', 'Brígida (deusa)', 'Cú Chulainn', 'Druida', 'Cernuno', 'Danu', 'Banshee', 'Samhain', 'Avalon', 'Rei Artur', 'Merlin', 'Excalibur', 'Fionn mac Cumhaill']
};

/* ---------- Regiões de Runeterra (com slug oficial da API Universe) ---------- */
const REGIOES = [
  { id: 'demacia', uSlug: 'demacia', nome: 'Demacia', cor: '#d9c58a', emblema: '🛡️', resumo: 'Reino orgulhoso de leis rígidas e cavaleiros honrados, cercado por muralhas de pedra petricita que absorve a magia. Seus cidadãos veneram a justiça e a ordem — mas perseguem implacavelmente os magos nascidos entre eles.', campeoes: ['Garen', 'Lux', 'JarvanIV', 'XinZhao', 'Fiora', 'Galio', 'Quinn', 'Shyvana', 'Poppy', 'Lucian', 'Sylas', 'Kayle', 'Morgana', 'Vayne', 'Sona'] },
  { id: 'noxus', uSlug: 'noxus', nome: 'Noxus', cor: '#c0392b', emblema: '🪓', resumo: 'Império expansionista governado pelo Trifarix, onde a força, a visão e a astúcia são as únicas medidas de valor. Qualquer pessoa pode ascender em Noxus se provar seu poder — enquanto a Rosa Negra conspira nas sombras do Bastião Imortal.', campeoes: ['Darius', 'Draven', 'Katarina', 'Swain', 'Leblanc', 'Talon', 'Sion', 'Cassiopeia', 'Riven', 'Samira', 'Mordekaiser', 'Vladimir', 'Kled', 'Briar', 'Ambessa', 'Rell', 'Mel'] },
  { id: 'ionia', uSlug: 'ionia', nome: 'Ionia', cor: '#e88fb0', emblema: '🌸', resumo: 'As Primeiras Terras: um arquipélago de magia selvagem onde o reino espiritual e o mundo material se entrelaçam. A brutal invasão noxiana rompeu a antiga harmonia e dividiu suas províncias entre a tradição e a vingança.', campeoes: ['Ahri', 'Yasuo', 'Yone', 'Irelia', 'Karma', 'Shen', 'Zed', 'Akali', 'Kennen', 'Jhin', 'Xayah', 'Rakan', 'Lillia', 'Sett', 'Syndra', 'MasterYi', 'MonkeyKing', 'Varus', 'Kayn', 'Hwei', 'Ivern', 'LeeSin'] },
  { id: 'freljord', uSlug: 'freljord', nome: 'Freljord', cor: '#8fd3ff', emblema: '❄️', resumo: 'Tundra congelada e implacável onde as tribos Avarosana, Garra do Inverno e Praeglacius disputam o legado das Três Irmãs. Semideuses antigos caminham nas tempestades e os Observadores dormem sob o Gelo Verdadeiro.', campeoes: ['Ashe', 'Sejuani', 'Lissandra', 'Braum', 'Tryndamere', 'Anivia', 'Olaf', 'Volibear', 'Ornn', 'Gnar', 'Nunu', 'Trundle', 'Udyr', 'Gragas'] },
  { id: 'piltover', uSlug: 'piltover', nome: 'Piltover', cor: '#f2c14e', emblema: '⚙️', resumo: 'A Cidade do Progresso: metrópole mercantil erguida sobre os penhascos onde clãs de inventores e mecenas impulsionam a revolução Hextec, unindo magia arcana e engenharia.', campeoes: ['Caitlyn', 'Vi', 'Jayce', 'Heimerdinger', 'Camille', 'Ezreal', 'Orianna', 'Seraphine'] },
  { id: 'zaun', uSlug: 'zaun', nome: 'Zaun', cor: '#4ad66d', emblema: '🧪', resumo: 'A subferia sob os cânions de Piltover: iluminada por vitrais industriais e vapores quimtec, Zaun é governada por Barões da Química, mas pulsa com genialidade rebelde e sobrevivência.', campeoes: ['Jinx', 'Ekko', 'Viktor', 'Singed', 'Warwick', 'Twitch', 'DrMundo', 'Urgot', 'Zac', 'Zeri', 'Renata', 'Blitzcrank', 'Janna'] },
  { id: 'ilhas', uSlug: 'shadow-isles', nome: 'Ilhas das Sombras', cor: '#3fe0c5', emblema: '👻', resumo: 'Outrora as Ilhas Abençoadas, um centro de sabedoria eterna destruído quando o rei Viego tentou ressuscitar sua rainha Isolde. Hoje a Névoa Negra consome tudo e espalha o Tormento pelos mares.', campeoes: ['Thresh', 'Hecarim', 'Kalista', 'Viego', 'Gwen', 'Maokai', 'Yorick', 'Elise', 'Karthus', 'Vex', 'Senna'] },
  { id: 'shurima', uSlug: 'shurima', nome: 'Shurima', cor: '#e6b34a', emblema: '☀️', resumo: 'Império milenar guiado pelo Disco Solar e pelos guerreiros Ascendentes. Traído por Xerath em seu apogeu e sepultado pelas areias por milênios, Shurima despertou novamente com o retorno de Azir.', campeoes: ['Azir', 'Nasus', 'Renekton', 'Sivir', 'Xerath', 'Amumu', 'Rammus', 'Taliyah', 'Skarner', 'KSante', 'Akshan', 'Naafiri', 'Zilean'] },
  { id: 'targon', uSlug: 'mount-targon', nome: 'Monte Targon', cor: '#9b8cff', emblema: '⛰️', resumo: 'A maior montanha de Runeterra toca o reino celestial. Nas suas encostas vivem os Solari e os Lunari em conflito ancestral, enquanto aqueles que sobrevivem à escalada tornam-se receptáculos dos Aspectos.', campeoes: ['Leona', 'Diana', 'Pantheon', 'Taric', 'Soraka', 'AurelionSol', 'Zoe', 'Aphelios'] },
  { id: 'aguas', uSlug: 'bilgewater', nome: 'Águas de Sentina', cor: '#3aa0c9', emblema: '🏴‍☠️', resumo: 'Porto sem lei erguido sobre carcaças de monstros marinhos, onde capitães corsários, arpoadores e sacerdotes da Serpente Mãe disputam ouro, pólvora e vingança.', campeoes: ['MissFortune', 'Gangplank', 'Graves', 'TwistedFate', 'Pyke', 'Nautilus', 'Illaoi', 'Fizz', 'TahmKench', 'Nilah'] },
  { id: 'ixtal', uSlug: 'ixtal', nome: 'Ixtal', cor: '#2bbf8a', emblema: '🌴', resumo: 'Isolada nas selvas profundas do continente oriental desde a Queda de Icathia, a arcologia de Ixaocan preserva a mais pura tradição da magia elemental sob a casta Yun Tal.', campeoes: ['Qiyana', 'Malphite', 'Nidalee', 'Rengar', 'Zyra', 'Neeko', 'Milio'] },
  { id: 'vazio', uSlug: 'void', nome: 'O Vazio', cor: '#b14cff', emblema: '🌀', resumo: 'O nada insaciável que existia antes da criação. Libertado em Icathia há milênios, o Vazio gera horrores que evoluem e consomem matéria, magia e memória.', campeoes: ['KogMaw', 'Chogath', 'Khazix', 'RekSai', 'Velkoz', 'Kassadin', 'Malzahar', 'Kaisa', 'Belveth'] },
  { id: 'bandopolis', uSlug: 'bandle-city', nome: 'Bandópolis', cor: '#ffb86b', emblema: '🍄', resumo: 'Lar encantado dos yordles, situado além do reino material e conectado ao mundo por portais ocultos em raízes, pedras e clareiras.', campeoes: ['Teemo', 'Tristana', 'Lulu', 'Veigar', 'Corki', 'Rumble', 'Yuumi', 'Kennen', 'Ziggs', 'Amumu'] },
  { id: 'runeterra', uSlug: null, nome: 'Andarilhos de Runeterra', cor: '#cccccc', emblema: '🌍', resumo: 'Seres cósmicos, demônios primordiais, Darkin e viajantes solitários cujos passos ecoam por todos os continentes de Runeterra.', campeoes: ['Bard', 'Ryze', 'Jax', 'Kindred', 'Smolder', 'Aatrox', 'Fiddlesticks', 'Evelynn', 'Nocturne', 'Shaco', 'Annie', 'Brand', 'Alistar'] }
];

/* ---------- Utilitário para escrever textos ---------- */
const P = (s) => s.trim().split(/\n\s*\n/).map(x => x.replace(/\s+/g, ' ').trim());

/* ---------- Contos Completos de Mitologia e Histórias Interativas ---------- */
const CONTOS = [
  /* ===== GREGA ===== */
  {
    id: 'prometeu', colecao: 'grega', titulo: 'Prometeu e o Fogo Roubado', sub: 'O titã que desafiou Zeus por amor à humanidade', tempo: 6,
    capitulos: [
      ['O Barro e o Sopro', P(`
        No princípio, quando os titãs haviam sido derrotados e Zeus reinava absoluto no Olimpo, a terra ainda estava vazia de criaturas que soubessem pensar. Foi então que Prometeu, cujo nome significa "aquele que pensa antes", desceu às margens de um rio e moldou figuras de barro à imagem dos deuses.

        Atena, deusa da sabedoria, observou o trabalho com curiosidade. Quando Prometeu terminou, ela soprou sobre as figuras e lhes deu espírito. Assim nasceram os primeiros seres humanos: frágeis, nus, tremendo de frio sob as estrelas.

        Prometeu olhou para suas criaturas e sentiu algo que nenhum titã costumava sentir: compaixão. Eles não tinham garras, nem asas, nem pelos. Como sobreviveriam?`)],
      ['O Truque do Sacrifício', P(`
        Zeus exigiu que os humanos oferecessem aos deuses a melhor parte de seus animais. Prometeu, astuto, preparou duas porções: na primeira, escondeu a carne suculenta sob o couro feio de um boi; na segunda, envolveu os ossos em gordura brilhante.

        "Escolha, grande Zeus", disse o titã. O rei dos deuses escolheu a porção reluzente — e encontrou apenas ossos. Desde então, os homens queimam ossos aos deuses e ficam com a carne.

        Furioso, Zeus decretou: "Que fiquem com a carne, então. Mas jamais terão o fogo para cozinhá-la."`)],
      ['A Centelha', P(`
        Naquela noite, Prometeu subiu ao Olimpo em silêncio. Na forja de Hefesto, onde o fogo divino jamais se apaga, ele acendeu um talo oco de funcho e escondeu a brasa dentro dele.

        Desceu a montanha correndo, enquanto a pequena chama pulsava em suas mãos como um coração. Quando entregou o fogo aos humanos, a escuridão recuou. Eles aprenderam a cozinhar, a forjar o bronze, a afastar as feras e a contar histórias ao redor das fogueiras.

        Do alto, Zeus viu milhares de pequenas luzes acendendo-se pela terra — e soube imediatamente quem o havia traído.`)],
      ['A Rocha do Cáucaso', P(`
        Prometeu foi acorrentado a um rochedo nas montanhas do Cáucaso. Todos os dias, uma águia enviada por Zeus descia para devorar seu fígado. E todas as noites, por ser imortal, o fígado se regenerava — para que o tormento recomeçasse ao amanhecer.

        Passaram-se séculos, até que o herói Héracles, em uma de suas jornadas, encontrou o titã. Com uma única flecha, abateu a águia e quebrou as correntes.

        Dizem que Prometeu nunca se arrependeu. Cada fogueira acesa no mundo, cada lâmpada, cada ideia que ilumina a escuridão, carrega um pouco daquela brasa roubada.`)]
    ]
  },
  {
    id: 'titanomaquia', colecao: 'grega', titulo: 'A Guerra dos Titãs (Titanomaquia)', sub: 'Os dez anos em que o céu e a terra tremeram pelo domínio do cosmos', tempo: 7,
    capitulos: [
      ['A Profecia de Cronos', P(`
        Cronos, o mais jovem dos Titãs, governava o universo desde que destronara seu pai, Urano. Mas uma profecia o assombrava dia e noite: um de seus próprios filhos o derrubaria do trono, assim como ele fizera.

        Para impedir o destino, sempre que sua esposa Reia dava à luz uma criança, Cronos a engolia inteira. Assim desapareceram Héstia, Deméter, Hera, Hades e Poseidon.

        Quando o sexto filho nasceu, porém, Reia escondeu o bebê em uma caverna na ilha de Creta e entregou a Cronos uma pedra envolta em panos. O rei dos Titãs a engoliu sem desconfiar. O menino escondido chamava-se Zeus.`)],
      ['A Libertação dos Irmãos', P(`
        Criado pelas ninfas e alimentado pelo leite da cabra Amalteia, Zeus cresceu forte como a tempestade. Ao atingir a maturidade, disfarçou-se de copeiro no palácio do Monte Ótris e serviu a Cronos uma poção preparada pela oceânide Métis.

        Cronos vomitou primeiro a pedra e, em seguida, todos os cinco filhos que havia devorado, já adultos e sedentos por justiça.

        Zeus e seus irmãos ergueram estandartes no topo do Monte Olimpo. Do outro lado, no Monte Ótris, Cronos reuniu os Titãs: Oceano, Hiperion, Jápeto e o colossal Atlas. Começava a Titanomaquia.`)],
      ['Os Cem Braços e o Raio', P(`
        Por dez anos a guerra devastou o cosmos, sem vencedor. As montanhas rachavam e os mares ferviam. Foi então que Gaia, a Mãe Terra, revelou a Zeus o segredo da vitória: ele precisava descer ao Tártaro, o abismo mais profundo, e libertar os Ciclopes e os Hecatônquiros — gigantes de cem braços e cinquenta cabeças que Cronos mantinha acorrentados.

        Zeus matou a monstruosa carcereira Campe e quebrou os grilhões. Em gratidão, os Ciclopes forjaram três armas supremas: para Zeus, os raios e trovões; para Poseidon, o tridente capaz de sacudir continentes; e para Hades, o elmo da invisibilidade.`)],
      ['A Queda do Monte Ótris', P(`
        No assalto final, Hades infiltrou-se invisível entre as linhas inimigas, Poseidon ergueu maremotos e fez o chão tremer, e Zeus incendiou os céus com uma tempestade de relâmpagos que cegou os Titãs. Enquanto isso, os Hecatônquiros lançavam trezentos rochedos de uma só vez.

        Derrotados, Cronos e os Titãs foram aprisionados no Tártaro sob a guarda dos Hecatônquiros, enquanto Atlas recebeu o castigo eterno de sustentar a abóbada celeste nos ombros. Os três irmãos sortearam o cosmos: Zeus ficou com os céus, Poseidon com os mares e Hades com o Submundo.`)]
    ]
  },
  {
    id: 'perseu-medusa', colecao: 'grega', titulo: 'Perseu e a Cabeça da Medusa', sub: 'O filho de Zeus contra a Górgona cujo olhar transformava homens em pedra', tempo: 6,
    capitulos: [
      ['O Presente Impossível', P(`
        Para proteger sua mãe Dânae do tirânico rei Polidectes, da ilha de Sérifos, o jovem Perseu fez uma promessa precipitada: traria ao rei qualquer presente que ele pedisse — até mesmo a cabeça da Medusa, a única mortal entre as três irmãs Górgonas.

        Polidectes sorriu com malícia e cobrou a palavra. Ninguém jamais voltara vivo do covil das Górgonas: quem olhasse diretamente para o rosto da Medusa, emoldurado por serpentes vivas, transformava-se instantaneamente em estátua de pedra.`)],
      ['Os Presentes dos Deuses', P(`
        Vendo a coragem do jovem, Atena e Hermes desceram para ajudá-lo. Atena entregou-lhe seu escudo de bronze polido como um espelho: "Nunca olhe para ela diretamente; guie sua mão pelo reflexo." Hermes deu-lhe uma foice de adamante capaz de cortar escamas divinas.

        Seguindo o conselho dos deuses, Perseu visitou primeiro as Graias, três irmãs anciãs que dividiam um único olho e um único dente, e obteve delas o caminho para as Ninfas Estígias. Das ninfas recebeu sandálias aladas, a bolsa mágica *kibisis* e o elmo da escuridão de Hades, que tornava invisível quem o usasse.`)],
      ['O Reflexo no Escudo', P(`
        Voando sobre oceanos até os confins do mundo ocidental, Perseu encontrou um jardim silencioso repleto de guerreiros petrificados pela chuva e pelo vento. No centro dormiam as três Górgonas: Esteno, Euríale e Medusa.

        Caminhando de costas e olhando apenas para o reflexo brilhante no escudo de Atena, Perseu aproximou-se sem fazer ruído. Com um único golpe certeiro da foice de Hermes, decepou a cabeça da Medusa antes que suas serpentes pudessem despertar. Do sangue que jorrou ao chão nasceu Pégaso, o cavalo alado.

        Guardando a cabeça na bolsa mágica e usando o elmo invisível para escapar das irmãs imortais, Perseu voou de volta, salvou a princesa Andrômeda de um monstro marinho e petrificou Polidectes e sua corte inteira com um último vislumbre da Górgona.`)]
    ]
  },
  {
    id: 'labirinto', colecao: 'grega', titulo: 'O Labirinto do Minotauro', sub: 'Uma aventura interativa: você é Teseu', tempo: 8, interativa: true,
    inicio: 'a',
    nos: {
      a: { t: P(`Você é Teseu, príncipe de Atenas. A cada nove anos, sete rapazes e sete moças atenienses são enviados a Creta para serem devorados pelo Minotauro, a criatura metade homem, metade touro, aprisionada no Labirinto construído por Dédalo.

        Este ano, você se ofereceu como um dos jovens. Ao desembarcar em Creta, a princesa Ariadne olha para você com atenção. Mais tarde, ela o encontra em segredo e oferece duas coisas: um novelo de linha dourada e uma pequena adaga.`),
        e: [['Aceitar os dois presentes e agradecer a Ariadne', 'b'], ['Recusar: um herói não precisa de ajuda', 'c']] },
      b: { t: P(`"Amarre a ponta da linha na entrada", sussurra Ariadne, "e ela o guiará de volta." Você guarda o novelo e a adaga sob a túnica.

        À meia-noite, os guardas abrem os portões de bronze. O Labirinto exala um cheiro de pedra úmida e ossos antigos. Você amarra a linha a uma coluna e avança na escuridão. Logo, o corredor se divide: à esquerda, um som de respiração pesada; à direita, um leve brilho de tochas.`),
        e: [['Seguir o som da respiração', 'd'], ['Seguir o brilho das tochas', 'e']] },
      c: { t: P(`Ariadne baixa os olhos, magoada. "Então que os deuses o protejam, ateniense."

        No Labirinto, sem a linha, você logo perde a noção do caminho. Horas se passam. Cada corredor parece igual ao anterior. Quando enfim ouve o rugido do Minotauro, já está exausto e sem saber por onde fugir.`),
        e: [['Lutar com as próprias mãos', 'f'], ['Gritar por Ariadne', 'g']] },
      d: { t: P(`A respiração fica mais alta. Você sente o chão tremer. No centro do Labirinto, em uma câmara redonda iluminada por uma fresta no teto, está o Minotauro: enorme, com chifres afiados como lanças e olhos que brilham na penumbra.

        Ele baixa a cabeça e investe!`),
        e: [['Esquivar para o lado e contra-atacar com a adaga', 'h'], ['Tentar falar com a criatura', 'i']] },
      e: { t: P(`As tochas levam a uma sala repleta de ossos e oferendas. Entre eles, você encontra o escudo de um herói antigo. Ao pegá-lo, ouve passos pesados atrás de você. O Minotauro bloqueia a saída.

        Com o escudo erguido, você sente uma nova coragem.`),
        e: [['Usar o escudo para resistir à investida', 'h'], ['Fugir pela linha dourada', 'j']] },
      f: { t: P(`Você luta com bravura, mas o Minotauro é forte demais. Ferido, você consegue escapar por um corredor estreito onde a criatura não cabe. Lá, sozinho na escuridão, você entende que até os maiores heróis precisam de aliados.`), fim: 'Final: A Lição da Humildade', tipoFim: 'ruim' },
      g: { t: P(`Seu grito ecoa pelos corredores. Para sua surpresa, uma linha dourada surge rolando pelo chão — Ariadne, mesmo magoada, havia seguido você até a entrada. Você agarra o fio e volta à luz, vivo, mas sem cumprir sua missão.`), fim: 'Final: Salvo por Ariadne', tipoFim: 'neutro' },
      h: { t: P(`Você desvia no último instante e o Minotauro colide contra a parede de pedra. Atordoado, ele não percebe o seu golpe certeiro. A criatura cai com um último rugido que ecoa por toda Creta.

        Seguindo a linha dourada, você retorna à entrada, onde Ariadne o espera. Juntos, libertam os jovens atenienses e fogem antes do amanhecer. Atenas jamais pagaria aquele tributo novamente.`), fim: 'Final: O Herói de Atenas', tipoFim: 'bom' },
      i: { t: P(`"Eu não vim para te odiar", você diz. O Minotauro para, confuso. Ninguém jamais havia falado com ele. Por um instante, você vê nos olhos da criatura não um monstro, mas um prisioneiro abandonado pelo próprio pai, o rei Minos.

        Você não o mata. Em vez disso, guia o Minotauro pela linha dourada até a saída, e ele desaparece nas montanhas de Creta, livre pela primeira vez. Os jovens atenienses são salvos — e uma nova lenda nasce.`), fim: 'Final Secreto: Coração de Herói', tipoFim: 'secreto' },
      j: { t: P(`Você corre seguindo a linha, com o Minotauro em seu encalço. Na saída, Ariadne corta o fio e fecha os portões de bronze. A criatura fica presa para sempre em seu Labirinto. Você sobreviveu — mas o tributo continuará até que outro herói tenha coragem de enfrentá-lo.`), fim: 'Final: A Fuga', tipoFim: 'neutro' }
    }
  },
  {
    id: 'orfeu', colecao: 'grega', titulo: 'Orfeu e Eurídice', sub: 'A canção que comoveu o Mundo dos Mortos', tempo: 5,
    capitulos: [
      ['A Lira de Orfeu', P(`
        Dizia-se que, quando Orfeu tocava sua lira, os rios paravam para ouvir, as árvores se inclinavam e até as pedras choravam. Filho da musa Calíope, ele era o maior músico que o mundo já conhecera.

        Orfeu amava Eurídice, uma ninfa de riso fácil. No dia de seu casamento, enquanto ela dançava pelos campos, uma serpente escondida na relva picou seu tornozelo. Eurídice caiu, e sua alma desceu ao reino de Hades.`)],
      ['A Descida', P(`
        Desesperado, Orfeu fez o que nenhum vivo ousava: desceu ao Mundo dos Mortos. Com sua música, acalmou Cérbero, o cão de três cabeças, e convenceu Caronte a levá-lo pelo rio Estige.

        Diante do trono de Hades e Perséfone, Orfeu tocou a canção mais triste já composta. Os espíritos pararam de vagar. Pela primeira vez, lágrimas rolaram pelo rosto do senhor dos mortos.`)],
      ['O Último Olhar', P(`
        "Leve-a", disse Hades. "Mas com uma condição: ela o seguirá, e você não poderá olhar para trás até que ambos estejam sob a luz do sol."

        Orfeu subiu pelo caminho escuro, ouvindo apenas os próprios passos. A dúvida o corroía: e se ela não estivesse ali? E se fosse um truque? Quando avistou a luz da superfície, a apenas um passo do mundo dos vivos, ele se virou.

        Eurídice estava lá — e, no mesmo instante, desapareceu como fumaça, sussurrando um último adeus. Orfeu passou o resto de seus dias cantando seu amor perdido, e sua lira foi transformada pelos deuses em uma constelação.`)]
    ]
  },

  /* ===== NÓRDICA ===== */
  {
    id: 'nove-mundos', colecao: 'nordica', titulo: 'A Criação dos Nove Mundos', sub: 'Do abismo Ginnungagap à árvore Yggdrasil', tempo: 6,
    capitulos: [
      ['O Abismo', P(`
        Antes de tudo, havia apenas Ginnungagap, o grande abismo vazio. Ao norte, ficava Niflheim, a terra da névoa e do gelo. Ao sul, Muspelheim, o reino do fogo, guardado pelo gigante Surt com sua espada flamejante.

        Onde o gelo encontrou o fogo, as gotas derretidas ganharam vida. Delas nasceu Ymir, o primeiro gigante, e a vaca Audhumla, que o alimentava com seu leite.`)],
      ['Odin e Seus Irmãos', P(`
        Audhumla lambia blocos de gelo salgado, e deles surgiu Buri, o avô dos deuses. Seu neto Odin, junto com os irmãos Vili e Vé, cresceu vendo a crueldade de Ymir e dos gigantes.

        Os três irmãos derrotaram Ymir. De sua carne fizeram a terra; de seu sangue, os mares; de seus ossos, as montanhas; de seu crânio, o céu, sustentado por quatro anões nos quatro cantos do mundo. As faíscas de Muspelheim tornaram-se as estrelas.`)],
      ['A Árvore do Mundo', P(`
        No centro de tudo ergueu-se Yggdrasil, o freixo colossal cujas raízes e galhos sustentam os nove mundos: Asgard, dos deuses Aesir; Vanaheim, dos Vanir; Midgard, dos humanos; Jotunheim, dos gigantes; Alfheim, dos elfos luminosos; Svartalfheim, dos anões; Niflheim; Muspelheim; e Helheim, o reino dos mortos.

        Caminhando pela praia, Odin e seus irmãos encontraram dois troncos. Deles criaram Ask e Embla, o primeiro homem e a primeira mulher. Para protegê-los, ergueram uma muralha feita das sobrancelhas de Ymir: Midgard, a "terra do meio". E a ponte de arco-íris Bifrost passou a ligar a terra dos homens ao lar dos deuses.`)]
    ]
  },
  {
    id: 'morte-balder', colecao: 'nordica', titulo: 'A Morte de Balder e o Castigo de Loki', sub: 'O ramo de visco que deu início à contagem regressiva para o Ragnarök', tempo: 6,
    capitulos: [
      ['O Juramento de Todas as Coisas', P(`
        Balder, o mais belo e amado entre os deuses de Asgard, começou a ter pesadelos sombrios anunciando sua própria morte. Aflita, sua mãe Frigg percorreu os nove mundos e exigiu um juramento solene de todas as coisas que existiam: o fogo, a água, o ferro, as pedras, as árvores, as feras e os venenos prometeram jamais ferir Balder.

        Apenas uma pequena planta, o visco que crescia a oeste de Valhala, pareceu jovem e inofensiva demais para que Frigg lhe pedisse juramento.

        Sentindo-se invulnerável, Balder passou a entreter os deuses no salão: eles lançavam lanças, machados e pedras contra ele, e tudo ricocheteava sem lhe causar um único arranhão.`)],
      ['A Flecha de Visco', P(`
        Apenas Loki sentiu inveja daquela glória. Disfarçado de uma velha mulher, conversou com Frigg e descobriu o segredo do visco.

        Imediatamente, Loki colheu um ramo da planta, talhou-o como um dardo e aproximou-se de Hod, o irmão cego de Balder, que permanecia afastado da brincadeira por não enxergar. "Honre seu irmão como os outros", sussurrou Loki, guiando a mão de Hod.

        O dardo de visco voou certeiro, atravessou o peito de Balder e o deus da luz caiu sem vida no chão de Asgard. O silêncio que se seguiu foi o maior choque que os nove mundos já sentiram.`)],
      ['A Giganta que Não Chorou', P(`
        Hermod cavalga por nove noites até Helheim para implorar a Hel que devolva Balder. A senhora dos mortos impôs uma condição: "Se todas as coisas do mundo, vivas ou sem vida, chorarem por Balder, ele voltará para os Aesir. Se uma só recusar, ficará comigo."

        Os mensageiros percorreram o mundo, e tudo chorou: homens, animais, árvores e até as rochas suaram lágrimas. Apenas uma giganta chamada Thökk, sentada em uma caverna escura, recusou: "Que Hel guarde o que tem; Balder nunca me serviu em vida." Thökk era o próprio Loki disfarçado.

        Quando os deuses descobriram a traição, capturaram Loki e o acorrentaram a três rochas pontiagudas nas profundezas da terra, com uma serpente gotejando veneno sobre seu rosto até o dia do Ragnarök.`)]
    ]
  },
  {
    id: 'martelo', colecao: 'nordica', titulo: 'O Martelo Roubado de Thor', sub: 'Quando o deus do trovão precisou se vestir de noiva', tempo: 5,
    capitulos: [
      ['O Despertar Sem Mjölnir', P(`
        Thor acordou certa manhã e tateou ao lado da cama: Mjölnir, seu martelo, havia sumido. Seu rugido fez tremer os salões de Asgard. Sem o martelo, os deuses estariam indefesos contra os gigantes.

        Loki, com o manto de penas de falcão de Freyja, voou até Jotunheim e descobriu o culpado: Thrym, o rei dos gigantes, que escondera o martelo oito léguas sob a terra. "Só o devolvo", disse Thrym, "se Freyja se casar comigo."`)],
      ['O Plano de Heimdall', P(`
        Freyja ficou tão furiosa que seu colar Brísingamen se partiu. Ela jamais se casaria com um gigante. Foi então que Heimdall teve uma ideia: "Vistamos Thor de noiva."

        Thor protestou, mas não havia escolha. Colocaram nele o vestido nupcial, o véu, as joias e o colar de Freyja. Loki se disfarçou de dama de companhia. E assim partiram para Jotunheim, na carruagem puxada por bodes.`)],
      ['O Banquete', P(`
        No banquete, a "noiva" devorou um boi inteiro, oito salmões e três barris de hidromel. Thrym estranhou. "Ela não comeu por oito noites, de tanta ansiedade", explicou Loki rapidamente.

        Quando Thrym ergueu o véu para beijá-la, recuou ao ver os olhos flamejantes. "Ela não dormiu por oito noites", disse Loki de novo. Por fim, Thrym ordenou que trouxessem o martelo para abençoar a noiva. Assim que Mjölnir tocou seu colo, Thor arrancou o véu, ergueu o martelo e o trovão voltou a ecoar sobre Jotunheim.`)]
    ]
  },
  {
    id: 'ragnarok', colecao: 'nordica', titulo: 'Ragnarök: O Crepúsculo dos Deuses', sub: 'O fim — e o recomeço — de todas as coisas', tempo: 6,
    capitulos: [
      ['O Inverno dos Invernos', P(`
        Primeiro virá o Fimbulvetr: três invernos seguidos, sem verão entre eles. Irmãos lutarão contra irmãos, e os laços entre as pessoas se romperão. Os lobos Sköll e Hati finalmente alcançarão o Sol e a Lua, e o mundo mergulhará na escuridão.

        A terra tremerá. As correntes que prendem Fenrir, o grande lobo, se partirão. Loki se libertará de sua prisão e conduzirá o navio Naglfar, feito das unhas dos mortos.`)],
      ['A Batalha Final', P(`
        Heimdall soprará a trombeta Gjallarhorn, chamando os deuses para a última batalha nos campos de Vigrid. Odin, à frente dos einherjar de Valhala, enfrentará Fenrir — e será devorado. Seu filho Vidar vingará o pai, rasgando as mandíbulas do lobo.

        Thor enfrentará Jörmungandr, a Serpente do Mundo. Com Mjölnir, esmagará sua cabeça, mas dará apenas nove passos antes de cair, envenenado. Heimdall e Loki se destruirão mutuamente. E Surt incendiará os nove mundos com sua espada de fogo.`)],
      ['O Novo Mundo', P(`
        Tudo afundará no mar. Mas, depois do silêncio, a terra ressurgirá das águas, verde e fértil. Balder e Hod voltarão do reino dos mortos. Os filhos de Thor, Modi e Magni, herdarão Mjölnir.

        E, escondidos no tronco de Yggdrasil, dois humanos — Líf e Lífthrasir — terão sobrevivido. Deles nascerá uma nova humanidade, sob um novo sol, filha do antigo. Porque, para os nórdicos, nenhum fim é realmente o fim.`)]
    ]
  },

  /* ===== EGÍPCIA ===== */
  {
    id: 'osiris', colecao: 'egipcia', titulo: 'Osíris, Ísis e a Traição de Set', sub: 'O mito que explica a vida, a morte e o renascimento', tempo: 6,
    capitulos: [
      ['O Rei Bom', P(`
        Osíris governava o Egito com sabedoria. Ensinou aos homens a agricultura, as leis e o culto aos deuses. Ao seu lado estava Ísis, sua esposa, a maior feiticeira do mundo. Mas seu irmão Set, senhor do deserto e das tempestades, ardia de inveja.

        Set mandou construir um sarcófago magnífico, feito exatamente nas medidas de Osíris. Durante um banquete, anunciou: "Quem couber perfeitamente neste baú poderá ficar com ele."`)],
      ['O Sarcófago no Nilo', P(`
        Um a um, os convidados tentaram — e ninguém coube. Quando Osíris se deitou, Set e seus cúmplices fecharam a tampa, selaram-na com chumbo derretido e lançaram o sarcófago ao Nilo.

        Ísis vagou pelo mundo procurando o marido. Encontrou o sarcófago preso no tronco de uma árvore, em Biblos, e o trouxe de volta. Mas Set descobriu, despedaçou o corpo de Osíris em catorze partes e as espalhou por todo o Egito.`)],
      ['O Primeiro Renascimento', P(`
        Com a ajuda de sua irmã Néftis e de Anúbis, Ísis recolheu cada parte do corpo. Anúbis enfaixou Osíris em linho — criando a primeira múmia — e Ísis, transformada em pássaro, soprou vida nele com suas asas.

        Osíris despertou, mas já não pertencia ao mundo dos vivos. Tornou-se o senhor do Duat, o reino dos mortos, onde julga as almas. Antes de partir, porém, concebeu com Ísis um filho: Hórus, o deus-falcão, que um dia enfrentaria Set para recuperar o trono do Egito.`)]
    ]
  },
  {
    id: 'julgamento', colecao: 'egipcia', titulo: 'O Julgamento de Anúbis', sub: 'Interativa: atravesse o Duat e salve sua alma', tempo: 6, interativa: true,
    inicio: 'a',
    nos: {
      a: { t: P(`Você abre os olhos em um barco de juncos deslizando por um rio negro. As estrelas brilham abaixo da água. Você entende: morreu, e sua alma — o ba — chegou ao Duat, o mundo dos mortos.

        Na margem, duas figuras esperam. Uma serpente gigantesca de escamas avermelhadas sibila seu nome. Do outro lado, um babuíno sábio segura um rolo de papiro.`),
        e: [['Ir até o babuíno com o papiro', 'b'], ['Enfrentar a serpente', 'c']] },
      b: { t: P(`"Sou um servo de Tot", diz o babuíno. "Este é o Livro dos Mortos. Contém os feitiços e as palavras que você precisará dizer diante dos 42 juízes." Ele entrega o papiro. Com ele, você atravessa os portões guardados por demônios com facas, recitando os nomes secretos de cada um.

        Enfim, chega ao Salão das Duas Verdades.`),
        e: [['Entrar no salão', 'd']] },
      c: { t: P(`A serpente é Apófis, o inimigo de Rá, a encarnação do caos. Seus olhos hipnotizam você. Antes que ele dê o bote, uma luz dourada corta a escuridão: é a barca solar de Rá, que atravessa o Duat todas as noites. Seth, de pé na proa, crava sua lança em Apófis.

        "Corra, alma!", grita. Você corre até o Salão das Duas Verdades.`),
        e: [['Entrar no salão', 'd']] },
      d: { t: P(`No centro do salão há uma grande balança. Anúbis, com sua cabeça de chacal, segura seu coração em uma mão. Na outra, a pena de Maat, deusa da verdade e da justiça. Tot está pronto para registrar o resultado, e ao lado, a devoradora Ammit — parte crocodilo, parte leão, parte hipopótamo — aguarda faminta.

        "Declare sua inocência", diz Anúbis.`),
        e: [['Dizer a verdade, admitindo seus erros', 'e'], ['Afirmar que nunca errou em nada', 'f']] },
      e: { t: P(`Você fala dos seus erros e de como tentou repará-los. Fala de quem ajudou e de quem amou. Anúbis coloca o coração na balança... e ela se equilibra perfeitamente com a pena de Maat.

        Osíris ergue-se do trono. "Seu coração é leve. Entre no Campo de Juncos." Você caminha para um paraíso de rios cristalinos e trigais dourados, onde viverá para sempre.`), fim: 'Final: O Coração Leve', tipoFim: 'bom' },
      f: { t: P(`"Nunca menti, nunca roubei, nunca feri ninguém!" — e, ao dizer isso, sente o coração pesar. A balança desce lentamente. Ammit lambe os beiços.

        Mas antes que ela avance, Ísis intervém: "Dê a ele outra chance de aprender." Sua alma é enviada de volta ao rio negro, para recomeçar a jornada.`), fim: 'Final: A Segunda Chance', tipoFim: 'neutro' }
    }
  },
  {
    id: 'ra', colecao: 'egipcia', titulo: 'A Jornada Noturna de Rá', sub: 'Todas as noites, o Sol luta para renascer', tempo: 4,
    capitulos: [
      ['A Barca dos Milhões de Anos', P(`
        Durante o dia, Rá atravessa o céu em sua barca solar, a Mandjet, iluminando o Egito. Mas, ao entardecer, ele envelhece. Quando o sol se põe no horizonte ocidental, Rá entra no Duat a bordo de outra barca, a Mesektet.

        São doze horas de noite, e cada hora é um portão a ser atravessado. Deuses o acompanham: Tot com sua sabedoria, Ísis com sua magia, e o feroz Set, que nessa jornada é seu protetor.`)],
      ['O Caos e a Aurora', P(`
        Na sétima hora, surge Apófis, a serpente gigante do caos, que tenta engolir a barca e mergulhar o universo na escuridão eterna. Set a enfrenta com sua lança, enquanto os sacerdotes no mundo dos vivos recitam feitiços para ajudá-lo.

        Ao final da décima segunda hora, Rá renasce como Khepri, o besouro escaravelho que empurra o disco solar para fora do horizonte oriental. E mais uma vez, o dia começa.`)]
    ]
  },

  /* ===== JAPONESA ===== */
  {
    id: 'amaterasu', colecao: 'japonesa', titulo: 'Amaterasu e a Caverna Celestial', sub: 'Como o sol foi trazido de volta ao mundo', tempo: 5,
    capitulos: [
      ['A Fúria de Susanoo', P(`
        Amaterasu, a deusa do Sol, governava a Planície do Alto Céu. Seu irmão Susanoo, deus das tempestades, era impulsivo e destrutivo. Certa vez, embriagado de orgulho, destruiu os arrozais da irmã, sujou seus salões sagrados e lançou um cavalo esfolado em sua sala de tecelagem.

        Magoada e furiosa, Amaterasu refugiou-se na caverna Ama-no-Iwato e fechou a entrada com uma grande rocha. Sem ela, o mundo mergulhou na escuridão. Os campos murcharam e os espíritos maus despertaram.`)],
      ['O Plano dos Oito Milhões de Deuses', P(`
        Os oito milhões de kami se reuniram diante da caverna. Penduraram um espelho sagrado e joias em uma árvore, e colocaram galos para cantar como se fosse amanhecer.

        Então, Ame-no-Uzume, a deusa da alegria, subiu em um tonel virado e começou uma dança tão engraçada e ousada que todos os deuses explodiram em gargalhadas.`)],
      ['O Espelho', P(`
        Curiosa com o barulho, Amaterasu entreabriu a rocha. "Por que riem, se o mundo está escuro?" "Porque encontramos uma deusa ainda mais brilhante que você!", responderam.

        Ela olhou e viu seu próprio reflexo no espelho Yata no Kagami. Encantada, deu um passo para fora — e o deus da força, Ame-no-Tajikarao, puxou-a e fechou a caverna atrás dela. A luz voltou ao mundo. O espelho tornou-se um dos três tesouros sagrados do Japão.`)]
    ]
  },
  {
    id: 'orochi', colecao: 'japonesa', titulo: 'Susanoo e a Serpente de Oito Cabeças', sub: 'O exílio, a redenção e a espada Kusanagi', tempo: 5,
    capitulos: [
      ['O Exílio', P(`
        Expulso do céu por seus crimes, Susanoo desceu à terra, na província de Izumo. À beira de um rio, encontrou um casal de idosos chorando ao lado de sua filha, Kushinada.

        "Tínhamos oito filhas", explicaram. "Todos os anos, Yamata no Orochi, a serpente de oito cabeças e oito caudas, vem e devora uma. Esta é a última."`)],
      ['O Saquê', P(`
        Susanoo prometeu matar a serpente se pudesse se casar com Kushinada. Para protegê-la, transformou a moça em um pente e o prendeu nos cabelos.

        Ordenou que construíssem uma cerca com oito portões e que, em cada um, colocassem um tonel do saquê mais forte que pudessem fazer. Quando Orochi chegou, cada uma de suas oito cabeças mergulhou em um tonel e bebeu até cair em sono profundo.`)],
      ['A Espada na Cauda', P(`
        Susanoo sacou sua espada e cortou a serpente em pedaços. O rio ficou vermelho. Ao golpear a quarta cauda, sua lâmina se partiu: havia algo duro lá dentro. Era uma espada magnífica — Ame-no-Murakumo, mais tarde chamada Kusanagi, "a cortadora de grama".

        Arrependido, Susanoo ofereceu a espada a Amaterasu como pedido de desculpas. Ela se tornou o segundo dos três tesouros sagrados do Japão, ao lado do espelho e da joia.`)]
    ]
  },

  /* ===== FOLCLORE BRASILEIRO ===== */
  {
    id: 'curupira', colecao: 'folclore', titulo: 'O Curupira e os Caçadores', sub: 'Interativa: sobreviva à noite na floresta', tempo: 7, interativa: true,
    inicio: 'a',
    nos: {
      a: { t: P(`Você é um jovem caçador que entrou na mata com dois companheiros, Zé e Tonho. Eles querem caçar muito mais do que precisam, para vender as peles na cidade. O sol está se pondo, e a floresta parece mais silenciosa do que deveria.

        De repente, vocês encontram pegadas na lama. Pequenas, de criança — mas viradas para trás.`),
        e: [['Seguir as pegadas', 'b'], ['Dizer aos amigos que é hora de voltar', 'c']] },
      b: { t: P(`"Vamos ver quem anda por aqui", ri Zé. Vocês seguem as pegadas, mas, quanto mais andam, mais a floresta parece mudar. Árvores que vocês já passaram aparecem de novo. Um assobio fino corta o ar.

        Tonho grita: ele viu um menino de cabelos vermelhos como fogo, montado em um porco-do-mato, sorrindo entre as folhas.`),
        e: [['Atirar na direção do menino', 'd'], ['Deixar uma oferenda de fumo e pedir licença', 'e']] },
      c: { t: P(`Seus amigos zombam de você, mas a escuridão os convence. Vocês tentam voltar pela trilha — porém ela simplesmente sumiu. Ao redor, só árvores gigantes e o som de passos. As pegadas invertidas agora estão por toda parte, rodeando vocês.

        Você lembra das histórias da sua avó: o Curupira confunde quem desrespeita a mata.`),
        e: [['Fazer uma trança de cipó e jogar no caminho', 'f'], ['Correr sem rumo', 'g']] },
      d: { t: P(`O tiro ecoa, mas acerta apenas uma árvore. A gargalhada do menino vem de todos os lados ao mesmo tempo. As armas de vocês esquentam até ficarem impossíveis de segurar. Tochas se apagam sozinhas.

        Vocês passam a noite inteira andando em círculos, perseguidos por assobios e sombras. Ao amanhecer, encontram a saída — sem armas, sem caça e com os cabelos brancos de susto. Nunca mais voltaram a caçar.`), fim: 'Final: A Lição do Guardião', tipoFim: 'ruim' },
      e: { t: P(`Você se ajoelha, deixa um pouco de fumo sobre uma raiz e diz: "Desculpe, guardião. Só queremos voltar para casa." O silêncio é total. Então, o menino aparece à sua frente, os pés virados para trás, os olhos brilhando como brasas.

        "Você respeita a mata", diz o Curupira. "Seus amigos, não." Ele aponta uma trilha iluminada por vagalumes. "Leve-os embora. E diga a todos: quem caçar por ganância, se perderá para sempre."`), fim: 'Final: O Respeito à Floresta', tipoFim: 'bom' },
      f: { t: P(`Você trança um cipó rapidamente e o joga na trilha, como sua avó ensinou. Dizem que o Curupira não resiste a desfazer nós. Ao longe, ouve-se um assobio irritado, e depois, silêncio. Enquanto ele se ocupa com o desafio, as estrelas se alinham e mostram o caminho de volta.

        Vocês saem da mata em segurança. Zé e Tonho nunca mais riram das histórias da sua avó.`), fim: 'Final: A Sabedoria dos Antigos', tipoFim: 'secreto' },
      g: { t: P(`Você corre até as pernas doerem. Quando para, está sozinho. Os amigos sumiram. O assobio fica cada vez mais próximo... e então tudo escurece. Você acorda dias depois, na beira de um rio, sem lembrar de nada — apenas de um par de olhos vermelhos e uma voz que dizia: "respeite".`), fim: 'Final: Perdido na Mata', tipoFim: 'ruim' }
    }
  },
  {
    id: 'iara', colecao: 'folclore', titulo: 'A Lenda da Iara', sub: 'A mãe-d\'água dos rios amazônicos', tempo: 4,
    capitulos: [
      ['A Guerreira', P(`
        Contam os povos ribeirinhos que Iara era a guerreira mais valente de sua aldeia. Seus irmãos, invejosos dos elogios que ela recebia do pai, o pajé, planejaram matá-la durante a noite.

        Mas Iara, com seus ouvidos atentos, acordou e se defendeu. Na luta, acabou matando os irmãos. Desesperada, fugiu pela mata, mas o pai a encontrou e, como castigo, lançou-a no encontro dos rios Negro e Solimões.`)],
      ['A Mãe-d\'Água', P(`
        Os peixes trouxeram Iara à superfície em uma noite de lua cheia. Ela não havia morrido: tinha se transformado em uma criatura metade mulher, metade peixe, de longos cabelos negros e olhos verdes como as águas do rio.

        Desde então, ela canta nas pedras ao entardecer. Os pescadores que ouvem seu canto ficam enfeitiçados e mergulham para encontrá-la — e poucos voltam. Os que retornam ficam loucos de saudade, e só um pajé pode curá-los. Por isso, quando o sol se põe sobre o rio, os pescadores mais antigos tapam os ouvidos e remam para casa.`)]
    ]
  },
  {
    id: 'saci', colecao: 'folclore', titulo: 'As Travessuras do Saci-Pererê', sub: 'O menino de uma perna só e seu gorro mágico', tempo: 4,
    capitulos: [
      ['O Redemoinho', P(`
        Quando um redemoinho de poeira passa rodopiando pelo terreiro, os mais velhos avisam: é o Saci. Um menino negro, de uma perna só, com um cachimbo na boca e um gorro vermelho que lhe dá poderes mágicos.

        O Saci adora travessuras. Esconde objetos, azeda o leite, queima a comida, dá nós na crina dos cavalos e assobia no escuro só para assustar os viajantes.`)],
      ['Como Capturar um Saci', P(`
        Dizem que quem joga uma peneira sobre o redemoinho consegue prender o Saci. E se alguém roubar seu gorro vermelho, ele fica obrigado a realizar um desejo para tê-lo de volta.

        Outra forma é colocá-lo dentro de uma garrafa bem tampada. Mas cuidado: o Saci é esperto, e quem o aprisiona costuma se arrepender. Afinal, ninguém quer um inimigo que pode sumir e aparecer em qualquer lugar, rindo da sua cara.`)]
    ]
  },
  {
    id: 'boitata', colecao: 'folclore', titulo: 'Boitatá, a Cobra de Fogo', sub: 'O guardião flamejante dos campos', tempo: 4,
    capitulos: [
      ['O Grande Dilúvio', P(`
        Há muito tempo, choveu tanto que os campos ficaram inundados por dias e dias. Os animais se refugiaram nas partes mais altas, e uma cobra enorme, a boiguaçu, acordou em sua toca com fome.

        Sem outra comida, ela começou a comer os olhos dos animais mortos pela enchente. E cada olho que devorava guardava um pouco da última luz que havia visto.`)],
      ['A Serpente Luminosa', P(`
        Aos poucos, o corpo da cobra foi se enchendo de luz até ficar transparente, brilhando como fogo. Ela se tornou o Boitatá — "cobra de fogo" em tupi.

        Hoje, o Boitatá protege as matas e os campos contra quem os incendeia. Quem o encontra deve ficar parado, de olhos fechados, sem respirar. Os que tentam fugir são perseguidos pela serpente flamejante, que pode deixá-los cegos com seu brilho.`)]
    ]
  },

  /* ===== IORUBÁ ===== */
  {
    id: 'iemanja', colecao: 'ioruba', titulo: 'Iemanjá, a Mãe das Águas', sub: 'A orixá dos mares e da maternidade', tempo: 4,
    capitulos: [
      ['A Mãe dos Orixás', P(`
        Nas tradições iorubás, Iemanjá é a mãe cujos filhos são peixes. Senhora do rio Ogum, na África, ela atravessou o oceano junto com seu povo e, no Brasil, tornou-se a rainha do mar.

        Diz-se que, quando um de seus filhos estava em perigo, Iemanjá derramou um vaso que carregava, e de suas águas nasceram rios e oceanos. Assim, ela criou um caminho por onde sempre poderia encontrar quem amava.`)],
      ['As Oferendas do Ano-Novo', P(`
        Por isso, na noite de Ano-Novo e no dia 2 de fevereiro, milhares de pessoas vestem branco e levam flores, perfumes e espelhos ao mar. Pulam sete ondas e fazem pedidos.

        Se a oferenda é levada pelas ondas, Iemanjá a aceitou. Se volta à praia, é sinal de que é preciso pedir de novo, com mais cuidado — e com o coração mais leve.`)]
    ]
  },
  {
    id: 'xango', colecao: 'ioruba', titulo: 'Xangô e o Fogo da Justiça', sub: 'O rei de Oyó, senhor dos raios e trovões', tempo: 4,
    capitulos: [
      ['O Rei de Oyó', P(`
        Xangô foi o quarto rei de Oyó, uma das maiores cidades iorubás. Era forte, vaidoso e justo, e carregava o oxê, um machado de duas lâminas que simboliza o equilíbrio: a justiça corta para os dois lados.

        Certa vez, Xangô encontrou uma folha mágica que lhe permitia cuspir fogo. Ao testá-la do alto de uma colina, provocou um raio tão poderoso que seu próprio palácio pegou fogo.`)],
      ['O Orixá do Trovão', P(`
        Arrependido, Xangô deixou a cidade. Alguns dizem que ele subiu aos céus em uma corrente; outros, que entrou na terra. Desde então, ele é o orixá dos raios, do trovão e da justiça.

        Quando um raio cai, os antigos dizem que é Xangô castigando os mentirosos e os injustos. Suas companheiras são Iansã, senhora dos ventos e tempestades, Oxum, rainha das águas doces, e Obá, a guerreira.`)]
    ]
  },

  /* ===== ASTECA ===== */
  {
    id: 'quinto-sol', colecao: 'asteca', titulo: 'A Lenda do Quinto Sol', sub: 'O sacrifício dos deuses em Teotihuacan', tempo: 5,
    capitulos: [
      ['Os Quatro Mundos Destruídos', P(`
        Os astecas acreditavam que o universo já havia sido criado e destruído quatro vezes. Cada era tinha seu próprio sol: o primeiro foi devorado por jaguares; o segundo, varrido por ventos; o terceiro, consumido por uma chuva de fogo; e o quarto, afogado em um dilúvio.

        Depois disso, só restou a escuridão. Os deuses se reuniram em Teotihuacan, a "cidade onde os deuses nascem", para decidir quem se sacrificaria para se tornar o novo sol.`)],
      ['Nanahuatzin', P(`
        O vaidoso Tecciztecatl se ofereceu, coberto de joias. O humilde Nanahuatzin, doente e coberto de feridas, também. Uma grande fogueira foi acesa. Tecciztecatl tentou pular quatro vezes, mas o medo o fez recuar.

        Nanahuatzin fechou os olhos e saltou sem hesitar. Envergonhado, Tecciztecatl o seguiu. Dos dois surgiram o Sol e a Lua. Mas o novo sol não se movia — e os deuses entenderam que precisariam oferecer o próprio sangue para colocá-lo em movimento. Assim nasceu o Quinto Sol, a era em que vivemos.`)]
    ]
  },
  {
    id: 'quetzalcoatl', colecao: 'asteca', titulo: 'Quetzalcóatl e os Ossos da Humanidade', sub: 'A Serpente Emplumada desce ao Mictlān', tempo: 5,
    capitulos: [
      ['A Descida', P(`
        Para criar uma nova humanidade, Quetzalcóatl, a Serpente Emplumada, precisava dos ossos dos antigos humanos, guardados por Mictlantecuhtli, senhor do Mictlān, o mundo dos mortos.

        "Te darei os ossos", disse o deus da morte, "se você der quatro voltas em meu reino tocando esta concha." Mas a concha não tinha furos. Quetzalcóatl chamou vermes para perfurá-la e abelhas para fazê-la soar.`)],
      ['O Sangue da Criação', P(`
        Mictlantecuhtli, irritado, mandou cavar um buraco no caminho. Quetzalcóatl tropeçou, os ossos caíram e se quebraram em pedaços — por isso os seres humanos têm tamanhos diferentes.

        Ele levou os fragmentos a Tamoanchan, onde a deusa Cihuacōātl os moeu como milho. Quetzalcóatl então furou a própria pele e derramou seu sangue sobre o pó. Desse barro sagrado nasceram os homens e as mulheres do Quinto Sol.`)]
    ]
  },

  /* ===== HINDU ===== */
  {
    id: 'oceano-leite', colecao: 'hindu', titulo: 'Samudra Manthan: A Agitação do Oceano de Leite', sub: 'Quando deuses e demônios se uniram em busca do néctar da imortalidade', tempo: 6,
    capitulos: [
      ['A Aliança Improvável', P(`
        Após perderem sua força divina devido à maldição de um sábio, os Devas (deuses) viram os Asuras (demônios) dominarem os três mundos. Buscando conselho, recorreram a Vishnu, o preservador do universo.

        "Vocês devem bater o Oceano Cósmico de Leite", disse Vishnu, "para extrair dele o Amrita, o néctar da imortalidade. Mas a tarefa é imensa demais: façam uma trégua temporária com os Asuras e trabalhem juntos."`)],
      ['O Monte Mandara e o Veneno de Shiva', P(`
        Os Devas e os Asuras usaram o Monte Mandara como batedor e a gigantesca serpente Vasuki como corda. Quando a montanha começou a afundar no oceano, Vishnu assumiu seu avatar Kurma — uma tartaruga colossal — e sustentou o monte sobre seu casco.

        Por mil anos eles puxaram a serpente de um lado e do outro. Mas antes do néctar, das profundezas emergiu o Halahala, um veneno tão letal que seus vapores ameaçavam extinguir toda a criação. Para salvar o universo, o deus Shiva recolheu o veneno nas mãos e o bebeu, segurando-o na garganta — que ficou azulada para sempre, dando-lhe o nome de Neelakantha.`)],
      ['A Dança de Mohini', P(`
        Da espuma sagrada surgiram maravilhas: a deusa Lakshmi da fortuna, o cavalo branco de sete cabeças Uchchaihshravas, o elefante celestial Airavata e a árvore dos desejos Kalpavriksha. Por fim, emergiu Dhanvantari, o médico divino, trazendo nas mãos o cântaro de Amrita.

        Os Asuras arrancaram o cântaro à força. Antes que bebessem, Vishnu assumiu a forma de Mohini, uma encantadora de beleza irresistível, que se ofereceu para distribuir o néctar. Enquanto os demônios aguardavam hipnotizados, ela serviu o Amrita aos Devas, restaurando o equilíbrio cósmico.`)]
    ]
  },

  /* ===== CELTA ===== */
  {
    id: 'cuchulainn', colecao: 'celta', titulo: 'A Fúria de Cú Chulainn', sub: 'O Campeão do Ulster e a lança mágica Gáe Bulg', tempo: 6,
    capitulos: [
      ['O Cão de Culann', P(`
        Nascido com o nome de Sétanta e filho do deus solar Lugh, o jovem herói irlandês já demonstrava força sobre-humana na infância. Certa noite, a caminho de um banquete na forja do ferreiro Culann, foi atacado pelo cão de guarda monstruoso que protegia a propriedade — uma fera que valia por dez guerreiros.

        Armado apenas com seu bastão de hurling e uma bola, o menino derrotou a fera. Vendo a tristeza do ferreiro por perder seu guardião, Sétanta prometeu: "Eu mesmo vigiarei suas terras até que um filhote deste cão cresça." Desde aquele dia, os druidas o batizaram de Cú Chulainn — o Cão de Culann.`)],
      ['O Treinamento na Ilha das Sombras', P(`
        Para conquistar a mão de Emer, Cú Chulainn viajou até a fortaleza da lendária guerreira Scáthach, na Ilha de Skye. Lá aprendeu o salto do salmão e recebeu a arma mais temida da mitologia celta: a Gáe Bulg, uma lança feita do osso de um monstro marinho que, ao atingir o alvo, abria trinta farpas mortais.

        Na ilha, também fez um juramento de amizade eterna com o nobre guerreiro Ferdiad, sem imaginar que o destino os colocaria em lados opostos.`)],
      ['O Cerco de Cooley', P(`
        Quando a rainha Medb de Connacht invadiu o reino do Ulster para roubar o Touro Pardo de Cooley, uma maldição antiga deixou todos os guerreiros do Ulster prostrados — todos, exceto Cú Chulainn, de apenas dezessete anos.

        Sozinho na fronteira, ele desafiou o exército inimigo para duelos individuais dia após dia, tomado pelo *ríastrad*, o espasmo de batalha que transformava seu corpo em uma força indomável da natureza, gravando seu nome para sempre nas sagas da Irlanda.`)]
    ]
  },

  /* ===== NOXUS · RUNETERRA ===== */
  {
    id: 'noxus-trifarix', colecao: 'cronicas-lol', titulo: 'Noxus: Ferro, Sangue e a Rosa Negra', sub: 'Crônica de Darius, Swain, Katarina, LeBlanc e Draven no Bastião Imortal', tempo: 6,
    capitulos: [
      ['Os Três Pilares do Trifarix', P(`
        Sob a sombra colossal do Bastião Imortal, ninguém nasce com o direito de governar Noxus. Após a queda do tirano Boram Darkwill, o Grande General Jericho Swain ergueu o Trifarix — um conselho de três pilares onde nenhum governante absoluto poderia corromper o império sozinho: Visão, Poder e Astúcia.

        Nos salões de basalto, os corvos demoníacos de Raum sussurram segredos de todas as fronteiras para Swain, enquanto Darius, a Mão de Noxus, marcha à frente da Legião Trifariana com seu machado banhado em aço negro. Para Darius, a nobreza de berço nada vale: em Noxus, qualquer soldado que erguer sua arma com determinação pode subir ao topo.`)],
      ['A Lâmina e a Rosa', P(`
        Mas nas galerias subterrâneas sob a capital, onde as tochas ardem em tons de púrpura, a pálida feiticeira LeBlanc tece outra história. Líder da cabala milenar da Rosa Negra, ela manipula príncipes, generais e magos de sangue desde a era de Mordekaiser, espalhando ilusões entre os salões de poder.

        Entre a visão implacável de Swain e as conspirações da Rosa Negra caminha Katarina Du Couteau. Com suas adagas gêmeas reluzindo na neblina noturna, a Lâmina Sinistra executa sentenças silenciosas contra aqueles que traem a força do império — provando que um único golpe preciso pode mudar o destino de uma guerra inteira.`)],
      ['O Rugido da Arena', P(`
        Enquanto generais e assassinos decidem o futuro nas fronteiras e nas sombras, o coração do povo noxiano pulsa nas areias ensanguentadas da Arena da Carnificina. Sob o clamor de milhares de vozes e o brilho de tochas acorrentadas, Draven — o Glorioso Carrasco — transforma o julgamento pela força em espetáculo.

        Machados giratórios cortam o ar sob o estandarte carmesim de Noxus. Seja nas muralhas de Basilich, nos corredores secretos da Rosa Negra ou no centro da arena, uma única lei une todos os campeões do império: a força acima de tudo.`)]
    ]
  }
];

/* ---------- HQ original interativa ---------- */
const HQS = [
  {
    id: 'guardia-1', colecao: 'originais', titulo: 'Guardiã do Céu #1', sub: 'Tempestade sobre São Paulo — HQ interativa', capa: 'assets/capas/guardia.jpg',
    resumo: 'A física Ayô Nascimento estuda um cristal misterioso no laboratório da universidade quando uma tempestade impossível cobre São Paulo. Suas escolhas vão definir o nascimento de uma heroína. Uma HQ interativa com finais diferentes!',
    paginas: [
      { id: 'capa', capa: 'assets/capas/guardia.jpg' },
      { id: 'p1', l: 'l2', p: [
        { img: 'assets/paineis/tempestade.jpg', b: [['narra', 'São Paulo. 23h47. A tempestade não estava em nenhuma previsão do tempo.', 3, 4], ['som', 'KRAKOOOM!', 58, 62]] },
        { img: 'assets/paineis/laboratorio.jpg', pos: '70% center', b: [['narra', 'Laboratório de Física, USP.', 3, 4], ['fala', 'O cristal... está reagindo à tempestade!', 4, 60]] }
      ]},
      { id: 'p2', l: 'l1', p: [
        { img: 'assets/paineis/laboratorio.jpg', pos: '35% center', b: [['som', 'ZZZAK!', 8, 12], ['pensa', 'Se eu soltar agora, a energia explode o prédio inteiro...', 46, 6], ['narra', 'Ayô Nascimento tem só um segundo para decidir.', 4, 86]] }
      ], e: { t: 'O que Ayô deve fazer?', op: [['⚡ Segurar o cristal com as duas mãos', 'a1'], ['🔌 Correr para desligar o gerador', 'b1']] } },
      { id: 'a1', l: 'l1', vai: 'p3', p: [
        { img: 'assets/paineis/laboratorio.jpg', pos: '45% center', b: [['som', 'VRRRUMMM!', 4, 6], ['narra', 'A energia atravessou seu corpo como um rio de luz.', 40, 6], ['fala', 'Eu... eu consigo sentir o céu inteiro!', 50, 74]] }
      ]},
      { id: 'b1', l: 'l12', vai: 'p3', p: [
        { img: 'assets/paineis/laboratorio.jpg', pos: '20% center', b: [['narra', 'Tarde demais. O gerador explodiu e o cristal se partiu em mil fagulhas.', 4, 6], ['som', 'BLAM!', 70, 60]] },
        { img: 'assets/paineis/tempestade.jpg', pos: '60% center', b: [['narra', 'As fagulhas subiram até o céu...', 6, 8]] },
        { img: 'assets/paineis/laboratorio.jpg', pos: '62% 30%', b: [['fala', 'Por que meu corpo está brilhando?!', 6, 64]] }
      ]},
      { id: 'p3', l: 'l21', p: [
        { img: 'assets/paineis/batalha.jpg', pos: '15% center', b: [['narra', 'Minutos depois, sobre a Avenida Paulista...', 5, 5]] },
        { img: 'assets/paineis/batalha.jpg', pos: '80% center', b: [['fala', 'SOU TORMENTA! ESTA CIDADE SERÁ MINHA!', 6, 64]] },
        { img: 'assets/paineis/batalha.jpg', b: [['fala', 'Não enquanto eu estiver aqui!', 4, 8], ['som', 'VRAAASH!', 52, 66]] }
      ], e: { t: 'Como enfrentar Tormenta?', op: [['💥 Atacar com toda a força', 'c1'], ['🌀 Absorver a tempestade', 'd1']] } },
      { id: 'c1', l: 'l2', vai: 'final', p: [
        { img: 'assets/paineis/batalha.jpg', pos: '50% 40%', b: [['som', 'KA-BOOOM!', 30, 30], ['narra', 'Raios contra raios. A cidade inteira tremeu.', 3, 4]] },
        { img: 'assets/paineis/tempestade.jpg', b: [['narra', 'Tormenta recuou para as nuvens... mas prometeu voltar.', 3, 4], ['fala', 'ISTO NÃO ACABOU, GUARDIÃ!', 50, 56]] }
      ]},
      { id: 'd1', l: 'l2', vai: 'final', p: [
        { img: 'assets/paineis/tempestade.jpg', b: [['narra', 'Ayô abriu os braços e puxou a tempestade para dentro de si.', 3, 4], ['som', 'FWOOOOM!', 40, 55]] },
        { img: 'assets/paineis/batalha.jpg', pos: '25% center', b: [['fala', 'Sua força agora é minha, Tormenta!', 40, 10]] }
      ]},
      { id: 'final', l: 'l1', p: [
        { img: 'assets/paineis/amanhecer.jpg', pos: '33% 70%', esc: 1.12, b: [['narra', 'Ao amanhecer, a cidade acordou sem saber quem a salvara.', 4, 5], ['fala', 'Uma guardiã não precisa de aplausos. Só precisa de céu.', 44, 70]] }
      ]},
      { id: 'fim', fim: true, t: 'Continua em Guardiã do Céu #2...', d: 'Você chegou a um dos finais. Volte e faça escolhas diferentes para descobrir outros caminhos!' }
    ]
  }
];
