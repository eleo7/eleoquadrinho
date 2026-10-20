'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const P=require('../server/pinterest'),T=require('../js/universe-tree');
test('cover URLs reject executable schemes and CSS delimiters',()=>{
 for(const url of ['javascript:alert(1)','http://site.test/a.jpg','https://site.test/a\')','https://site.test/a b'])assert.equal(T.safeCover(url),false);
 assert.ok(T.safeCover('https://images.example/a.jpg?q=2'));
});
test('Pinterest stays unconfigured without credentials and only returns trusted images',async()=>{
 const oldFetch=global.fetch,oldToken=process.env.PINTEREST_ACCESS_TOKEN,oldBoard=process.env.PINTEREST_BOARD_ID;
 try{
 delete process.env.PINTEREST_ACCESS_TOKEN;delete process.env.PINTEREST_BOARD_ID;
 assert.equal((await P.wallpapers()).configured,false);
 process.env.PINTEREST_ACCESS_TOKEN='test-token';process.env.PINTEREST_BOARD_ID='1234';
 global.fetch=async(url,options)=>{assert.ok(url.includes('/boards/1234/pins'));assert.equal(options.headers.Authorization,'Bearer test-token');return Response.json({items:[{id:'5',title:'Landscape',media:{images:{large:{url:'https://i.pinimg.com/a.jpg',width:1000}}}},{id:'6',media:{images:{large:{url:'https://evil.test/a.jpg'}}}}]});};
 const result=await P.wallpapers();assert.equal(result.items.length,1);assert.equal(result.items[0].source,'https://www.pinterest.com/pin/5/');assert.ok(!JSON.stringify(result).includes('test-token'));
 }finally{global.fetch=oldFetch;for(const [k,v] of [['PINTEREST_ACCESS_TOKEN',oldToken],['PINTEREST_BOARD_ID',oldBoard]]){if(v===undefined)delete process.env[k];else process.env[k]=v;}}
});
