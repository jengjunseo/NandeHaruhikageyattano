'use strict';
// View-only state: it never enters saves or changes simulation/economy rules.
window.RingCafePresentation = (() => {
  let api, panel='home', previous=null, phase=null, day=null, numbers='';
  const $=s=>document.querySelector(s);
  function mount(value) {
    api=value;
    $('#cafeClosePanel').onclick=close;
    $('#operations').ontoggle=()=>paintNumbers(api.getState());
  }
  function selectTab(tab) { panel=tab; }
  function close() {
    if(api.getState().phase==='open')api.setTab('orders');
    else {panel='home';api.render();}
    $('#weekScene [data-week="prepare"]')?.focus();
  }
  function paintNumbers(s) {
    if(!$('#operations').open)return;
    const value='원두 '+s.stock.beans+' · 우유 '+s.stock.milk+' · 케이크 '+s.stock.cake+' · 말차 '+s.stock.matcha+'\n오늘 매출 ¥'+s.revenue.toLocaleString('ko-KR')+' · 서빙 '+s.served+' · 이탈 '+s.left;
    if(numbers!==value){$('#cafeNumbers').textContent=value;numbers=value;}
  }
  function render(s) {
    if(!api)return;
    if(previous!==s||day!==s.day||phase!==s.phase){panel=s.phase==='open'?'orders':'home';previous=s;day=s.day;phase=s.phase;numbers='';$('#operations').open=false;}
    if(document.body.classList.contains?.('week-editing'))panel='prep';
    document.body.dataset.cafePanel=panel;
    $('#cafeClosePanel').hidden=panel==='home'||s.phase==='open'&&panel==='orders';
    paintNumbers(s);
  }
  return {mount,render,selectTab,close};
})();
