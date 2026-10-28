'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const R = require('../js/reading-rewards');
const day = '2026-10-17';
function read(state, seconds, id = 'book', date = day, progress = 1) {
  for (let n = 0; n < seconds; n += 15) state = R.advance(state, { id, seconds: Math.min(15, seconds-n), progress, day: date });
  return state;
}
test('opening a book or jumping to the end is not enough; completion is unique and durable', () => {
  let state = R.advance(null, { id: 'book', seconds: 0, progress: 1, day });
  assert.equal(R.metrics(state).completed, 0);
  state = read(state, 45); assert.equal(R.metrics(state).completed, 0);
  state = read(state, 15); assert.equal(R.metrics(state).completed, 1);
  state = read(state, 120); assert.equal(R.metrics(state).completed, 1);
  assert.equal(R.metrics(R.normalize(JSON.parse(JSON.stringify(state)))).completed, 1);
});
test('daily goals count once, reset by date, and changing a completed goal does not farm rewards', () => {
  let s = R.setGoal(null, 5, day);
  s = read(s, 300); assert.equal(s.goalDays, 1);
  s = R.setGoal(s, 10, day); s = read(s, 300); assert.equal(s.goalDays, 1);
  s = read(s, 600, 'book', '2026-10-18'); assert.equal(s.goalDays, 2);
  assert.equal(s.days[day].goal, 5); assert.equal(s.days['2026-10-18'].goal, 10);
});
test('unlocked rewards can be equipped; unknown or locked options cannot change appearance', () => {
  assert.throws(() => R.equip(null, 'theme', 'forest'));
  assert.throws(() => R.equip(null, 'role', 'admin'));
  let s = read(null, 300);
  s = R.equip(s, 'avatar', 'owl'); s = R.equip(s, 'frame', 'bronze'); s = R.equip(s, 'layout', 'compact');
  assert.deepEqual(R.appearance(s), { avatar: 'owl', frame: 'bronze', theme: 'default', layout: 'compact' });
  const unearned = R.normalize({ appearance: { theme: 'sunset' } });
  assert.equal(R.appearance(unearned).theme, 'default');
});
test('background, unfocused, idle and delayed timers do not count as active reading', () => {
  const active = { elapsed:15000, visible:true, focused:true, reading:true, idle:1000 };
  assert.equal(R.activeSeconds(active), 15);
  for (const invalid of [{visible:false}, {focused:false}, {reading:false}, {idle:90001}, {elapsed:60000}, {elapsed:-1}]) assert.equal(R.activeSeconds({...active,...invalid}), 0);
});
test('completion requires 95% progress and local package keys do not create repeated completions', () => {
  let s = read(null, 300, 'sha256:same', day, .5);
  assert.equal(R.metrics(s).completed, 0);
  s = read(s, 15, 'sha256:same', day, .95);
  s = read(s, 100, 'sha256:same', '2026-10-18');
  assert.equal(R.metrics(s).completed, 1);
});
test('goals use the stated Brazil time zone and default state is empty per account', () => {
  assert.equal(R.dayKey(new Date('2026-10-18T01:00:00Z')), '2026-10-17');
  assert.equal(R.dayKey(new Date('2026-10-18T04:00:00Z')), '2026-10-18');
  assert.equal(R.normalize(null).totalSeconds, 0);
  assert.equal(R.normalize({ goal: -2 }).goal, 10);
});

test('XP recognizes existing mission progress and new cosmetics keep legacy unlocks', () => {
  const legacy = R.normalize({totalSeconds:1800,goalDays:2,books:{'work:old':{seconds:60,progress:1,completed:true}},appearance:{frame:'bronze',avatar:'owl',theme:'forest',layout:'compact'}});
  assert.equal(R.xp(legacy),500);
  assert.equal(R.appearance(legacy).frame,'bronze');
  assert.ok(R.available(legacy,'frame','verdant'));
  assert.ok(!R.available(legacy,'frame','flames'));
  assert.throws(()=>R.equip(legacy,'layout','showcase'));
  const earned=R.normalize({...legacy,totalSeconds:9000});
  assert.ok(R.available(earned,'layout','showcase'));
  assert.equal(R.appearance(R.equip(earned,'layout','showcase')).layout,'showcase');
});
test('weekly quest awards one persistent bonus and resets progress on Monday in Brazil', () => {
  let s = read(null,3600,'book','2026-10-18',.5);
  assert.equal(R.weekStart('2026-10-18'),'2026-10-12');
  assert.equal(R.weekly(s,'2026-10-18').done,true);
  assert.equal(Object.keys(s.weeklyWins).length,1);
  const before=R.xp(s);
  s=read(s,60,'book','2026-10-18',.5);
  assert.equal(R.xp(s),before+10);
  assert.equal(R.weekly(s,'2026-10-19').seconds,0);
  s=read(s,3600,'book','2026-10-19',.5);
  assert.equal(Object.keys(s.weeklyWins).length,2);
  const retained=R.normalize({...s,days:{}});
  assert.deepEqual(retained.weeklyWins,s.weeklyWins);
  assert.equal(R.xp(retained),R.xp(s));
});
test('all frame thresholds unlock automatically without spending XP', () => {
  let s=R.normalize({totalSeconds:180000});
  const before=R.xp(s);
  for(const frame of R.OPTIONS.frame.filter(o=>o.xp!==undefined)) {
    assert.ok(R.available(s,'frame',frame.id));
    s=R.equip(s,'frame',frame.id);
    assert.equal(R.appearance(s).frame,frame.id);
  }
  assert.equal(R.xp(s),before);
  assert.ok(!R.available(R.normalize(),'frame','dragon_frame'));
});

test('hero events rotate on Mondays and return after twelve weeks', () => {
  const s=R.normalize();
  assert.equal(R.event(s,'2026-10-25').set.id,'flash');
  assert.equal(R.event(s,'2026-10-26').set.id,'batman');
  assert.equal(R.event(s,'2027-01-11').set.id,'flash');
  assert.equal(R.MISSIONS.length,45);
  assert.equal(Object.values(R.OPTIONS).flat().filter(o=>o.set).length,72);
});
test('event rewards require this week reading and persist across rotation and serialization', () => {
  let s=read(null,600,'old','2026-10-18');
  s=read(s,15,'old','2026-10-19',.1);
  assert.equal(R.event(s,'2026-10-19').books,0);
  s=read(s,885,'old','2026-10-19');
  assert.equal(R.event(s,'2026-10-19').books,1);
  assert.ok(!R.available(s,'avatar','event_flash'));
  s=read(s,300,'second','2026-10-20');
  for(const kind of ['frame','avatar','theme']) {
    assert.ok(R.available(s,kind,'event_flash'));
    s=R.equip(s,kind,'event_flash');
  }
  const before=Object.keys(s.eventRewards).length;
  s=read(s,60,'second','2026-10-20');
  assert.equal(Object.keys(s.eventRewards).length,before);
  s=read(s,15,'old','2026-10-26');
  assert.equal(R.event(s,'2026-10-26').seconds,15);
  assert.equal(R.event(s,'2026-10-26').books,0);
  s=R.normalize(JSON.parse(JSON.stringify(s)));
  assert.equal(R.appearance(s).theme,'event_flash');
  assert.ok(!R.available(s,'theme','event_batman'));
  assert.deepEqual(R.normalize({eventRewards:{'theme:unknown':true}}).eventRewards,{});
});
test('event theme needs multiple active days even after time and books objectives', () => {
  let s=read(null,1140,'one','2026-10-19');
  s=read(s,60,'two','2026-10-19');
  assert.ok(R.available(s,'frame','event_flash'));
  assert.ok(R.available(s,'avatar','event_flash'));
  assert.ok(!R.available(s,'theme','event_flash'));
  s=read(s,285,'two','2026-10-20');
  assert.ok(!R.available(s,'theme','event_flash'));
  s=read(s,15,'two','2026-10-20');
  assert.ok(R.available(s,'theme','event_flash'));
});
test('Minhas Conquistas lists all unlocked frames and icons and equips them as global avatar', () => {
  let s = R.normalize();
  const initial = R.unlockedAchievements(s);
  assert.deepEqual(initial.frames.map(f => f.id), ['default', 'steel']);
  assert.deepEqual(initial.avatars.map(a => a.id), ['default', 'sentinel']);
  assert.equal(initial.totalUnlocked, 4);
  assert.equal(initial.equippedFrame.id, 'default');
  assert.equal(initial.equippedAvatar.id, 'default');

  s = read(s, 300, 'conto:noxus-trifarix', '2026-10-28', 1);
  s = R.advance(s, { id: 'conto:noxus-trifarix', seconds: 20, progress: 1, day: '2026-10-28', noxus: true });
  s = R.advance(s, { id: 'local:thundercats-v1-1', seconds: 20, progress: 1, day: '2026-10-28', thunderV1: true, hasV1Catalog: true });

  const unlocked = R.unlockedAchievements(s);
  assert.ok(unlocked.frames.some(f => f.id === 'bronze'));
  assert.ok(unlocked.frames.some(f => f.id === 'noxus_darius' && f.origin === 'Evento de Noxus'));
  assert.ok(unlocked.frames.some(f => f.id === 'thunder_liono' && f.origin === 'Evento ThunderCats'));
  assert.ok(unlocked.avatars.some(a => a.id === 'owl'));
  assert.ok(unlocked.avatars.some(a => a.id === 'noxus_darius' && a.origin === 'Evento de Noxus'));
  assert.ok(unlocked.pairs.some(p => p.id === 'noxus_darius'));

  s = R.equipGlobalAvatar(s, { kind: 'avatar', id: 'owl' });
  assert.equal(R.appearance(s).avatar, 'owl');
  assert.equal(R.unlockedAchievements(s).equippedAvatar.id, 'owl');

  s = R.equipGlobalAvatar(s, { kind: 'frame', id: 'thunder_liono' });
  assert.equal(R.appearance(s).frame, 'thunder_liono');
  assert.equal(R.unlockedAchievements(s).equippedFrame.id, 'thunder_liono');

  s = R.equipGlobalAvatar(s, { pairId: 'noxus_darius' });
  assert.equal(R.appearance(s).avatar, 'noxus_darius');
  assert.equal(R.appearance(s).frame, 'noxus_darius');
  assert.ok(R.unlockedAchievements(s).pairs.find(p => p.id === 'noxus_darius').equipped);

  assert.throws(() => R.equipGlobalAvatar(s, { kind: 'frame', id: 'dragon_frame' }));
  assert.throws(() => R.equipGlobalAvatar(s, { pairId: 'thunder_mummra' }));
});

