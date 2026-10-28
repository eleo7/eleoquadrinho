const {test}=require('node:test'),assert=require('node:assert/strict'),R=require('../js/reading-rewards'),T=require('../js/thunder-rewards');
test('ThunderCats draw only after active thresholds, persists and never repeats owned rewards',()=>{
 let s=R.normalize({days:{'2026-10-28':{seconds:580,goal:10}}});
 s=R.advance(s,{id:'hq',seconds:20,progress:0,day:'2026-10-28',seed:'reader'});
 const first=s.thunderDraws.daily.reward;assert.ok(first.includes('thunder_'));assert.ok(s.eventRewards[first]);
 s=R.advance(s,{id:'hq',seconds:20,progress:0,day:'2026-10-28',seed:'reader'});assert.equal(s.thunderDraws.daily.reward,first);
 s.days['2026-10-29']={seconds:580,goal:10};s=R.advance(s,{id:'hq',seconds:20,progress:0,day:'2026-10-29',seed:'reader'});assert.notEqual(s.thunderDraws.daily.reward,first);
 s.days['2026-10-30']={seconds:3580,goal:10};s=R.advance(s,{id:'hq',seconds:20,progress:0,day:'2026-10-30',seed:'reader'});assert.ok(s.thunderDraws.weekly.reward);assert.notEqual(s.thunderDraws.weekly.reward,s.thunderDraws.daily.reward);
 const normalized=R.normalize(s);assert.deepEqual(normalized.thunderDraws,s.thunderDraws);assert.ok(normalized.eventRewards[first]);
 for(const [kind,items]of Object.entries(T.OPTIONS))for(const o of items)s.eventRewards[kind+':'+o.id]=true;
 s.days['2026-10-31']={seconds:580,goal:10};s=R.advance(s,{id:'hq',seconds:20,day:'2026-10-31'});assert.equal(s.thunderDraws.daily.reward,'');
});
test('ThunderCats does not draw before release or for zero activity',()=>{
 const s=R.advance(null,{id:'hq',seconds:0,day:'2026-10-28'});assert.deepEqual(s.thunderDraws,{});
 const old=R.normalize({days:{'2026-10-27':{seconds:6000}}});T.draw(old,{day:'2026-10-27',week:'2026-10-26'});assert.deepEqual(old.thunderDraws,{});
});
test('ThunderCats frame and avatar artwork match standard geometry without vertical squashing or sprite bleed',()=>{
 global.EQRewardSeasons=require('../js/reward-seasons');
 global.EQEpicRewards=require('../js/epic-rewards');
 global.EQThunderRewards=T;
 global.EQNoxusRewards=require('../js/noxus-rewards');
 require('../js/reward-art');
 const Art=global.EQRewardArt;
 for(const set of T.SETS){
  const f=Art.frame(set.id),a=Art.avatar(set.id);
  assert.match(f,/class="reward-frame-art thunder-frame"/);
  assert.match(f,/viewBox="0 0 120 120"/);
  assert.match(f,/clipPath id="eq-thunder-frame-\d+"/);
  assert.doesNotMatch(f,/0 434\.4 724/);
  assert.match(a,/class="reward-avatar-art"/);
  assert.match(a,/rx="22"/);
  assert.match(a,/thundercats-avatars\.png/);
  assert.match(a,new RegExp(`stroke="${set.light}"`));
 }
});
test('Noxus event rewards unlock frames and icons when reading Noxus stories, lore, or HQs',()=>{
 const N=require('../js/noxus-rewards');
 global.EQNoxusRewards=N;
 require('../js/reward-art');
 const Art=global.EQRewardArt;
 assert.equal(N.SETS.length,5);
 for(const set of N.SETS){
  const f=Art.frame(set.id),a=Art.avatar(set.id);
  assert.match(f,/class="reward-frame-art noxus-frame"/);
  assert.match(f,/viewBox="0 0 120 120"/);
  assert.match(f,/noxus-frames\.png/);
  assert.match(a,/class="reward-avatar-art noxus-avatar"/);
  assert.match(a,/noxus-avatars\.png/);
 }
 assert.equal(N.isNoxusWork('conto:noxus-trifarix'),true);
 assert.equal(N.isNoxusWork('rhq:darius/bloodofnoxus'),true);
 assert.equal(N.isNoxusWork({id:'lol:Swain',titulo:'Swain',sub:'O Grande General Noxiano'}),true);
 assert.equal(N.isNoxusWork('rserie:lux'),false);

 let s=R.normalize({});
 let st0=N.status(s);
 assert.equal(st0.percent,0);
 assert.equal(st0.remainingSets,5);
 assert.equal(st0.totalTargetSeconds,300);
 assert.equal(st0.nextSet.id,'noxus_darius');

 s=R.advance(s,{id:'lol:Swain',seconds:20,progress:0.8,day:'2026-10-28'});
 assert.equal(R.available(s,'frame','noxus_swain'),true);
 assert.equal(R.available(s,'avatar','noxus_swain'),true);
 let st1=N.status(s);
 assert.equal(st1.completedSets,1);
 assert.equal(st1.remainingSets,4);
 assert.equal(st1.percent,20);
 assert.equal(st1.effectiveSeconds,60);

 s=R.advance(s,{id:'rhq:darius/bloodofnoxus',seconds:20,progress:0.9,day:'2026-10-28'});
 assert.equal(R.available(s,'frame','noxus_darius'),true);
 assert.equal(R.available(s,'avatar','noxus_darius'),true);
 let st2=N.status(s);
 assert.equal(st2.completedSets,2);
 assert.equal(st2.remainingSets,3);
 assert.equal(st2.percent,40);
 assert.equal(st2.nextSet.id,'noxus_katarina');
});

