'use strict';
// Original procedural Foley. No external recordings or music are redistributed.
window.RingAudio=(()=>{
 let context=null,master=null,compressor=null,noise=null,unlocked=false,active=0;
 const recent=new Map();
 function setup(){
  const A=window.AudioContext||window.webkitAudioContext;if(!A)return null;
  if(!context||context.state==='closed'){
   context=new A();master=context.createGain();compressor=context.createDynamicsCompressor();
   compressor.threshold.value=-18;compressor.knee.value=18;compressor.ratio.value=5;
   master.connect(compressor).connect(context.destination);
   noise=context.createBuffer(1,context.sampleRate*2,context.sampleRate);const data=noise.getChannelData(0);let brown=0;
   for(let i=0;i<data.length;i++){brown=(brown+Math.random()*.14-.07)/1.02;data[i]=brown*3}
  }return context;
 }
 async function unlock(){try{const ctx=setup();if(!ctx)return;if(ctx.state!=='running')await ctx.resume();unlocked=ctx.state==='running'}catch{}}
 function release(source,gain,filter){source.onended=()=>{source.disconnect();gain.disconnect();filter?.disconnect();active=Math.max(0,active-1)}}
 function tone(freq,delay,duration,volume=.25,type='sine',endFreq){
  if(active>=28)return;active++;const at=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();
  o.type=type;o.frequency.setValueAtTime(freq,at);if(endFreq)o.frequency.exponentialRampToValueAtTime(endFreq,at+duration);
  g.gain.setValueAtTime(.0001,at);g.gain.exponentialRampToValueAtTime(Math.max(.0002,volume),at+.006);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  o.connect(g).connect(master);release(o,g);o.start(at);o.stop(at+duration+.02);
 }
 function hiss(delay,duration,volume,frequency=1800,type='lowpass'){
  if(active>=28)return;active++;const at=context.currentTime+delay,s=context.createBufferSource(),f=context.createBiquadFilter(),g=context.createGain();
  s.buffer=noise;f.type=type;f.frequency.value=frequency;g.gain.setValueAtTime(.0001,at);g.gain.linearRampToValueAtTime(volume,at+.025);g.gain.exponentialRampToValueAtTime(.0001,at+duration);
  s.connect(f).connect(g).connect(master);release(s,g,f);s.start(at,Math.random()*.7);s.stop(at+duration+.02);
 }
 function perform(type,state){
  if(!unlocked||!state.sound||!state.volume||document.hidden)return;
  try{const ctx=setup();if(!ctx||ctx.state!=='running')return;
   const now=performance.now();if(now-(recent.get(type)||-1000)<(type==='click'?50:120))return;recent.set(type,now);
   master.gain.setTargetAtTime(Math.min(.8,Math.max(0,state.volume))*.62,ctx.currentTime,.015);
   switch(type){
    case 'anger':tone(1450,0,.07,.16,'sawtooth',420);hiss(0,.09,.12,2800,'highpass');break;
    case 'tremble':for(let i=0;i<7;i++)tone(88+i%2*12,i*.065,.08,.1,'triangle');break;
    case 'rumble':tone(70,0,.32,.11,'sine',45);hiss(0,.28,.1,350);tone(105,.08,.2,.04,'triangle',60);break;
    case 'boom':hiss(0,.18,.12,850);tone(160,0,.19,.1,'sine',65);break;
    case 'shout':hiss(0,.25,.12,650);tone(120,0,.28,.1,'triangle',65);break;
    case 'surprise':tone(420,0,.13,.12,'triangle',1380);tone(1760,.12,.22,.1);break;
    case 'plop':tone(240,0,.16,.16,'sine',65);hiss(.01,.13,.1,450);break;
    case 'tease':tone(659,0,.1,.1,'triangle');tone(784,.12,.09,.08,'triangle');tone(622,.24,.16,.1,'triangle');break;
    case 'sparkle':[1319,1760,2093].forEach((f,i)=>tone(f,i*.09,.3,.07));break;
    case 'reveal':tone(330,0,.12,.12,'triangle');tone(392,.12,.13,.12,'triangle');tone(523,.25,.35,.13);break;
    case 'deadpan':tone(523,0,.07,.1,'triangle',440);break;
    case 'sleep':tone(330,0,.3,.07,'sine',220);tone(220,.3,.4,.04,'sine',165);break;
    case 'sweat':tone(1047,0,.16,.06,'sine',440);break;
    case 'point':tone(1175,0,.08,.07);break;
    case 'laugh':[659,784,988].forEach((f,i)=>tone(f,i*.07,.13,.06,'triangle'));break;
    case 'door':tone(1568,0,.6,.16,'sine');tone(2093,.07,.7,.09);tone(3136,0,.23,.025);break;
    case 'brew':hiss(0,.28,.27,900);hiss(.2,1.1,.18,2300);tone(88,0,.45,.08,'triangle',67);tone(740,.04,.06,.045);break;
    case 'cup':tone(1800,0,.09,.1,'triangle');tone(2600,.035,.12,.05);hiss(0,.08,.12,700);break;
    case 'ready':tone(1047,0,.16,.12);tone(1568,.12,.28,.12);break;
    case 'serve':tone(1760,0,.11,.14,'triangle');tone(2349,.07,.15,.1);tone(3136,.16,.25,.09);hiss(.01,.08,.1,4000,'highpass');break;
    case 'purchase':hiss(0,.17,.2,1800);tone(640,.03,.09,.1,'triangle');tone(960,.11,.12,.09,'triangle');break;
    case 'upgrade':[523,659,784,1047,1319].forEach((f,i)=>tone(f,i*.08,.4,.13,'triangle'));hiss(.3,.5,.09,3000,'highpass');break;
    case 'open':[392,523,659,784].forEach((f,i)=>tone(f,i*.11,.5,.13,'triangle'));break;
    case 'result':[523,659,784,1047].forEach((f,i)=>tone(f,i*.13,.7,.13,'triangle'));tone(1319,.55,.75,.08);break;
    case 'leave':tone(392,0,.15,.08,'triangle',330);tone(294,.12,.24,.06);break;
    case 'story':tone(659,0,.32,.08);tone(988,.14,.45,.06);break;
    case 'choice':tone(784,0,.13,.09);tone(1175,.1,.3,.08);break;
    case 'pause':hiss(0,.09,.08,900);tone(440,0,.06,.05);break;
    default:tone(880,0,.045,.065,'sine',660);break;
   }
  }catch{}
 }
 function play(type,state){if(!state.sound||!state.volume)return;if(unlocked)perform(type,state);else if(context?.state==='running'){unlocked=true;perform(type,state)}}
 return {unlock,play,get supported(){return !!(window.AudioContext||window.webkitAudioContext)}};
})();
