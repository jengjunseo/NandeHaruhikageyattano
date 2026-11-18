const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const source=files.map(n=>fs.readFileSync('app/'+n+'.js','utf8')).join('\n');
function boot(saved){let el={},sounds=[];const element=x=>el[x]||(el[x]={innerHTML:'',textContent:'',style:{},isConnected:true,classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},focus(){}});const ctx={console,Math,JSON,localStorage:{getItem:()=>saved||null,setItem(){}},document:{querySelector:element,querySelectorAll:()=>[]},window:{RingAudio:{play:fx=>sounds.push(fx)}},setInterval(){},setTimeout(){return 1},clearTimeout(){}};vm.createContext(ctx);vm.runInContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+source+';globalThis.api={s:()=>state,show:showStory,next:advanceStory,draw:drawStory,stories:()=>storyData,cast:vnCast,emotion:vnEmotion,index:()=>storyIndex}',ctx);return {a:ctx.api,el,sounds}}
const {a,el,sounds}=boot();a.s().vnSpeed=0;
const expected=JSON.parse(fs.readFileSync('tests/pico-rewrite/imported.json','utf8')).scenes.intro;
assert.equal(a.stories().intro.lines.length,expected.lines.length);assert.equal(a.stories().intro.lines[0][1],expected.lines[0][1]);
assert.equal(Object.values(a.stories()).filter(s=>s.comicRevision===2).length,101);
a.show('intro',true);assert(el['#dialog'].innerHTML.includes('assets/casual/taki.png'));assert(!el['#dialog'].innerHTML.includes('assets/casual/anon.png'));
a.next();a.next();assert(el['#dialog'].innerHTML.includes('assets/casual/anon.png'));assert(!el['#dialog'].innerHTML.includes('assets/casual/rana.png'));assert(sounds.includes('door'));const count=sounds.length;a.draw();assert.equal(sounds.length,count);
while(a.index()<13)a.next();for(const n of ['taki','anon','tomori','soyo','rana'])assert(el['#dialog'].innerHTML.includes('assets/casual/'+n+'.png'));
while(a.index()<expected.lines.length-1)a.next();assert(!sounds.some(s=>['rumble','tremble','deadpan','shout'].includes(s)));assert.equal(a.s().stories.length,0);
for(const[name,e,frame]of [['타키','angry',1],['타키','shock',2],['아논','wink',3],['토모리','worried',2],['소요','laugh',3],['라나','parfait',2]])assert.equal(a.emotion(name,e),frame);
const base=JSON.parse(JSON.stringify(a.s()));base.pendingStory={id:'intro',index:18,choice:null,contentVersion:6};let restored=boot(JSON.stringify(base));assert.equal(restored.a.index(),0);assert.equal(restored.a.s().pendingStory.contentVersion,8);base.pendingStory={id:'intro',index:18,choice:null,contentVersion:8};restored=boot(JSON.stringify(base));assert.equal(restored.a.index(),18);
for(const name of ['taki','anon','tomori','soyo','rana']){const b=fs.readFileSync('app/assets/casual/'+name+'.png');assert.equal(b[25],6);assert.equal(b.readUInt32BE(16),b.readUInt32BE(20)*2)}
console.log('PASS: exact rewritten prologue, timed arrivals, restrained one-shot door cues, expression atlases, replay isolation and revision migration.');
