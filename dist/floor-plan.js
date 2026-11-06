'use strict';
// Positions use the cafe image's floor, with a clear aisle down the middle.
// x is the feet centre; bottom is the baseline. Portraits face left in source art.
window.RingFloor=(()=>{
 const seats=[
  {x:16,bottom:4,scale:1}, {x:84,bottom:4,scale:1},
  {x:24,bottom:28,scale:.88}, {x:77,bottom:30,scale:.88},
  {x:12,bottom:43,scale:.76}, {x:88,bottom:45,scale:.76},
  {x:67,bottom:47,scale:.74}
 ];
 const home={x:55,bottom:23,scale:.92};
 function seat(index){return {...seats[Number.isInteger(Number(index))&&Number(index)>=0&&Number(index)<seats.length?Number(index):0]}}
 function customer(node,index){const p=seat(index),right=p.x<50;node.dataset.facing=right?'right':'left';for(const [key,value] of Object.entries({'--guest-x':p.x+'%','--guest-bottom':p.bottom+'%','--guest-scale':p.scale,'--guest-facing':right?-1:1,'--entry-x':right?'-55px':'55px','--guest-depth':Math.round(70-p.bottom)}))node.style?.setProperty?.(key,String(value))}
 function destination(index){const p=seat(index);return {x:p.x+(p.x<50?12:-12),bottom:Math.max(1,p.bottom-2),scale:p.scale,facing:p.x<50?-1:1}}
 function worker(node,work,customers){
  const guest=work?.kind==='serve'?customers.find(c=>c.id===work.id):null;
  const p=guest?destination(guest.seat):home;
  node.dataset.serviceTarget=guest?String(guest.id):'';
  node.dataset.facing=guest?(p.facing<0?'left':'right'):'right';
  node.classList.toggle('handoff',!!guest&&work.remaining<=1);
  for(const [key,value] of Object.entries({'--worker-x':p.x+'%','--worker-bottom':p.bottom+'%','--worker-scale':p.scale,'--worker-facing':p.facing||1}))node.style?.setProperty?.(key,String(value));
  const tray=node.querySelector?.('.service-item');if(tray){tray.className='service-item menu-art art-'+(guest?.menu||'coffee');tray.hidden=!guest}
 }
 return {seat,customer,destination,worker,home:{...home}};
})();
