'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const names=['week-balance','week-rules','week-story','final-stories','concert-arc','followup-stories','endings','live-stories','regular-stories','seasonal-stories','cameos','cafe-episodes','main-arc','episodes','choices','stories','comedy-stories','game'];
const code=names.map(name=>fs.readFileSync('app/'+name+'.js','utf8')).join('\n');
function launch(saved=null){
 const elements={};
 const el=id=>elements[id]||= {innerHTML:'',textContent:'',style:{},classList:{add(){},remove(){},toggle(){}},querySelectorAll(){return[]},focus(){}};
 const window={RingWeekView:{mount(){},render(){},ticket(){return ''},archive(){return ''},receipt(){return ''},bindArchive(){},bindStock(){},stock(){return ''},decorLink(){return ''},scenery(){return ''},priceHelp(){return ''},menuStats(){return ''}}};
 const storage={getItem:()=>saved,setItem:(_key,v)=>saved=v};
 const c=vm.createContext({console,window,localStorage:storage,document:{querySelector:el,querySelectorAll:()=>[]},setInterval(){},setTimeout(){return 1},clearTimeout(){}});
 vm.runInContext(require('fs').readFileSync('app/save-schema.js','utf8')+require('fs').readFileSync('app/service-lines.js','utf8')+'\n'+code+';globalThis.flow={state:()=>state,story:()=>activeStory,index:()=>storyIndex,definition:activeStoryDefinition,newGame:titleNewGame,resume:titleResume,open:openDay,assign,tick,nextDay,closeDay,advance:advanceStory,choose:chooseStory,show:showStory,postpone:postponeWeekStory,adapter:weekViewAdapter,valid:validBackupState,snapshot:()=>JSON.parse(JSON.stringify(state)),initial}',c);
 return {a:c.flow,rules:window.RingWeek};
}
function finish(a){
 let guard=0;
 while(a.story()){
  assert(++guard<150,'story did not finish');
  const data=a.definition();
  if(data.choice&&a.index()===data.lines.length-1&&a.story().choice===null)a.choose(0);
  else a.advance();
 }
}
const sample=launch(), original=sample.a.initial();
Object.assign(original,{day:4,phase:'open',nextId:9,tick:12,arrival:999,stories:['intro'],customers:[
 {id:8,menu:'latte',price:670,seat:1,status:'making',materialCost:230,patience:19,maxPatience:26}
],workers:{taki:{id:8,kind:'make',remaining:3}}});
const restored=launch(JSON.stringify(original)).a;
assert.equal(restored.state().week,undefined);
restored.tick();
assert.equal(restored.state().workers.taki.remaining,2);
assert.equal(restored.state().customers[0].price,670);
restored.closeDay();
finish(restored);
restored.nextDay();
assert.equal(restored.state().day,5);
assert(restored.state().week);
assert.equal(restored.state().money,2200);

function run(weak){
 const {a,rules}=launch();a.newGame();a.state().week.seed=47001;
 assert.equal(a.definition().lines[0][1],'하아… 어제 드럼 편곡하다 3시간 잤더니 눈앞이 노랗네…');
 finish(a);
 if(!weak)for(const id of Object.keys(a.state().prices))a.state().prices[id]-=50;
 let postponed=false;
 for(let day=1;day<=42;day++){
  const s=a.state();
  if(weak&&day>1)s.prices.coffee=630;
  if(s.money<500){s.money+=2500;s.supportDebt+=2500}
  if(day>=3)s.enabled.liveSet=true;
  const basket=rules.recommendation(s).missing;
  if(rules.basketCost(basket)<=s.money)rules.buyStock(s,basket);
  s.priority=weak&&day>1?'manual':'serve';
  a.open();
  if(day===1){a.assign('taki',s.customers[0].id,'make');a.tick();a.assign('taki',s.customers[0].id,'serve')}
  for(let i=0;s.phase==='open'&&i<110;i++)a.tick();
  assert.equal(s.phase,'closed');
  assert.equal(a.story(),null,'receipt precedes VN');
  const cash=s.money;a.closeDay();assert.equal(s.money,cash,'no duplicate accounting');
  if(day===2){
   assert(s.week.queue.includes('tomori_note'));
   a.adapter().story('tomori_note');a.advance();a.advance();
   assert.equal(a.definition().lines.length,4);
   a.postpone();
   assert.equal(s.pendingStory,null);
   assert.equal(s.week.bookmarks.tomori_note.index,2);
   postponed=true;
  }
  if(day===3&&postponed){
   a.adapter().story('tomori_note');
   assert.equal(a.index(),2);
   finish(a);
   assert.equal(s.week.memories.note,'save');
  }
  for(const id of [...s.week.queue])if(id!=='tomori_note'||day!==2){a.adapter().story(id);finish(a)}
  assert(a.valid(a.snapshot()),'valid exported snapshot at day '+day);
  if(day===7){assert(s.week.owned.liveMemento);assert(s.week.photos.some(p=>p.day===7))}
  if(day===28)assert.equal(s.endingId,weak?'ending_forward':'ending_bright');
  if(day!==42)a.nextDay();
 }
 assert(a.state().stories.includes('concert_11'));
 assert.equal(a.state().day,42);
 return a.state().endingId;
}
const ending=[run(false),run(true)];
assert.notEqual(...ending);
console.log('PASS: original active-shift migration, receipt before story, postponed beat resume, day 7 snapshot and both day 28 endings through day 42.');

