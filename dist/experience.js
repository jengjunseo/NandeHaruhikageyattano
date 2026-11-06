'use strict';
window.RingExperience=(()=>{
 let api=null,prep='stock',paused=false,lastRevenue=null,lastDay=null,lastPhase=null,lastWork='',jobLength=1,toastTimer=null;
 const $=s=>document.querySelector(s),yen=n=>'¥'+n.toLocaleString();
 const art=id=>`<span class="menu-art art-${id}" aria-hidden="true"></span>`;
 const ingredientArt={beans:'beans',milk:'latte',cake:'cake',matcha:'matcha'};
 function paintPrep(){
  document.body.dataset.prep=prep;
  document.querySelectorAll('[data-prep]').forEach(b=>{const on=b.dataset.prep===prep;b.classList.toggle('active',on);b.setAttribute('aria-pressed',on)});
  // hidden removes inactive sections from both keyboard navigation and accessibility trees.
  document.querySelectorAll('[data-section]').forEach(section=>section.hidden=section.dataset.section!==prep);
 }
 function mount(value){
  api=value;
  document.addEventListener('pointerdown',()=>{window.RingAudio?.unlock()},{capture:true,passive:true});
  document.addEventListener('keydown',()=>{window.RingAudio?.unlock()},{capture:true});
  document.querySelectorAll('[data-prep]').forEach(b=>b.onclick=()=>{prep=b.dataset.prep;api.beep();paintPrep();$('#panel').scrollTop=0});
  $('#soundQuick').onclick=()=>{const s=api.getState();s.sound=!s.sound;api.save();api.beep('choice');api.render()};
  $('#pauseBtn').onclick=()=>{paused=!paused;api.beep('pause');api.render()};
  document.addEventListener('keydown',event=>{
   if(event.target.matches('input,select,textarea')||$('#app').inert)return;
   if(event.code==='Space'&&event.target===document.body&&api.getState().phase==='open'){event.preventDefault();paused=!paused;api.render()}
   if(event.key==='Escape'&&paused){paused=false;api.render()}
  });
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)api.render()});
 }
 function render(s,view){
  if(!api)return;
  if(lastDay!==s.day||s.phase!=='open')paused=false;
  const body=document.body;body.dataset.phase=s.phase;body.dataset.tab=view.tab;body.classList.toggle('busy-board',s.customers.length>=5);body.classList.toggle('game-paused',paused||document.hidden||view.menuPaused||view.modalOpen||!!window.RingTitle?.blocked);
  const allPaused=paused||document.hidden||view.menuPaused||view.modalOpen||!!window.RingTitle?.blocked;
  $('#pauseBtn').hidden=s.phase!=='open';$('#pauseBtn').textContent=paused?'영업 재개':'일시정지';$('#pauseBtn').setAttribute('aria-pressed',paused);
  $('#soundQuick').textContent=s.sound?'소리 켜짐':'소리 꺼짐';$('#soundQuick').setAttribute('aria-label',s.sound?'효과음 음소거':'효과음 켜기');$('#soundQuick').setAttribute('aria-pressed',!s.sound);
  $('#dayMood').textContent=`${view.season} · ${view.rainy?'비 오는 날':'맑은 날'}${view.special?' · 특별 공연':view.live?' · 라이브 공연':''}`;
  const fill=$('#shiftFill');fill.style.width=Math.min(100,s.tick/view.length*100)+'%';
  const hour=Math.min(19,11+Math.floor(Math.min(s.tick,view.length)/view.length*8)),minute=Math.floor((Math.min(s.tick,view.length)/view.length*8%1)*60);
  if(s.phase==='open'&&s.tick<view.length)$('#clock').textContent=allPaused?'일시정지':`${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')} · 영업 중`;
  const work=s.workers.taki,key=work?work.id+':'+work.kind:'';
  if(key!==lastWork){jobLength=work?.remaining||1;lastWork=key}
  const name=work?s.customers.find(c=>c.id===work.id)?.menu:null;
  const menuNames={coffee:'블렌드 커피',latte:'카페 라테',cake:'오늘의 케이크',matcha:'말차 라테',liveSet:'공연 콜라보 세트'};
  $('#workStatus').textContent=work?`${menuNames[name]||''} ${work.kind==='make'?'만드는 중':'전달 중'} · ${work.remaining}초`:s.phase==='prep'?'오늘도 한 잔씩, 차근차근.':s.phase==='closed'?'수고했어. 이제 정리하자.':s.priority==='rest'?'잠깐 쉬는 중':allPaused?'잠시 영업을 멈췄습니다':'다음 주문을 기다리는 중';
  $('#workFill').style.width=work?Math.max(5,(1-work.remaining/jobLength)*100)+'%':'0%';
  $('.cafe-console').classList.toggle('working',!!work);$('#fatigueLabel').style.setProperty('--fatigue',s.fatigue+'%');
  const brief=$('#dayBrief');
  if(s.phase==='prep'){
   const r=view.recommendation;
   brief.hidden=false;brief.innerHTML=`<span class="brief-day">DAY ${String(s.day).padStart(2,'0')}</span><h2>오늘의 카페 영업</h2><p>${view.special?'공연을 기다리는 손님들로 바쁜 하루가 되겠어.':view.live?'라이브가 있는 날. 오픈 전에 재료부터 확인하자.':view.rainy?'비 오는 날엔 따뜻한 커피 한 잔이 좋겠지.':'잔을 꺼내고, 원두를 채우고. 문을 열 준비를 하자.'}</p><div class="brief-facts"><span>${view.special?'특별 공연일':view.live?'라이브 공연일':'일반 영업일'}</span><span>${r.cost?`보충 제안 ${yen(r.cost)}`:'재료 준비 완료'}</span></div><button id="stageOpen" class="primary">영업 시작하기 <span>→</span></button><button id="introReplay" class="intro-replay">프롤로그 다시 보기</button>`;$('#introReplay').onclick=()=>api.replayIntro();$('#stageOpen').onclick=()=>{paused=false;api.openDay()};
  }else{brief.hidden=true;if(lastPhase==='prep')brief.innerHTML=''}
  const stockNames={beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'};
  $('#stockDock').innerHTML=Object.entries(stockNames).map(([id,label])=>`<button class="stock-item ${s.stock[id]===0?'stock-empty':''}" data-stock-link="${id}" aria-label="${label} 재고 ${s.stock[id]}개${s.phase==='prep'?' 발주 열기':''}">${art(ingredientArt[id])}<span>${label}<b>${s.stock[id]}<small>개</small></b></span></button>`).join('');
  document.querySelectorAll('[data-stock-link]').forEach(b=>b.onclick=()=>{prep='stock';api.setTab('prep');paintPrep()});
  $('#prepNav').hidden=view.tab!=='prep';paintPrep();
  if(s.revenue>lastRevenue&&lastRevenue!==null&&lastDay===s.day){
   const node=$('#saleFeedback');node.textContent='+'+yen(s.revenue-lastRevenue);node.classList.remove('show');void node.offsetWidth;node.classList.add('show');
   if(toastTimer)clearTimeout(toastTimer);toastTimer=setTimeout(()=>node.classList.remove('show'),1600);
  }
  if(s.phase==='closed')$('#stockDock').classList.add('closed');else $('#stockDock').classList.remove('closed');
  // The worker moves to the selected customer's seat while serving.
  const actor=$('.worker.taki');if(actor){actor.classList.toggle('resting',s.priority==='rest'&&!work);window.RingFloor?.worker(actor,work,s.customers)}
  // Dedicated item art replaces platform emoji in menu controls without changing button names.
  document.querySelectorAll('[data-toggle]').forEach(b=>{const title=b.parentElement.querySelector('strong');if(title&&!title.querySelector('.menu-art')){title.textContent=title.textContent.replace(/^[^가-힣]+/,'');title.insertAdjacentHTML('afterbegin',art(b.dataset.toggle))}});
  lastRevenue=s.revenue;lastDay=s.day;lastPhase=s.phase;
 }
 return {mount,render,get paused(){return paused||document.hidden}};
})();
