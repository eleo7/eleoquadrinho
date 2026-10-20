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
 const api={collect};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQReleaseNews=api;
})(globalThis);
