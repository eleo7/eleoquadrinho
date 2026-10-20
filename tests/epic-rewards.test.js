'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const E=require('../js/epic-rewards'),R=require('../js/reading-rewards'),N=require('../js/release-news');
function read(s,seconds,day,id='one',progress=1){for(let t=0;t<seconds;t+=20)s=R.advance(s,{seconds:Math.min(20,seconds-t),day,id,progress});return s;}
test('five weekly styles rotate and twelve monthly editions follow calendar boundaries',()=>{
 assert.equal(E.schedule('2026-10-25').weekly.id,'epic_titan');assert.equal(E.schedule('2026-10-26').weekly.id,'epic_storm');
 assert.equal(E.schedule('2026-11-01').monthly.id,'monthly_2');assert.equal(E.schedule('2027-10-01').monthly.id,'monthly_1');assert.equal(E.OPTIONS.length,17);
});
test('weekly epic requires active reading and distinct completed books; equipment survives reset',()=>{
 let s=read(null,1800,'2026-10-20');assert.ok(!R.available(s,'frame','epic_titan'));
 s=read(s,40,'2026-10-20','two');assert.ok(!R.available(s,'frame','epic_titan'));
 s=read(s,20,'2026-10-20','two');assert.ok(R.available(s,'frame','epic_titan'));
 s=R.equip(s,'frame','epic_titan');s=read(s,20,'2026-10-26');
 assert.equal(R.appearance(R.normalize(JSON.parse(JSON.stringify(s)))).frame,'epic_titan');assert.equal(E.status(s.epicProgress,'2026-10-26')[0].count,0);
});
test('monthly frame requires eight active days and two hours; does not inherit old totals',()=>{
 let s=R.normalize({totalSeconds:99999,goalDays:30});assert.ok(!R.available(s,'frame','monthly_1'));
 for(let day=20;day<27;day++)s=read(s,900,'2026-10-'+day);
 assert.ok(!R.available(s,'frame','monthly_1'));s=read(s,900,'2026-10-27');assert.ok(R.available(s,'frame','monthly_1'));
 s=read(s,20,'2026-11-01');assert.ok(R.available(s,'frame','monthly_1'));assert.ok(!R.available(s,'frame','monthly_2'));assert.equal(E.status(s.epicProgress,'2026-11-01')[1].seconds,20);
});
test('news appears once, detects additions not edits, and remembers temporarily hidden works',()=>{
 const a={id:'a',titulo:'A'},b={id:'b',titulo:'B'},reward={id:'frame:epic',epic:true};
 const first=N.collect(null,[a],[reward]);assert.equal(first.works.length,1);assert.equal(first.rewards.length,1);
 assert.equal(N.collect(first.snapshot,[{...a,titulo:'Renamed'}],[reward]).works.length,0);
 const hidden=N.collect(first.snapshot,[],[reward]);assert.equal(N.collect(hidden.snapshot,[a],[reward]).works.length,0);
 assert.deepEqual(N.collect(first.snapshot,[a,b],[reward]).works.map(w=>w.id),['b']);
 assert.equal(N.collect(null,[],[{id:'old'}]).rewards.length,0);
});

test('launch suppression is per release; later keeps it pending and future rewards return',()=>{
 const a={id:'frame:a',epic:true},b={id:'frame:b',epic:true};
 const initial=N.spotlight(null,[a],[]);assert.deepEqual(initial.pending,['frame:a']);
 assert.deepEqual(N.spotlight(initial,[a],[]).pending,['frame:a']);
 const seen=N.dismissSpotlight(initial);assert.deepEqual(N.spotlight(seen,[a],[]).pending,[]);
 assert.deepEqual(N.spotlight(seen,[a,b],[b]).pending,['frame:b']);
 assert.deepEqual(N.spotlight(initial,[],[]).pending,[]);
});
