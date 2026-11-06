const fs=require('fs'),vm=require('vm'),assert=require('assert');
const elements={},timers=new Map(),listeners={};let nextTimer=0;
function element(selector){return elements[selector]||(elements[selector]={innerHTML:'',textContent:'',style:{},isConnected:true,classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},focus(){}})}
const c={console,Math,JSON,localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:element,querySelectorAll:()=>[],addEventListener:(type,fn)=>listeners[type]=fn},window:{},setInterval(){},setTimeout(fn){timers.set(++nextTimer,fn);return nextTimer},clearTimeout(id){timers.delete(id)}};
vm.createContext(c);
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
vm.runInContext(files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n')+';globalThis.api={show:showStory,input:vnInput,choose:chooseStory,index:()=>storyIndex,current:()=>activeStory,state:()=>state,defs:()=>storyData,complete:()=>vnTextComplete,tick,log:showVnLog}',c);
const a=c.api;
a.show('tomori_note');
assert(elements['#dialog'].innerHTML.includes('assets/tomori.png'));
assert(elements['#dialog'].innerHTML.includes('assets/taki.png'));
assert(!elements['#dialog'].innerHTML.includes('id="next"'));
assert.equal(a.complete(),false);
a.input();assert.equal(a.index(),0);assert.equal(a.complete(),true);
a.input();assert.equal(a.index(),1);assert.equal(a.complete(),false);
const before=a.state().tick;a.state().phase='open';a.tick();assert.equal(a.state().tick,before,'story should pause service');
elements['#vnMenuToggle'].onclick({stopPropagation(){}});assert(elements['#dialog'].innerHTML.includes('대화 기록'));
const menuFirst={focus(){c.document.activeElement=this}},menuLast={focus(){c.document.activeElement=this}};let focusSelector='';elements['#dialog'].querySelectorAll=selector=>{focusSelector=selector;return [menuFirst,menuLast]};c.document.activeElement=menuLast;let trapped=false;listeners.keydown({key:'Tab',preventDefault(){trapped=true}});assert(trapped&&c.document.activeElement===menuFirst,'menu focus must wrap');assert(focusSelector.includes('.vn-menu button')&&!focusSelector.includes('[tabindex]'),'menu trap must exclude the story stage');
const index=a.index();a.input();assert.equal(a.index(),index,'menu must prevent story advancement');
elements['#vnLog'].onclick();elements['#logBack'].onclick();assert.equal(a.index(),index,'log restores same line');
a.show('plan_shift');const choiceIndex=a.defs().plan_shift.lines.length-1;while(a.index()<choiceIndex){a.input();a.input()}
a.input();a.input();assert.equal(a.index(),choiceIndex,'choice waits for selection');
a.choose(0);assert.equal(a.index(),choiceIndex+1,'choice leads to its reply');
assert.equal(a.state().pendingStory.choice,0);assert.equal(a.state().pendingStory.index,choiceIndex+1);
a.input();a.input();assert.equal(a.current(),null);assert(a.state().stories.includes('plan_shift'));
console.log('PASS: paired portraits, two-step typing input, menu and log isolation, choice persistence, service pause and return');
