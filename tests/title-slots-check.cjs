const fs=require('fs'),vm=require('vm'),assert=require('assert');
let raw=new Map(),rejectWrites=false;const storage={getItem:k=>raw.get(k)??null,setItem(k,v){if(rejectWrites)throw Error('quota');raw.set(k,v)}};
class Audio{constructor(){this.paused=true}pause(){this.paused=true}play(){this.paused=false;return Promise.resolve()}}
const context={window:{},Audio,localStorage:storage,Date,Intl,JSON,Number,Math};vm.createContext(context);vm.runInContext(fs.readFileSync('dist/title-menu.js','utf8'),context);const Slots=context.window.RingSaveSlots;
const validate=s=>!!s&&Number.isInteger(s.day)&&s.day>=1&&Number.isFinite(s.money)&&typeof s.pendingStory==='object';
const store=new Slots(storage,validate);assert.equal(store.read().length,5);assert(store.read().every(x=>x===null));
for(let i=0;i<5;i++){const state={day:i+1,money:4500+i,pendingStory:{id:'intro',index:i,choice:null}};store.put(i,state);state.pendingStory.index=99;assert.equal(store.get(i).state.pendingStory.index,i,'slot stores a detached snapshot')}
assert.equal(new Slots(storage,validate).get(4).state.day,5,'all five slots survive reconstruction');
const before=raw.get(store.key);assert.throws(()=>store.put(5,{day:1,money:0,pendingStory:null}));assert.equal(raw.get(store.key),before);
rejectWrites=true;assert.throws(()=>store.put(0,{day:9,money:100,pendingStory:null}));assert.equal(raw.get(store.key),before,'a failed overwrite leaves the old slot intact');rejectWrites=false;
raw.set(store.key,'broken');assert.throws(()=>store.read());assert.throws(()=>store.put(0,{day:1,money:0,pendingStory:null}));assert.equal(raw.get(store.key),'broken','corrupt slot envelope is preserved');
raw.set(store.key,JSON.stringify({version:1,slots:[{savedAt:'not a date',state:{day:1,money:2,pendingStory:null}},null,null,null,null]}));assert.throws(()=>store.get(0));
// The exact caller-provided image and MP3 are copied without modifying their content.
const crypto=require('crypto'),digest=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(digest('dist/assets/title-screen.png'),'ea3f065b31afb3202f514598e605be897210f4f3b07023171b992d522c7ea63d');
assert.equal(digest('dist/assets/title-inst.mp3'),'601c188fe9b67449284d1ff44ff79b8c6ecb118a4e39c03ef09d2ee44feb3af0');
console.log('PASS five independent manual slots: snapshots, reload, bounds, failed overwrite, corrupt preservation and original title media integrity');
