(function(root){
'use strict';
const SETS=[['liono','Lion-O','#ffc247','#40121b'],['tygra','Tygra','#54cbff','#172c36'],['cheetara','Cheetara','#ffe281','#412b16'],['panthro','Panthro','#89baff','#182036'],['mummra','Mumm-Ra','#b6ff87','#291839']].map(([id,label,light,dark],index)=>({id:'thunder_'+id,label,light,dark,index}));
const OPTIONS=Object.fromEntries(['frame','avatar','theme'].map(kind=>[kind,SETS.map(s=>({id:s.id,label:'ThunderCats · '+s.label,event:true,epic:true,thunder:true,art:kind==='avatar',release:'2026-10-28'}))]));
function normalize(input){const out={};for(const kind of ['daily','weekly']){const v=input?.[kind];if(v&&typeof v.key==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.key)&&Number.isFinite(Date.parse(v.key)))out[kind]={key:v.key,reward:typeof v.reward==='string'?v.reward:''};}return out;}
function draw(state,{day,week,seed=''}){
 if(day<'2026-10-28')return;
 for(const [kind,key,seconds,target]of [['daily',day,state.days[day]?.seconds||0,600],['weekly',week,Object.entries(state.days).filter(([d])=>d>=week&&d<=day&&d>='2026-10-28').reduce((n,[,v])=>n+v.seconds,0),3600]]){
  if(seconds<target||state.thunderDraws[kind]?.key===key)continue;
  const pool=Object.entries(OPTIONS).flatMap(([k,items])=>items.map(o=>k+':'+o.id)).filter(id=>!state.eventRewards[id]);
  let hash=2166136261;for(const c of seed+kind+key)hash=Math.imul(hash^c.charCodeAt(0),16777619)>>>0;
  const reward=pool.length?pool[hash%pool.length]:'';state.thunderDraws[kind]={key,reward};if(reward)state.eventRewards[reward]=true;
 }
}
const api={SETS,OPTIONS,normalize,draw};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQThunderRewards=api;
})(globalThis);
