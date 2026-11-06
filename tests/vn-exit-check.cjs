const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const src=files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n');let els={},timers=[];
const el=x=>els[x]||(els[x]={innerHTML:'',textContent:'',style:{},isConnected:true,classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},focus(){}});
const c={console,Math,JSON,localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:el,querySelectorAll:()=>[]},window:{},setInterval(){},setTimeout(fn,delay){timers.push({fn,delay});return timers.length},clearTimeout(){}};
vm.createContext(c);vm.runInContext(src+';globalThis.api={show:showStory,advance:advanceStory,draw:drawStory,index:()=>storyIndex,all:()=>storyData}',c);const a=c.api;
a.show('ring_board_1',true);assert(!els['#dialog'].innerHTML.includes('vn-exit-layer'));
for(let i=0;i<4;i++)a.advance();assert.equal(a.index(),4);assert(els['#dialog'].innerHTML.includes('data-vn-exit="타키"'));assert(els['#dialog'].innerHTML.includes('vn-entering'));assert(els['#dialog'].innerHTML.includes('aria-hidden="true"'));
a.draw();assert(!els['#dialog'].innerHTML.includes('vn-exit-layer'),'redraw without a cast change must not replay an exit');
// Ellipsis adds a pause without blocking the player's explicit advance.
a.show('tomori_note',true);for(let i=0;i<3;i++)timers[timers.length-1].fn();assert(timers.some(t=>t.delay>=250),'ellipsis should create a longer typewriter delay');
const css=fs.readFileSync('dist/style.css','utf8');assert(css.includes('vn-actor-out'));assert(css.includes('.vn-actor.vn-exiting{animation:none;opacity:0}'));
console.log('PASS: cast entrance/exit on changes, no repeated exit, ellipsis pacing, accessibility and reduced motion');
