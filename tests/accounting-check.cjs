const fs=require('fs'),vm=require('vm'),assert=require('assert');
const files=['final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const source=files.map(n=>fs.readFileSync('dist/'+n+'.js','utf8')).join('\n');
function start(saved){
  const elements={};const el=s=>elements[s]||(elements[s]={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return []},focus(){}});
  const c={console,Math,JSON,localStorage:{getItem:()=>saved||null,setItem(){}},document:{querySelector:el,querySelectorAll:()=>[]},window:{},setInterval(){},setTimeout(){return 1},clearTimeout(){}};
  vm.createContext(c);vm.runInContext(source+';globalThis.api={get:()=>state,buy,upgrade,support:requestSupport,assign,tick,close:closeDay,summary,initial}',c);return {a:c.api,elements};
}
let {a,elements}=start();let s=a.get();
a.buy('beans');a.upgrade('machine');a.support();assert.equal(s.accounting.purchases,130);assert.equal(s.accounting.equipment,4000);assert.equal(s.accounting.support,2500);
Object.assign(s,{phase:'open',arrival:999,priority:'rest'});s.customers=[{id:1,menu:'coffee',status:'waiting',patience:99,maxPatience:99}];
elements['.music-drawer']={open:true};a.tick();assert.equal(s.tick,0,'opening the music panel must pause service');elements['.music-drawer'].open=false;
assert(a.assign('taki',1,'make'));for(let i=0;i<3;i++)a.tick();assert.equal(s.customers[0].status,'ready');
assert(a.assign('taki',1,'serve'));for(let i=0;i<2;i++)a.tick();assert.equal(s.accounting.soldCost,130);assert.equal(s.revenue,480);
s.customers=[{id:2,menu:'latte',status:'waiting',patience:1,maxPatience:1}];assert(a.assign('taki',2,'make'));a.tick();assert.equal(s.accounting.lostCost,230);
a.close();const expected=480-130-2380-230-s.waste*100;assert.equal(s.money-s.accounting.startCash,480-130-4000+2500-s.overhead-s.loanPaid);
a.summary();assert(elements['#dialog'].innerHTML.includes('영업 손익'));assert(elements['#dialog'].innerHTML.includes('¥'+expected.toLocaleString()));assert(elements['#dialog'].innerHTML.includes('지원금 미상환'));
const old=a.initial();delete old.accounting;old.money=3200;const restored=start(JSON.stringify(old));assert.equal(restored.a.get().accounting.accurate,false);restored.a.summary();assert(restored.elements['#dialog'].innerHTML.includes('이전 버전에서 진행 중이던 하루'));
console.log('PASS: sales and lost-order costs, milk waste, expenses, cash movement, support and old-save migration');

