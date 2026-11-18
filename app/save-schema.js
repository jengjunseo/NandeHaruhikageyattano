'use strict';
if(typeof window!=='undefined')window.RingSaveSchema=(()=>{
 const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 const integer=(x,min=0,max=1e9)=>Number.isSafeInteger(x)&&x>=min&&x<=max;
 const number=(x,min=-1e12,max=1e12)=>Number.isFinite(x)&&x>=min&&x<=max;
 const modes=['manual','pickup','make','serve','rest'],menuIds=['coffee','latte','cake','matcha','liveSet'];
 function safeTree(value,depth=0,budget={nodes:0}){
  if(depth>24||++budget.nodes>30000)return false;
  if(typeof value==='number')return Number.isFinite(value);
  if(typeof value==='string')return value.length<=20000;
  if(value===null||typeof value==='boolean')return true;
  if(Array.isArray(value))return value.length<=10000&&value.every(x=>safeTree(x,depth+1,budget));
  return object(value)&&Object.entries(value).every(([k,v])=>!['__proto__','constructor','prototype'].includes(k)&&safeTree(v,depth+1,budget));
 }
 function read(input,{defaults,balance,weekValid}={}){
  const fail=code=>({ok:false,code,message:'저장 데이터의 '+({ACCOUNTING:'회계 기록',NUMBERS:'숫자 기록',PREFERENCES:'설정',PRICE:'가격',IDS:'주문 번호',JOBS:'작업 연결',WEEK:'영업 기록',SHAPE:'형식',VERSION:'버전'}[code]||'일부 기록')+'을 확인할 수 없습니다. 원본은 보존됩니다.'});
  if(!object(input)||!safeTree(input))return fail('SHAPE');
  if(input.saveVersion!==undefined&&!integer(input.saveVersion,1,1))return fail('VERSION');
  if(!integer(input.day,1,1000000)||!number(input.money)||!['prep','open','closed'].includes(input.phase)||!object(input.stock)||!Array.isArray(input.customers)||!Array.isArray(input.stories)||!object(input.workers))return fail('SHAPE');
  let s;try{s=JSON.parse(JSON.stringify(input))}catch{return fail('SHAPE')}
  // Only absent legacy fields acquire defaults. Invalid present values are never
  // coerced, so a damaged {} accounting record cannot become a valid balance.
  for(const[k,v]of Object.entries(defaults||{}))if(s[k]===undefined)s[k]=JSON.parse(JSON.stringify(v));
  for(const group of ['stock','prices','enabled','upgrades','regulars'])if(object(s[group]))for(const[k,v]of Object.entries(defaults[group]))if(s[group][k]===undefined)s[group][k]=v;
  if(input.accounting===undefined)s.accounting={startCash:s.money,purchases:0,equipment:0,support:0,soldCost:0,lostCost:0,accurate:false};
  if(input.failures===undefined)s.failures={wait:0,stockWait:0,cancelled:0,missing:{},complete:s.phase==='prep'};
  if(input.tutorial===undefined)s.tutorial={stage:'done',orderId:null};
  if(input.menuHistory===undefined)s.menuHistory={today:{},yesterday:null,complete:s.phase==='prep'};
  const legacy=input.workModel!=='solo-v1';
  if(legacy){
   const old=s.workers,chosen=(s.tutorial?.stage==='making'&&old.player?.id===s.tutorial.orderId?old.player:old.taki)||old.player||null;
   for(const job of [old.player,old.taki])if(job&&job!==chosen&&job.id!==chosen?.id){
    const guest=s.customers.find(c=>c.id===job.id),recipe=balance?.menu[guest?.menu]?.recipe||{coffee:{beans:1},latte:{beans:1,milk:1},cake:{cake:1},matcha:{matcha:1,milk:1},liveSet:{beans:1,cake:1}}[guest?.menu];
    if(guest&&job.kind==='make'&&guest.status==='making'&&recipe){for(const[k,n]of Object.entries(recipe))s.stock[k]=(s.stock[k]||0)+n;guest.status='waiting';delete guest.materialCost;}
    else if(guest&&job.kind==='serve'&&guest.status==='serving')guest.status='ready';
   }
   s.workers={taki:chosen};s.workModel='solo-v1';
   s.nextId=Math.max(s.nextId||1,...s.customers.map(c=>(c.id||0)+1));
  }
  if(!integer(s.nextId,1)||!integer(s.tick)||!integer(s.arrival)||!integer(s.fatigue,0,100))return fail('NUMBERS');
  for(const k of ['served','left','revenue','expense','overhead','waste','turnedAway','priceWalkouts','varietyWalkouts','supportDebt','loanPaid','soldLiveSet','endingDays','endingServed','endingLost'])if(!integer(s[k],0,1e12))return fail('NUMBERS');
  if(!object(s.stock)||!['beans','milk','cake','matcha'].every(k=>integer(s.stock[k])))return fail('NUMBERS');
  if(s.revision!==undefined&&!integer(s.revision))return fail('NUMBERS');
  if(!modes.includes(s.priority)||![1,2].includes(s.simSpeed)||![0,12,30].includes(s.vnSpeed)||![1000,1800,3500].includes(s.vnAutoDelay)||!['normal','large'].includes(s.vnTextSize)||typeof s.reduceMotion!=='boolean'||typeof s.sound!=='boolean'||!number(s.volume,0,1))return fail('PREFERENCES');
  for(const k of ['prices','enabled','upgrades','regulars'])if(!object(s[k]))return fail('SHAPE');
  for(const id of menuIds){
   const base=defaults.prices[id],limits=s.week&&balance?balance.menu[id].steps.map(n=>base+n*balance.priceStep):[Math.ceil(base*.7/50)*50,Math.floor(base*1.4/50)*50];
   // Unchanged legacy defaults (e.g. 480) remain valid even though old +/-
   // controls round their end points to 50. Prices must stay in the mode range.
   if(!integer(s.prices[id],Math.min(base,...limits),Math.max(base,...limits))||typeof s.enabled[id]!=='boolean')return fail('PRICE');
  }
  if(Object.values(s.upgrades).some(x=>!integer(x,0,1))||Object.values(s.regulars).some(x=>!integer(x)))return fail('NUMBERS');
  const a=s.accounting;
  if(!object(a)||!number(a.startCash)||!['purchases','equipment','support','soldCost','lostCost'].every(k=>integer(a[k],0,1e12))||typeof a.accurate!=='boolean')return fail('ACCOUNTING');
  if(s.customers.length>64||s.stories.length>1000||s.stories.some(x=>typeof x!=='string'||x.length>100)||new Set(s.stories).size!==s.stories.length)return fail('SHAPE');
  const ids=new Set();
  for(const c of s.customers){
   if(!object(c)||!integer(c.id,1)||ids.has(c.id)||!menuIds.includes(c.menu)||!['waiting','making','ready','serving'].includes(c.status)||!integer(c.patience,0,1000000)||!integer(c.maxPatience,1,1000000)||c.patience>c.maxPatience)return fail('IDS');
   if(c.price!=null&&!integer(c.price,1,10000)||c.materialCost!=null&&!integer(c.materialCost,0,10000)||c.seat!=null&&!integer(c.seat,0,63))return fail('PRICE');
   if(c.regularId!=null&&!['haru','mei','jun'].includes(c.regularId)||c.regularName!=null&&!['하루','메이','준'].includes(c.regularName)||c.profile!=null&&!['general','window','fan'].includes(c.profile))return fail('SHAPE');
   ids.add(c.id);
  }
  const ledger=s.week?.shift?.ledger||[];
  if(!Array.isArray(ledger)||ledger.length>1000||ledger.some(x=>!object(x)||!integer(x.id,1)))return fail('IDS');
  if(ledger.some(x=>x.revenue!==undefined&&!integer(x.revenue,0,1e12)||x.cost!==undefined&&!integer(x.cost,0,1e12)))return fail('ACCOUNTING');
  if(s.nextId<=Math.max(0,...ids,...ledger.map(x=>x.id)))return fail('IDS');
  if(Object.keys(s.workers).some(k=>k!=='taki'))return fail('JOBS');
  const jobs=Object.values(s.workers).filter(Boolean);
  for(const w of jobs)if(!object(w)||!integer(w.id,1)||!['make','serve'].includes(w.kind)||!integer(w.remaining,1,1000000)||!s.customers.some(c=>c.id===w.id&&c.status===(w.kind==='make'?'making':'serving')))return fail('JOBS');
  if(s.customers.some(c=>['making','serving'].includes(c.status)&&!jobs.some(w=>w.id===c.id&&w.kind===(c.status==='making'?'make':'serve'))))return fail('JOBS');
  if(s.week){try{if(!weekValid?.(s.week,s)||s.week.queue.length>200||new Set(s.week.queue).size!==s.week.queue.length||s.week.photos.length>1000)return fail('WEEK');}catch{return fail('WEEK');}}
  s.saveVersion=1;return {ok:true,value:s,code:null,message:''};
 }
 return {read};
})();
