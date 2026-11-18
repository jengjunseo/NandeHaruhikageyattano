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
      if (action === 'help') {
        const hint = $('#weekHelp');
        hint.hidden = !hint.hidden;
        button.setAttribute('aria-expanded', String(!hint.hidden));
      }
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
    if (!api.assign(chosen.id, 'make')) api.notice('재료를 확인해요');
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
            const price=has?'보유':rules.unlocked(state,id)?yen(item.cost):item.unlock==='first_close'?'첫 마감 후':'DAY '+item.day;
            return control('preview',id,`<strong>${item.name}</strong><span>${price}</span><small>${item.effect}</small>`,'aria-pressed="'+(preview===id)+'"');
          }).join('')}</div>
        <footer>${control('place','',preview==='base'?'기본으로 돌리기':owned?'배치':'구매·배치',canPlace?'class="primary"':'disabled')}
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
        ${rules.live(state.day)?`<span>${waveLabel(state)} · 세트 ${Math.max(0,rules.setLimit(state.day)-shift.sets)}개</span>`:''}
        ${queued?control('cancel-queue','',`#${queued.id} 예약 취소`) :''}
        ${coach?control('help','','?','aria-label="첫 주문 도움말" aria-expanded="false"') : ''}
        <span id="weekHelp" hidden>${coach?.status==='waiting'?'케이크를 꺼내요':'픽업 접시를 눌러요'}</span>
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
    const status=queued?'예약':{waiting:'대기',making:'제조',ready:'픽업',serving:'전달'}[c.status];
    const base=`<div class="week-ticket-title">${art(c.menu)}<strong>#${c.id} ${menuNames[c.menu]}</strong><small>${yen(c.price)}</small></div>
      <div class="week-ticket-meta"><span>${c.takeout?'포장':rules.profiles[c.profile]||'일반'} · ${status}</span><span data-patience="${c.id}">${c.patience}초</span></div>
      <div class="bar"><i data-patience-bar="${c.id}" style="width:${Math.max(0,c.patience/c.maxPatience)*100}%"></i></div>`;
    const button=(kind,label)=>`<button data-${kind}="${c.id}" aria-label="${menuNames[c.menu]} 주문 ${c.id} ${label}" ${queued?'disabled':''}>${label}</button>`;
    if (c.status==='ready') return base+button('serve',reserving?'전달 예약':'직접 서빙');
    if (c.status!=='waiting') return base;
    if(state.week.milkOrder===c.id)return base+`<button data-link-milk="${c.id}">우유 연결</button>`;
    if (available) return base+button('make',reserving?'제조 예약':'직접 제조');
    return base+`<span class="week-shortage">재료 부족</span>
      ${alternative?`<button data-alternate="${alternative}">${menuNames[alternative]} ${yen(state.prices[alternative])}</button>`:''}
      <button data-cancel="${c.id}">취소</button>`;
  }

  function stock(state, ingredients) {
    const plan=rules.recommendation(state);
    if (!cart || cart.day!==state.day || cart.state!==state) cart={day:state.day,state,counts:{...plan.missing}};
    return `<section class="week-stock"><h2>재료 발주</h2>
      <form id="weekBasket">${Object.entries(ingredients).map(([id,item])=>`<label><strong>${item.name}</strong>
      <span>필요 ${plan.low[id]}–${plan.high[id]} · 보유 ${state.stock[id]}</span>
      <input aria-label="${item.name} 주문 수량" type="number" name="${id}" min="0" max="99" required value="${cart.counts[id]}"></label>`).join('')}
      <div class="week-basket-actions"><button type="submit" class="primary" id="weekBasketPay">발주 · ${yen(rules.basketCost(cart.counts))}</button>
      <button type="button" id="weekBasketSuggest">추천 수량</button>${state.money<Math.max(600,plan.cost)?'<button type="button" id="weekBasketBasic">기본 묶음</button>':""}${state.money<500?'<button type="button" id="weekBasketSupport">운영 지원금</button>':""}</div></form>
      <p id="weekBasketFeedback" role="status"></p></section>`;
  }

  function bindStock(panel, adapter) {
    const form=panel.querySelector('#weekBasket');
    if (!form) return;
    form.oninput=()=>{
      for (const name of Object.keys(cart.counts)) cart.counts[name]=form.elements[name].valueAsNumber || 0;
      form.querySelector('#weekBasketPay').textContent='발주 · '+yen(rules.basketCost(cart.counts));
    };
    form.onsubmit=event=>{
      event.preventDefault();
      if (adapter.buy({...cart.counts})) { cart=null; adapter.render(); }
      else panel.querySelector('#weekBasketFeedback').textContent='수량과 보유금을 확인해요.';
    };
    form.querySelector('#weekBasketSuggest').onclick=()=>{cart=null;adapter.render()};
    const basic=form.querySelector('#weekBasketBasic');
    if(basic)basic.onclick=()=>{const state=adapter.state();const menu=Object.keys(menuNames).filter(id=>rules.available(state,id)).map(id=>rules.balance.menu[id]).sort((a,b)=>rules.basketCost(a.recipe)-rules.basketCost(b.recipe))[0];cart.counts={beans:0,milk:0,cake:0,matcha:0,...menu?.recipe};adapter.render()};
    const support=form.querySelector('#weekBasketSupport');if(support)support.onclick=adapter.support;
  }

  function receipt(state, stories) {
    const ledger=state.week.shift?.ledger||[];
    const failures=Object.entries(rules.reasons).filter(([key])=>key!=='sold').map(([reason,label])=>({label,n:ledger.filter(x=>x.reason===reason).length})).sort((a,b)=>b.n-a.n);
    const profit=state.revenue-state.accounting.soldCost-state.accounting.lostCost-state.overhead;
    const today={2:'tomori_note',3:'anon_poster',4:'rana_cup',5:'soyo_table'}[state.day];
    const story=state.week.queue.includes(today)?today:state.week.queue.find(id=>stories[id]&&!state.stories.includes(id));
    const photo=state.week.photos.find(p=>p.day===state.day&&p.day===7);
    return `<section class="week-receipt">
      <div class="eyebrow">RiNG · DAY ${state.day}</div><h2>오늘의 영수증</h2>
      ${state.week.alias?`<p>${esc(state.week.alias)}</p>`:''}
      <dl><div><dt>영업 손익</dt><dd>${yen(profit)}</dd></div><div><dt>서빙</dt><dd>${state.served}건</dd></div><div><dt>놓친 손님</dt><dd>${state.left}명</dd></div></dl>
      <p>${failures[0]?.n?failures[0].label+' '+failures[0].n+'건':'모든 주문을 전달했어요'}</p>
      <details><summary>영수증 상세</summary><p>매출 ${yen(state.revenue)} · 판매 원가 ${yen(state.accounting.soldCost)} · 폐기 원가 ${yen(state.accounting.lostCost)} · 영업비 ${yen(state.overhead)}</p>
      <p>발주 ${yen(state.accounting.purchases)} · 가구 ${yen(state.accounting.equipment)} · 상환 ${yen(state.loanPaid)} · 보유금 ${yen(state.money)}</p>
      <p>${failures.filter(x=>x.n).map(x=>x.label+' '+x.n+'건').join(' · ')}</p></details>
      ${story?`<button data-week-story="${story}">${esc(stories[story].title)} 감상</button>`:''}
      ${photo?`<p>첫 공연 사진을 기록에 남겼어요.</p>`:''}
      <div class="actions"><button id="tomorrow" class="primary">내일 준비</button><button id="weekLook">둘러보기</button>${rules.recommendation(state,state.day+1).cost?'<button id="weekReorder">내일 발주</button>':""}</div></section>`;
  }

  function archive(state, stories) {
    const queue=state.week.queue.filter(id=>stories[id]&&!state.stories.includes(id));
    return `${queue.length?`<div class="week-story-list"><h2>아직 듣지 못한 이야기</h2>${queue.map(id=>`<button data-week-story="${id}">${esc(stories[id].title)}</button>`).join('')}</div>`:''}
      ${state.week.photos.map(photo=>`<figure class="week-photo"><div class="${photo.placements.display==='display'?'display-upgraded':''}">${scenery(photo.placements)}</div><figcaption>DAY ${photo.day} · ${esc(photo.alias||'RiNG')} ${photo.day===7?'첫 공연':'처음 문을 연 날'}</figcaption></figure>`).join('')}`;
  }

  function bindArchive(panel, adapter) {
    panel.querySelectorAll('[data-week-story]').forEach(b=>b.onclick=()=>adapter.story(b.dataset.weekStory));
  }

  function menuStats(state,menu){const last=state.menuHistory.yesterday?.[menu.id];return `<p class="week-menu-stats">남는 ${yen(state.prices[menu.id]-menu.cost)} · 판매 ${last?.sold??'–'} · 가격 이탈 ${last?.priceRejected??'–'}</p>`}
  function priceHelp(){return '<details class="menu-help"><summary>가격과 손님 선호</summary><p>손님은 선호 메뉴 두 개를 보고, 가격이 예산 안에 들고 재료가 있는 것을 골라요. 발주에는 판매 중인 메뉴와 같은 메뉴의 전일 기록이 반영돼요.</p></details>'}
  return { menuStats,priceHelp,mount, render, edit, ticket, stock, bindStock, receipt, archive, bindArchive, scenery,
    decorLink:()=>'<button id="weekEdit" class="primary">매장 꾸미기</button>' };
})();

