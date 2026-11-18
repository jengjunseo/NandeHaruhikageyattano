'use strict';
window.RingAssets=(()=>{
 const paths=[
  'assets/casual/taki.png','assets/casual/anon.png','assets/casual/tomori.png','assets/casual/soyo.png','assets/casual/rana.png','assets/casual/emotes.png',
  'assets/cafe.png','assets/cafe-display-upgraded.png','assets/vn-rehearsal.png','assets/vn-stage.png',
  'assets/sakiko.png','assets/mutsumi.png','assets/uika.png','assets/umiri.png','assets/nyamu.png',
  'assets/haru-vn.png','assets/mei-vn.png','assets/jun-vn.png','assets/taki-chibi.png','assets/menu-atlas.png',
  'assets/visitor-teal.png','assets/visitor-rust.png','assets/visitor-mei.png','assets/furniture-v51.png'
 ];
 const critical=['assets/casual/taki.png','assets/cafe.png'];
 const decoded=new Map(),inFlight=new Map();let pending=null,background=null;
 function load(path){
  if(decoded.has(path))return Promise.resolve(decoded.get(path));
  if(inFlight.has(path))return inFlight.get(path);
  const request=(async()=>{
   const img=new Image();img.decoding='sync';img.loading='eager';
   const loaded=new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('이미지를 불러오지 못했습니다.'))});
   img.src=path;
   await loaded;
   if(typeof img.decode==='function')await img.decode();
   decoded.set(path,img);
   return img;
  })().finally(()=>inFlight.delete(path));
  inFlight.set(path,request);
  return request;
 }
 async function first(onProgress=()=>{}){
  let done=0;
  onProgress(0,critical.length);
  await Promise.all(critical.map(async path=>{await load(path);onProgress(++done,critical.length)}));
  prefetch();
 }
 function prefetch(){
  if(background)return background;
  background=(async()=>{
   for(const group of [paths.slice(0,6),paths.slice(18),paths.slice(6,18)]){
    for(let i=0;i<group.length;i+=4)await Promise.allSettled(group.slice(i,i+4).map(load));
   }
  })().finally(()=>{background=null});
  return background;
 }
 function ensure(onProgress=()=>{}){
  if(pending)return pending;
  pending=(async()=>{let next=0,done=0;onProgress(0,paths.length);const worker=async()=>{while(next<paths.length){await load(paths[next++]);onProgress(++done,paths.length)}};await Promise.all(Array.from({length:4},worker));return true})().catch(error=>{pending=null;throw error});
  return pending;
 }
 // Transfer the already-decoded Image itself, rather than creating a new image
 // and waiting for another paint/decode when a character enters the scene.
 function hydrate(stage){
  if(!stage?.querySelectorAll)return;
  stage.querySelectorAll('.vn-slot img.vn-actor').forEach(placeholder=>{
   const source=placeholder.getAttribute('src'),image=decoded.get(source);if(!image||image===placeholder)return;
   image.className=placeholder.className;image.alt=placeholder.alt;image.setAttribute('data-legacy-src',placeholder.getAttribute('data-legacy-src')||'');image.draggable=false;placeholder.replaceWith(image);
  });
 }
 return {ensure,first,prefetch,hydrate,get ready(){return paths.every(path=>decoded.has(path))},get count(){return decoded.size}};
})();
