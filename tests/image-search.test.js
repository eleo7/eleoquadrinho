'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const S=require('../server/image-search');
test('free image search validates input, limits content, sanitizes results and caches requests',async()=>{
 await assert.rejects(()=>S.searchImages({q:'a'}));await assert.rejects(()=>S.searchImages({kind:'unknown',q:'test'}));
 const old=global.fetch;let calls=0;
 try{
 global.fetch=async url=>{calls++;const u=new URL(url);assert.equal(u.hostname,'api.jikan.moe');assert.equal(u.searchParams.get('sfw'),'true');assert.equal(u.searchParams.get('limit'),'12');return Response.json({data:[{mal_id:20,title:'Naruto',images:{jpg:{large_image_url:'https://cdn.myanimelist.net/images/anime/a.jpg'}}},{mal_id:30,images:{jpg:{large_image_url:'https://evil.test/a.jpg'}}}]});};
 const r=await S.searchImages({q:'Naruto',kind:'anime'});assert.equal(r.items.length,1);assert.equal(r.items[0].source,'https://myanimelist.net/anime/20');
 await S.searchImages({q:'naruto',kind:'anime'});assert.equal(calls,1);
 assert.equal(S.imageURL('javascript:alert(1)'), '');
 }finally{global.fetch=old;}
});
