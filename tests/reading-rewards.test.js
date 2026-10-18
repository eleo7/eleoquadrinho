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
