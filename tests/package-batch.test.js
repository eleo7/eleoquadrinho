'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {run}=require('../js/package-batch');
test('packages run sequentially, continue after invalid file, and count duplicates',async()=>{
 let inFlight=0;const stored=new Set(),files=['a','broken','a','b'].map(name=>({name}));
 const result=await run(files,{unpack:async f=>{assert.equal(inFlight++,0);await Promise.resolve();inFlight--;if(f.name==='broken')throw Error('Invalid');return [f.name];},save:async books=>{const before=stored.size;books.forEach(b=>stored.add(b));return stored.size-before;}});
 assert.deepEqual(result.results.map(r=>r.added),[1,undefined,0,1]);assert.equal(result.results[2].duplicates,1);assert.equal(result.remaining,0);
});
test('cancel or account change after decoding prevents saving the next package',async()=>{
 let active=true,saved=0;
 const result=await run([{name:'one'},{name:'two'}],{unpack:async()=>{active=false;return [1];},save:async()=>++saved,active:()=>active});
 assert.equal(saved,0);assert.equal(result.remaining,2);assert.equal(result.stopped,true);
});
test('quota failures stop the queue and preserve completed package results',async()=>{
 let count=0;const result=await run([{name:'one'},{name:'two'},{name:'three'}],{unpack:async()=>[1],save:async()=>{if(count++)throw new DOMException('Full','QuotaExceededError');return 1;}});
 assert.equal(result.results[0].added,1);assert.equal(result.results[1].code,'QuotaExceededError');assert.equal(result.remaining,1);
});
