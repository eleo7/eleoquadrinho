const {test}=require('node:test'),assert=require('node:assert/strict'),M=require('../js/mascots');
test('mascots unlock at earned XP thresholds',()=>{assert.deepEqual(M.unlocked(0).map(p=>p.id),['byte']);assert.equal(M.unlocked(499).length,1);assert.equal(M.unlocked(500).length,2);assert.equal(M.unlocked(1500).length,3);assert.equal(M.unlocked(3000).length,4);});
test('recommendations prefer character themes and unfinished stories, without suggesting folders',()=>{const works=[{id:'1',tipo:'ext-hq',titulo:'Outra história'},{id:'2',tipo:'serie-pasta',titulo:'ThunderCats'},{id:'3',tipo:'ext-hq',titulo:'ThunderCats edição 1'},{id:'4',tipo:'ext-hq',titulo:'ThunderCats edição 2'}];assert.deepEqual(M.recommend(works,M.PETS[1],[{id:'3',prog:1}]).map(it=>it.id),['4','3','1']);assert.equal(works.length,4);assert.deepEqual(M.recommend([],M.PETS[0]),[]);});
test('Batman mascots stay locked without event progress and unlock with Batman sets',()=>{
  const R=require('../js/reading-rewards');
  let state=R.normalize();
  assert.deepEqual(M.unlocked(0,state).map(p=>p.id),['byte']);
  state=R.advance(state,{id:'conto:batman-cavaleiro-gotham',seconds:15,progress:0.6,day:'2026-11-16',batman:true});
  assert.deepEqual(M.unlocked(0,state).map(p=>p.id),['byte','bat_sentinela']);
  state=R.advance(state,{id:'conto:batman-arkham-sombras',seconds:15,progress:0.6,day:'2026-11-16',batman:true});
  assert.deepEqual(M.unlocked(0,state).map(p=>p.id),['byte','bat_sentinela','bat_felino']);
  for(let n=0;n<300;n+=15)state=R.advance(state,{id:'conto:batman-cavaleiro-gotham',seconds:15,progress:1,day:'2026-11-16',batman:true});
  assert.deepEqual(M.unlocked(0,state).map(p=>p.id),['byte','bat_sentinela','bat_felino','bat_blindado','bat_estelar']);
  const batPet=M.PETS.find(p=>p.id==='bat_sentinela');
  assert.match(M.art(batPet),/batman-mascots\.png/);
  const batWorks=[{id:'x',tipo:'ext-hq',titulo:'Liga da Justiça'},{id:'y',tipo:'ext-hq',titulo:'Batman: Ano Um'}];
  assert.equal(M.recommend(batWorks,batPet,[])[0].id,'y');
});

