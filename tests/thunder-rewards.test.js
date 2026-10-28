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
