const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),{PGlite}=require('@electric-sql/pglite');
test('direct transfer SQL isolates requests, approval, signaling and reader completion',async()=>{
 const db=new PGlite();try{
 await db.exec("create role anon;create role authenticated;create role service_role;create schema auth;create table auth.users(id uuid primary key,email text,raw_user_meta_data jsonb,raw_app_meta_data jsonb default '{}');");await db.exec(fs.readFileSync('supabase/schema.sql','utf8'));const sql=fs.readFileSync('supabase/transfers.sql','utf8');await db.exec(sql);await db.exec(sql);
 const admin='00000000-0000-4000-8000-000000000001',a='00000000-0000-4000-8000-000000000002',b='00000000-0000-4000-8000-000000000003';
 for(const [id,login]of [[admin,'admin'],[a,'reader'],[b,'other']])await db.query('insert into auth.users values($1,$2,$3,$4)',[id,login+'@test.org',{login,nome:login},{role:id===admin?'admin':'reader'}]);
 const rpc=async(actor,operation,payload={})=>(await db.query('select hq_transfer($1,$2,$3) as data',[actor,operation,payload])).rows[0].data;
 await db.exec('set role authenticated');await assert.rejects(rpc(a,'offers'),/permission denied/);await db.exec('reset role');
 await assert.rejects(rpc(a,'publish',{title:'bad',items:[]}),/Admin/);
 const offer=await rpc(admin,'publish',{title:'HQ',items:[{id:'local:1',titulo:'HQ'}]});await rpc(a,'request',{offer:offer.id});await rpc(a,'request',{offer:offer.id});
 const rows=await rpc(admin,'list');assert.equal(rows.length,1);const id=rows[0].id;
 assert.deepEqual(await rpc(b,'list'),[]);await assert.rejects(rpc(b,'signal',{id}),/Not allowed/);await assert.rejects(rpc(a,'accept',{id}),/Not allowed/);await assert.rejects(rpc(a,'signal',{id}),/Session expired/);
 await rpc(admin,'accept',{id});await rpc(admin,'signal',{id,signal:{type:'offer',sdp:'offer'}});assert.equal((await rpc(a,'signal',{id})).signal.sdp,'offer');await rpc(a,'signal',{id,signal:{type:'answer',sdp:'answer'}});assert.equal((await rpc(admin,'signal',{id})).signal.type,'answer');
 await assert.rejects(rpc(admin,'complete',{id}),/Invalid operation/);await rpc(a,'complete',{id});assert.equal((await rpc(admin,'list'))[0].status,'completed');await assert.rejects(rpc(a,'signal',{id}),/Session expired/);
 }finally{await db.close();}
});
