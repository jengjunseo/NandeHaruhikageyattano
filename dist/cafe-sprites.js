'use strict';
window.RingCafeSprites = (() => {
  const frames={idle:0,walk:1,make:3,serve:4,success:5,tired:6,rest:7};
  let previous=null,lastRevenue=0,saleAt=-100;
  const failed=path=>window.RingAssets?.failures?.includes(path);
  function pose(s) {
    const work=s.workers.taki;
    if(work)return work.kind==='make'?'make':work.remaining>1?'walk':'serve';
    if(s.fatigue>=60)return 'tired';
    if(s.priority==='rest'&&s.phase==='open')return 'rest';
    if(s.phase==='closed'&&s.served>0||s.phase==='open'&&s.tick-saleAt<3)return 'success';
    return 'idle';
  }
  function paint(s) {
    if(previous!==s){previous=s;lastRevenue=s.revenue;saleAt=-100;}
    if(s.revenue>lastRevenue)saleAt=s.tick;lastRevenue=s.revenue;
    const root=document.querySelector('.worker.taki');
    if(root){const state=pose(s),frame=frames[state];root.dataset.pose=state;root.style.setProperty('--sd-col',frame%4);root.style.setProperty('--sd-row',Math.floor(frame/4));}
    document.body.classList.toggle('taki-art-fallback',!!failed('assets/pico-taki-v52.png'));
    document.body.classList.toggle('guest-art-fallback',!!failed('assets/pico-guests-v52.png'));
    document.body.classList.toggle('cafe-art-fallback',!!failed('assets/cafe-v52.png'));
    document.body.classList.toggle('furniture-art-fallback',!!failed('assets/furniture-v52.png'));
    document.body.classList.toggle('display-art-fallback',!!failed('assets/cafe-display-v52.png'));
  }
  function guest(id) { return {haru:0,jun:1,mei:2}[id]??3; }
  function background(path,display=false) {return path==='assets/cafe.png'&&!failed('assets/cafe-v52.png')?display&&!failed('assets/cafe-display-v52.png')?'assets/cafe-display-v52.png':'assets/cafe-v52.png':path;}
  return {pose,paint,guest,background,frames};
})();
