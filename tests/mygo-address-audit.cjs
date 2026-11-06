const fs=require('fs'),vm=require('vm'),assert=require('assert');
const els={};const el=s=>els[s]||(els[s]={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []}});
const c={console,Math,JSON,localStorage:{getItem:()=>null,setItem(){}},document:{querySelector:el,querySelectorAll:()=>[]},window:{},setInterval(){}};vm.createContext(c);
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
vm.runInContext(files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n')+';globalThis.data=storyData',c);
const rules={
 '토모리':[/아논/,/사키코\s*쨩/,/타키(?!\s*쨩)/,/소요(?!\s*쨩)/,/라나(?!\s*쨩)/],
 '아논':[/토모리/,/타키/,/소요(?!링)/,/라나(?!\s*쨩)/],
 '라나':[/타키/,/토모린/,/소요링/,/아노\s*쨩/],
 '소요':[/토모리(?!\s*쨩)/,/아논(?!\s*쨩)/,/라나(?!\s*쨩)/,/타키(?!\s*쨩)/],
 '타키':[/토모린/,/아노\s*쨩/,/소요링/,/릿키/]
};
let count=0;
for(const [id,story] of Object.entries(c.data)){
  const lines=[...story.lines,...(story.choice?.options||[]).map(option=>option.reply)];
  for(const [who,line] of lines){count++;if(id==='intro')continue;for(const pattern of rules[who]||[])assert(!pattern.test(line),id+': '+who+' / '+line+' matched '+pattern)}
}
assert(c.data.sakiko_2.lines.some(([who,line])=>who==='토모리'&&line.includes('사키 쨩')));
assert(c.data.rana_cup.lines.some(([who,line])=>who==='타키'&&line.includes('길고양이')));
assert(c.data.concert_7.lines.some(([who,line])=>who==='토모리'&&line.includes('아노 쨩')));
console.log('PASS: '+count+' dialogue and choice replies checked against known member address patterns; Taki and Tomori examples present');
