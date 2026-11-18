
'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),cp=require('child_process'),crypto=require('crypto');
const base=fs.readFileSync('tests/major-patch-check.cjs','utf8').split('const old=launch(null,true);')[0]
 .replace('initial,regularForId,','initial,regularForId,stories:()=>storyData,direction:vnDirection,');
function harness(source){const ctx={require,console};vm.runInNewContext(source+';this.tools={launch,finish};',ctx);return ctx.tools}
const {launch,finish}=harness(base);
const oldBase=base.replace("const disk=name=>fs.readFileSync('dist/'+name+'.js','utf8');",
 "const disk=name=>fs.readFileSync('tests/fixtures/sites/ee429fd3ccd6550f674784a3adbe9dd307ac8dbd/'+name+'.js','utf8');");
const old=harness(oldBase);
const before=old.launch(),g=launch(),a=g.a;g.r.init(a.state(),false,8371);
const original=before.a.stories(),current=a.stories();
assert.deepEqual(Object.keys(current).sort(),Object.keys(original).sort(),'registered story IDs remain stable');
let lines=0,firstPerson=0;
for(const [id,story] of Object.entries(current)){
 assert(story.lines.length>0,'revised content: '+id);assert.equal(story.day,original[id].day);assert.equal(story.when?.toString(),original[id].when?.toString());
 for(const line of story.lines){
  assert.notEqual(line[0],'나','no player speaker in '+id);
  if(line[1].includes('나'))firstPerson++;
  lines++;
 }
 assert.equal(JSON.stringify(story.choice?.options.map(o=>o.perk)),JSON.stringify(original[id].choice?.options.map(o=>o.perk)),'unchanged reward contract '+id);
}
for(const id of Object.keys(before.m.scenes)){
 const snap=before.a.initial();before.r.init(snap,false,12901);
 Object.assign(snap,{day:5,money:3721,stories:['intro','good']});
 snap.week.owned.windowLamp=true;snap.week.placements.window='windowLamp';
 snap.week.queue=['rough','tomori_note'];snap.week.morning={day:5,id,source:'morning',status:'active'};
 snap.pendingStory={id,index:1,choice:null,contentVersion:4};
 const updated=launch(JSON.stringify(snap));assert(updated.a.valid(snap));updated.a.resume();
 assert.equal(updated.a.active().id,id);assert.equal(updated.a.index(),0);
 assert.notEqual(updated.a.definition().lines[1][0],'나');
 assert.equal(updated.a.state().money,3721);
 assert.equal(JSON.stringify(updated.a.state().week.queue),JSON.stringify(snap.week.queue));
 assert.equal(updated.a.state().week.placements.window,'windowLamp');
 finish(updated.a);assert.equal(updated.a.state().week.morning.status,'completed');
}
let effects=[];
a.show('intro',true);
const intro=current.intro;
for(let i=0;i<intro.lines.length;i++){let fx=a.direction(intro,i,intro.lines[i]).fx;if(fx&&fx!=='door')effects.push(i);}
assert.deepEqual(effects,[],'no additional comedy overlays in the rewritten prologue');
assert.equal(a.direction({lines:[['아논','왜!?','shock']]},0,['아논','왜!?','shock']).fx,null,'punctuation alone is not a cue');
assert.equal(a.direction({lines:[['소요','응.','worried']]},0,['소요','응.','worried']).fx,null);
const css=fs.readFileSync('dist/ring-visual.css','utf8');
assert(css.includes('.vn-reaction-anchor { position:absolute'));
assert(css.includes('body[data-tab=story] .staff-control { display:none; }'));
const digest=file=>crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
// The portable repository pins the actual v52 published title asset; the original
// development-only reference image is not needed to execute this backup.
assert.equal(digest('dist/assets/title-screen.png'),'d95ec12820fa50252d5bda88198dab045a6af0f67171718f23e31e228ecc1075');
console.log('PASS visual patch: '+Object.keys(current).length+' stories / '+lines+' lines audited for separate player, '+firstPerson+' lines retain ordinary first-person text, 9 v49 morning saves restart obsolete dialogue safely, choices/IDs/queue unchanged, restrained entrance cues.');

