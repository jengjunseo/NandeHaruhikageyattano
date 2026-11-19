'use strict';

window.RingWeekView = (() => {
  const rules = window.RingWeek;
  const $ = selector => document.querySelector(selector);
  const yen = amount => '¥' + amount.toLocaleString('ko-KR');
  const art = id => `<span class="menu-art art-${id}" aria-hidden="true"></span>`;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[char]);
  const slotClass = key => 'slot-' + key;
  const menuNames = { coffee:'블렌드 커피', latte:'카페 라테', cake:'오늘의 케이크', matcha:'말차 라테', liveSet:'공연 세트' };
  let api, editor = null, lastScene = '', cart = null, lastGame;

  function mount(adapter) {
    api = adapter;
    document.addEventListener('click', event => {
      const button = event.target.closest('#weekScene button[data-week], #weekEditorHost button[data-week]');
      if (!button || button.disabled) return;
      const action = button.dataset.week, id = button.dataset.id;
      if (action === 'open') {
        const state=api.state();
        if(cart?.state===state&&cart.day===state.day&&rules.basketCost(cart.counts)>0){
          api.prep('stock');
          $('#weekOpenFromPrep')?.click();
        } else api.open();
      }
      if (action === 'prepare') api.prep('stock');
      if (action === 'prep') api.prep(id);
      if (action === 'next-prep') api.applyNextPrep();
      if (action === 'menu-record') api.applyNextPrep({day:api.state().day,kind:'menu',id});
      if (action === 'receipt') api.receipt();
      if (action === 'edit') edit();
      if (action === 'close-editor') {
        editor = null;
        api.render();
        $('#weekScene [data-week="edit"]')?.focus();
      }
      if (action === 'slot') { editor.slot = id; editor.preview = undefined; refresh(); }
      if (action === 'preview') { editor.preview = id; refresh(); }
      if (action === 'place') {
        if (api.place(editor.slot, editor.preview === 'base' ? null : editor.preview)) {
          editor.preview = undefined;
          refresh();
        }
      }
      if (action === 'undo') { if (api.undo()) { editor.preview = undefined; refresh(); } }
      if (action === 'zoom') { editor.zoom = !editor.zoom; refresh(); }
            if (action === 'milk') api.linkMilk(Number(id));
      if (action === 'serve') api.assign(Number(id), 'serve');
      if (action === 'cancel-queue') api.cancelQueue();
    });
    $('#weekEditorHost').addEventListener('submit', event => {
      if (event.target.id !== 'weekAlias') return;
      event.preventDefault();
      api.alias(event.target.elements.alias.value);
    });
  }

  function edit() {
    if (!api.state().week || api.state().phase === 'open') return;
    editor = { slot:'window', preview:undefined, zoom:false };
    refresh();
    $('#weekEditorHost [data-week="close-editor"]')?.focus({preventScroll:true});
  }

  function refresh() {
    lastScene = '';
    api.render();
  }

  function prop(id) {
    return `<i class="cafe-prop ${['windowLamp','machine','poster','pickupShelf'].includes(id)?'painted-prop ':''}prop-${id}" aria-hidden="true"><i></i><i></i><i></i></i>`;
  }

  function scenery(placements, memories = {}) {
    const props = Object.entries(placements).map(([slot, id]) =>
      `<span class="prop-spot ${slotClass(slot)}">${prop(id)}</span>`);
    if (memories.note) props.push(`<span class="prop-spot prop-note" title="토모리의 분실물함">✉</span>`);
    if (memories.poster && !Object.values(placements).includes('poster')) {
      props.push(`<span class="prop-spot ${slotClass(memories.poster)}">${prop('poster')}</span>`);
    }
    if (memories.cup) props.push(`<span class="prop-spot prop-cup" title="라나의 컵">${art(memories.cup==='tall'?'latte':'coffee')}</span>`);
    if (memories.reserved) props.push('<span class="prop-spot prop-reserved">예약석</span>');
    return props.join('');
  }

  function control(action, id, text, extra = '') {
    return `<button type="button" data-week="${action}" data-id="${id}" ${extra}>${text}</button>`;
  }

  function editorMarkup(state) {
    const {slot, preview, zoom} = editor;
    const ids = Object.keys(rules.items).filter(id => rules.items[id].slot === slot || id === 'poster' && slot === 'stage');
    const candidate = rules.items[preview], owned = state.week.owned[preview];
    const canPlace = preview === 'base' || candidate && rules.unlocked(state, preview) && (owned || candidate.cost <= state.money || candidate.cost === 0);
    return `<section class="week-editor" aria-label="매장 꾸미기">
        <header><strong>${rules.slots[slot]} 꾸미기</strong><span>${yen(state.money)}</span>
          ${control('zoom','',zoom?'축소':'확대','aria-pressed="'+zoom+'"')}
          ${control('close-editor','','완료')}</header>
        <div class="week-slot-list" aria-label="배치 위치 목록">${Object.entries(rules.slots).map(([key,label]) =>
          control('slot',key,label,'aria-pressed="'+(key===slot)+'"')).join('')}</div>
        <div class="week-catalog">${control('preview','base','기본 배치','aria-pressed="'+(preview==='base')+'"')}
          ${ids.map(id => {
            const item=rules.items[id], has=state.week.owned[id];
            const price=has?(state.week.placements[slot]===id?'배치 중':'보관 중'):rules.unlocked(state,id)?yen(item.cost):item.unlock==='first_close'?'첫 마감 후':'DAY '+item.day;
            return control('preview',id,`<strong>${item.name}</strong><span>${price}</span><small>${item.effect}</small>`,'aria-pressed="'+(preview===id)+'"');
          }).join('')}</div>
        <footer>${candidate?`<p class="facility-compare">${esc(rules.facilityCompare(state,preview))}</p>`:''}${candidate?'<small class="growth-preview">'+(owned?'이미 보유 · 배치 무료 · 하루 유지비 '+yen(candidate.upkeep):candidate.cost<=state.money?'구매 후 '+yen(state.money-candidate.cost)+' · 하루 유지비 '+yen(candidate.upkeep):yen(candidate.cost-state.money)+' 부족')+'</small>':''}${control('place','',preview==='base'?'기본으로 돌리기':owned?'배치':'구매·배치',canPlace?'class="primary"':'disabled')}
          ${candidate?'<small>배치를 누르면 가게에 바로 적용돼요. 새 물건은 이때 결제합니다.</small>':''}
          ${control('undo','','되돌리기',state.week.undo?'':'disabled')}
          <form id="weekAlias"><input name="alias" maxlength="28" aria-label="가게 별칭 14자" value="${esc(state.week.alias)}" placeholder="가게 별칭"><button>저장</button></form>
        </footer>
      </section>`;
  }

  function waveLabel(state) {return {off:'',before:'공연 전',during:'공연 중',after:'공연 후'}[rules.livePhase(state)];}

  function openMarkup(state, selected) {
    const shift=state.week.shift;
    const pickup=state.customers.filter(c=>c.status==='ready');
    const queued=state.week.nextJob;
    const pending=state.customers.filter(c=>c.menu==='liveSet').length;
    const received=pending+shift.ledger.filter(row=>row.accepted||row.setReplaced||row.menu==='liveSet'&&row.reason==='sold').length+
      state.customers.filter(c=>c.setReplaced).length;
    const plan=rules.dayPlan?.(state);
    const remaining=rules.available(state,'liveSet')?rules.setLimit(state.day)-shift.sets:0;
    const sale=shift.ledger.findLast(row=>row.reason==='sold'&&row.at!==undefined&&state.tick-row.at<4);
    const seat=sale&&window.RingFloor?.seat(sale.seat??0,state.week.placements);
    const coach=state.customers.find(c=>c.id===shift.coach);
    const spot=pickup.length?pickup.map(c=>control('serve',c.id,`${art(c.menu)}<span>#${c.id} 전달</span>`,
      `aria-label="${menuNames[c.menu]} #${c.id} 픽업 및 전달" class="${coach?.id===c.id?'coach-mark':''}"`)).join(''):'<span>픽업</span>';
    return `${state.week.milkOrder?control("milk",state.week.milkOrder,"우유 연결",'class="floor-pin week-milk coach-mark"'):""}<div class="floor-pin week-pickup ${pickup.length?'has-order':''}" aria-label="픽업 선반">${spot}</div>
      ${plan?.window&&state.tick<30?'<div class="floor-pin window-reservation">토모리 · 창가 예약</div>':''}
      ${plan?.board?`<div class="cafe-chalk-line">오늘 추천 · ${menuNames[plan.board]}</div>`:''}
      ${sale?`<div class="guest-handoff" style="--handoff-x:${seat?.x??20}%;--handoff-y:${(seat?.bottom??4)+28}%">${art(sale.menu)}<span>${menuNames[sale.menu]} · 전달 완료 +${yen(sale.revenue)}<small>${esc(sale.reaction||'')}</small></span></div>`:''}
      <div class="week-scene-status">
        ${state.tick>=shift.seconds?'<b>마지막 주문</b>':''}
        ${shift.outside.length?`<span>입구 대기 ${shift.outside.length}</span>`:''}
        ${rules.live(state.day)?`<span>${waveLabel(state)} · 세트 제공 ${state.soldLiveSet}/접수 ${received} · ${!state.enabled.liveSet?'판매 안 함':remaining?'접수 가능 '+remaining:'접수 마감'}${plan?.allocation?.held?' · 재료 확보 '+plan.allocation.held+'인분':''}</span>`:''}
        ${!state.customers.length?`<p class="week-quiet">${esc(rules.quietLine(state))}</p>`:''}
        ${queued?control('cancel-queue','',`#${queued.id} 예약 취소`) :''}

      </div>`;
  }

  function prepHero(state) {
    const plan=rules.schedule(state.day),weather={sun:'햇살 좋은 날',rain:'비 오는 날',live:'라이브가 있는 날',special:'특별 공연일'}[plan.type];
    const options=Object.keys(rules.balance.menu).filter(id=>state.enabled[id]&&(id!=='liveSet'||rules.live(state.day)));
    const firstMissing=state.week.introService&&!rules.enough(state,'cake'),shortage=firstMissing||!options.some(id=>rules.enough(state,id));
    const previous=rules.previousMenu?.(state);
    const proposal=state.week.nextPrep?.day===state.day?control('next-prep','','마감에서 고른 항목'):
      rules.live(state.day)?control('prep','calendar','공연 세트 준비'):
      state.day===2&&rules.morningSeen?.(state,'morning_window')?control('prep','stock','창가에 예약표 두기'):
      state.day===2&&previous?control('menu-record',previous,'전일 메뉴 기록 보기'):
      state.day===4&&rules.morningSeen?.(state,'morning_board')?control('prep','menu','메뉴판 한 줄 채우기'):
      state.day===4?control('prep','equipment','창가등과 머신 비교'):
      state.day===5&&plan.type==='rain'&&Object.values(state.week.guestMemory||{}).some(m=>m.lastServed)?control('prep','menu','비 오는 날 단골 메뉴 보기'):'';
    return '<div class="cafe-day-intro"><p>DAY '+state.day+' · '+weather+'</p><h2>오늘의 RiNG</h2>'+(proposal||'<span>한 잔씩, 우리 페이스대로.</span>')+(shortage?'<p class="prep-alert">! '+(firstMissing?'첫 주문 케이크의 재료가 부족해요.':'지금 낼 수 있는 메뉴의 재료가 부족해요.')+' '+control('prep','stock','재료 확인')+'</p>':'')+'</div><div class="week-prep-tools">'+control('open','','문 열기','class="primary"')+control('prepare','','준비하기')+'</div>';
  }
  function render(state, view) {
    const host = $('#weekScene'), editorHost = $('#weekEditorHost');
    if(lastGame!==state){editor=null;lastGame=state;lastScene=''}
    editorHost.hidden=!state.week||!editor||state.phase==='open';
    document.body.classList.toggle('week-mode', !!state.week);
    host.hidden = !state.week;
    if (!state.week) { editor=null; lastScene=''; document.body.classList.remove('week-editing'); return; }
    if (state.phase==='open') editor=null;
    const editMode=!!editor;
    document.body.classList.toggle('week-editing',editMode);
    host.classList.toggle('week-zoom',!!editor?.zoom);
    const placements={...state.week.placements};
    if (editor?.preview==='base') delete placements[editor.slot];
    else if (editor?.preview) {
      for (const key of Object.keys(placements)) if (placements[key]===editor.preview) delete placements[key];
      placements[editor.slot]=editor.preview;
    }
    $('.scene').classList.toggle('display-upgraded',placements.display==='display');
    const signature=JSON.stringify([state.day,state.phase,placements,state.week.memories,state.week.alias,editor,
      editor?state.money:null,editor?state.week.undo:null,editor?state.week.owned:null,state.week.nextJob,
      state.week.shift?.coach,state.week.milkOrder,state.week.shift?.outside.length,state.week.shift?.sets,
      state.week.shift?state.tick>=state.week.shift.seconds:false,state.week.shift?waveLabel(state):'', state.stock.cake>0,
      state.customers.map(c=>[c.id,c.menu,c.status]),state.workers.taki?.id,state.menuHistory.today,state.week.shift?.ledger.length,
      rules.dayPlan?.(state),state.week.morning?.status,state.week.nextPrep,state.tick<30,
      state.week.shift?.ledger.findLast(row=>row.reason==='sold'&&row.at!==undefined&&state.tick-row.at<4)?.id]);
    if(signature===lastScene)return;
    lastScene=signature;
    const inEditor=editorHost.contains(document.activeElement);
    const focused=host.contains(document.activeElement)||inEditor?document.activeElement:null;
    const focusAction=focused?.dataset.week, focusId=focused?.dataset.id;
    host.innerHTML=`<div data-live-phase="${state.phase!=='prep'?rules.livePhase(state):rules.live(state.day)?'before':'off'}" class="week-decor-layer ${rules.schedule(state.day).type==='rain'?'week-rain':''} ${state.phase==='open'&&waveLabel(state)==='공연 중'?'week-stage-playing':''}">${scenery(placements,state.week.memories)}</div>
      <div class="week-sign"><strong>RiNG</strong>${state.week.alias?`<small>${esc(state.week.alias)}</small>`:''}</div>
      ${editMode?`<div class="week-slot-pins" aria-label="매장 배치 위치">${Object.entries(rules.slots).map(([key,label])=>control('slot',key,key===editor.slot?label:'·',`class="floor-pin ${slotClass(key)}" aria-label="${label} 배치 위치" aria-pressed="${key===editor.slot}"`)).join('')}</div>`:state.phase==='open'?openMarkup(state,view.selectedOrderId):
        state.phase==='prep'?prepHero(state):`<div class="week-prep-tools">${control('receipt','','영수증','class="primary"')+control('edit','','꾸미기')}</div>`}`;
    editorHost.innerHTML=editMode?editorMarkup(state):'';
    if(focusAction)[...(inEditor?editorHost:host).querySelectorAll('[data-week]')].find(b=>b.dataset.week===focusAction&&b.dataset.id===focusId)?.focus({preventScroll:true});
  }

  function ticket(c, state) {
    const queued=state.week.nextJob?.id===c.id;
    const available=rules.enough(state,c.menu);
    const alternative=rules.alternate(state,c);
    const reserving=!!state.workers.taki || c.status==='waiting'&&state.customers.filter(order=>order.status==='ready').length>=(rules.has(state,'pickupShelf')?2:1);
    const status=queued?(state.week.nextJob.kind==='make'?'제조 예약':'전달 예약'):{waiting:'주문 대기',making:'타키가 제조 중',ready:'픽업 · 전달 필요',serving:'타키가 전달 중'}[c.status];
    const plan=rules.dayPlan?.(state);
    const label=[plan?.regular===c.id?'오늘의 단골':'',plan?.lamp===c.id?'창가 · 대기 +3초':'',plan?.machine===c.id&&c.status==='making'?'추출 1초 단축':''].filter(Boolean).join(' · ');
    const quick=plan?.regular===c.id&&['make','serve','pickup'].includes(state.priority)&&!queued&&
      (c.status==='ready'||available&&c.status==='waiting'&&state.priority!=='pickup')
      ?`<button data-first-work="${c.id}" aria-pressed="${plan.priority===c.id}">${plan.priority===c.id?'먼저 처리 예약됨':'먼저 처리'}</button>`:'';
    const base=`<div class="week-ticket-title">${art(c.menu)}<strong>#${c.id} ${menuNames[c.menu]}</strong><small>${yen(c.price)}</small></div>
      <div class="week-ticket-meta"><span>${c.regularName?esc(c.regularName)+' · ':''}${c.takeout?'포장':rules.profiles[c.profile]||'일반'} · ${status}</span><span data-patience="${c.id}">${c.patience}초</span></div>
      <div class="bar"><i data-patience-bar="${c.id}" style="width:${Math.max(0,c.patience/c.maxPatience)*100}%"></i></div>
      ${label?`<p class="service-tag">${label}</p>`:''}${quick}`;
    const button=(kind,label)=>`<button data-${kind}="${c.id}" aria-label="${menuNames[c.menu]} 주문 ${c.id} ${label}" ${queued?'disabled':''}>${label}</button>`;
    if (c.status==='ready') return base+button('serve',reserving?'전달 예약':'직접 서빙');
    if (c.status!=='waiting') return base;
    if(state.week.milkOrder===c.id)return base+`<button data-link-milk="${c.id}">우유 연결</button>`;
    const greeting='<p class="guest-line">'+esc(rules.guestGreeting(state,c))+'</p>';
    if (available) return base+greeting+button('make',reserving?'제조 예약':'직접 제조');
    return base+greeting+`<span class="week-shortage">${Object.entries(rules.balance.menu[c.menu].recipe).filter(([key,n])=>(rules.usable?.(state,key,c.menu)??state.stock[key])<n).map(([key])=>({beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'})[key]).join('·')} 부족</span>
      ${alternative?`<button data-alternate="${alternative}">${menuNames[alternative]} ${yen(state.prices[alternative])}</button>`:''}
      <button data-cancel="${c.id}">취소</button>`;
  }

  function planControls(state,kind) {
    if (state.phase!=='prep') return '';
    const plan=rules.dayPlan?.(state);
    const button=(id,value,label,current)=>`<button type="button" data-plan-kind="${id}" data-plan-value="${value}" aria-pressed="${current===value}">${label}</button>`;
    if (kind==='window'&&state.day===2&&rules.morningSeen?.(state,'morning_window')) {
      return `<section class="service-plan"><h3>토모리의 창가</h3><p>예약표는 첫 30초 동안 창가에 놓여요.</p>${button('window','yes','창가에 예약표 두기',plan?.window?'yes':'no')}${button('window','no','평소처럼 열기',plan?.window?'yes':'no')}</section>`;
    }
    if (kind==='board'&&state.day===4&&rules.morningSeen?.(state,'morning_board')) {
      const menus=Object.keys(menuNames).filter(id=>id!=='liveSet'&&rules.available(state,id)&&rules.enough(state,id));
      return `<section class="service-plan"><h3>아논의 추천 칠판</h3><p>영업 전반에 일반 손님 최대 두 명이 추천 메뉴를 먼저 살펴봐요.</p>
        ${menus.map(id=>button('board',id,menuNames[id],plan?.board)).join('')}${button('board','none','비워 두기',plan?.board||'none')}</section>`;
    }
    if (kind!=='live'||!rules.live(state.day)) return '';
    const preview=rules.reservePreview(state);
    const current=state.enabled.liveSet?(plan?.live==='reserve'?'reserve':'shared'):'off';
    const recipe=rules.balance.menu.liveSet.recipe;
    const stock=Object.keys(recipe).map(id=>{
      const reserved=preview.units*recipe[id];
      return (id==='beans'?'원두':'케이크')+' 일반 '+(state.stock[id]-reserved)+' · 공연 '+reserved;
    }).join(' / ');
    return `<section class="service-plan"><h3>공연 세트 재료 배분</h3><p>공연이 시작되면 새 세트 접수를 닫아요. 이미 들어온 주문은 계속 준비합니다.</p>
      ${button('live','off','기본 메뉴만 판매',current)}${button('live','shared','세트 같이 팔기',current)}
      ${button('live','reserve','공연용 2인분 확보',current)}<p>${stock}</p>
      ${preview.target?`<p>현재 ${preview.units}인분 확보 가능${preview.missing.length?' · '+preview.missing.join(' · '):''}</p>`:''}</section>`;
  }

  function stock(state, ingredients) {
    const plan=rules.recommendation(state), locked=state.phase!=='prep';
    if (!cart || cart.day!==state.day || cart.state!==state) cart={day:state.day,state,counts:{beans:0,milk:0,cake:0,matcha:0}};
    return `<section class="week-stock">${planControls(state,'window')}<h2>재료 발주</h2>
      <p class="muted">판매 메뉴, 날씨·공연 일정, 전일 주문 기록을 반영한 추정량이에요. 실제 주문은 달라질 수 있어요.</p>
      ${locked?'<p>발주는 영업 준비 중에 할 수 있어요.</p>':''}
      <form id="weekBasket"><fieldset ${locked?'disabled':''}><legend class="sr-only">재료별 발주 수량</legend>${Object.entries(ingredients).map(([id,item])=>`<label><strong>${item.name}</strong>
      <span>보유 ${state.stock[id]} · 예상 ${plan.low[id]}~${plan.high[id]}개
      ${plan.reserve&&rules.balance.menu.liveSet.recipe[id]?`<br>일반 목표 ${plan.general[id]} · 공연 확보 목표 ${plan.reserve*rules.balance.menu.liveSet.recipe[id]}`:''}
      <br>개당 ${yen(item.cost)} · <b data-basket-row="${id}">${yen(item.cost*cart.counts[id])}</b></span>
      <input aria-label="${item.name} 주문 수량" type="number" name="${id}" min="0" max="99" required value="${cart.counts[id]}"></label>`).join('')}
      <p id="weekBasketPreview">발주 후 보유금 ${yen(state.money-rules.basketCost(cart.counts))}</p>
      <div class="week-basket-actions"><button type="button" id="weekBasketSuggest">추천 수량</button>${state.money<Math.max(600,plan.cost)?'<button type="button" id="weekBasketBasic">기본 묶음</button>':""}${state.money<500?'<button type="button" id="weekBasketSupport">운영 지원금</button>':""}</div></fieldset></form>
      <p class="muted">재료는 제조를 시작할 때 쓰이며, 남은 우유는 마감 때 20%를 버려요(소수점 버림).</p>
      <div class="stock-checkout"><p id="weekBasketFeedback" role="status"></p>
      <div class="stock-actions"><button type="submit" form="weekBasket" class="primary" id="weekBasketPay" ${locked?'disabled':''}>발주 · ${yen(rules.basketCost(cart.counts))}</button>
      ${locked?'':'<button type="button" id="weekOpenFromPrep" class="primary">준비 완료 · 문 열기</button>'}</div>
      <div id="stockOpenChoices" class="stock-actions" hidden><button type="button" id="stockPayOpen">발주하고 열기</button><button type="button" id="stockSkipOpen">발주 없이 열기</button></div></div></section>`;
  }

  function bindStock(panel, adapter) {
    const form=panel.querySelector('#weekBasket');if(!form)return;
    const read=()=>{for(const id of Object.keys(cart.counts)){const n=form.elements[id].valueAsNumber;cart.counts[id]=Number.isInteger(n)&&n>=0&&n<=99?n:0}};
    const feedback=()=>panel.querySelector('#weekBasketFeedback');
    const choices=panel.querySelector('#stockOpenChoices'), open=panel.querySelector('#weekOpenFromPrep');
    if(open)open.onclick=()=>{
      if(!form.reportValidity())return;
      read();
      if(rules.basketCost(cart.counts)>0){
        feedback().textContent='미결제 발주가 있어요. 수량을 구매할지 선택해 주세요.';
        choices.hidden=false;
        panel.querySelector('#stockPayOpen').focus();
      }else adapter.open();
    };
    if(open){
      panel.querySelector('#stockPayOpen').onclick=()=>{
        if(!form.reportValidity())return;
        read();
        if(!adapter.buy({...cart.counts})){feedback().textContent='결제하지 못했어요. 수량과 보유금을 확인해 주세요.';return;}
        cart=null;
        adapter.render();
        adapter.open();
      };
      panel.querySelector('#stockSkipOpen').onclick=()=>{cart=null;adapter.render();adapter.open();};
    }
    const paint=()=>{const state=adapter.state(),total=rules.basketCost(cart.counts);panel.querySelector('#weekBasketPay').textContent='발주 · '+yen(total);
      form.querySelector('#weekBasketPreview').textContent=total>state.money?'보유금 '+yen(total-state.money)+' 부족 · 수량을 줄여 주세요.':'발주 후 보유금 '+yen(state.money-total);
      for(const [id,n] of Object.entries(cart.counts))form.querySelector('[data-basket-row="'+id+'"]').textContent=yen(rules.balance.ingredients[id]*n);
    };
    const suggest=counts=>{for(const id of Object.keys(cart.counts))form.elements[id].value=counts[id]||0;read();paint();feedback().textContent='수량을 채웠어요. 발주를 누르면 결제됩니다.'};
    form.oninput=()=>{read();paint();feedback().textContent='';if(choices)choices.hidden=true;};
    form.onsubmit=event=>{event.preventDefault();if(!form.reportValidity())return;read();const total=rules.basketCost(cart.counts);
      if(adapter.buy({...cart.counts})){cart=null;adapter.render();panel.querySelector('#weekBasketFeedback').textContent=yen(total)+' 결제했어요. 재고에 반영됐습니다.';panel.querySelector('#weekBasketPay')?.focus({preventScroll:true});}
      else feedback().textContent=total>adapter.state().money?yen(total-adapter.state().money)+' 부족합니다. 수량을 줄이거나 기본 묶음을 확인하세요.':'발주할 수량을 확인해 주세요.';
    };
    form.querySelector('#weekBasketSuggest').onclick=()=>suggest(rules.recommendation(adapter.state()).missing);
    const basic=form.querySelector('#weekBasketBasic');if(basic)basic.onclick=()=>{const state=adapter.state();const menu=Object.keys(menuNames).filter(id=>rules.available(state,id)).map(id=>rules.balance.menu[id]).sort((a,b)=>rules.basketCost(a.recipe)-rules.basketCost(b.recipe))[0];suggest(menu?.recipe||{})};
    const support=form.querySelector('#weekBasketSupport');if(support)support.onclick=adapter.support;
  }

  function receipt(state, stories) {
    const ledger=state.week.shift?.ledger||[];
    const failures=Object.entries(rules.reasons).filter(([key])=>key!=='sold').map(([reason,label])=>({reason,label,n:ledger.filter(x=>x.reason===reason).length})).sort((a,b)=>b.n-a.n);
    const profit=state.revenue-state.accounting.soldCost-state.accounting.lostCost-state.overhead;
    const story=state.week.queue.find(id=>stories[id]&&!state.stories.includes(id));
    const photo=state.week.photos.find(p=>p.day===state.day&&p.day===7);
    const next=rules.schedule(state.day+1), tomorrow={sun:'일반 영업 · 맑음',rain:'일반 영업 · 비',live:'라이브 공연',special:'특별 공연'}[next.type];
    const a=state.accounting, rejected=Object.entries(state.menuHistory.today).filter(([,x])=>x.priceRejected);
    const action=rules.nextAction?.(state), result=rules.dailyLine?.(state), plan=rules.dayPlan?.(state);
    const liveFailed=ledger.filter(row=>row.setReplaced||row.menu==='liveSet'&&row.accepted&&row.reason!=='sold');
    const returned=plan?.allocation?.released||0;
    const released=Object.entries(rules.balance.menu.liveSet.recipe).map(([id,n])=>(id==='beans'?'원두':'케이크')+' '+n*returned).join(' · ');
    const tips={stock:'부족했던 재료를 발주에서 확인해 보세요.',wait:'픽업 선반의 주문부터 전달해 보세요.',price:'메뉴판에서 가격 이탈이 있었던 메뉴를 확인해 보세요.',full:'다음 공연 전에는 좌석을 늘리는 방법도 있어요.',closing:'마감 전에 픽업 선반을 비워 두면 좋아요.',menu:'판매 중인 메뉴를 확인해 보세요.'};
    return `<section class="week-receipt">
      <div class="eyebrow">RiNG · DAY ${state.day}</div><h2>오늘의 영수증</h2>
      ${state.week.alias?`<p>${esc(state.week.alias)}</p>`:''}
      <dl><div><dt>매출</dt><dd>${yen(state.revenue)}</dd></div><div><dt>영업 손익</dt><dd>${a.accurate?yen(profit):'기록 없음'}</dd></div><div><dt>서빙</dt><dd>${state.served}건</dd></div><div><dt>놓친 손님</dt><dd>${state.left}명</dd></div></dl>
      <p>${action?esc(action.label):failures[0]?.n?failures[0].label+' '+failures[0].n+'건 · '+tips[failures[0].reason]:state.served?'모든 주문을 전달했어요.':'오늘 접수된 주문이 없었어요.'}</p>
      ${action?`<button id="weekPlanTomorrow" aria-pressed="${state.week.nextPrep?.day===state.day+1}">${state.week.nextPrep?.day===state.day+1?'내일 먼저 보기 예약됨':'내일 해당 항목 먼저 보기'}</button>`:''}
      ${result?`<p class="receipt-taki">${esc(result)}</p>`:''}
      <details><summary>손익·현금·주문 상세</summary><div class="receipt-accounts"><section><h3>영업 손익</h3><p>매출 ${yen(state.revenue)} − 판매 원가 ${yen(a.soldCost)} − 폐기 원가 ${yen(a.lostCost)} − 영업비 ${yen(state.overhead)}. 남은 우유 중 ${state.waste}개를 폐기했어요.</p></section>
      <section><h3>현금 흐름</h3><p>시작 ${yen(a.startCash)} · 매출 +${yen(state.revenue)} · 발주 −${yen(a.purchases)} · 시설 −${yen(a.equipment)} · 영업비 −${yen(state.overhead)} · 지원금 +${yen(a.support)} · 상환 −${yen(state.loanPaid)}</p><p>변화 ${yen(state.money-a.startCash)} · 잔액 <b>${yen(state.money)}</b></p></section></div>
      <p>재료값은 발주할 때 지불합니다. 판매와 폐기 원가는 손익에만 반영돼요.</p>
      <p>${failures.map(x=>x.label+' '+x.n+'건').join(' · ')}</p>
      ${rejected.length?`<p>가격 이탈: ${rejected.map(([id,x])=>menuNames[id]+' '+x.priceRejected+'건').join(' · ')}</p>`:''}
      ${rules.dayNotes(state).filter(line=>line!==result).map(line=>`<p>${esc(line)}</p>`).join('')}
      ${rules.live(state.day)?`<section><h3>공연 세트</h3><p>${!state.enabled.liveSet?'기본 메뉴만 판매':plan?.allocation?.initial?'재료 '+plan.allocation.initial+'인분 확보':'일반 주문과 재료 공유'} · 접수 ${state.soldLiveSet+liveFailed.length}건 · 전달 ${state.soldLiveSet}건</p>
      <p>접수 후 실패 ${liveFailed.length}건${liveFailed.length?' · '+liveFailed.map(row=>row.setReplaced?'다른 메뉴로 변경':rules.reasons[row.reason]).join(' · '):''}${returned?' · 미사용 '+returned+'인분 반환 ('+released+')':''}</p></section>`:''}
      ${plan?.board?`<p>추천 칠판 · ${menuNames[plan.board]} · 판매 ${state.menuHistory.today[plan.board]?.sold||0}건 · 가격 이탈 ${state.menuHistory.today[plan.board]?.priceRejected||0}건</p>`:''}
      ${ledger.length?`<details><summary>주문 기록 ${ledger.length}건</summary><ol class="receipt-orders">${ledger.map(row=>`<li>#${row.id} ${rules.regularNames[row.regularId]||''} ${menuNames[row.menu]||'손님'} · ${rules.reasons[row.reason]}${row.reason==='sold'?' '+yen(Number.isFinite(row.revenue)?row.revenue:0):''}${row.reaction?' · '+esc(row.reaction):''}</li>`).join('')}</ol></details>`:''}</details>
      ${story?`<button data-week-story="${story}">${esc(stories[story].title)} 감상</button>`:''}
      ${photo?`<p>첫 공연 사진을 기록에 남겼어요.</p>`:''}
      <p class="receipt-forecast"><b>내일 · DAY ${state.day+1}</b> ${tomorrow}</p>
      <div class="actions"><button id="tomorrow" class="primary">다음 영업일 →</button><button id="weekLook">둘러보기</button><button id="weekReorder">내일 발주 미리 보기</button></div></section>`;
  }

  function archive(state, stories) {
    const queue=state.week.queue.filter(id=>stories[id]&&!state.stories.includes(id));
    const regulars=Object.entries(state.week.guestMemory||{}).map(([id,m])=>`<li><b>${rules.regularNames[id]}</b> · 방문 ${m.visits}회 · 최근 ${menuNames[m.lastMenu]||'주문 없음'} / ${rules.reasons[m.lastResult]}</li>`).join('');
    return `${regulars?`<details class="week-regulars"><summary>단골 노트</summary><ul>${regulars}</ul></details>`:''}${queue.length?`<div class="week-story-list"><h2>아직 듣지 못한 이야기</h2>${queue.map(id=>`<button data-week-story="${id}"><small>대기 중 · ${esc([...new Set(stories[id].lines.map(line=>line[0]).filter(Boolean))].join(' · '))}</small><strong>${esc(stories[id].title)}</strong><span>이야기 읽기 →</span></button>`).join('')}</div>`:''}
      ${state.week.photos.map(photo=>`<figure class="week-photo"><div class="${photo.placements.display==='display'?'display-upgraded':''}">${scenery(photo.placements)}</div><figcaption>DAY ${photo.day} · ${esc(photo.alias||'RiNG')} ${photo.day===7?'첫 공연':'처음 문을 연 날'}</figcaption></figure>`).join('')}`;
  }

  function bindArchive(panel, adapter) {
    panel.querySelectorAll('[data-week-story]').forEach(b=>b.onclick=()=>adapter.story(b.dataset.weekStory));
  }

  function menuStats(state,menu){
    const last=state.menuHistory.yesterday?.[menu.id], labels={beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'};
    const status=menu.limited&&!rules.live(state.day)?'공연일 한정':!state.enabled[menu.id]?'미판매 설정':!rules.enough(state,menu.id)?'재료 부족':'판매 가능';
    const recipe=Object.entries(menu.needs).map(([key,n])=>labels[key]+' '+n).join(' · ');
    const competing=rules.dayPlan?.(state)?.live==='reserve'&&menu.id!=='liveSet'&&state.enabled.liveSet
      ?Object.keys(menu.needs).filter(id=>rules.balance.menu.liveSet.recipe[id]).map(id=>labels[id]).join('·'):'';
    const memories=state.day===5?Object.entries(state.week.guestMemory||{}).filter(([,m])=>m.lastServed===menu.id).map(([id])=>rules.regularNames[id]):[];
    return `<p class="week-menu-stats"><b>${status}</b> · ${recipe}<br>제조 ${rules.makeSeconds(state,menu.id)}초 (현재 피로·설비 기준)<br>메뉴당 차액 ${yen(state.prices[menu.id]-menu.cost)} · ${state.menuHistory.yesterday?`전일 판매 ${last?.sold??0} · 가격 이탈 ${last?.priceRejected??0}${last?.accepted!==undefined?' · 접수 '+last.accepted:''}`:'아직 판매 기록이 없어요.'}
      ${competing?'<br>공연 세트와 함께 쓰는 재료 · '+competing:''}${memories.length?'<br>지난번에 받은 손님 · '+memories.join('·'):''}</p>`;
  }
  function priceHelp(){return '<details class="menu-help"><summary>가격과 손님 선호</summary><p>영업 준비 중에 ¥50씩 조정하면 오늘 접수할 주문부터 적용돼요. 손님은 선호 메뉴 두 개 중 예산과 재고에 맞는 것을 고릅니다. 메뉴당 차액은 가격에서 재료 원가를 뺀 금액이며 영업비는 포함하지 않아요.</p></details>'}
  return { menuStats,priceHelp,mount, render, edit, ticket, stock, bindStock, receipt, archive, bindArchive, scenery,planControls,
    decorLink:()=>'<button id="weekEdit" class="primary">매장 꾸미기</button>' };
})();

