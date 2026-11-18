'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const context=vm.createContext({window:{},console,Date});
for (const name of ['week-balance','week-rules','week-story','week-save']) {
 vm.runInContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+fs.readFileSync('app/'+name+'.js','utf8'),context);
}
const rules=context.window.RingWeek;
const fresh=(seed=47)=>({
 day:1,phase:'prep',tick:0,money:4500,stock:{...rules.balance.opening.stock},
 prices:Object.fromEntries(Object.entries(rules.balance.menu).map(([k,m])=>[k,m.basePrice])),
 enabled:{coffee:true,latte:true,cake:true,matcha:false,liveSet:false},upgrades:{machine:0,seats:0,display:0,decor:0},
 customers:[],workers:{taki:null},nextId:1,regulars:{},fatigue:0,priority:'manual',nextPerk:null,
 served:0,left:0,revenue:0,expense:0,soldLiveSet:0,failures:{stockWait:0,wait:0},
 menuHistory:{today:{}},accounting:{soldCost:0,lostCost:0,purchases:0,equipment:0,startCash:4500},
 supportDebt:0, seed
});
const start=(state,coach=false)=>{rules.init(state,coach,state.seed);state.phase='open';rules.open(state)};
const next=state=>{
 state.phase='prep';state.day++;state.tick=0;state.week.shift=null;state.week.undo=null;state.week.nextJob=null;
 state.served=state.left=state.revenue=state.expense=state.soldLiveSet=0;
 state.menuHistory.today={};state.failures={stockWait:0,wait:0};
 state.fatigue=Math.max(0,state.fatigue-12);
 state.accounting={soldCost:0,lostCost:0,purchases:0,equipment:0,startCash:state.money};
};
const close=state=>{
 state.phase='closed';
 const overhead=rules.close(state);
 const wasted=Math.floor(state.stock.milk*.2);
 state.stock.milk-=wasted;
 state.accounting.lostCost+=wasted*100;
 state.money-=overhead;
 const repaid=Math.min(state.supportDebt,Math.floor(state.revenue*.2),Math.max(0,state.money-1000));
 state.money-=repaid;state.supportDebt-=repaid;
 return {overhead,profit:state.revenue-state.accounting.soldCost-state.accounting.lostCost-overhead,repaid};
};

const s=fresh();start(s,true);
assert.equal(s.customers[0].menu,'cake');
assert.equal(rules.tick(s).close,false);
assert.equal(s.tick,0);
assert.equal(rules.command(s,1,'make'),'make');
assert.equal(rules.command(s,1,'make'),null);
assert.equal(s.stock.cake,4);
rules.tick(s);
assert.equal(s.customers[0].status,'ready');
assert.equal(rules.command(s,1,'serve'),'serve');
s.customers[0].patience=1;
rules.tick(s);rules.tick(s);
assert.equal(s.revenue,700);
assert.equal(s.money,5200);
assert.equal(s.week.shift.ledger.length,1);
assert.equal(s.tick,0);
assert(rules.valid(s.week,s));

const q=fresh();start(q);q.tick=50;q.week.shift.cursor=q.week.shift.arrivals.length;
const add=(id,menu,seat)=>q.customers.push({id,menu,seat,status:'waiting',patience:20,maxPatience:26,price:q.prices[menu],profile:'general',budget:1.2});
add(41,'coffee',0);add(42,'cake',1);add(43,'latte',2);
assert.equal(rules.command(q,41,'make'),'make');
assert.equal(rules.command(q,42,'make'),'queued');
assert.equal(rules.command(q,43,'make'),'queued');
assert.equal(rules.command(q,43,'make'),null);
assert.equal(q.stock.milk,5);
for(let i=0;i<3;i++)rules.tick(q);
assert.equal(q.customers.find(x=>x.id===41).status,'ready');
assert.equal(q.workers.taki,null,'manual queue cannot enable automatic pickup');
assert.equal(rules.command(q,41,'serve'),'serve');
rules.tick(q);rules.tick(q);
assert.equal(q.workers.taki.id,43);
assert.equal(q.stock.milk,4);
assert.equal(q.stock.cake,5);
q.customers.find(x=>x.id===43).patience=1;rules.tick(q);
assert.equal(q.accounting.lostCost,230);
assert.equal(q.week.shift.ledger.find(x=>x.id===43).reason,'wait');
q.stock.cake=0;
assert.equal(rules.alternate(q,q.customers.find(x=>x.id===42)),'latte');
assert.equal(rules.switchOrder(q,42,'latte'),true);
assert.equal(q.customers.find(x=>x.id===42).price,620);

const d=fresh();rules.init(d);d.phase='closed';d.week.firstClosed=true;
assert(!rules.place(d,'window','poster'));assert(rules.place(d,'window','plant'));
assert(rules.undo(d));assert.equal(d.week.owned.plant,undefined);
d.day=3;
assert(rules.place(d,'window','windowLamp'));
assert.equal(d.money,3750);
assert(rules.undo(d));assert.equal(d.money,4500);
assert(rules.place(d,'window','windowLamp'));
assert(rules.place(d,'window',null));
assert.equal(d.week.owned.windowLamp,true);
assert.equal(d.upgrades.decor,0);
assert(rules.place(d,'window','windowLamp'));
assert.equal(d.money,3750);
d.upgrades.machine=1;delete d.week;rules.init(d);assert.equal(d.week.owned.machine,true);
assert(rules.valid(d.week,d));
const unsafe=JSON.parse(JSON.stringify(d.week));unsafe.memories.poster='"><script>';assert(!rules.valid(unsafe,d));

const sale=fresh();start(sale);
sale.week.shift.cursor=sale.week.shift.arrivals.length;
sale.stock.milk=3;
for (let i=0;i<9;i++) {
 const menu=['coffee','latte','cake'][i%3],id=i+100;
 sale.customers.push({id,menu,seat:0,status:'waiting',patience:30,maxPatience:30,price:sale.prices[menu]});
 assert.equal(rules.command(sale,id,'make'),'make');
 while(sale.workers.taki)rules.tick(sale);
 assert.equal(rules.command(sale,id,'serve'),'serve');
 while(sale.workers.taki)rules.tick(sale);
 sale.tick=0;
}
const accounting=close(sale);
assert.equal(sale.revenue,5400);assert.equal(sale.accounting.soldCost,1980);assert.equal(accounting.profit,1470);

let raw=null;const storage={getItem:()=>raw,setItem:(_key,nextValue)=>{raw=nextValue}};
const one=context.window.RingSaveGuard.open(storage,'save'),two=context.window.RingSaveGuard.open(storage,'save');
assert.equal(one.write({money:4500}),1);
assert.throws(()=>two.write({money:0}),{name:'RingSaveConflict'});
assert.equal(JSON.parse(raw).money,4500);

function simulate(seed,policy,days,machine=false) {
 const a=fresh(seed), totals={profit:0,revenue:0,served:0,visits:0,window:0,packed:0,inputs:0,losses:{},waste:0,shortageSeconds:0,cashByDay:[]};
 rules.init(a,true,seed);
 for(let day=1;day<=days;day++) {
  if(a.money<500&&policy!=='handsOff'){a.money+=2500;a.supportDebt+=2500}
  const startCash=a.money, purchases=a.accounting.purchases, equipment=a.accounting.equipment;
  if(policy==='window'&&day===2){a.enabled.matcha=true;a.enabled.latte=false;rules.place(a,'window','windowLamp');rules.place(a,'display','display')}
  if(policy==='concert'&&day===3){a.enabled.liveSet=true;rules.place(a,'entrance','poster');rules.place(a,'pickup','pickupShelf');a.priority='pickup'}
  if(machine&&day===4)assert(rules.place(a,'espresso','machine'));
  if(policy==='oneMenu'){a.enabled.coffee=true;a.enabled.latte=false;a.enabled.cake=false}
  if(policy==='overspend')for(const [id,item] of Object.entries(rules.items))if(!a.week.owned[id])rules.place(a,item.slot,id);
  if(policy!=='handsOff'){
   const basket=rules.recommendation(a).missing;
   if(rules.basketCost(basket)<=a.money)rules.buyStock(a,basket);
   else for(const [id,n] of Object.entries(basket)) if(n&&a.money>=rules.balance.ingredients[id])rules.buyStock(a,{[id]:1});
  }
  a.phase='open';rules.open(a);
  for(let steps=0;;steps++){
   assert(steps<110,'shift must terminate');
   const ready=a.customers.filter(c=>c.status==='ready').sort((x,y)=>x.patience-y.patience)[0];
   const waiting=a.customers.find(c=>c.status==='waiting'&&rules.enough(a,c.menu));
   if (policy!=='handsOff' || a.week.shift.coach!==null) {
    if(ready&&!a.workers.taki){if(rules.command(a,ready.id,'serve'))totals.inputs++}
    else if(waiting&&(!a.workers.taki||a.workers.taki.kind==='serve')&&a.week.nextJob?.id!==waiting.id){
     if(rules.command(a,waiting.id,'make'))totals.inputs++;
    }
   }
   if(a.customers.some(c=>c.status==='waiting'&&!rules.enough(a,c.menu)))totals.shortageSeconds++;
   if(rules.tick(a).close)break;
  }
  const receipt=close(a);
  assert(a.week.shift.sets<=rules.setLimit(day));
  assert.equal(a.money,startCash+a.revenue-receipt.overhead-receipt.repaid-(a.accounting.purchases-purchases)-(a.accounting.equipment-equipment));
  assert.equal(a.week.shift.ledger.length,a.served+a.left);
  assert(a.stock.beans>=0&&a.stock.milk>=0&&a.stock.cake>=0&&a.stock.matcha>=0);
  totals.profit+=receipt.profit;totals.revenue+=a.revenue;totals.served+=a.served;totals.visits+=a.served+a.left;totals.waste+=a.accounting.lostCost;
  totals.cashByDay.push(a.money-a.supportDebt);
  for(const row of a.week.shift.ledger){
   if(row.profile==='window')totals.window++;
   if(row.takeout)totals.packed++;
   if(row.reason!=='sold')totals.losses[row.reason]=(totals.losses[row.reason]||0)+1;
  }
  if(day<days)next(a);
 }
 return {...totals,fatigue:a.fatigue,cash:a.money,debt:a.supportDebt,liquid:a.money-a.supportDebt};
}
function median(nums){const sorted=nums.slice().sort((x,y)=>x-y);return (sorted[(nums.length-1)>>1]+sorted[nums.length>>1])/2}
const metrics=[];
for(const days of [7,28])for(const policy of ['starter','window','concert','oneMenu','overspend','handsOff']){
 const results=Array.from({length:30},(_,i)=>simulate(47001+i,policy,days));
 metrics.push({days,policy,profit:median(results.map(r=>r.profit)),liquid:median(results.map(r=>r.liquid)),
  reopen:results.filter(r=>r.cash>=130||(r.cash<500&&Math.max(2500,1200-r.cash)+r.cash>=130)).length,
  served:median(results.map(r=>r.served)),inputPerServe:median(results.map(r=>r.inputs/Math.max(1,r.served))),
  windowShare:median(results.map(r=>Math.round(r.window/r.visits*100))),takeoutShare:median(results.map(r=>Math.round(r.packed/r.visits*100))),
  shortageSeconds:median(results.map(r=>r.shortageSeconds)),waste:median(results.map(r=>r.waste)),fatigue:median(results.map(r=>r.fatigue)),
  lossCounts:Object.fromEntries(['stock','price','wait','full','closing'].map(reason=>[reason,median(results.map(r=>r.losses[reason]||0))]))});
}
if(process.argv.includes('--report')){
 const breakeven=[];
 const payback=Array.from({length:30},(_,i)=>{
  const seed=47001+i;
  const base=simulate(seed,'concert',28).cashByDay;
  const equipped=simulate(seed,'concert',28,true).cashByDay;
  breakeven.push(Math.max(...equipped.slice(3,10).map((cash,i)=>cash-base[i+3]+rules.items.machine.cost)));
  const day=equipped.findIndex((cash,i)=>i>=3&&cash>=base[i]);
  return day<0?null:day-2;
 });
 console.log(JSON.stringify({metrics,machineRecovery:{within7:payback.filter(n=>n!==null&&n<=7).length,
  within25:payback.filter(n=>n!==null).length,medianSevenDayHeadroom:median(breakeven),seeds:payback}},null,2));
}
const [baseline,tea,counter]=metrics;
for(const policy of [baseline,tea,counter]){
 assert(policy.profit>0);
 assert(policy.reopen>=24);
 assert(policy.inputPerServe>=1&&policy.inputPerServe<=2);
}
assert(Math.abs(tea.liquid-counter.liquid)/Math.min(tea.liquid,counter.liquid)<=.25);
assert(tea.windowShare-counter.windowShare>=15);
assert(counter.takeoutShare-tea.takeoutShare>=15);
console.log('PASS: first cake, queued commands, duplicate settlement, purchase/undo, migration, stale-tab write, exact ledger and 360 seeded runs.');

