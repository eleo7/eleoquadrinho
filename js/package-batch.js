/* Sequential package imports: bounded memory, per-file results and safe cancellation. */
(function(root){
 'use strict';
 async function run(files,{unpack,save,active=()=>true,progress=()=>{}}){
  const results=[];let stopped=false;
  for(let index=0;index<files.length;index++){
   if(!active()){stopped=true;break;}
   const file=files[index];progress({index,total:files.length,name:file.name});
   try{
    const books=await unpack(file);
    if(!active()){stopped=true;break;}
    const added=await save(books);
    results.push({name:file.name,added,duplicates:books.length-added});
   }catch(error){
    results.push({name:file.name,error:error.message||'Falha ao importar.',code:error.name});
    if(error.name==='QuotaExceededError'||error instanceof RangeError||!active()){stopped=true;break;}
   }
  }
  return {results,remaining:files.length-results.length,stopped};
 }
 const api={run};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQPackageBatch=api;
})(globalThis);
