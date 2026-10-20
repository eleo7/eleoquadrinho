'use strict';
const {HttpError}=require('./backend');
let cache;
const safeImage=value=>{try{const u=new URL(value);return u.protocol==='https:'&&(u.hostname==='i.pinimg.com'||u.hostname.endsWith('.pinimg.com'))?u.href:'';}catch{return '';}};
async function wallpapers(){
 const token=process.env.PINTEREST_ACCESS_TOKEN,board=process.env.PINTEREST_BOARD_ID;
 if(!token||!/^\d+$/.test(board||''))return {configured:false,items:[],message:'O administrador precisa conectar um painel do Pinterest nas configurações da Vercel.'};
 if(cache&&cache.board===board&&cache.until>Date.now())return cache.data;
 let response;try{response=await fetch(`https://api.pinterest.com/v5/boards/${board}/pins?page_size=50`,{headers:{Authorization:`Bearer ${token}`},signal:AbortSignal.timeout(12000)});}catch{throw new HttpError(502,'Pinterest indisponível. Tente novamente mais tarde.');}
 if(!response.ok)throw new HttpError(502,response.status===401||response.status===403?'A autorização do Pinterest precisa ser revisada pelo administrador.':'Não foi possível carregar o painel do Pinterest.');
 const result=await response.json();
 const items=(result.items||[]).flatMap(pin=>{
  const images=Object.values(pin.media?.images||{}).sort((a,b)=>(b.width||0)-(a.width||0));
  const image=images.map(i=>safeImage(i.url)).find(Boolean);
  return image&&/^\d+$/.test(pin.id)?[{id:pin.id,title:String(pin.title||'Papel de parede').slice(0,150),image,source:`https://www.pinterest.com/pin/${pin.id}/`}]:[];
 });
 const data={configured:true,items};cache={board,until:Date.now()+300000,data};return data;
}
module.exports={wallpapers,safeImage};
