/* Shared schedule validation and bounded active-reading progress. */
(function(root){
'use strict';
function validate(events){
 if(!Array.isArray(events)||events.length>50)throw new Error('Use no máximo 50 eventos.');
 const ids=new Set();
 for(const e of events){
  if(!e||!/^event-[a-z0-9-]{1,70}$/.test(e.id)||ids.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.title.length>100||!Number.isInteger(e.minutes)||e.minutes<1||e.minutes>10080||!['frame','avatar','theme'].includes(e.kind)||typeof e.reward!=='string'||e.reward.length>100)throw new Error('Evento inválido.');
  for(const key of ['start','end'])if(typeof e[key]!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e[key])||!Number.isFinite(Date.parse(e[key]))||new Date(e[key]).toISOString().slice(0,10)!==e[key])throw new Error('Data inválida.');
  if(e.start>e.end)throw new Error('O término deve ser posterior ao início.');ids.add(e.id);
 }
 return events;
}
function normalize(input){const out={};for(const [id,n] of Object.entries(input||{}).slice(0,100))if(/^event-[a-z0-9-]{1,70}$/.test(id)&&Number.isFinite(n))out[id]=Math.max(0,Math.min(604800,Math.floor(n)));return out;}
function advance(input,events,day,seconds){const out=normalize(input);for(const e of events)if(e.start<=day&&day<=e.end)out[e.id]=Math.min(e.minutes*60,(out[e.id]||0)+Math.max(0,Math.min(20,Math.floor(seconds)||0)));return out;}
const api={validate,normalize,advance};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQScheduledEvents=api;
})(globalThis);
