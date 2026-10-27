const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../js/scheduled-events'),R=require('../js/reading-rewards'),A=require('../js/content-access');
const reward=R.OPTIONS.frame.find(o=>o.event).id;
const event={id:'event-test',title:'Desafio',start:'2026-10-27',end:'2026-10-28',minutes:1,kind:'frame',reward};
test('scheduled events validate dates, bounds and duplicate IDs',()=>{
 assert.deepEqual(S.validate([event]),[event]);
 for(const change of [{start:'2026-02-30'},{end:'2026-01-01'},{minutes:0},{minutes:1.5}])assert.throws(()=>S.validate([{...event,...change}]));
 assert.throws(()=>S.validate([event,event]));
 assert.deepEqual(A.filterCatalog({events:[event]},{mode:'initial'},'reader').events,[event]);
});
test('only active reading during schedule earns persistent cosmetic; old totals do not count',()=>{
 let state=R.advance(null,{id:'a',seconds:20,progress:1,day:'2026-10-26',events:[event]});
 assert.equal(state.scheduledProgress[event.id],undefined);
 for(let i=0;i<3;i++)state=R.advance(state,{id:'a',seconds:20,progress:1,day:'2026-10-27',events:[event]});
 assert.equal(R.available(state,'frame',reward),true);
 assert.equal(state.scheduledProgress[event.id],60);
 state=R.advance(state,{id:'a',seconds:20,progress:1,day:'2026-10-29',events:[]});
 assert.equal(R.available(R.normalize(state),'frame',reward),true);
});
