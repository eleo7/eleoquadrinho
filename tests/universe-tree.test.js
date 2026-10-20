'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const T=require('../js/universe-tree'),Access=require('../js/content-access');
const base=T.collections.map(c=>({id:'u-'+c,nome:c,cols:[c]}));
test('default mythology grouping preserves every collection exactly once',()=>{
 const nodes=T.defaults(base);T.validate(nodes);
 assert.equal(nodes.filter(n=>n.parent==='u-mitologias').length,9);
 assert.deepEqual(nodes.flatMap(n=>n.cols).sort(),[...T.collections].sort());
});
test('create, transfer, rename, merge and delete preserve collections and reject cycles',()=>{
 const original=T.defaults(base);
 let nodes=T.change(original,{type:'create',id:'u-custom',nome:'Minhas histórias'});
 nodes=T.change(nodes,{type:'edit',id:'u-grega',nome:'Grécia',parent:'u-custom'});
 assert.equal(nodes.find(n=>n.id==='u-grega').parent,'u-custom');
 assert.throws(()=>T.change(nodes,{type:'edit',id:'u-custom',nome:'Novo',parent:'u-grega'}));
 assert.throws(()=>T.change(nodes,{type:'merge',id:'u-custom',target:'u-grega'}));
 assert.throws(()=>T.change(nodes,{type:'delete',id:'u-grega'}));
 nodes=T.change(nodes,{type:'merge',id:'u-grega',target:'u-custom'});
 assert.deepEqual(nodes.find(n=>n.id==='u-custom').cols,['grega']);
 nodes=T.change(nodes,{type:'merge',id:'u-custom',target:'u-mitologias'});
 nodes=T.change(nodes,{type:'create',id:'u-empty',nome:'Vazio'});
 nodes=T.change(nodes,{type:'delete',id:'u-empty'});
 assert.deepEqual(nodes.flatMap(n=>n.cols).sort(),[...T.collections].sort());
 assert.equal(original.find(n=>n.id==='u-grega').parent,'u-mitologias');
});
test('catalog organization retains original access restrictions',()=>{
 const nodes=T.defaults(base),policy={mode:'alternative',universes:['grega'],categories:['lore']};
 const data=Access.filterCatalog({universes:nodes,externas:[{id:'a',colecao:'grega',formatoObra:'Lore'},{id:'b',colecao:'nordica',formatoObra:'Lore'}]},policy,'reader');
 assert.deepEqual(data.universes,nodes);assert.deepEqual(data.externas.map(x=>x.id),['a']);
 assert.throws(()=>T.validate(nodes.map(n=>({...n,cols:[]}))));
 assert.throws(()=>T.validate([...nodes,nodes[0]]));
});
