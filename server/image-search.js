'use strict';
const {HttpError}=require('./backend');
const cache=new Map();let lastRequest=0;
function imageURL(value){try{const u=new URL(value);return u.protocol==='https:'&&u.hostname==='cdn.myanimelist.net'?u.href:'';}catch{return '';}}
async function searchImages(body){
 const kind=body.kind||'anime',q=typeof body.q==='string'?body.q.trim():'';
 if(!['anime','manga'].includes(kind)||q.length<2||q.length>80)throw new HttpError(400,'Busque um anime ou mangá usando entre 2 e 80 caracteres.');
 const key=kind+':'+q.toLowerCase(),hit=cache.get(key);
 if(hit&&hit.until>Date.now())return hit.data;
 if(Date.now()-lastRequest<400)throw new HttpError(429,'Aguarde um instante antes de fazer outra busca.');
 lastRequest=Date.now();
 let response;try{response=await fetch('https://api.jikan.moe/v4/'+kind+'?'+new URLSearchParams({q,limit:'12',sfw:'true'}),{signal:AbortSignal.timeout(12000)});}catch{throw new HttpError(502,'A busca de imagens está indisponível. Tente novamente.');}
 if(!response.ok)throw new HttpError(response.status===429?429:502,response.status===429?'A busca atingiu o limite temporário. Tente novamente em alguns segundos.':'Não foi possível consultar as imagens agora.');
 const result=await response.json();
 const items=(result.data||[]).flatMap(item=>{
  const image=imageURL(item.images?.webp?.large_image_url)||imageURL(item.images?.jpg?.large_image_url);
  return image&&Number.isSafeInteger(item.mal_id)&&item.mal_id>0?[{id:String(item.mal_id),title:String(item.title||item.name||'Imagem').slice(0,160),image,source:`https://myanimelist.net/${kind}/${item.mal_id}`}]:[];
 });
 const data={items,provider:'Jikan / MyAnimeList'};
 if(cache.size>=100)cache.delete(cache.keys().next().value);
 cache.set(key,{until:Date.now()+600000,data});return data;
}
module.exports={searchImages,imageURL};
