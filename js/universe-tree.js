/* Shared catalog organization. Collection IDs remain stable for access and history. */
(function(root){
  'use strict';
  const myths=['grega','nordica','egipcia','japonesa','folclore','ioruba','asteca','hindu','celta'];
  const collections=['hqs-lol','cronicas-lol','lol','runeterra','lor','marvel','dc','originais',...myths,'arquivo'];
  function validate(nodes){
    if(!Array.isArray(nodes)||nodes.length>100||!nodes.length)throw new Error('Lista de universos inválida.');
    const ids=new Set(),cols=new Set();
    for(const n of nodes){
      if(!n||typeof n.id!=='string'||!/^u-[a-z0-9-]{1,70}$/.test(n.id)||ids.has(n.id)||typeof n.nome!=='string'||!n.nome.trim()||n.nome.length>80||typeof n.parent!=='string'||!Array.isArray(n.cols)||Object.keys(n).some(k=>!['id','nome','parent','cols'].includes(k)))throw new Error('Universo inválido ou repetido.');
      ids.add(n.id);
      for(const c of n.cols){if(!collections.includes(c)||cols.has(c))throw new Error('Coleção inválida ou duplicada.');cols.add(c);}
    }
    if(cols.size!==collections.length)throw new Error('Transfira as coleções antes de excluir um universo.');
    for(const n of nodes){const visited=new Set([n.id]);let parent=n.parent;while(parent){if(!ids.has(parent)||visited.has(parent))throw new Error('Destino inválido: pastas não podem conter a si mesmas.');visited.add(parent);parent=nodes.find(v=>v.id===parent).parent;}}
    return nodes;
  }
  function defaults(base){return [...base.map(n=>({id:n.id,nome:n.nome,parent:myths.some(c=>n.cols.includes(c))?'u-mitologias':'',cols:[...n.cols]})),{id:'u-mitologias',nome:'Mitologias',parent:'',cols:[]}];}
  function change(input,action){
    const nodes=JSON.parse(JSON.stringify(input)),source=nodes.find(n=>n.id===action.id),target=nodes.find(n=>n.id===action.target);
    if(action.type==='create')nodes.push({id:action.id,nome:action.nome.trim(),parent:action.parent||'',cols:[]});
    else {
      if(!source)throw new Error('Universo não encontrado.');
      if(action.type==='edit'){source.nome=action.nome.trim();source.parent=action.parent||'';}
      else if(action.type==='merge'){
        if(!target||target===source)throw new Error('Escolha outro universo de destino.');
        let ancestor=target;while(ancestor){if(ancestor.id===source.id)throw new Error('Não é possível unificar com uma subpasta própria.');ancestor=nodes.find(n=>n.id===ancestor.parent);}
        target.cols.push(...source.cols);nodes.filter(n=>n.parent===source.id).forEach(n=>n.parent=target.id);nodes.splice(nodes.indexOf(source),1);
      }else if(action.type==='delete'){
        if(source.cols.length||nodes.some(n=>n.parent===source.id))throw new Error('Pasta com conteúdo. Unifique com outro universo antes de excluir.');
        nodes.splice(nodes.indexOf(source),1);
      }else throw new Error('Operação inválida.');
    }
    return validate(nodes);
  }
  const api={myths,collections,validate,defaults,change};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EQUniverseTree=api;
})(globalThis);
