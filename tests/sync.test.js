'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { SyncDocument } = require('../js/account-client');
function storage() { const values = new Map(); return { getItem: k => values.get(k), setItem: (k,v) => values.set(k,v), removeItem: k => values.delete(k) }; }
test('saved data is available on a second device', async () => {
  let cloud = { data: {}, revision: 0 };
  const transport = async (_, method, body, id) => {
    assert.equal(id, 'reader');
    if (method !== 'PUT') return structuredClone(cloud);
    assert.equal(body.revision, cloud.revision);
    cloud = { data: structuredClone(body.data), revision: cloud.revision + 1 };
    return { revision: cloud.revision };
  };
  const first = new SyncDocument('state', 'reader', () => {}, transport, storage());
  await first.load(); first.update({ salvos: { book: true } }); await first.flush();
  const second = new SyncDocument('state', 'reader', () => {}, transport, storage());
  assert.deepEqual((await second.load()).salvos, { book: true });
});
test('network failure keeps a durable pending save and retries the same revision', async () => {
  const cache = storage(); let fail = true;
  const transport = async (_, method) => {
    if (method !== 'PUT') return { data: {}, revision: 0 };
    if (fail) throw new Error('Offline');
    return { revision: 1 };
  };
  const doc = new SyncDocument('state', 'alice', () => {}, transport, cache);
  await doc.load(); doc.update({ salvos: { book: true } });
  await assert.rejects(doc.flush(), /Offline/);
  assert.ok(cache.getItem(doc.key)); assert.equal(doc.dirty, true);
  fail = false; await doc.flush(); assert.equal(doc.dirty, false); assert.equal(cache.getItem(doc.key), undefined);
});
test('conflicts retain the pending data for backup without overwriting the cloud', async () => {
  const cache = storage();
  cache.setItem('eq:pending:alice:state', JSON.stringify({ data: { salvos: { pending: true } }, revision: 0 }));
  const doc = new SyncDocument('state', 'alice', () => {}, async () => ({ data: { salvos: { cloud: true } }, revision: 1 }), cache);
  assert.deepEqual((await doc.load()).salvos, { pending: true });
  assert.equal(doc.conflict, true); await assert.rejects(doc.flush(), /conflito/);
  assert.ok(cache.getItem(doc.key));
});
test('pending data is not loaded into a different account', async () => {
  const cache = storage(); cache.setItem('eq:pending:alice:state', JSON.stringify({ data: { salvos: { secret: true } }, revision: 0 }));
  const doc = new SyncDocument('state', 'bob', () => {}, async () => ({ data: {}, revision: 0 }), cache);
  assert.deepEqual(await doc.load(), {});
});
test('updates made during a request are saved after that request completes', async () => {
  let release; let calls = 0;
  const doc = new SyncDocument('state', 'alice', () => {}, async (_, method, body) => {
    if (method !== 'PUT') return { data: {}, revision: 0 };
    calls++;
    if (calls === 1) await new Promise(resolve => { release = resolve; });
    else { assert.equal(body.revision, 1); assert.deepEqual(body.data.salvos, { second: true }); }
    return { revision: calls };
  }, storage());
  await doc.load(); doc.update({ salvos: { first: true } }); const saving = doc.flush();
  doc.update({ salvos: { second: true } }); release(); await saving;
  assert.equal(calls, 2); assert.equal(doc.dirty, false);
});

test('oversized local reader bookmarks sync without duplicating images or files and preserve progress/rewards',async()=>{
 const {prepareReaderState}=require('../js/account-client');
 const image='data:image/jpeg;base64,'+'A'.repeat(150000);
 const book={id:'local:big',titulo:'Minha HQ',colecao:'dc',serieId:'serie:1',localOnly:true,capa:image,paginas:Array(20).fill(image),textoLore:'local story',blobs:[{}]};
 const data={historico:[{id:book.id,item:book,prog:.72,pos:14,quando:123}],salvos:{[book.id]:book},prefs:{readingRewards:{totalSeconds:900},personalShelves:{Favoritas:[book.id]}}};
 const before=JSON.stringify(data);let saved;
 const cache=storage();cache.setItem('eq:pending:reader:state',JSON.stringify({data,revision:2}));
 const transport=async(_,method,body)=>{if(method==='GET')return{data:{},revision:2};assert.ok(Buffer.byteLength(JSON.stringify(body))<2000000);saved=body.data;return{revision:3};};
 const doc=new SyncDocument('state','reader',()=>{},transport,cache);await doc.load();await doc.flush();
 assert.equal(saved.historico[0].pos,14);assert.equal(saved.historico[0].prog,.72);assert.equal(saved.salvos[book.id].serieId,'serie:1');assert.deepEqual(saved.prefs,data.prefs);assert.equal(saved.salvos[book.id].paginas,undefined);assert.equal(saved.salvos[book.id].capa,undefined);
 assert.equal(JSON.stringify(data),before);assert.equal(cache.getItem(doc.key),undefined);assert.equal(doc.dirty,false);
 const shared={salvos:{x:{id:'ext:x',textoLore:'Shared story',capa:'https://example.com/cover.jpg',paginas:['https://example.com/page.jpg']}}};assert.deepEqual(prepareReaderState(shared),shared);
});
