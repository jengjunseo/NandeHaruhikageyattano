const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const source=files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n');
function start(saved){let store=saved||null,els={};const el=s=>els[s]||(els[s]={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},focus(){}});const math=Object.create(Math);math.random=()=>.8;
const c={console,Math:math,JSON,localStorage:{getItem:()=>store,setItem:(k,v)=>store=v},document:{querySelector:el,querySelectorAll:()=>[]},window:{},setInterval(){},setTimeout(){return 1},clearTimeout(){}};vm.createContext(c);vm.runInContext(source+';globalThis.api={s:()=>state,toggle:toggleMenu,breadth:menuBreadthRetention,tick,close:closeDay,summary,initial}',c);return {a:c.api,els}}
const {a,els}=start(),s=a.s();assert.equal(a.breadth(),1);
a.toggle('cake');assert.equal(a.breadth(),.85);assert(els['#panel'].innerHTML.includes('85%'));a.toggle('latte');assert.equal(a.breadth(),.7);assert(els['#panel'].innerHTML.includes('70%'));
Object.assign(s,{phase:'open',tick:0,arrival:1,priority:'rest'});a.tick();assert.equal(s.varietyWalkouts,1);assert.equal(s.priceWalkouts,0);assert.equal(s.customers.length,0);
a.close();assert.equal(s.endingLost,1);a.summary();assert(els['#dialog'].innerHTML.includes('원하는 메뉴가 적어 떠난 손님 1명'));
const old=a.initial();delete old.varietyWalkouts;const restored=start(JSON.stringify(old));assert.equal(restored.a.s().varietyWalkouts,0);
console.log('PASS: one/two/three menu retention, distinct walkout accounting, ending impact and old-save default');
