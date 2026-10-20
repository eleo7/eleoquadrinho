/* Per-account discovery; callers supply only content already allowed for this reader. */
(function(root){
 'use strict';
 function collect(previous,works,rewards){
  const before=previous&&Array.isArray(previous.works)&&Array.isArray(previous.rewards)?previous:null;
  const unique=items=>[...new Map(items.filter(x=>x&&typeof x.id==='string').map(x=>[x.id,x])).values()];
  const allWorks=unique(works),allRewards=unique(rewards);
  const newWorks=allWorks.filter(x=>!before?.works.includes(x.id));
  const newRewards=allRewards.filter(x=>before?!before.rewards.includes(x.id):x.epic);
  return {first:!before,works:newWorks,rewards:newRewards,snapshot:{works:[...new Set([...(before?.works||[]),...allWorks.map(x=>x.id)])].slice(-20000),rewards:[...new Set([...(before?.rewards||[]),...allRewards.map(x=>x.id)])].slice(-2000)}};
 }
 function spotlight(previous,available,added){
  const known=new Set(available.map(o=>o.id));
  const dismissed=[...new Set(Array.isArray(previous?.dismissed)?previous.dismissed:[])].filter(id=>typeof id==='string').slice(-2000);
  const initial=previous?.initialized?[]:available.filter(o=>o.epic).map(o=>o.id);
  const pending=[...new Set([...(Array.isArray(previous?.pending)?previous.pending:[]),...initial,...added.map(o=>o.id)])].filter(id=>known.has(id)&&!dismissed.includes(id));
  return {initialized:true,pending,dismissed};
 }
 function dismissSpotlight(state){return {...state,pending:[],dismissed:[...new Set([...state.dismissed,...state.pending])].slice(-2000)};}
 const api={collect,spotlight,dismissSpotlight};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQReleaseNews=api;
})(globalThis);
