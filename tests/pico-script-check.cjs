'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const imported=JSON.parse(fs.readFileSync('tests/pico-rewrite/imported.json','utf8'));
const prefix=fs.readFileSync('tests/major-patch-check.cjs','utf8').split('const old=launch(null,true);')[0]
 .replace('initial,regularForId,','initial,regularForId,storyData:()=>storyData,cast:vnCast,');
function harness(p){const c={require,console};vm.runInNewContext(p+';this.launchGame=launch;',c);return c.launchGame;}
const launch=harness(prefix),prior=harness(prefix.replace("const disk=name=>fs.readFileSync('dist/'+name+'.js','utf8');","const disk=name=>fs.readFileSync('tests/pico-rewrite/before/'+name+'.js','utf8');"));
const game=launch(),old=prior(),defs=game.a.storyData(),oldDefs=old.a.storyData();
game.r.init(game.a.state(),false,234);
assert.equal(Object.keys(defs).length,110);assert.deepEqual(Object.keys(defs).sort(),Object.keys(imported.scenes).sort());
const pairs=lines=>JSON.stringify(lines.map(l=>l.slice(0,2)));
let lines=0,legacy=0;
for(const[id,expected]of Object.entries(imported.scenes)){
 const definition=game.a.adapter;const original=oldDefs[id],actual=defs[id];
 assert.equal(actual.title,expected.title,id);assert.equal(actual.day,original.day,id);assert.equal(actual.when?.toString(),original.when?.toString(),id);
 assert.equal(pairs(actual.lines),pairs((imported.compat[id]||expected).lines),id+' full text');
 if(expected.choice){assert.equal(actual.choice.prompt,expected.choice.prompt);for(const[i,o]of expected.choice.options.entries()){
  assert.equal(actual.choice.options[i].perk,original.choice.options[i].perk);assert.equal(actual.choice.options[i].label,o.label);assert.equal(JSON.stringify(actual.choice.options[i].reply),JSON.stringify(o.reply));
 }}else assert.equal(actual.choice,undefined);
 game.a.show(id,true);assert.equal(pairs(game.a.definition().lines),pairs(expected.lines),id+' effective text');
 for(let guard=0;game.a.active();guard++){
  assert(guard<100,id+' completes');const s=game.a.definition();
  if(s.choice&&game.a.index()===s.lines.length-1&&game.a.active().choice===null)game.a.choose(0);else game.a.advance();
 }lines+=expected.lines.length;
 // Test migration from a real previous runtime snapshot at its final old line.
 const base=old.a.initial();old.r.init(base,false,234);
 base.day=21;base.money=8451;base.stock.milk=17;base.stories=['intro'];base.week.queue=['good'];
 base.pendingStory={id,index:original.lines.length-1,choice:null,contentVersion:id==='intro'?6:4};
 if(id.startsWith('morning_'))base.week.morning={day:21,id,source:'morning',status:'active'};
 const loaded=launch(JSON.stringify(base));assert(loaded.a.valid(base),id+' valid old save');loaded.a.resume();
 assert.equal(loaded.a.active().id,id);assert.equal(loaded.a.index(),0,id+' rewritten scene starts safely');
 assert.equal(loaded.a.state().money,8451);assert.equal(loaded.a.state().stock.milk,17);assert.equal(JSON.stringify(loaded.a.state().week.queue),'["good"]');
 assert.equal(loaded.a.state().pendingStory.contentVersion,8);legacy++;
 loaded.a.advance();const saved=loaded.saved(),restored=launch(saved);restored.a.resume();assert.equal(restored.a.index(),1,id+' current scene keeps its position');
 if(imported.compat[id]){assert.equal(restored.a.state().pendingStory.scriptVariant,'long');assert.equal(pairs(restored.a.definition().lines),pairs(imported.compat[id].lines));
  base.pendingStory={id,index:7,choice:null,contentVersion:7};delete base.week.morning;const compact=launch(JSON.stringify(base));compact.a.resume();assert.equal(compact.a.index(),0);assert.equal(pairs(compact.a.definition().lines),pairs(expected.lines));
 }
 if(expected.choice)for(const choice of [0,1]){
  base.pendingStory={id,index:original.lines.length,choice,contentVersion:4};const chosen=launch(JSON.stringify(base));chosen.a.resume();assert.equal(chosen.a.index(),actual.lines.length);assert.equal(chosen.a.active().choice,choice);chosen.a.advance();assert.equal(chosen.a.state().storyChoices[id],choice);
 }
}
// Replay must leave the complete game/save progression unchanged.
const fresh=launch();const before=JSON.stringify(fresh.a.state());fresh.a.show('intro',true);while(fresh.a.active())fresh.a.advance();assert.equal(JSON.stringify(fresh.a.state()),before);
// All 82 service strings round-trip through the actual exporter and conditional rule functions.
const child=require('child_process');child.execFileSync(process.execPath,['tests/export-story-book.cjs','tests/pico-rewrite/verified-story-book.md']);
const book=fs.readFileSync('tests/pico-rewrite/verified-story-book.md','utf8').split('## 부록 B —')[1];
const reactions=[...book.matchAll(/- ([^\n]+)\n\n\*\*([^*]+)\*\*: ([^\n]+)/g)].map(m=>({condition:m[1],who:m[2],text:m[3]}));
assert.equal(JSON.stringify(reactions),JSON.stringify(imported.service));
console.log('PASS Pico rewrite: 110 exact scripts / '+lines+' dialogue+direction lines, 4 compatibility variants, both branches of 3 choices, 82 exact service reactions; '+legacy+' old snapshots migrate safely, current positions restore, replay is isolated.');
