'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');const manifest=JSON.parse(fs.readFileSync('app/image-manifest.json','utf8')).images;
function boot(mode='fail'){
 const timers=new Map(),properties=new Map();let id=0,requests=0,current=mode;
 class Image{set src(value){this._src=value;if(!value)return;requests++;if(current==='hang'&&/casual\/taki/.test(value))return;queueMicrotask(()=>current==='fail'&&/cafe-v52/.test(value)?this.onerror?.():this.onload?.());}get src(){return this._src}async decode(){if(current==='decode'&&/casual\/taki/.test(this.src))throw Error('decode');}}
 const c={window:{RingImageManifest:manifest},Image,document:{documentElement:{style:{setProperty:(k,v)=>properties.set(k,v)}},querySelectorAll:()=>[]},setTimeout:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimeout:k=>timers.delete(k)};
 vm.runInNewContext(fs.readFileSync('app/asset-cache.js','utf8'),c);
 return {a:c.window.RingAssets,timers,properties,setMode:x=>current=x,requests:()=>requests};
}
(async()=>{
 const g=boot();await g.a.first();assert(g.a.ready);assert(g.a.failures.includes('assets/cafe-v52.png'));const count=g.requests();g.setMode('ok');await g.a.retryFailed();assert(g.requests()>count);assert.equal(g.a.failures.length,0);assert(g.a.url('assets/cafe-v52.png').includes('ring-retry='));
 await g.a.prefetch(Object.keys(manifest));assert(g.a.count<=10);assert(g.a.diagnostics().retainedRGBA<=24*1024*1024);
 for(const mode of ['hang','decode']){const h=boot(mode);let finished=false;const promise=h.a.first().then(()=>finished=true);for(let i=0;i<300&&!finished;i++){for(let settle=0;settle<20;settle++)await Promise.resolve();for(const[k,t]of [...h.timers]){h.timers.delete(k);t.fn();}}await promise;assert(finished);assert(h.a.ready);assert(h.a.failures.length>0);assert(h.a.diagnostics().failures.some(x=>x.code===(mode==='hang'?'TIMEOUT':'DECODE')));}
 const first=['assets/title-screen.png','assets/cafe-v52.png',...['taki','anon','tomori','soyo','rana'].map(x=>'assets/casual/'+x+'.png'),'assets/pico-taki-v52.png','assets/pico-guests-v52.png','assets/menu-atlas.png','assets/furniture-v52.png'];const bytes=first.reduce((n,k)=>n+manifest[k].bytes,0);assert(bytes<5e6,'first-play image budget');for(const row of Object.values(manifest))assert(fs.existsSync('app/'+row.url));
 console.log('PASS asset failure→recovery, bounded timeout/decode failure, 10-image/24MiB retained-resource budget and first-play image set '+bytes+' bytes (<5MB).');
})().catch(e=>{console.error(e);process.exitCode=1});
