'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const prefix=fs.readFileSync('tests/major-patch-check.cjs','utf8').split('const old=launch(null,true);')[0].replace('initial,regularForId,','support:requestSupport,defs:()=>storyData,initial,regularForId,');const c={require,console};vm.runInNewContext(prefix+';this.boot=launch;',c);
function finish(a){for(let i=0;a.active();i++){assert(i<150);const s=a.definition();if(s.choice&&a.index()===s.lines.length-1&&a.active().choice===null)a.choose(0);else a.advance();}}
const runs=[];
for(let seed=1;seed<=10;seed++){
 let g=c.boot(),a=g.a;a.newGame();a.state().week.seed=seed;finish(a);
 for(let day=1;day<=42;day++){
  let s=a.state();assert.equal(s.day,day);const cash=s.money;
  if(s.money<500)a.support();if(day>=3)s.enabled.liveSet=true;if(day>=4)s.enabled.matcha=true;
  const basket=g.r.recommendation(s).missing;if(g.r.basketCost(basket)<=s.money)g.r.buyStock(s,basket);
  s.priority='serve';a.open();if(day===1){const order=s.customers[0];a.assign('taki',order.id,'make');a.tick();a.assign('taki',order.id,'serve');}
  for(let i=0;s.phase==='open'&&i<130;i++)a.tick();assert.equal(s.phase,'closed','closes '+seed+'/'+day);
  assert.equal(s.money-cash,s.revenue-s.accounting.purchases-s.accounting.equipment+s.accounting.support-s.overhead-s.loanPaid,'cash equation '+seed+'/'+day);
  assert(a.valid(JSON.parse(JSON.stringify(s))),'valid snapshot '+seed+'/'+day);
  for(const id of [...s.week.queue]){a.adapter().story(id);finish(a);}if(day<42){a.next();finish(a);}
  if(day===14){const snapshot=JSON.stringify(a.state());g=c.boot(snapshot);a=g.a;a.resume();finish(a);}
 }
 runs.push({seed,days:42,money:a.state().money,ending:a.state().endingId});assert(a.state().endingId,'ending reached');
}
// Current scheduler contract for every registered closing story, with explicit
// prerequisite fixtures. This supplements, rather than replaces, linear play.
const base=c.boot(),defs=base.a.defs();let scheduled=0;
for(const[id,entry]of Object.entries(defs)){
 if(id==='intro'||id.startsWith('morning_'))continue;
 let found=false;
 for(let day=Math.max(entry.day||1,id.startsWith('ending_')?28:1);day<Math.max(entry.day||1,28)+10&&!found;day++)for(const cake of [0,5])for(const milk of [0,10]){
  if(found)break;const g=c.boot(),s=g.a.state();g.r.init(s,false,53);Object.assign(s,{day,phase:'prep',money:20000,endingId:id.startsWith('ending_')?null:'ending_bright',endingDays:30,endingServed:id==='ending_forward'?0:100,endingLost:id==='ending_forward'?100:0,served:5,left:id==='rough'?10:0,turnedAway:2,priceWalkouts:2,fatigue:75,soldLiveSet:1});for(const[slot,item]of [['window','windowLamp'],['espresso','machine'],['tables','seats'],['display','display']])g.r.place(s,slot,item);s.phase='open';s.stories=Object.keys(defs).filter(x=>x!==id);s.stock.cake=cake;s.stock.milk=milk;s.enabled.matcha=true;s.enabled.liveSet=true;s.regulars={haru:5,mei:5,jun:5};g.r.open(s);s.week.shift.arrivals=[];const candidate=g.a.defs()[id];if(candidate.when&&!candidate.when(s))continue;g.a.close();if(!s.week.queue.includes(id))continue;g.a.adapter().story(id);assert.equal(g.a.active()?.id,id);finish(g.a);assert(s.stories.includes(id));found=true;scheduled++;
 }
  assert(found,'current scheduler reaches '+id);
}
fs.writeFileSync('.cache/v53/current-engine.json',JSON.stringify({policy:'current RingWeek, automatic serve, recommended purchases, no furniture; actual command/close/save/resume paths',shifts:420,runs,scheduledClosingStories:scheduled,limits:'Targeted prerequisites prove scheduler contracts; not 110 scenes reached in one linear playthrough.'},null,2));
console.log('PASS current RingWeek: 10 seeds ×42 days, 420 closes/accounting/schema checks, mid-run reloads, endings and '+scheduled+' closing story scheduler contracts.');
