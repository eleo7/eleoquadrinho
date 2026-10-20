'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const V=require('../js/library-view');
const items=[{id:'a',titulo:'Edição 10',heroiNome:'Amazônia'},{id:'b',titulo:'Edição 2',serieNome:'Lendas'},{id:'c',titulo:'Outro'}],history=[{id:'a',prog:.4},{id:'b',prog:1}];
test('library searches normalized titles, heroes and series, preserving original items',()=>{
 assert.deepEqual(V.select(items,{query:'amazonia'},history).map(i=>i.id),['a']);
 assert.deepEqual(V.select(items,{query:'lendas'},history).map(i=>i.id),['b']);
 assert.deepEqual(V.select(items,{sort:'title'},history).map(i=>i.id),['b','a','c']);
 assert.deepEqual(items.map(i=>i.id),['a','b','c']);
});
test('library reading filters and progress order use each work history',()=>{
 for(const [status,id]of [['reading','a'],['finished','b'],['unread','c']])assert.deepEqual(V.select(items,{status},history).map(i=>i.id),[id]);
 assert.deepEqual(V.select(items,{sort:'progress'},history).map(i=>i.id),['b','a','c']);
 assert.equal(V.select(items,{query:'not found'}).length,0);
});
