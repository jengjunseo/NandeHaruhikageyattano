'use strict';
window.RingDiagnostics=(()=>{
 const events=[];let lastAction='boot';
 function record(code,detail={}){events.push({code:String(code).replace(/[^A-Z0-9_]/g,'').slice(0,48),phase:lastAction,line:Number.isInteger(detail.line)?detail.line:undefined});if(events.length>20)events.shift();}
 document.addEventListener('click',event=>{const target=event.target?.closest?.('button,select');if(target?.id)lastAction=target.id.replace(/[^a-zA-Z0-9_-]/g,'').slice(0,48);},{capture:true,passive:true});
 window.addEventListener('error',event=>record('UNHANDLED_ERROR',{line:event.lineno}));window.addEventListener('unhandledrejection',()=>record('UNHANDLED_PROMISE'));
 function snapshot(){return {version:53,build:window.RingBuild?.id||'v53-development',browser:navigator.userAgent,events:events.slice(),assets:window.RingAssets?.diagnostics(),storagePolicy:'local only; no alias, save, dialogue or remote transmission included'};}
 function download(){const raw=JSON.stringify(snapshot(),null,2),href=URL.createObjectURL(new Blob([raw],{type:'application/json'})),link=document.createElement('a');link.href=href;link.download='ring-v53-diagnostics.json';link.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
 return {record,snapshot,download};
})();
