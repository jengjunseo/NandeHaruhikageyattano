'use strict';
window.RingAssets=(()=>{
 const intro=['assets/casual/taki.png','assets/casual/anon.png','assets/casual/tomori.png','assets/casual/soyo.png','assets/casual/rana.png','assets/cafe-v52.png'];
 const service=['assets/pico-taki-v52.png','assets/pico-guests-v52.png','assets/menu-atlas.png','assets/furniture-v52.png'];
 const states=new Map(),decoded=new Map(),inFlight=new Map(),cancellations=new Map();let pinned=new Set(intro),attempts=0;
 const limit=24*1024*1024,maxImages=10,timeoutMs=6000;
 const timer=typeof setTimeout==='function'?setTimeout:null,clear=typeof clearTimeout==='function'?clearTimeout:null;
 const variable=path=>'--ring-'+path.replace(/[^a-z0-9]/gi,'-');
 const manifest=()=>window.RingImageManifest||{};
 function preferred(path){const entry=manifest()[path];return entry?(entry.small&&typeof innerWidth==='number'&&innerWidth<=600?entry.small:entry.url):path;}
 function url(path){return states.get(path)?.activeURL||preferred(path);}
 function publish(path,activeURL){if(typeof document!=='undefined')document.documentElement?.style?.setProperty(variable(path),'url("'+activeURL+'")');}
 function trim(){let bytes=[...decoded.values()].reduce((n,x)=>n+x.bytes,0);for(const[path,item]of decoded){if(decoded.size<=maxImages&&bytes<=limit)break;if(pinned.has(path))continue;decoded.delete(path);bytes-=item.bytes;}for(const[path,item]of decoded){if(decoded.size<=maxImages&&bytes<=limit)break;decoded.delete(path);bytes-=item.bytes;}}
 function request(source){return new Promise((resolve,reject)=>{
  const img=new Image();img.decoding='async';img.loading='eager';let settled=false,clock;
  const requestId=++attempts;
  function finish(error){if(settled)return;settled=true;cancellations.delete(requestId);if(clock)clear?.(clock);img.onload=null;img.onerror=null;error?reject(error):resolve(img);}
  cancellations.set(requestId,()=>{finish(Object.assign(Error('이미지 준비 취소'),{code:'CANCELLED'}));try{img.src=''}catch{}});
  img.onload=async()=>{try{if(typeof img.decode==='function')await img.decode();finish();}catch{finish(Object.assign(Error('이미지 디코딩 실패'),{code:'DECODE'}));}};
  img.onerror=()=>finish(Object.assign(Error('이미지 연결 실패'),{code:'NETWORK'}));
  if(timer)clock=timer(()=>{finish(Object.assign(Error('이미지 대기 시간 초과'),{code:'TIMEOUT'}));try{img.src=''}catch{}},timeoutMs);
  img.src=source;
 });}
 async function load(path,force=false){
  if(inFlight.has(path))return inFlight.get(path);
  if(!force&&decoded.has(path)){const cached=decoded.get(path);decoded.delete(path);decoded.set(path,cached);return cached.image;}
  if(!force&&states.get(path)?.status==='failed')return null;
  const prior=states.get(path),attempt=(prior?.attempt||0)+1;
  const pending=(async()=>{
   const primary=preferred(path)+(force?(preferred(path).includes('?')?'&':'?')+'ring-retry='+attempt:'');
   let image,activeURL=primary,errorCode=null,fallback=false;
   try{image=await request(primary);}catch(error){errorCode=error.code||'NETWORK';
    if(error.code!=='CANCELLED'&&primary!==path){try{activeURL=path;image=await request(path);fallback=true;}catch{}}
   }
   if(!image){states.set(path,{status:'failed',code:errorCode,attempt,activeURL:prior?.activeURL});return null;}
   const meta=manifest()[path],bytes=(image.naturalWidth||meta?.width||1)*(image.naturalHeight||meta?.height||1)*4;
   decoded.set(path,{image,bytes});states.set(path,{status:fallback?'fallback':'ready',code:errorCode,attempt,activeURL});publish(path,activeURL);trim();return image;
  })().finally(()=>inFlight.delete(path));inFlight.set(path,pending);return pending;
 }
 async function group(paths,onProgress=()=>{},concurrency=2){let next=0,done=0;onProgress(0,paths.length);const worker=async()=>{while(next<paths.length){await load(paths[next++]);onProgress(++done,paths.length);}};await Promise.all(Array.from({length:Math.min(concurrency,paths.length)},worker));return true;}
 function first(progress){return group(intro,progress,6);}
 function ensure(progress){return group([...intro,...service],progress);}
 function prefetch(paths=[]){return group(paths);}
 function prepareScene(paths){pinned=new Set(paths);return group(paths).then(()=>trim());}
 async function retryFailed(){const paths=[...states].filter(([,x])=>x.status!=='ready').map(([path])=>path);let next=0;const worker=async()=>{while(next<paths.length)await load(paths[next++],true);};await Promise.all([worker(),worker()]);if(typeof document!=='undefined')hydrate(document);return {remaining:failures().length};}
 function failures(){return [...states].filter(([,x])=>x.status!=='ready').map(([path])=>path);}
 function hydrate(stage){
  if(!stage?.querySelectorAll)return;
  stage.querySelectorAll('.vn-slot img.vn-actor').forEach(node=>{
   const logical=node.getAttribute('data-ring-asset')||node.getAttribute('src'),entry=decoded.get(logical);if(!entry)return;
   // Each stage owns its display node. The cached resource never migrates
   // between two visible slots, so comparison/transition scenes cannot steal it.
   const active=url(logical);if(node.getAttribute('src')!==active)node.src=active;
  });
 }
 return {first,ensure,prefetch,prepareScene,prepareService:()=>group(service),retryFailed,hydrate,url,variable,cancelPending:()=>{for(const cancel of [...cancellations.values()])cancel();},
  diagnostics:()=>({attempts,decoded:decoded.size,retainedRGBA:[...decoded.values()].reduce((n,x)=>n+x.bytes,0),limit,maxImages,failures:[...states].filter(([,x])=>x.status!=='ready').map(([path,x])=>({path,status:x.status,code:x.code})),timeoutMs}),
  get failures(){return failures();},get ready(){return intro.every(path=>states.has(path));},get count(){return decoded.size;},get degraded(){return failures().length>0;}};
})();
