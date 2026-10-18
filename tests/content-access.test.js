const {test}=require('node:test');
const assert=require('node:assert/strict');
const A=require('../js/content-access');
test('new accounts default to all universes and all categories',()=>{
  assert.equal(A.normalize().mode,'standard');
  assert.ok(A.allowed({tipo:'conto',colecao:'grega'}));
});
test('alternative filters intersect universes and categories and allow empty selection',()=>{
  const p={mode:'alternative',universes:['marvel','dc'],categories:['manga']};
  assert.ok(A.allowed({colecao:'dc',formatoObra:'Mangá'},p));
  assert.ok(!A.allowed({colecao:'dc',formatoObra:'HQ'},p));
  assert.ok(!A.allowed({colecao:'arquivo',formatoObra:'Mangá'},p));
  assert.ok(!A.allowed({colecao:'dc'}, {...p,categories:[]}));
  assert.ok(A.allowed({colecao:'arquivo'},p,'admin'));
});
test('classification recognizes unlabelled text and bundled manga',()=>{
  assert.equal(A.category({formato:'epub'}),'lore');
  assert.equal(A.category({titulo:'Akira — Coleção Completa'}),'manga');
  assert.equal(A.universe({colecao:'cronicas-lol'}),'lol');
});
