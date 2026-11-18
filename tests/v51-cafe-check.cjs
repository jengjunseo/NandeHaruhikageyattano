'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync('tests/major-patch-check.cjs','utf8').split('const old=launch(null,true);')[0];
const ctx={require,console};vm.runInNewContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+prefix+';this.h={launch,finish};',ctx);const {launch,finish}=ctx.h;
const clocks={window:{},setTimeout(){}};vm.runInNewContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+fs.readFileSync('app/simulation-clock.js','utf8'),clocks);
const Clock=clocks.window.RingClock;
function shift({day=3,seed=187,menu='latte',profile='general',lamp=false,ownedOnly=false,id=12}={}) {
 const g=launch(),s=g.a.state();Object.assign(s,{day,stories:['intro'],nextId:id});g.r.init(s,false,seed);
 if(lamp||ownedOnly)s.week.owned.windowLamp=true;if(lamp)s.week.placements.window='windowLamp';
 for(const key of Object.keys(s.enabled))s.enabled[key]=key===menu;
 g.a.open();s.week.shift.arrivals=[{at:1,profile,budget:1.35,takeout:false,preference:.5}];return g;
}
function sold(g){const s=g.a.state(),c=s.customers[0];assert(c);assert(g.r.command(s,c.id,'make'));assert(!g.r.command(s,c.id,'make'));while(s.workers.taki)g.a.tick();assert(g.a.assign('taki',c.id,'serve'));while(s.workers.taki)g.a.tick();return s.week.shift.ledger.at(-1);}
// A: only actual successful latte service becomes a recollection.
let g=shift(),s=g.a.state();g.a.tick();assert(!g.r.guestGreeting(s,s.customers[0]).includes('지난번'));
let row=sold(g);assert(row.moments.includes('jun-latte'));assert.equal(s.week.guestMemory.jun.lastServed,'latte');
assert(g.r.guestGreeting(s,{regularId:'jun',menu:'latte'}).includes('같은 걸로'));
let reload=launch(JSON.stringify(s));assert(reload.a.valid(s));assert.equal(reload.a.state().week.guestMemory.jun.lastServed,'latte');
g=shift();s=g.a.state();g.a.tick();s.stock.milk=0;assert(g.r.cancel(s,s.customers[0].id));assert(!g.r.guestGreeting(s,{regularId:'jun',menu:'latte'}).includes('같은 걸로'));
assert.equal(s.week.guestMemory.jun.lastServed,null);assert(!s.week.shift.ledger[0].moments);
// B: rain / placed / window / delivered. Owning alone never qualifies.
for(const [day,lamp,ownedOnly,expected] of [[5,true,false,true],[5,false,false,false],[5,false,true,false],[2,true,false,false]]) {
 g=shift({day,lamp,ownedOnly,profile:'window',menu:'coffee',id:1});s=g.a.state();g.a.tick();
 assert.equal(s.customers[0].maxPatience,g.r.balance.profiles.window.patience+(lamp?3:0));
 row=sold(g);assert.equal(!!row.moments?.includes('rain-window'),expected);
 assert.equal(g.r.dayNotes(s).some(x=>x.includes('창가등')),expected);
 const copy=launch(JSON.stringify(s));assert(copy.a.valid(s));assert.equal(copy.r.dayNotes(copy.a.state()).some(x=>x.includes('창가등')),expected);
}
// C: admission cap zero preserves the accepted set; no live menu on ordinary days.
g=shift({menu:'liveSet',profile:'fan',id:1});s=g.a.state();s.week.shift.sets=g.r.setLimit(3)-1;g.a.tick();assert.equal(g.r.available(s,'liveSet'),false);
row=sold(g);assert(row.moments.includes('live-set'));assert.equal(s.soldLiveSet,1);s.tick=50;assert.equal(g.r.livePhase(s),'after');assert(g.r.liveAfter(s).includes('1개'));assert(g.r.dayNotes(s).some(x=>x.includes('1개')));
for(const day of [1,2,4,5]){g=shift({day,menu:'liveSet'});g.a.tick();assert(!g.a.state().customers.some(x=>x.menu==='liveSet'));assert.equal(g.r.livePhase(g.a.state()),'off');}
for(const reason of ['stock','price','wait']) {
 g=shift({menu:'liveSet',profile:'fan',id:1});s=g.a.state();if(reason==='stock')s.stock.cake=0;if(reason==='price')s.prices.liveSet=1200;
 if(reason==='price')s.week.shift.arrivals[0].budget=.9;g.a.tick();
 if(reason==='wait'){for(let i=0;i<29;i++)g.a.tick();}
 s.tick=50;assert.equal(s.soldLiveSet,0);assert(!g.r.liveAfter(s).includes('1개 전달'));assert(!g.r.dayNotes(s).some(x=>x.includes('공연 세트')));
 if(reason!=='wait')assert(s.week.shift.ledger.some(x=>x.reason===reason));
}
g=shift({menu:'liveSet',profile:'fan',id:1});s=g.a.state();g.a.tick();s.stock.cake=0;assert(g.r.cancel(s,s.customers[0].id));assert.equal(s.week.shift.sets,0);assert(!g.r.cancel(s,1));
// Two facilities: money, placement, storage, undo and identical-fatigue manufacture.
for(const item of ['windowLamp','machine']) {
 g=shift({day:4,id:1});s=g.a.state();s.phase='prep';s.week.shift=null;s.money=10000;
 const cfg=g.r.items[item],before=s.money;assert(g.r.place(s,cfg.slot,item));assert.equal(s.money,before-cfg.cost);assert(g.r.place(s,cfg.slot,item));assert.equal(s.money,before-cfg.cost);
 assert(g.r.facilityCompare(s,item).includes('→'));if(item==='machine')assert.equal(g.r.makeSeconds(s,'latte',false)-g.r.makeSeconds(s,'latte',true),1);
 const copy=launch(JSON.stringify(s));assert(copy.a.valid(s));assert(copy.r.has(copy.a.state(),item));
 assert(g.r.place(s,cfg.slot,null));assert(!g.r.has(s,item));assert(s.week.owned[item]);assert(g.r.place(s,cfg.slot,item));assert.equal(s.money,before-cfg.cost);
}
// Identical simulation seconds produce identical orders/economy at both rates and a low 5fps scheduler.
for(const mode of ['manual','pickup','make','serve','rest']) {
 function run(rate,frame) {
  const h=shift({day:3,seed:991,id:1}),v=h.a.state();v.priority=mode;v.stock={beans:40,milk:40,cake:40,matcha:40};h.r.open(v);
  let time=0;const clock=Clock.create({speed:()=>rate,paused:()=>false,session:()=>v,step:()=>h.a.tick(),now:()=>time});
  for(let i=0;i<60000/rate/frame;i++){time+=frame;clock.pulse();}
  return JSON.stringify({tick:v.tick,stock:v.stock,cash:v.money,customers:v.customers,ledger:v.week.shift.ledger,work:v.workers,fatigue:v.fatigue});
 }
 assert.equal(run(1,100),run(2,100),mode);assert.equal(run(1,100),run(2,200),mode+' low frames');
}
let time=0,rate=1,pause=false,ticks=0,session={};const clock=Clock.create({speed:()=>rate,paused:()=>pause,session:()=>session,step:()=>ticks++,now:()=>time});
time=900;clock.pulse();pause=true;time=1900;clock.pulse();pause=false;time=2000;clock.pulse();assert.equal(ticks,0);time=3000;clock.pulse();assert.equal(ticks,1);
time=60000;clock.pulse();assert.equal(ticks,1,'background suspension never catches up');rate=2;time+=100;clock.pulse();time+=500;clock.pulse();assert.equal(ticks,2);session={};time+=500;clock.pulse();assert.equal(ticks,2,'loaded session starts with no elapsed debt');
// Real v50 source fixture: optional fields default; money, records, pending VN and furniture survive.
const oldPrefix=prefix.replace("const disk=name=>fs.readFileSync('app/'+name+'.js','utf8');", "const disk=name=>fs.readFileSync('tests/fixtures/sites/0dc97bffb37d0ef604f0a53fb0b1333a4f84896e/'+name+'.js','utf8');");
const oldCtx={require,console};vm.runInNewContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+oldPrefix+';this.h={launch,finish};',oldCtx);const old=oldCtx.h.launch();old.a.newGame();oldCtx.h.finish(old.a);const oldState=old.a.state();oldState.money=7000;oldState.day=5;old.r.place(oldState,'window','windowLamp');oldState.week.queue=['tomori_note'];old.a.show('morning_cups',false,1);
const fixture=JSON.parse(JSON.stringify(oldState));const migrated=launch(JSON.stringify(fixture));assert(migrated.a.valid(fixture));assert.equal(migrated.a.state().money,fixture.money);assert.equal(migrated.a.state().simSpeed,1);assert.equal(migrated.a.state().week.placements.window,'windowLamp');assert.equal(JSON.stringify(migrated.a.state().week.queue),JSON.stringify(fixture.week.queue));migrated.a.resume();assert.equal(migrated.a.index(),0);assert.equal(migrated.a.active().id,'morning_cups');
 const speedSave=JSON.parse(JSON.stringify(migrated.a.state()));speedSave.simSpeed=2;const fastLoaded=launch(JSON.stringify(speedSave));assert(fastLoaded.a.valid(speedSave));assert.equal(fastLoaded.a.state().simSpeed,2);speedSave.simSpeed=9;assert(!fastLoaded.a.valid(speedSave));
 for(const installed of [false,true]) {
  const h=shift({day:4,menu:'latte',id:1}),v=h.a.state();v.fatigue=75;if(installed){v.week.owned.machine=true;v.week.placements.espresso='machine';}h.a.tick();assert(h.r.command(v,1,'make'));assert.equal(v.workers.taki.remaining,installed?5:6,'actual command duration at equal fatigue');
 }
 console.log('PASS v51: A/B/C truth and restore, cap/cancel/failures, facilities and actual command durations, all five modes 1x/2x/5fps equivalence, pause/suspension/load boundaries, speed persistence/validation, real v50 fixture migration.');
