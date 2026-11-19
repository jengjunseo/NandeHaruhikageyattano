'use strict';
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const harness = fs.readFileSync('tests/major-patch-check.cjs','utf8').split('const old=launch(null,true);')[0];
const context = {require,console};
vm.runInNewContext(harness+';this.boot=launch;this.finish=finish;',context);
const {boot,finish}=context;
const clone=value=>JSON.parse(JSON.stringify(value));
const equal=(actual,expected)=>assert.deepEqual(clone(actual),clone(expected));

function start(day=1,seed=31) {
  const game=boot();
  game.a.newGame();
  finish(game.a);
  Object.assign(game.a.state(),{day,priority:'manual'});
  game.a.state().week.seed=seed;
  return game;
}

function closeShift(game) {
  for (let tick=0;game.a.state().phase==='open'&&tick<130;tick++) game.a.tick();
  assert.equal(game.a.state().phase,'closed');
}

function statement(state) {
  const a=state.accounting;
  const result={day:state.day,revenue:state.revenue,profit:state.revenue-a.soldCost-a.lostCost-state.overhead,
    cashChange:state.money-a.startCash,served:state.served,missed:state.left,money:state.money,stock:state.stock,
    sets:state.soldLiveSet,allocation:state.week.servicePlan?.allocation||null};
  assert.equal(result.cashChange,state.revenue-a.purchases-a.equipment+a.support-state.overhead-state.loanPaid);
  return clone(result);
}

// Same seed, menu and arrival roster. Only the pool of usable supplies changes.
function concert(mode, stock={beans:2,milk:3,cake:2,matcha:1}) {
  const g=start(3),s=g.a.state();
  s.stock={...stock};
  assert(g.r.planChoice(s,'live',mode));
  if(mode==='reserve')assert.equal(g.r.recommendation(s).reserve,2);
  g.a.open();
  return g;
}
const off=concert('off'),shared=concert('shared'),reserved=concert('reserve');
const shows=[off,shared,reserved];
equal(shared.a.state().week.shift.arrivals,reserved.a.state().week.shift.arrivals);
assert(!off.r.available(off.a.state(),'liveSet'));
assert(shared.r.enough(shared.a.state(),'coffee'));
assert(!reserved.r.enough(reserved.a.state(),'coffee'));
assert(reserved.r.enough(reserved.a.state(),'liveSet'));
const liveComparison=[];
for (const [mode,g] of [['off',off],['shared',shared],['reserve',reserved]]) {
  const s=g.a.state();
  const opened={stock:clone(s.stock),generalBeans:g.r.usable(s,'beans','coffee'),generalCake:g.r.usable(s,'cake','cake')};
  s.priority='serve';
  closeShift(g);
  assert(g.a.valid(clone(s)));
  assert(Object.values(s.stock).every(n=>n>=0));
  assert.equal(s.week.servicePlan.allocation.held,0);
  liveComparison.push({mode,opened,receipt:statement(s),setOrders:clone(s.week.shift.ledger.filter(row=>row.menu==='liveSet'))});
}

const limited=concert('reserve',{beans:1,milk:2,cake:3,matcha:0});
assert.equal(limited.a.state().week.servicePlan.allocation.initial,1);
const held=concert('reserve'),hs=held.a.state();
hs.week.shift.arrivals=[{at:1,profile:'fan',preference:.5,budget:1.25,takeout:false}];
held.a.tick();
const set=hs.customers[0];
assert.equal(set.menu,'liveSet');
set.patience=set.maxPatience=70;
while(held.r.livePhase(hs)==='before')held.a.tick();
equal(hs.week.servicePlan.allocation,{held:1,initial:2,used:0,released:1});
assert(held.r.enough(hs,'coffee'));
assert(!held.r.available(hs,'liveSet'));
assert.equal(held.r.command(hs,set.id,'make'),'make');
assert.equal(held.r.command(hs,set.id,'make'),null);
equal(hs.week.servicePlan.allocation,{held:0,initial:2,used:1,released:1});
assert.equal(hs.stock.beans,1);
assert.equal(hs.stock.cake,1);
assert(held.a.valid(clone(hs)));

const cancellation=concert('shared'), cs=cancellation.a.state();
cs.week.shift.arrivals=[{at:1,profile:'fan',preference:.5,budget:1.25,takeout:false}];
cancellation.a.tick();
const accepted=cs.customers[0];
assert.equal(accepted.menu,'liveSet');
cs.stock.beans=0;
assert(cancellation.r.cancel(cs,accepted.id));
assert.equal(cs.week.shift.sets,0);
assert.equal(cs.week.shift.ledger[0].reason,'stock');
assert.equal(cs.week.shift.ledger[0].accepted,true);
assert.equal(cs.money,4500);

function windowShift(mark) {
  const g=start(2),s=g.a.state();
  assert(!g.r.planChoice(s,'window',true),'choice requires the completed morning');
  s.week.morning={day:2,id:'morning_window',source:'morning',status:'completed'};
  if(mark)assert(g.r.planChoice(s,'window',true));
  g.a.open();
  s.priority='serve';
  closeShift(g);
  return {state:s,result:g.r.dailyLine(s),receipt:statement(s)};
}
const quietWindow=windowShift(false),markedWindow=windowShift(true);
equal(quietWindow.state.week.shift.arrivals,markedWindow.state.week.shift.arrivals);
equal(quietWindow.receipt,markedWindow.receipt);
assert.notEqual(quietWindow.result,markedWindow.result);

const remembered=start(5),rs=remembered.a.state();
rs.enabled.latte=false;
rs.week.guestMemory={jun:{visits:2,lastDay:4,lastMenu:'latte',lastServed:'latte',lastResult:'sold'}};
remembered.a.open();
rs.week.shift.arrivals=[{at:1,profile:'general',preference:.5,budget:1.25,takeout:false}];
const jun=()=>({id:'jun',name:'준',favorite:'latte'});
remembered.r.tick(rs,jun);
const order=rs.customers[0];
assert.equal(order.menu,'coffee');
assert.equal(order.remembers,'latte');
assert.match(remembered.r.guestGreeting(rs,order),/라테/);
order.patience=1;
remembered.r.tick(rs,jun);
assert.equal(rs.week.guestMemory.jun.lastServed,'latte');
assert.equal(rs.week.guestMemory.jun.lastResult,'wait');
assert.equal(rs.week.guestMemory.jun.lastReferencedDay,5);
assert.equal(rs.week.guestMemory.jun.lastOrderId,order.id);

const priority=start(2),ps=priority.a.state();
priority.a.open();
ps.week.shift.arrivals=[1,2,3].map(at=>({at,profile:'general',preference:.5,budget:1.25,takeout:false}));
const identify=id=>id===3?jun():null;
priority.r.tick(ps,identify);
priority.r.command(ps,1,'make');
priority.r.tick(ps,identify);
priority.r.tick(ps,identify);
assert(priority.r.firstWork(ps,3));
assert.equal(ps.workers.taki.id,1,'existing brew keeps its turn');
ps.priority='serve';
for(let i=0;i<9 && ps.workers.taki?.id!==3;i++)priority.r.tick(ps,identify);
assert.equal(ps.workers.taki?.id,3,'next eligible brew favors the regular');

const board=start(4),bs=board.a.state();
assert(!board.r.planChoice(bs,'board','cake'));
bs.week.morning={day:4,id:'morning_board',source:'morning',status:'completed'};
assert(board.r.planChoice(bs,'board','cake'));
board.a.open();
bs.week.shift.arrivals=[1,2,3].map(at=>({at,profile:'general',preference:.5,budget:1.25,takeout:false}));
for(let n=0;n<3;n++)board.r.tick(bs);
assert.equal(bs.week.servicePlan.boardUsed,2);
assert.equal(bs.week.shift.cursor,3);

const facility=start(5),fsState=facility.a.state();
const cash=fsState.money;
assert(facility.r.place(fsState,'window','windowLamp'));
assert(facility.r.place(fsState,'espresso','machine'));
assert.equal(fsState.money,cash-750-2100);
assert(facility.r.place(fsState,'window',null));
assert(facility.r.place(fsState,'window','windowLamp'));
assert.equal(fsState.money,cash-750-2100);
facility.a.open();
fsState.week.shift.arrivals=[{at:1,profile:'window',preference:.5,budget:1.25,takeout:false}];
facility.r.tick(fsState);
assert.equal(fsState.customers[0].maxPatience,34);
assert.equal(fsState.week.servicePlan.lamp,fsState.customers[0].id);
const timing={};
for(const id of ['coffee','latte','liveSet','cake','matcha']){
  function elapsed(machine){
    const g=start(6),s=g.a.state();
    if(machine){s.day=4;assert(g.r.place(s,'espresso','machine'));s.day=6;}
    g.a.open();s.week.shift.arrivals=[];
    s.customers.push({id:s.nextId++,menu:id,price:s.prices[id],seat:0,profile:'general',status:'waiting',patience:30,maxPatience:30});
    const order=s.customers[0],startTick=s.tick;
    assert.equal(g.r.command(s,order.id,'make'),'make');
    while(order.status==='making')g.r.tick(s);
    return s.tick-startTick;
  }
  const before=elapsed(false),after=elapsed(true);
  assert.equal(before-after,['coffee','latte','liveSet'].includes(id)?1:0);
  timing[id]={before,after};
}

function fiveDays(experiment) {
  const g=start(1,31),receipts=[];
  for(let day=1;day<=5;day++){
    const s=g.a.state();
    assert.equal(s.day,day);
    if (experiment) {
      if(day===3)assert(g.r.planChoice(s,'live','reserve'));
      if(day===4)assert(g.r.place(s,'window','windowLamp'));
      const basket=g.r.recommendation(s).missing;
      if(g.r.basketCost(basket)<=s.money)g.r.buyStock(s,basket);
    } else {
      // Standard menu only. Refill by hand without using any daily proposals.
      const basket=Object.fromEntries(Object.entries(g.r.balance.opening.stock)
        .map(([key,target])=>[key,Math.max(0,target-s.stock[key])]));
      if(g.r.basketCost(basket)<=s.money)g.r.buyStock(s,basket);
    }
    s.priority='serve';
    g.a.open();
    if(day===1){
      const id=s.customers[0].id,stock=s.stock.cake;
      g.a.assign('taki',id,'make');g.a.tick();
      assert.equal(s.tick,0);assert.equal(s.stock.cake,stock-1);
      g.a.assign('taki',id,'serve');g.a.tick();g.a.tick();
      assert.equal(s.served,1);assert.equal(s.revenue,700);
    }
    closeShift(g);
    assert(s.revenue>0,'sales on day '+day);
    const result=statement(s);
    assert(g.a.valid(clone(s)));
    receipts.push(result);
    g.a.next();finish(g.a);
  }
  assert.equal(g.a.state().day,6);
  return receipts;
}
const basic=fiveDays(false),experiment=fiveDays(true);
assert.notEqual(basic[2].sets,experiment[2].sets);

const migration=JSON.parse(fs.readFileSync('tests/fixtures/v53-save-samples.json','utf8'));
for (const [phase,sample] of Object.entries(migration)) {
  const old=sample;
  const restored=boot(JSON.stringify(old));
  assert(restored.a.valid(old),phase);
  const s=restored.a.state();
  assert.equal(s.saveVersion,2,phase);
  for (const key of ['phase','day','money','stock','workers','pendingStory','accounting']) equal(s[key],old[key]);
  for (const key of ['queue','placements','guestMemory','shift','morning']) {
    if(old.week[key]!==undefined)equal(s.week[key],old.week[key]);
  }
}
const result={seed:31,baseline:statement(migration.closed),liveComparison,earlyCancellation:{id:accepted.id,reason:'stock',slotsAfter:cs.week.shift.sets},
  window:[quietWindow.result,markedWindow.result],equipmentSeconds:timing,fiveDays:{basic,experiment},migration:Object.keys(migration)};
fs.mkdirSync('.cache/v54',{recursive:true});
fs.writeFileSync('.cache/v54/gameplay-evidence.json',JSON.stringify(result,null,2)+'\n');
console.log('PASS v54 five-day gameplay, concert stock and ledger, regular memory, window choice, facilities and v53 migration.');
