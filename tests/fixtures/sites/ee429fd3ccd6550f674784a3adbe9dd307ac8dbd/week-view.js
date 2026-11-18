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
      if (action === 'open') api.open();
      if (action === 'prep') api.prep(id);
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
      if (action === 'station') station(id);
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

  function station(id) {
    const state = api.state();
    const waiting = state.customers.filter(c => c.status === 'waiting' && rules.balance.menu[c.menu].station === id);
    const chosen = waiting.find(c => c.id === api.selected()) || (waiting.length === 1 ? waiting[0] : null);
    if (!chosen) { api.notice(waiting.length ? '주문을 먼저 골라요' : '대기 주문 없음'); return; }
    api.select(chosen.id);
    if (!api.assign(chosen.id,'make')&&!rules.enough(state,chosen.menu)) api.notice('재료가 부족해요. 주문표에서 대체 메뉴나 취소를 확인하세요.');
  }

  function prop(id) {
    return `<i class="cafe-prop prop-${id}" aria-hidden="true"><i></i><i></i><i></i></i>`;
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
        <footer>${candidate?'<small class="growth-preview">'+(owned?'이미 보유한 품목 · 무료로 배치':candidate.cost<=state.money?'구매 후 '+yen(state.money-candidate.cost)+' · 하루 유지비 '+yen(candidate.upkeep):yen(candidate.cost-state.money)+' 부족')+'</small>':''}${control('place','',preview==='base'?'기본으로 돌리기':owned?'배치':'구매·배치',canPlace?'class="primary"':'disabled')}
          ${control('undo','','되돌리기',state.week.undo?'':'disabled')}
          <form id="weekAlias"><input name="alias" maxlength="28" aria-label="가게 별칭 14자" value="${esc(state.week.alias)}" placeholder="가게 별칭"><button>저장</button></form>
        </footer>
      </section>`;
  }

  function waveLabel(state) {
    if (!rules.live(state.day)) return '';
    const lastBefore = Math.floor((5 + state.week.shift.seconds - 3 - 10) / 2);
    if (state.tick <= lastBefore) return '공연 전';
    return state.tick < lastBefore + 10 ? '공연 중' : '공연 후';
  }

  function openMarkup(state, selected) {
    const shift=state.week.shift;
    const pickup=state.customers.filter(c=>c.status==='ready');
    const queued=state.week.nextJob;
    const reserved=state.customers.filter(c=>c.menu==='liveSet').length;
    const coach=state.customers.find(c=>c.id===shift.coach);
    const work=state.customers.find(c=>c.id===state.workers.taki?.id);
    const onStation=work?.status==='making'?rules.balance.menu[work.menu].station:null;
    const stations=['display','espresso','mix'].map(id=>{
      const waiting=state.customers.some(c=>c.status==='waiting'&&rules.balance.menu[c.menu].station===id);
      const label=id==='display'?(state.stock.cake?'진열대':'케이크 품절'):id==='espresso'?'추출기':'말차';
      const point=window.RingFloor.workPoints[id];
      return control('station',id,`${art(id==='display'?'cake':id==='espresso'?'coffee':'matcha')}<span>${label}</span>`,
        `style="--pin-x:${point.x}%" class="floor-pin station-${id} ${waiting?'has-order':''} ${coach?.status==='waiting'&&id==='display'?'coach-mark':''} ${onStation===id?'working':''}" aria-label="${rules.stations[id]}"`);
    }).join('');
    const spot=pickup.length?pickup.map(c=>control('serve',c.id,`${art(c.menu)}<span>#${c.id} 전달</span>`,
      `aria-label="${menuNames[c.menu]} #${c.id} 픽업 및 전달" class="${coach?.id===c.id?'coach-mark':''}"`)).join(''):'<span>픽업</span>';
    return `${stations}${state.week.milkOrder?control("milk",state.week.milkOrder,"우유 연결",'class="floor-pin week-milk coach-mark"'):""}<div class="floor-pin week-pickup ${pickup.length?'has-order':''}" aria-label="픽업 선반">${spot}</div>
      <div class="week-scene-status">
        ${state.tick>=shift.seconds?'<b>마지막 주문</b>':''}
        ${shift.outside.length?`<span>입구 대기 ${shift.outside.length}</span>`:''}
        ${rules.live(state.day)?`<span>${waveLabel(state)} · 세트 접수 가능 ${state.enabled.liveSet?Math.max(0,rules.setLimit(state.day)-shift.sets):0} · 접수된 주문 ${reserved}${state.enabled.liveSet?'':' · 판매 안 함'}</span>`:''}
        ${queued?control('cancel-queue','',`#${queued.id} 예약 취소`) :''}

      </div>`;
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
      state.customers.map(c=>[c.id,c.menu,c.status]),state.workers.taki?.id]);
    if(signature===lastScene)return;
    lastScene=signature;
    const inEditor=editorHost.contains(document.activeElement);
    const focused=host.contains(document.activeElement)||inEditor?document.activeElement:null;
    const focusAction=focused?.dataset.week, focusId=focused?.dataset.id;
    host.innerHTML=`<div class="week-decor-layer ${rules.schedule(state.day).type==='rain'?'week-rain':''} ${state.phase==='open'&&waveLabel(state)==='공연 중'?'week-stage-playing':''}">${scenery(placements,state.week.memories)}</div>
      <div class="week-sign"><strong>RiNG</strong>${state.week.alias?`<small>${esc(state.week.alias)}</small>`:''}</div>
      ${editMode?`<div class="week-slot-pins" aria-label="매장 배치 위치">${Object.entries(rules.slots).map(([key,label])=>control('slot',key,label,`class="floor-pin ${slotClass(key)}" aria-pressed="${key===editor.slot}"`)).join('')}</div>`:state.phase==='open'?openMarkup(state,view.selectedOrderId):
        `<div class="week-prep-tools">${control(state.phase==='prep'?'open':'receipt','',state.phase==='prep'?'문 열기':'영수증','class="primary"')}
        ${state.phase==='prep'?control('prep','menu','메뉴판')+control('prep','stock','발주')+control('prep','calendar','일정'):''}
        ${control('edit','','꾸미기')}</div>`}`;
    editorHost.innerHTML=editMode?editorMarkup(state):'';
    if(focusAction)[...(inEditor?editorHost:host).querySelectorAll('[data-week]')].find(b=>b.dataset.week===focusAction&&b.dataset.id===focusId)?.focus({preventScroll:true});
  }

  function ticket(c, state) {
    const queued=state.week.nextJob?.id===c.id;
    const available=rules.enough(state,c.menu);
    const alternative=rules.alternate(state,c);
    const reserving=!!state.workers.taki || c.status==='waiting'&&state.customers.filter(order=>order.status==='ready').length>=(rules.has(state,'pickupShelf')?2:1);
    const status=queued?(state.week.nextJob.kind==='make'?'제조 예약':'전달 예약'):{waiting:'주문 대기',making:'타키가 제조 중',ready:'픽업 · 전달 필요',serving:'타키가 전달 중'}[c.status];
    const base=`<div class="week-ticket-title">${art(c.menu)}<strong>#${c.id} ${menuNames[c.menu]}</strong><small>${yen(c.price)}</small></div>
      <div class="week-ticket-meta"><span>${c.regularName?esc(c.regularName)+' · ':''}${c.takeout?'포장':rules.profiles[c.profile]||'일반'} · ${status}</span><span data-patience="${c.id}">${c.patience}초</span></div>
      <div class="bar"><i data-patience-bar="${c.id}" style="width:${Math.max(0,c.patience/c.maxPatience)*100}%"></i></div>`;
    const button=(kind,label)=>`<button data-${kind}="${c.id}" aria-label="${menuNames[c.menu]} 주문 ${c.id} ${label}" ${queued?'disabled':''}>${label}</button>`;
    if (c.status==='ready') return base+button('serve',reserving?'전달 예약':'직접 서빙');
    if (c.status!=='waiting') return base;
    if(state.week.milkOrder===c.id)return base+`<button data-link-milk="${c.id}">우유 연결</button>`;
    const greeting='<p class="guest-line">'+esc(rules.guestGreeting(state,c))+'</p>';
    if (available) return base+greeting+button('make',reserving?'제조 예약':'직접 제조');
    return base+greeting+`<span class="week-shortage">${Object.entries(rules.balance.menu[c.menu].recipe).filter(([key,n])=>state.stock[key]<n).map(([key])=>({beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'})[key]).join('·')} 부족</span>
      ${alternative?`<button data-alternate="${alternative}">${menuNames[alternative]} ${yen(state.prices[alternative])}</button>`:''}
      <button data-cancel="${c.id}">취소</button>`;
  }

  function stock(state, ingredients) {
    const plan=rules.recommendation(state), locked=state.phase!=='prep';
    if (!cart || cart.day!==state.day || cart.state!==state) cart={day:state.day,state,counts:{beans:0,milk:0,cake:0,matcha:0}};
    return `<section class="week-stock"><h2>재료 발주</h2>
      <p class="muted">판매 메뉴, 날씨·공연 일정, 전일 주문 기록을 반영한 추정량이에요. 실제 주문은 달라질 수 있어요.</p>
      ${locked?'<p>발주는 영업 준비 중에 할 수 있어요.</p>':''}
      <form id="weekBasket"><fieldset ${locked?'disabled':''}><legend class="sr-only">재료별 발주 수량</legend>${Object.entries(ingredients).map(([id,item])=>`<label><strong>${item.name}</strong>
      <span>보유 ${state.stock[id]} · 예상 ${plan.low[id]}~${plan.high[id]}개<br>개당 ${yen(item.cost)} · <b data-basket-row="${id}">${yen(item.cost*cart.counts[id])}</b></span>
      <input aria-label="${item.name} 주문 수량" type="number" name="${id}" min="0" max="99" required value="${cart.counts[id]}"></label>`).join('')}
      <p id="weekBasketPreview">발주 후 보유금 ${yen(state.money-rules.basketCost(cart.counts))}</p>
      <div class="week-basket-actions"><button type="submit" class="primary" id="weekBasketPay">발주 · ${yen(rules.basketCost(cart.counts))}</button>
      <button type="button" id="weekBasketSuggest">추천 수량</button>${state.money<Math.max(600,plan.cost)?'<button type="button" id="weekBasketBasic">기본 묶음</button>':""}${state.money<500?'<button type="button" id="weekBasketSupport">운영 지원금</button>':""}</div></fieldset></form>
      <p id="weekBasketFeedback" role="status"></p><p class="muted">재료는 제조를 시작할 때 쓰이며, 남은 우유는 마감 때 20%를 버려요(소수점 버림).</p></section>`;
  }

  function bindStock(panel, adapter) {
    const form=panel.querySelector('#weekBasket');if(!form)return;
    const read=()=>{for(const id of Object.keys(cart.counts)){const n=form.elements[id].valueAsNumber;cart.counts[id]=Number.isInteger(n)&&n>=0&&n<=99?n:0}};
    const feedback=()=>panel.querySelector('#weekBasketFeedback');
    const paint=()=>{const state=adapter.state(),total=rules.basketCost(cart.counts);form.querySelector('#weekBasketPay').textContent='발주 · '+yen(total);
      form.querySelector('#weekBasketPreview').textContent=total>state.money?'보유금 '+yen(total-state.money)+' 부족 · 수량을 줄여 주세요.':'발주 후 보유금 '+yen(state.money-total);
      for(const [id,n] of Object.entries(cart.counts))form.querySelector('[data-basket-row="'+id+'"]').textContent=yen(rules.balance.ingredients[id]*n);
    };
    const suggest=counts=>{for(const id of Object.keys(cart.counts))form.elements[id].value=counts[id]||0;read();paint();feedback().textContent='수량을 채웠어요. 발주를 누르면 결제됩니다.'};
    form.oninput=()=>{read();paint();feedback().textContent=''};
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
    const tips={stock:'부족했던 재료를 발주에서 확인해 보세요.',wait:'픽업 선반의 주문부터 전달해 보세요.',price:'메뉴판에서 가격 이탈이 있었던 메뉴를 확인해 보세요.',full:'다음 공연 전에는 좌석을 늘리는 방법도 있어요.',closing:'마감 전에 픽업 선반을 비워 두면 좋아요.',menu:'판매 중인 메뉴를 확인해 보세요.'};
    return `<section class="week-receipt">
      <div class="eyebrow">RiNG · DAY ${state.day}</div><h2>오늘의 영수증</h2>
      ${state.week.alias?`<p>${esc(state.week.alias)}</p>`:''}
      <dl><div><dt>매출</dt><dd>${yen(state.revenue)}</dd></div><div><dt>영업 손익</dt><dd>${a.accurate?yen(profit):'기록 없음'}</dd></div><div><dt>서빙</dt><dd>${state.served}건</dd></div><div><dt>놓친 손님</dt><dd>${state.left}명</dd></div></dl>
      <p>${failures[0]?.n?failures[0].label+' '+failures[0].n+'건 · '+tips[failures[0].reason]:state.served?'모든 주문을 전달했어요.':'오늘 접수된 주문이 없었어요.'}</p>
      ${state.day===1?'<p class="receipt-taki">타키: 정산은 같이 보자. 오늘 부족했던 건 내일 채우면 돼.</p>':''}
      <details><summary>손익·현금·주문 상세</summary><div class="receipt-accounts"><section><h3>영업 손익</h3><p>매출 ${yen(state.revenue)} − 판매 원가 ${yen(a.soldCost)} − 폐기 원가 ${yen(a.lostCost)} − 영업비 ${yen(state.overhead)}. 남은 우유 중 ${state.waste}개를 폐기했어요.</p></section>
      <section><h3>현금 흐름</h3><p>시작 ${yen(a.startCash)} · 매출 +${yen(state.revenue)} · 발주 −${yen(a.purchases)} · 시설 −${yen(a.equipment)} · 영업비 −${yen(state.overhead)} · 지원금 +${yen(a.support)} · 상환 −${yen(state.loanPaid)}</p><p>변화 ${yen(state.money-a.startCash)} · 잔액 <b>${yen(state.money)}</b></p></section></div>
      <p>재료값은 발주할 때 지불합니다. 판매와 폐기 원가는 손익에만 반영돼요.</p>
      <p>${failures.map(x=>x.label+' '+x.n+'건').join(' · ')}</p>
      ${rejected.length?`<p>가격 이탈: ${rejected.map(([id,x])=>menuNames[id]+' '+x.priceRejected+'건').join(' · ')}</p>`:''}
      ${ledger.length?`<details><summary>주문 기록 ${ledger.length}건</summary><ol class="receipt-orders">${ledger.map(row=>`<li>#${row.id} ${rules.regularNames[row.regularId]||''} ${menuNames[row.menu]||'손님'} · ${rules.reasons[row.reason]}${row.reason==='sold'?' '+yen(Number.isFinite(row.revenue)?row.revenue:0):''}${row.reaction?' · '+esc(row.reaction):''}</li>`).join('')}</ol></details>`:''}</details>
      ${story?`<button data-week-story="${story}">${esc(stories[story].title)} 감상</button>`:''}
      ${photo?`<p>첫 공연 사진을 기록에 남겼어요.</p>`:''}
      <p class="receipt-forecast"><b>내일 · DAY ${state.day+1}</b> ${tomorrow}</p>
      <div class="actions"><button id="tomorrow" class="primary">다음 영업일 →</button><button id="weekLook">둘러보기</button><button id="weekReorder">내일 발주 미리 보기</button></div></section>`;
  }

  function archive(state, stories) {
    const queue=state.week.queue.filter(id=>stories[id]&&!state.stories.includes(id));
    const regulars=Object.entries(state.week.guestMemory||{}).map(([id,m])=>`<li><b>${rules.regularNames[id]}</b> · 방문 ${m.visits}회 · 최근 ${menuNames[m.lastMenu]||'주문 없음'} / ${rules.reasons[m.lastResult]}</li>`).join('');
    return `${regulars?`<details class="week-regulars"><summary>단골 노트</summary><ul>${regulars}</ul></details>`:''}${queue.length?`<div class="week-story-list"><h2>아직 듣지 못한 이야기</h2>${queue.map(id=>`<button data-week-story="${id}">${esc(stories[id].title)}</button>`).join('')}</div>`:''}
      ${state.week.photos.map(photo=>`<figure class="week-photo"><div class="${photo.placements.display==='display'?'display-upgraded':''}">${scenery(photo.placements)}</div><figcaption>DAY ${photo.day} · ${esc(photo.alias||'RiNG')} ${photo.day===7?'첫 공연':'처음 문을 연 날'}</figcaption></figure>`).join('')}`;
  }

  function bindArchive(panel, adapter) {
    panel.querySelectorAll('[data-week-story]').forEach(b=>b.onclick=()=>adapter.story(b.dataset.weekStory));
  }

  function menuStats(state,menu){
    const last=state.menuHistory.yesterday?.[menu.id], labels={beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'};
    const status=menu.limited&&!rules.live(state.day)?'공연일 한정':!state.enabled[menu.id]?'미판매 설정':!rules.enough(state,menu.id)?'재료 부족':'판매 가능';
    const recipe=Object.entries(menu.needs).map(([key,n])=>labels[key]+' '+n).join(' · ');
    return `<p class="week-menu-stats"><b>${status}</b> · ${recipe}<br>메뉴당 차액 ${yen(state.prices[menu.id]-menu.cost)} · ${state.menuHistory.yesterday?`전일 판매 ${last?.sold??0} · 가격 이탈 ${last?.priceRejected??0}`:'아직 판매 기록이 없어요.'}</p>`;
  }
  function priceHelp(){return '<details class="menu-help"><summary>가격과 손님 선호</summary><p>영업 준비 중에 ¥50씩 조정하면 오늘 접수할 주문부터 적용돼요. 손님은 선호 메뉴 두 개 중 예산과 재고에 맞는 것을 고릅니다. 메뉴당 차액은 가격에서 재료 원가를 뺀 금액이며 영업비는 포함하지 않아요.</p></details>'}
  return { menuStats,priceHelp,mount, render, edit, ticket, stock, bindStock, receipt, archive, bindArchive, scenery,
    decorLink:()=>'<button id="weekEdit" class="primary">매장 꾸미기</button>' };
})();

