'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { PGlite } = require('@electric-sql/pglite');

test('SQL migration, reserved administrator, row security and atomic state writes', async () => {
  const db = new PGlite();
  try {
    // Supabase supplies these roles and the auth schema in production.
    await db.exec(`
      create role anon; create role authenticated; create role service_role bypassrls;
      create schema auth;
      create table auth.users (id uuid primary key, email text, raw_user_meta_data jsonb, raw_app_meta_data jsonb default '{}');
    `);
    await db.exec(fs.readFileSync(require.resolve('../supabase/schema.sql'), 'utf8'));
    const alice = '00000000-0000-4000-8000-000000000001';
    const bob = '00000000-0000-4000-8000-000000000002';
    const admin = '00000000-0000-4000-8000-000000000003';
    const reserved = '00000000-0000-4000-8000-000000000004';
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [alice, 'alice@example.org', { login: 'alice', role: 'admin', nome: 'Alice' }]);
    await db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [bob, 'bob@example.org', { login: 'bob', nome: 'Bob' }]);
    assert.equal((await db.query('select role from profiles where id=$1', [alice])).rows[0].role, 'reader');
    await assert.rejects(db.query('insert into auth.users(id,email,raw_user_meta_data) values ($1,$2,$3)', [reserved, 'reserved@example.org', { login: 'Eleo7', role: 'admin' }]), /Reserved login/);
    await db.query('insert into auth.users(id,email,raw_user_meta_data,raw_app_meta_data) values ($1,$2,$3,$4)', [admin, 'admin@example.org', { login: 'Eleo7', nome: 'Eleo7' }, { role: 'admin' }]);
    assert.equal((await db.query('select role from profiles where id=$1', [admin])).rows[0].role, 'admin');
    assert.equal((await db.query('select count(*)::int as n from reader_state')).rows[0].n, 3);
    await db.exec('set role authenticated');
    await assert.rejects(db.query('select * from profiles'), /permission denied/);
    await assert.rejects(db.query("update profiles set role='admin'"), /permission denied/);
    await assert.rejects(db.query('select * from reader_state'), /permission denied/);
    await assert.rejects(db.query('select save_account_data($1,false,0,$2)', [alice, {}]), /permission denied/);
    await db.exec('reset role; set role service_role');
    const save = async (id, catalog, revision, data) => (await db.query('select save_account_data($1,$2,$3,$4) as revision', [id, catalog, revision, data])).rows[0].revision;
    assert.equal(await save(alice, false, 0, { salvos: { book: true } }), 1);
    assert.equal(await save(alice, false, 0, { salvos: {} }), null);
    assert.deepEqual((await db.query('select data from reader_state where user_id=$1', [bob])).rows[0].data, {});
    await assert.rejects(save(alice, true, 0, { externas: [] }), /Admin required/);
    assert.equal(await save(admin, true, 0, { externas: [] }), 1);
    await db.exec('reset role');
    await db.query('update auth.users set email=$2 where id=$1', [alice, 'new@example.org']);
    assert.equal((await db.query('select email from profiles where id=$1', [alice])).rows[0].email, 'new@example.org');
  } finally { await db.close(); }
});
