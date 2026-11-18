'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{execFileSync}=require('node:child_process');
const names=['week-balance','week-rules','week-story','final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','morning-stories','game'];
const disk=name=>fs.readFileSync('app/'+name+'.js','utf8');
function launch(saved=null,legacy=false){
 const elements={},timers=new Map();let timer=0;
 const el=id=>elements[id]||={innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return[]},focus(){}};
 const source=names.filter(name=>!legacy||name!=='morning-stories').map(name=>legacy&&['game','week-rules','week-balance'].includes(name)?
   fs.readFileSync('tests/fixtures/sites/ff68e4875b9432c1b83d85cd2332799ea727b8c7/'+name+'.js','utf8'):disk(name)).join('\n');
 const window={RingWeekView:{mount(){},render(){},ticket(){return ''},archive(){return ''},receipt(){return ''},bindArchive(){},bindStock(){},stock(){return ''},decorLink(){return ''},scenery(){return ''},priceHelp(){return ''},menuStats(){return ''}}};
 const storage={getItem:()=>saved,setItem:(_key,v)=>saved=v};
 const ctx=vm.createContext({console,window,localStorage:storage,document:{querySelector:el,querySelectorAll:()=>[]},setInterval(){},
   setTimeout(fn,ms){timers.set(++timer,{fn,ms});return timer},clearTimeout(id){timers.delete(id)}});
 vm.runInContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+source+';globalThis.qa={state:()=>state,active:()=>activeStory,index:()=>storyIndex,definition:activeStoryDefinition,newGame:titleNewGame,resume:titleResume,open:openDay,assign,tick,next:nextDay,close:closeDay,advance:advanceStory,choose:chooseStory,show:showStory,adapter:weekViewAdapter,valid:validBackupState,initial,regularForId,showVnLog,vnInput}',ctx);
 return {a:ctx.qa,r:window.RingWeek,m:window.RingMorning,elements,timers,saved:()=>saved,el};
}
function finish(a){
 for(let n=0;a.active();n++){
  assert(n<120);
  const s=a.definition();
  if(s.choice&&a.index()===s.lines.length-1&&a.active().choice===null)a.choose(0);
  else a.advance();
 }
}
const old=launch(null,true);old.a.newGame();finish(old.a);const os=old.a.state();
os.week.seed=761;os.money=6220;os.day=2;os.week.queue.push('tomori_note');assert(old.r.place(os,'window','windowLamp'));
old.a.open();old.a.close();
const fixture=JSON.parse(old.saved());
assert.equal(fixture.phase,'closed');
const game=launch(JSON.stringify(fixture)),{a,r,m}=game,s=a.state();
assert(a.valid(fixture));assert.equal(s.money,fixture.money);assert.equal(s.week.placements.window,'windowLamp');
assert(s.week.queue.includes('tomori_note'));
game.el('#weekReorder').onclick();assert.equal(s.day,2);assert.equal(s.money,fixture.money);
game.el('#done').onclick();
a.next();const id=a.active().id,cash=s.money;assert(m.is(id));assert.equal(s.day,3);assert(s.week.queue.includes('tomori_note'));
a.next();a.open();assert.equal(s.day,3);assert.equal(s.phase,'prep');assert.equal(s.money,cash);
a.vnInput();assert.equal(a.index(),0,'first input completes typing');a.vnInput();assert.equal(a.index(),1);
const current=JSON.parse(game.saved());assert(a.valid(current));assert.equal(current.week.morning.id,id);
const loaded=launch(game.saved());loaded.a.resume();assert.equal(loaded.a.active().id,id);assert.equal(loaded.a.index(),1);
loaded.a.showVnLog();assert.equal(loaded.a.index(),1);loaded.el('#logBack').onclick();assert.equal(loaded.a.index(),1);
finish(loaded.a);assert.equal(loaded.a.state().week.morning.status,'completed');
assert(loaded.a.state().week.queue.includes('tomori_note'));
const beforeReplay=JSON.stringify(loaded.a.state());loaded.a.show(id,true);finish(loaded.a);assert.equal(JSON.stringify(loaded.a.state()),beforeReplay);
const unknown=JSON.parse(game.saved());unknown.week.morning.id=unknown.pendingStory.id='morning_removed';const repaired=launch(JSON.stringify(unknown));repaired.a.resume();assert.equal(repaired.a.active().id,m.fallback);
const seeded=new Set();const choices=Object.keys(m.scenes).filter(x=>x!==m.fallback&&!m.scenes[x].when);
for(let seed=0;seed<256;seed++){
 const state={day:2,stories:[],week:{seed,queue:[]}};
 seeded.add(m.begin(state,r.schedule(2)).id);
}
assert.deepEqual([...seeded].sort(),choices.sort());
const empty={day:3,stories:Object.keys(m.scenes),week:{seed:19,queue:[]}};
assert.equal(m.begin(empty,r.schedule(3)).id,m.fallback);
const one=choices[0];
assert.equal(m.begin({day:2,stories:choices.slice(1),week:{seed:19,queue:[]}},r.schedule(2)).id,one);
assert.equal(m.begin({day:2,stories:choices.slice(1),week:{seed:19,queue:[one]}},r.schedule(2)).id,m.fallback);
for(const priority of ['manual','pickup','make','serve','rest']){
 const g=launch(),s=g.a.state();Object.assign(s,{day:3,priority,fatigue:80,stories:['intro']});
 g.r.init(s);g.a.open();s.week.shift.arrivals=[];
 s.customers.push({id:1,menu:'cake',status:'ready',price:700,materialCost:300,seat:0,patience:20,maxPatience:26},
   {id:2,menu:'latte',status:'waiting',price:620,seat:1,patience:20,maxPatience:26,profile:'general'});
 g.a.tick();
 assert.equal(s.workers.taki?.kind, ['pickup','make','serve'].includes(priority)?'serve':undefined);
 if(priority==='rest'){for(let i=0;i<4;i++)g.a.tick();assert.equal(s.fatigue,79);}
 else if(priority==='make'||priority==='serve'){for(let i=0;i<2;i++)g.a.tick();assert.equal(s.workers.taki.kind,'make');assert.equal(s.stock.milk,4);}
}
function makeShift({day=3, enabled=['coffee'], price=480,budget=1.1, profile='general'}={}){
 const g=launch(),s=g.a.state();s.day=day;s.stories=['intro'];g.r.init(s,false,120);
 for(const id of Object.keys(s.enabled))s.enabled[id]=enabled.includes(id);
 s.prices.coffee=price;g.a.open();
 s.week.shift.arrivals=[{at:1,profile,budget,takeout:false,preference:.5}];
 return g;
}
for(const price of [480,630]){
 const g=makeShift({price});const s=g.a.state();g.a.tick();
 assert.equal(s.customers.length,price===480?1:0);
 if(price===630){assert.equal(s.menuHistory.today.coffee.priceRejected,1);assert.equal(s.week.shift.ledger[0].reason,'price');}
}
const live=makeShift({enabled:['coffee','liveSet'],profile:'fan'});
const ls=live.a.state();ls.week.shift.sets=live.r.setLimit(ls.day)-1;
live.a.tick();const guest=ls.customers[0];assert.equal(guest.menu,'liveSet');assert.equal(ls.week.shift.sets,live.r.setLimit(ls.day));
assert(live.a.assign('taki',guest.id,'make'));assert(!live.a.assign('taki',guest.id,'make'));
for(let n=0;n<6;n++)live.a.tick();
assert(live.a.assign('taki',guest.id,'serve'));assert(!live.a.assign('taki',guest.id,'serve'));
live.a.tick();live.a.tick();assert.equal(ls.soldLiveSet,1);assert.equal(ls.revenue,1050);assert.equal(ls.stock.cake,4);
const short=makeShift({enabled:['coffee','liveSet'],profile:'fan'});const ss=short.a.state();short.a.tick();
ss.stock.cake=0;assert(short.r.cancel(ss,ss.customers[0].id));assert.equal(ss.week.shift.sets,0);
const cart=launch(),cs=cart.a.state();cart.r.init(cs,false,42);cs.stock.cake=0;
assert(!cart.r.buyStock(cs,{cake:99}));assert.equal(cs.money,4500);assert.equal(cs.stock.cake,0);
assert(cart.r.buyStock(cs,{cake:1}));assert.equal(cs.money,4200);assert.equal(cs.stock.cake,1);
cs.stories=['intro'];cs.day=4;assert(cart.r.place(cs,'espresso','machine'));assert(cart.r.place(cs,'window','windowLamp'));
assert.equal(cs.money,1350);assert.equal(cs.accounting.equipment,2850);assert(cart.r.has(cs,'machine')&&cart.r.has(cs,'windowLamp'));
let seen=new Set(),nOrders=0;
for(const seed of [39,99,707,7301,81001]){
 const g=launch(),{a,r}=g;a.newGame();finish(a);const s=a.state();s.week.seed=seed;
 for(let day=1;day<=7;day++){
  assert.equal(s.day,day);
  if(day>=3)s.enabled.liveSet=true;
  if(s.money<500){s.money+=2500;s.supportDebt+=2500;s.accounting.support+=2500}
  const plan=r.recommendation(s);
  if(plan.cost<=s.money)r.buyStock(s,plan.missing);
  s.priority='serve';a.open();
  if(day===1){
   const order=s.customers[0];assert(a.assign('taki',order.id,'make'));a.tick();assert(a.assign('taki',order.id,'serve'));
   a.tick();a.tick();assert.equal(s.revenue,700);assert.equal(s.tick,0);
  }
  for(let i=0;i<111&&s.phase==='open';i++)a.tick();
  assert.equal(s.phase,'closed');
  const rows=s.week.shift.ledger,account=s.accounting;
  assert.equal(s.left,rows.filter(row=>row.reason!=='sold').length);
  assert.equal(s.served,rows.filter(row=>row.reason==='sold').length);
  assert.equal(s.revenue,rows.reduce((sum,x)=>sum+x.revenue,0));
  assert.equal(account.soldCost,rows.filter(x=>x.reason==='sold').reduce((sum,x)=>sum+x.cost,0));
  assert.equal(account.lostCost,rows.filter(x=>x.reason!=='sold').reduce((sum,x)=>sum+x.cost,0)+100*s.waste);
  assert.equal(s.money,account.startCash+s.revenue-account.purchases-account.equipment+account.support-s.loanPaid-s.overhead);
  assert(Object.values(s.stock).every(n=>n>=0));
  assert(a.valid(JSON.parse(g.saved())));
  nOrders+=rows.length;for(const key of Object.keys(s.week.guestMemory||{}))seen.add(key);
  const queue=s.week.queue.slice();a.next();assert(g.m.is(a.active().id));finish(a);assert.deepEqual(s.week.queue,queue);
 }
}
assert.deepEqual([...seen].sort(),['haru','jun','mei']);
console.log('PASS: v48 fixture, morning selection/restore/fallback/log, 5 Taki modes, prices, reservations, purchases, growth, 35 shifts and '+nOrders+' terminal orders.');
