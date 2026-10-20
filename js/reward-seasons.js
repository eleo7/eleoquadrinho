/* Curated rotation: new event each Monday in Brasília; sets return every 12 weeks. */
(function(root){
  'use strict';
  const SETS=[
    ['flash','Flash','Caçada aos vilões','Raio Escarlate','#ffcd46','#a91220','flame','bolt'],
    ['batman','Batman','Vigília de Gotham','Guardião da Noite','#bdd7ff','#202d52','spike','bat'],
    ['spiderman','Homem-Aranha','Entre teias e histórias','Sentinela das Teias','#ff7474','#192b65','circuit','web'],
    ['wonder','Mulher-Maravilha','Jornada das amazonas','Escudo Amazona','#ffe194','#8d2439','crown','shield'],
    ['iron','Homem de Ferro','Protocolo de leitura','Reator Dourado','#82f3ff','#902b18','gear','reactor'],
    ['hulk','Hulk','Força entre páginas','Força Esmeralda','#b0ff73','#354022','spike','fist'],
    ['thor','Thor','Crônicas do trovão','Trovão de Asgard','#b8eaff','#263c72','ice','hammer'],
    ['panther','Pantera Negra','Legado de Wakanda','Garra de Vibranium','#cb9cff','#302346','gem','panther'],
    ['strange','Doutor Estranho','Biblioteca das dimensões','Selo Arcano','#ffbd65','#66311d','orbit','eye'],
    ['superman','Superman','Além do horizonte','Esperança Solar','#ffd862','#234aa1','crown','sun'],
    ['naruto','Naruto','Caminho do leitor ninja','Espiral Shinobi','#ffb75d','#6e351b','leaf','spiral'],
    ['goku','Goku','Superando os limites','Aura Saiyajin','#ffe76a','#284a8a','dragon','starball']
  ].map(([id,hero,title,label,light,dark,motif,symbol],index)=>({id,hero,title,label,light,dark,motif,symbol,index}));
  function find(id){return SETS.find(s=>id==='hero_'+s.id||id==='event_'+s.id);}
  const api={SETS,find};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQRewardSeasons=api;
})(globalThis);
