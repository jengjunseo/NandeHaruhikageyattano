'use strict';

window.RingWeek = (() => {
  const balance = window.RingWeekBalance;
  const stations = { espresso: '에스프레소 머신', display: '케이크 진열대', mix: '말차 작업대', pickup: '픽업 선반' };
  const slots = { window: '창가', entrance: '입구 벽', pickup: '픽업', display: '쇼케이스', stage: '무대', tables: '테이블', espresso: '머신' };
  const decorNames = {
    plant: ['작은 화분', '장식 · 창가에 초록빛'], chalkboard: ['손글씨 칠판', '장식 · 입구 메뉴판'],
    windowLamp: ['낮은 창가등', '창가 대기 +3초'], poster: ['공연 포스터', '공연 팬 최대 +2명'],
    pickupShelf: ['픽업 선반', '포장 전달 1초 · 픽업 2칸'], display: ['케이크 진열대', '일부 손님이 케이크를 먼저 고려'],
    seats: ['동선 배치', '최대 2석 추가'], machine: ['커피 머신', '추출 1초 단축'],
    stageLight: ['무대 조명', '장식 · 따뜻한 무대 빛'], liveMemento: ['첫 공연 기념물', '첫 주의 공연 기록']
  };
  const items = Object.fromEntries(Object.entries(balance.decor).map(([id, value]) =>
    [id, { ...value, name: decorNames[id][0], effect: decorNames[id][1] }]));
  const profiles = { general: '일반', window: '창가', fan: '공연 팬' };
  const reasons = { stock: '재료 부족', wait: '대기 시간 초과', full: '만석', price: '가격 이탈', closing: '마감', menu: '판매 메뉴 없음', sold: '서빙' };
  const menuIds = Object.keys(balance.menu);
  const menuNames = {coffee:'블렌드 커피', latte:'카페 라테', cake:'오늘의 케이크', matcha:'말차 라테', liveSet:'공연 세트'};
  const ingredientNames = {beans:'원두', milk:'우유', cake:'케이크', matcha:'말차'};
  const regularNames = { haru:'하루', mei:'메이', jun:'준' };
  const regularLines = {
    haru:{first:'안녕하세요. 오늘은 천천히 쉬었다 갈게요.',back:'지난번처럼 잠깐 쉬어 가도 되죠?',favorite:['이 향 때문에 다시 왔어요.','역시 한 모금 마시면 정신이 들어요.']},
    mei:{first:'오늘 케이크는 어떤 거예요?',back:'오늘은 진열대부터 보게 되네요.',favorite:['다음에도 디저트 보러 올게요.','천천히 먹고 가야겠어요. 아까워서요.']},
    jun:{first:'공연 기다리면서 한 잔 할게요.',back:'공연 전까지 여기서 기다려도 되죠?',favorite:['공연 전엔 이걸 마시면 마음이 좀 놓여요.','라테 챙겨 주셔서 고마워요. 공연 잘 보고 갈게요.']}
  };
  const reactionLines = { sold:['잘 먹을게요.','고맙습니다!','딱 좋네요.'], stock:['그럼 다음에 다시 올게요.','오늘은 재료가 다 떨어졌군요.'], wait:['시간이 다 돼서 먼저 갈게요.','오늘은 기다리기 어려울 것 같아요.'], price:['오늘은 예산을 조금 넘네요.','다음에 메뉴를 다시 볼게요.'], closing:['벌써 마감 시간이군요.'], full:['다음엔 조금 일찍 올게요.'], menu:['지금 주문할 메뉴가 없군요.'] };
  const modeHelp = {manual:'주문표에서 제조와 전달을 선택하세요.',pickup:'제조를 지시하면 타키가 완성품을 먼저 전달해요. DAY 3부터 사용할 수 있어요.',make:'타키가 제조하고, 픽업이 차거나 손님이 오래 기다리면 먼저 전달해요.',serve:'타키가 완성품을 먼저 전달하고, 없으면 다음 주문을 제조해요.',rest:'진행 중인 일을 마치고 쉬어요. 직접 지시하면 일을 맡고, 예약은 업무를 바꿀 때까지 기다려요.'};
  const count = x => Number.isInteger(x) && x >= 0;
  const object = x => x && typeof x === 'object' && !Array.isArray(x);
  const validPlacement = (slot, id) => Object.hasOwn(slots, slot) && Object.hasOwn(items, id) && (items[id].slot === slot || id === 'poster' && slot === 'stage');
  const validAlias = value => typeof value === 'string' && Array.from(value).length <= 14;

  function dayPlan(state) {
    const plan = state.week.servicePlan;
    return plan?.day === state.day ? plan : null;
  }

  function ensurePlan(state) {
    return dayPlan(state) || (state.week.servicePlan = {day:state.day});
  }

  function morningSeen(state, id) {
    return state.week.morning?.day === state.day && state.week.morning.id === id &&
      state.week.morning.status === 'completed';
  }

  function planChoice(state, kind, value) {
    if (state.phase !== 'prep') return false;
    if (kind === 'live' && live(state.day) && ['off','shared','reserve'].includes(value)) {
      ensurePlan(state).live = value;
      state.enabled.liveSet = value !== 'off';
      return true;
    }
    if (kind === 'window' && state.day === 2 && morningSeen(state,'morning_window') && typeof value === 'boolean') {
      ensurePlan(state).window = value;
      return true;
    }
    if (kind === 'board' && state.day === 4 && morningSeen(state,'morning_board') &&
        (value === null || menuIds.includes(value) && value !== 'liveSet' && available(state,value) && enough(state,value))) {
      ensurePlan(state).board = value;
      return true;
    }
    return false;
  }

  function validPlan(state, week) {
    const plan = week.servicePlan;
    const step = week.nextPrep;
    if (step !== undefined && (!object(step) || ![state.day,state.day+1].includes(step.day) ||
      !(step.kind === 'stock' && Object.hasOwn(ingredientNames,step.id) ||
        step.kind === 'menu' && menuIds.includes(step.id) ||
        step.kind === 'work' && step.id === 'priority'))) return false;
    if (plan === undefined) return true;
    if (!object(plan) || plan.day !== state.day ||
        plan.live !== undefined && !['off','shared','reserve'].includes(plan.live) ||
        plan.window !== undefined && typeof plan.window !== 'boolean' ||
        plan.board != null && (!menuIds.includes(plan.board) || plan.board === 'liveSet')) return false;
    const shift = week.shift;
    for (const key of ['priority','regular','lamp','machine']) {
      if (plan[key] != null && (!count(plan[key]) || plan[key] === 0 || plan[key] >= state.nextId)) return false;
    }
    if (plan.priority != null && !state.customers.some(c=>c.id===plan.priority && ['waiting','ready'].includes(c.status))) return false;
    if (plan.boardUsed !== undefined && (!count(plan.boardUsed) || plan.boardUsed>2)) return false;
    if (plan.allocation === undefined) return true;
    const a = plan.allocation;
    return !!shift && object(a) && ['held','initial','released','used'].every(k=>count(a[k]) && a[k]<=2) &&
      a.initial === a.held+a.released+a.used &&
      Object.entries(balance.menu.liveSet.recipe).every(([id,n])=>a.held*n<=state.stock[id]);
  }

  function reservePreview(state) {
    const spec = balance.menu.liveSet.recipe;
    const target = dayPlan(state)?.live === 'reserve' && state.enabled.liveSet ? 2 : 0;
    const units = Math.min(target,...Object.entries(spec).map(([id,n])=>Math.floor(state.stock[id]/n)));
    return {target,units,missing:Object.entries(spec).filter(([id,n])=>state.stock[id]<n*target)
      .map(([id,n])=>ingredientNames[id]+' '+(n*target-state.stock[id])+'개 부족')};
  }

  function usable(state, ingredient, menu) {
    const held = menu === 'liveSet' ? 0 : dayPlan(state)?.allocation?.held || 0;
    return state.stock[ingredient] - held*(balance.menu.liveSet.recipe[ingredient] || 0);
  }

  function releaseReserve(state, force = false) {
    const a = dayPlan(state)?.allocation;
    if (!a?.held || (!force && livePhase(state) === 'before')) return;
    const pending = force ? 0 : state.customers.filter(c=>c.status==='waiting' && c.menu==='liveSet').length;
    const returned = Math.max(0,a.held-pending);
    a.held -= returned;
    a.released += returned;
  }

  function firstWork(state,id) {
    const guest = state.customers.find(c=>c.id===id);
    const plan = dayPlan(state);
    if (state.phase!=='open' || plan?.regular!==id || !['waiting','ready'].includes(guest?.status)) return false;
    plan.priority=id;
    return true;
  }

  function advancePlan(state) {
    delete state.week.servicePlan;
    if (state.week.nextPrep?.day !== state.day) delete state.week.nextPrep;
  }

  function init(state, fresh = false, seed = Date.now() >>> 0) {
    if (state.week) return state.week;
    const owned = {};
    const placements = {};
    for (const [old, id] of Object.entries({ decor: 'windowLamp', display: 'display', seats: 'seats', machine: 'machine' })) {
      if (state.upgrades[old]) {
        owned[id] = true;
        placements[items[id].slot] = id;
      }
    }
    state.week = {
      schemaVersion: 1, seed, introService: fresh, owned, placements, alias: '',
      nextJob: null, shift: null, undo: null, queue: [], memories: {}, yesterday: null,
      photos: [], firstClosed: state.day > 1 || state.phase === 'closed',
      latteLinked: false, milkOrder: null
    };
    if (!fresh) state.tutorial = { stage: 'done', orderId: null };
    return state.week;
  }

  function valid(week, state) {
    if (week === undefined) return true;
    if (!object(week) || week.schemaVersion !== 1 || !count(week.seed) || week.seed > 0xffffffff ||
        !validAlias(week.alias) || typeof week.introService !== 'boolean' ||
        typeof week.firstClosed !== 'boolean' || !object(week.owned) || !object(week.placements) ||
        !Array.isArray(week.queue) || !week.queue.every(id => typeof id === 'string') ||
        !Array.isArray(week.photos) || !object(week.memories)) return false;
    if (Object.entries(week.owned).some(([id, own]) => !Object.hasOwn(items, id) || own !== true)) return false;
    if (Object.entries(week.placements).some(([slot, id]) => !validPlacement(slot, id) || week.owned[id] !== true)) return false;
    if (new Set(Object.values(week.placements)).size !== Object.keys(week.placements).length) return false;
    const memoryValues = { note:[true,'save'], poster:['entrance','stage'], cup:[true,'short','tall'], reserved:[true,'mark'] };
    if (Object.entries(week.memories).some(([key,value]) => !Object.hasOwn(memoryValues,key) || !memoryValues[key].includes(value))) return false;
    if (week.photos.some(photo => !object(photo) || !count(photo.day) || !validAlias(photo.alias) ||
      !object(photo.placements) || Object.entries(photo.placements).some(([slot,id]) => !validPlacement(slot,id)))) return false;
    if (week.bookmarks !== undefined && (!object(week.bookmarks) || Object.entries(week.bookmarks).some(([id, mark]) =>
      !object(mark) || mark.id !== id || !count(mark.index) || !count(mark.contentVersion)))) return false;
    if (week.latteLinked !== undefined && typeof week.latteLinked !== 'boolean') return false;
    if (week.milkOrder != null && !state.customers.some(c => c.id === week.milkOrder && c.menu === 'latte' && c.status === 'waiting')) return false;
    if (week.nextJob !== null && (!object(week.nextJob) || !['make', 'serve'].includes(week.nextJob.kind) ||
        !state.customers.some(c => c.id === week.nextJob.id && c.status === (week.nextJob.kind === 'make' ? 'waiting' : 'ready')))) return false;
    if (week.yesterday !== null && (!object(week.yesterday) || Object.entries(week.yesterday).some(([id, n]) =>
      !menuIds.includes(id) || !object(n) || !count(n.sold) || !count(n.missed)))) return false;
    if (week.undo !== null && (!object(week.undo) || !count(week.undo.cost) || !Object.hasOwn(items, week.undo.id) ||
        week.undo.cost !== items[week.undo.id].cost || week.owned[week.undo.id] !== true ||
        !object(week.undo.placements) || Object.entries(week.undo.placements).some(([slot, id]) =>
          !validPlacement(slot, id) || week.owned[id] !== true))) return false;
    if (week.morning !== undefined) {
      const m = week.morning;
      if (!object(m) || m.day !== state.day || m.source !== 'morning' || typeof m.id !== 'string' ||
        !['active','completed'].includes(m.status) || m.status === 'active' && state.phase !== 'prep') return false;
    }
    if (week.guestMemory !== undefined && (!object(week.guestMemory) || Object.entries(week.guestMemory).some(([id,m])=>
      !Object.hasOwn(regularNames,id) || !object(m) || !count(m.visits) || !count(m.lastDay) || m.lastDay>state.day ||
      (m.lastOrderId!==undefined&&(!count(m.lastOrderId)||m.lastOrderId>=state.nextId)) ||
      (m.lastReferencedDay!==undefined&&(!count(m.lastReferencedDay)||m.lastReferencedDay>state.day)) ||
      (m.lastServedDay!==undefined&&(!count(m.lastServedDay)||m.lastServedDay>m.lastDay)) ||
      (m.lastMenu!==null&&!menuIds.includes(m.lastMenu)) || (m.lastServed!==null&&!menuIds.includes(m.lastServed)) || !Object.hasOwn(reasons,m.lastResult)))) return false;
    if (!validPlan(state,week)) return false;
    if (week.shift === null) return state.phase !== 'open';
    const shift = week.shift;
    return object(shift) && shift.day === state.day && count(shift.seconds) && shift.seconds >= 65 && shift.seconds <= 75 &&
      count(shift.cursor) && Array.isArray(shift.arrivals) && shift.cursor <= shift.arrivals.length &&
      shift.arrivals.every(a => object(a) && count(a.at) && a.at < shift.seconds && Object.hasOwn(profiles, a.profile) &&
        Number.isFinite(a.budget) && a.budget >= .88 && a.budget <= 1.35 && typeof a.takeout === 'boolean') &&
      Array.isArray(shift.outside) && shift.outside.every(i => count(i) && i < shift.cursor) &&
      Array.isArray(shift.ledger) && shift.ledger.every(r => object(r) && count(r.id) &&
        Object.hasOwn(reasons, r.reason) && (r.menu === null || menuIds.includes(r.menu)) &&
        (r.moments === undefined || Array.isArray(r.moments) && r.moments.every(x=>['jun-latte','rain-window','live-set'].includes(x)))) &&
      new Set(shift.ledger.map(r => r.id)).size === shift.ledger.length && count(shift.sets) &&
      (shift.coach === null || count(shift.coach));
  }

  function has(state, id) {
    return Object.values(state.week.placements).includes(id);
  }

  function schedule(day) {
    const firstWeek = balance.days[day - 1];
    if (firstWeek) return firstWeek;
    const type = day % 7 === 0 ? 'special' : day % 3 === 0 ? 'live' : day % 5 === 0 ? 'rain' : 'sun';
    return { ...balance.days.find(d => d.type === type && d.day !== 1), day };
  }

  function live(day) {
    return ['live', 'special'].includes(schedule(day).type);
  }

  function available(state, id, day = state.day) {
    return state.enabled[id] && (id !== 'liveSet' || live(day) && (day !== state.day ||
      (state.week.shift?.sets || 0) < setLimit(day) && (!dayPlan(state)?.allocation || livePhase(state)==='before')));
  }

  function setLimit(day) {
    return balance.menu.liveSet.dailyLimit[schedule(day).type] || 0;
  }

  function random(seed, day, index, salt) {
    let x = seed ^ Math.imul(day, 0x9e3779b9) ^ Math.imul(index + 1, 0x85ebca6b) ^ salt;
    x = Math.imul(x ^ x >>> 16, 0x7feb352d);
    x = Math.imul(x ^ x >>> 15, 0x846ca68b);
    return ((x ^ x >>> 16) >>> 0) / 4294967296;
  }

  function roster(state) {
    const plan = schedule(state.day);
    const weights = plan.profileWeights.slice();
    const warmMenu = state.enabled.matcha && state.enabled.cake ? 6 : 0;
    const lamp = Math.min(weights[0], (has(state, 'windowLamp') ? 12 : 0) + warmMenu);
    const poster = live(state.day) && has(state, 'poster') ? Math.min(weights[0] - lamp, 15) : 0;
    weights[0] -= lamp + poster;
    weights[1] += lamp;
    weights[2] += poster;
    const gap = live(state.day) ? 10 : 0;
    const start = 5, end = plan.seconds - 3;
    const middle = Math.floor((start + end - gap) / 2);
    const windows = plan.waves.length === 1 ? [[start, end]] : [[start, middle], [middle + gap, end]];
    const first = state.week.introService && state.day === 1;
    const total = plan.visits - Number(first);
    const extra = poster ? 2 : 0;
    const result = [];
    for (let wave = 0; wave < windows.length; wave++) {
      const firstWave = Math.round(total * plan.waves[0] / 100);
      const base = wave === 0 ? firstWave : total - firstWave;
      const [from, to] = windows[wave];
      for (let i = 0; i < base + (wave === 0 ? extra : 0); i++) {
        const extraVisit = i >= base;
        const j = extraVisit ? total + i - base : (wave === 0 ? 0 : firstWave) + i;
        const pick = random(state.week.seed, state.day, j, 1) * 100;
        const profile = i >= base ? 'fan' : pick < weights[0] ? 'general' : pick < weights[0] + weights[1] ? 'window' : 'fan';
        const cfg = balance.profiles[profile], [lo, hi] = cfg.maxPriceRatioRange;
        const packChance = cfg.takeoutChance || (profile === 'general' && has(state, 'pickupShelf') ? .58 : 0);
        const progress = extraVisit ? (i - base + 1) / (extra + 1) : i / Math.max(1, base - 1);
        result.push({ at: Math.round(from + (to - from) * progress),
          profile, budget: lo + (hi - lo) * random(state.week.seed, state.day, j, 2),
          takeout: random(state.week.seed, state.day, j, 3) < packChance,
          preference: random(state.week.seed, state.day, j, 4) });
      }
    }
    return result.sort((a,b)=>a.at-b.at);
  }

  function enough(state, id) {
    return Object.entries(balance.menu[id].recipe).every(([k, n]) => usable(state,k,id) >= n);
  }

  function stat(state, id) {
    return state.menuHistory.today[id] ||= { offered: 0, sold: 0, priceRejected: 0, accepted: 0 };
  }

  const text=(id,params)=>window.RingNarrative.get(id,params);
  function guestGreeting(state,guest){
    const who=regularNames[guest.regularId]?guest.regularId:'general';
    if (who!=='general' && menuIds.includes(guest.remembers)) {
      const menu=menuNames[guest.remembers];
      return guest.menu===guest.remembers ? {
        haru:'지난번 '+menu+', 오늘도 한 잔 부탁해요.',
        mei:'저번에 먹은 '+menu+'가 생각나서 왔어요.',
        jun:'지난번 '+menu+', 오늘도 될까요?'
      }[who] : '지난번엔 '+menu+'였죠. 오늘은 이걸로 할게요.';
    }
    const memory=state.week.guestMemory?.[who];
    if(who==='general')return text('guest.general.'+(guest.takeout?'takeout':'here'));
    return text('guest.'+who+'.'+(!memory?.visits?'first':['wait','stock'].includes(memory.lastResult)?'missed':memory.lastServed&&memory.lastServed===guest.menu?'same':'back'));
  }

  function terminal(state, guest, reason) {
    const shift = state.week.shift;
    if (shift.ledger.some(r => r.id === guest.id)) return false;
    const previous = state.week.guestMemory?.[guest.regularId];
    const favorite = reason === 'sold' && guest.favorite === guest.menu && regularLines[guest.regularId]?.favorite;
    const lines = favorite || reactionLines[reason];
    let reaction = lines[(previous?.visits ?? guest.id) % lines.length];
    const moments=[];
    if(reason==='sold') {
      if(guest.regularId==='jun'&&guest.menu==='latte') {
        moments.push('jun-latte');
        reaction=live(state.day)?(livePhase(state)==='after'?'공연 보고 마시는 라테도 좋네요. 오늘도 잘 마실게요.':'공연 전에 한 잔. 따뜻해서 마음이 놓이네요.'):
          previous?.lastServed==='latte'?'지난번 라테가 생각나서 왔어요. 오늘도 잘 마실게요.':'라테가 부드럽네요. 다음에도 이걸로 부탁할게요.';
      }
      if(schedule(state.day).type==='rain'&&has(state,'windowLamp')&&guest.profile==='window'&&!guest.takeout) {
        moments.push('rain-window');reaction='비 오는 창가에 이 불빛… 따뜻하네요. 조금 쉬다 갈게요.';
      }
      if(guest.menu==='liveSet'&&live(state.day)) {moments.push('live-set');reaction=livePhase(state)==='after'?'공연 여운이 남네요. 세트 잘 먹고 갈게요.':'공연 기다리면서 먹기 딱 좋겠어요. 세트 감사합니다.';}
    }
    const who=regularNames[guest.regularId]?guest.regularId:'general';
    const variant=(previous?.visits??guest.id)%2;
    const keyed='outcome.'+who+'.'+reason+'.'+(who!=='general'&&['sold','stock','wait','price'].includes(reason)?variant:0);
    reaction=text(keyed);
    if(reason==='sold'){
     if(favorite&&['haru','mei'].includes(who))reaction=text('favorite.'+who+'.'+variant);
     if(who==='jun'&&guest.menu==='latte')reaction=live(state.day)?text('jun.live.'+(livePhase(state)==='after'?'after':'before')):text('jun.latte.'+(previous?.lastServed==='latte'?1:0));
     if(moments.includes('rain-window'))reaction=text('rain.'+who);
     if(moments.includes('live-set'))reaction=text('set.'+(livePhase(state)==='after'?'after':'before')+'.'+who);
    }
    if (Object.hasOwn(regularNames,guest.regularId)) {
      state.week.guestMemory ||= {};
      state.week.guestMemory[guest.regularId] = {visits:(previous?.visits||0)+1,lastDay:state.day,lastMenu:guest.menu||null,
        lastServed:reason==='sold'?guest.menu:previous?.lastServed??null,lastResult:reason,lastOrderId:guest.id,
        ...(reason==='sold'||previous?.lastServed?{lastServedDay:reason==='sold'?state.day:previous.lastServedDay??previous.lastDay}:{}),
        ...(previous?.lastReferencedDay!==undefined?{lastReferencedDay:previous.lastReferencedDay}:{})};
    }
    shift.ledger.push({ id: guest.id, menu: guest.menu || null, reason, at:state.tick, profile: guest.profile || 'general',
      takeout: !!guest.takeout, ...(moments.length?{moments}:{}), ...(guest.regularId?{regularId:guest.regularId}:{}),
      ...(guest.menu?{quotedPrice:guest.price??state.prices[guest.menu]}:{}),
      ...(guest.status&&guest.menu==='liveSet'?{accepted:true}:{}),
      ...(guest.setReplaced?{setReplaced:true}:{}),
      ...(count(guest.seat)?{seat:guest.seat}:{}),
      reaction, revenue: reason === 'sold' ? guest.price : 0, cost: guest.materialCost || 0 });
    if (reason === 'sold') {
      state.money += guest.price;
      state.revenue += guest.price;
      state.accounting.soldCost += guest.materialCost || 0;
      state.served++;
      stat(state, guest.menu).sold++;
      if (guest.menu === 'liveSet') state.soldLiveSet++;
      if (guest.regularId) state.regulars[guest.regularId]++;
      state.fatigue = Math.min(100, state.fatigue + 2);
    } else {
      state.left++;
      if (reason === 'stock') {
        state.failures.stockWait++;
        state.failures.missing ||= {};
        if (guest.menu) for (const [key,n] of Object.entries(balance.menu[guest.menu].recipe)) {
          if (usable(state,key,guest.menu) < n) state.failures.missing[key] = (state.failures.missing[key] || 0) + 1;
        }
      }
      if (reason === 'wait' || reason === 'closing') state.failures.wait++;
      if (reason === 'price' && guest.menu) stat(state, guest.menu).priceRejected++;
      state.accounting.lostCost += guest.materialCost || 0;
      if (guest.menu === 'liveSet' && guest.status === 'waiting') shift.sets--;
    }
    state.customers = state.customers.filter(c => c.id !== guest.id);
    if (state.workers.taki?.id === guest.id) state.workers.taki = null;
    if (state.week.nextJob?.id === guest.id) state.week.nextJob = null;
    if (state.week.milkOrder === guest.id) state.week.milkOrder = null;
    const plan = dayPlan(state);
    if (plan?.priority===guest.id) delete plan.priority;
    releaseReserve(state);
    return true;
  }

  function open(state) {
    const first = state.week.introService && state.day === 1;
    const plan = schedule(state.day);
    const arrivals = roster(state);
    state.week.undo = null;
    state.week.milkOrder = null;
    if (state.day === 6) state.fatigue = Math.max(0, state.fatigue - 8);
    state.week.shift = { day: state.day, seconds: plan.seconds, cursor: 0, arrivals, outside: [], ledger: [], sets: 0, coach: null };
    const service=ensurePlan(state);
    if (live(state.day)) {
      const {units}=reservePreview(state);
      service.allocation={initial:units,held:units,used:0,released:0};
    }
    if (first) {
      const id = state.nextId++;
      state.customers.push({ id, menu: 'cake', price: state.prices.cake, seat: 0, profile: 'general',
        status: 'waiting', patience: 26, maxPatience: 26 });
      const tutorial=stat(state,'cake');
      tutorial.offered++;
      tutorial.accepted=(tutorial.accepted||0)+1;
      state.week.shift.coach = id;
    }
  }

  function capacity(state) {
    return has(state, 'pickupShelf') ? 2 : 1;
  }

  function pickupFull(state) {
    return state.customers.filter(c => c.status === 'ready').length >= capacity(state);
  }

  function command(state, id, kind) {
    if (state.phase !== 'open' || !['make', 'serve'].includes(kind)) return null;
    const guest = state.customers.find(c => c.id === id);
    if (!guest || guest.status !== (kind === 'make' ? 'waiting' : 'ready')) return null;
    if (kind === 'make' && !enough(state, guest.menu)) return null;
    const busy = !!state.workers.taki || kind === 'make' && pickupFull(state);
    if (busy) {
      if (state.week.nextJob?.id === id && state.week.nextJob.kind === kind) return null;
      state.week.nextJob = { id, kind };
      return 'queued';
    }
    const spec = balance.menu[guest.menu];
    if (kind === 'make') {
      let cost = 0;
      const plan = dayPlan(state);
      if (guest.menu==='liveSet' && plan?.allocation?.held) {
        plan.allocation.held--;
        plan.allocation.used++;
      }
      for (const [key, n] of Object.entries(spec.recipe)) {
        state.stock[key] -= n;
        cost += balance.ingredients[key] * n;
      }
      guest.materialCost = cost;
      guest.status = 'making';
      if (state.week.milkOrder === id) {
        state.week.milkOrder = null;
        state.week.latteLinked = true;
      }
      const seconds = state.week.shift.coach === id ? 1 :
        makeSeconds(state,guest.menu);
      if (plan && plan.machine===undefined && spec.station==='espresso' && has(state,'machine')) plan.machine=id;
      state.workers.taki = { id, kind, remaining: seconds };
    } else {
      guest.status = 'serving';
      const seconds = guest.takeout && has(state, 'pickupShelf') ? 1 : !guest.takeout && guest.seat >= 5 ? 3 : 2;
      state.workers.taki = { id, kind, remaining: seconds };
    }
    if (state.week.nextJob?.id === id && state.week.nextJob.kind === kind) state.week.nextJob = null;
    const plan = dayPlan(state);
    if (plan?.priority===id) delete plan.priority;
    return kind;
  }

  function candidates(state, profile, budget, preference, favorite, board) {
    const order = [...balance.profiles[profile].preference];
    if (schedule(state.day).type === 'rain' && profile !== 'fan') order.unshift('matcha');
    if (has(state, 'display') && profile !== 'fan' && preference < .25) {
      const i = order.indexOf('cake');
      if (i > 0) order.splice(i - 1, 0, ...order.splice(i, 1));
    }
    if (favorite && !(profile === 'fan' && available(state,'liveSet'))) order.unshift(favorite);
    const ranked = [...new Set(order)].filter(id => available(state, id));
    const pos = ranked.indexOf(board);
    if (pos>0) ranked.splice(pos-1,0,...ranked.splice(pos,1));
    const choices = ranked.slice(0, 2);
    return { choices, pick: choices.find(id => enough(state, id) && state.prices[id] <= Math.round(balance.menu[id].basePrice * budget)) };
  }

  function alternate(state, guest) {
    if (guest.status !== 'waiting' || enough(state, guest.menu) || guest.switched || !guest.budget) return null;
    return [...new Set([guest.favorite,...balance.profiles[guest.profile].preference])].filter(Boolean).find(id => id !== guest.menu && available(state, id) &&
      enough(state, id) && state.prices[id] <= Math.round(balance.menu[id].basePrice * guest.budget)) || null;
  }

  function switchOrder(state, id, expected) {
    const guest = state.customers.find(c => c.id === id);
    if (!guest || !menuIds.includes(expected) || alternate(state, guest) !== expected) return false;
    if (guest.menu === 'liveSet') {
      state.week.shift.sets--;
      guest.setReplaced=true;
    }
    if (expected === 'liveSet') state.week.shift.sets++;
    guest.menu = expected;
    guest.price = state.prices[expected];
    guest.switched = true;
    stat(state,expected).offered++;
    const stats=stat(state,expected);
    stats.accepted=(stats.accepted||0)+1;
    if (state.week.nextJob?.id === id) state.week.nextJob = null;
    if (state.week.milkOrder === id) state.week.milkOrder = null;
    releaseReserve(state);
    return true;
  }

  function cancel(state, id) {
    if (state.phase !== 'open') return false;
    const guest = state.customers.find(c => c.id === id);
    if (!guest || guest.status !== 'waiting' || enough(state, guest.menu) || state.week.shift.coach === id) return false;
    return terminal(state, guest, 'stock');
  }

  function freeSeat(state, arrival) {
    const count = has(state, 'seats') ? 7 : 5;
    const order = arrival.takeout ? [7, 8] : arrival.profile === 'window' && has(state, 'windowLamp') ?
      [2, 4, 0, 1, 3, 5, 6].filter(n => n < count) : Array.from({ length: count }, (_, i) => i);
    return order.find(i => !state.customers.some(c => c.seat === i));
  }

  function enter(state, arrival, seat, regularForId, events) {
    const id = state.nextId++;
    const regular = regularForId(id);
    const service = ensurePlan(state);
    const board = !regular && arrival.profile!=='fan' && state.tick<state.week.shift.seconds/2 &&
      (service.boardUsed||0)<2 && service.board && available(state,service.board) && enough(state,service.board)
      ? service.board : null;
    if (board) service.boardUsed=(service.boardUsed||0)+1;
    const { choices, pick } = candidates(state, arrival.profile, arrival.budget, arrival.preference,regular?.favorite,board);
    if (!pick) {
      const price = choices.find(menu => enough(state, menu));
      const reason = price ? 'price' : choices.length ? 'stock' : 'menu';
      const menu = price || choices[0];
      if(menu)stat(state,menu).offered++;
      terminal(state, { id, menu, profile: arrival.profile,regularId:regular?.id,takeout:arrival.takeout }, reason);
      events.push(reason);
      return;
    }
    if (pick === 'liveSet') state.week.shift.sets++;
    stat(state,pick).offered++;
    const stats=stat(state,pick);
    stats.accepted=(stats.accepted||0)+1;
    const patience = balance.profiles[arrival.profile].patience +
      (arrival.profile === 'window' && has(state, 'windowLamp') ? 3 : 0) +
      (regular ? Math.min(4, state.regulars[regular.id] || 0) : 0) + (state.nextPerk === 'patient' ? 4 : 0);
    const lamp = arrival.profile==='window' && has(state,'windowLamp');
    if (lamp && service.lamp===undefined) service.lamp=id;
    let remembers;
    if (regular && service.regular===undefined) {
      service.regular=id;
      const memory=state.week.guestMemory?.[regular.id];
      if (memory?.lastServed && (memory.lastServedDay??memory.lastDay)<state.day && memory.lastReferencedDay!==state.day) {
        remembers=memory.lastServed;
        memory.lastReferencedDay=state.day;
      }
    }
    state.customers.push({ id, menu: pick, price: state.prices[pick], seat, profile: arrival.profile, budget: arrival.budget,
      ...(remembers?{remembers}:{}),
      takeout: arrival.takeout, regularId: regular?.id || null, regularName: regular?.name || null, favorite:regular?.favorite||null,
      status: 'waiting', patience, maxPatience: patience });
    events.push('door');
  }

  function startNext(state) {
    if (state.workers.taki) return null;
    const queued = state.week.nextJob;
    if (queued && state.priority!=='rest' && !(queued.kind === 'make' && pickupFull(state))) {
      const started = command(state, queued.id, queued.kind);
      if (started === 'make' || started === 'serve') return started;
      if (!started) state.week.nextJob = null;
    }
    const ready = state.customers.filter(c => c.status === 'ready').sort((a, b) => a.patience - b.patience)[0];
    const waiting = state.customers.find(c => c.status === 'waiting' && enough(state, c.menu));
    const autoPickup = state.priority === 'pickup' && state.day >= 3;
    const priority=dayPlan(state)?.priority;
    const preferred=state.customers.find(c=>c.id===priority);
    if (preferred && (autoPickup || ['make','serve'].includes(state.priority))) {
      if (preferred.status==='ready') return command(state,priority,'serve');
      if (!pickupFull(state) && !state.week.milkOrder && !ready && !autoPickup && enough(state,preferred.menu)) return command(state,priority,'make');
    }
    if (ready && (autoPickup || state.priority === 'serve' || state.priority === 'make' &&
        (!waiting || ready.patience <= 6 || state.customers.filter(c => c.status === 'ready').length >= capacity(state)))) {
      return command(state, ready.id, 'serve');
    }
    if (waiting && ['make', 'serve'].includes(state.priority)) return command(state, waiting.id, 'make');
    return null;
  }

  function tick(state, regularForId = () => null) {
    const shift = state.week.shift, events = [];
    const coach = shift.coach !== null;
    const worker = state.workers.taki;
    const stage=livePhase(state);
    if (!coach) state.tick++;
    if (stage==='before' && livePhase(state)==='during') events.push('choice');
    releaseReserve(state);
    if (worker && --worker.remaining <= 0) {
      const guest = state.customers.find(c => c.id === worker.id);
      state.workers.taki = null;
      if (guest && worker.kind === 'make') {
        guest.status = 'ready';
        events.push('ready');
      } else if (guest) {
        terminal(state, guest, 'sold');
        events.push('serve');
        if (coach) {
          shift.coach = null;
          state.week.introService = false;
        }
      }
    }
    if (coach) return { events, close: false };
    if (state.priority === 'rest' && !state.workers.taki && state.tick % balance.staff.restEvery === 0) state.fatigue = Math.max(0, state.fatigue - 1);
    for (const guest of [...state.customers]) {
      if (guest.status === 'serving' || --guest.patience > 0) continue;
      const reason = guest.status === 'waiting' && !enough(state, guest.menu) ? 'stock' : 'wait';
      terminal(state, guest, reason);
      events.push(reason);
    }
    if (state.tick < shift.seconds) {
      while (shift.cursor < shift.arrivals.length && shift.arrivals[shift.cursor].at <= state.tick) shift.outside.push(shift.cursor++);
      shift.outside = shift.outside.filter(i => {
        const arrival = shift.arrivals[i], seat = freeSeat(state, arrival);
        if (seat !== undefined) enter(state, arrival, seat, regularForId, events);
        else if (state.tick - arrival.at < 5) return true;
        else {
          terminal(state, { id: state.nextId++, profile: arrival.profile }, 'full');
          events.push('full');
        }
        return false;
      });
    } else {
      for (const i of shift.outside) terminal(state, { id: state.nextId++, profile: shift.arrivals[i].profile }, 'full');
      shift.outside = [];
      if (state.tick >= shift.seconds + balance.clock.grace) {
        for (const guest of [...state.customers]) terminal(state, guest, 'closing');
      }
    }
    const close = state.tick >= shift.seconds && !state.customers.length && !state.workers.taki;
    if (close) releaseReserve(state,true);
    if (!close) {
      const next = startNext(state);
      if (next === 'make' || next === 'serve') events.push(next);
    }
    return { events, close };
  }

  function recommendation(state, day = state.day) {
    const plan = schedule(day);
    const availableMenus = menuIds.filter(id => state.enabled[id] && (id !== 'liveSet' || live(day)));
    const low = { beans: 0, milk: 0, cake: 0, matcha: 0 }, high = { ...low }, target = { ...low }, general = { ...low };
    const reserve=day===state.day?reservePreview(state).target:0;
    const weight = Object.fromEntries(availableMenus.map(id => [id, 0]));
    for (const [i, profile] of Object.keys(profiles).entries()) {
      const order=plan.type==='rain'&&profile!=='fan'?['matcha',...balance.profiles[profile].preference]:balance.profiles[profile].preference;
      const choices = [...new Set(order)].filter(id => availableMenus.includes(id)).slice(0, 2);
      for (const [rank, id] of choices.entries()) weight[id] += plan.profileWeights[i] * (rank === 0 ? .62 : .38);
    }
    const total = Object.values(weight).reduce((a, b) => a + b, 0) || 1;
    for (const id of availableMenus) {
      const previous = state.week.yesterday?.[id];
      const estimate = plan.visits * weight[id] / total;
      let n = Math.max(0, Math.round(previous ? (estimate * 2 + previous.sold + previous.missed) / 3 : estimate));
      if (id === 'liveSet') n = Math.min(Math.max(reserve,n), setLimit(day));
      for (const [ingredient, amount] of Object.entries(balance.menu[id].recipe)) {
        low[ingredient] += Math.max(0, n - 1) * amount;
        target[ingredient] += n * amount;
        if (id!=='liveSet') general[ingredient] += n*amount;
        high[ingredient] += (id==='liveSet'?Math.min(setLimit(day),n+1):n+1) * amount;
      }
    }
    const missing = Object.fromEntries(Object.entries(target).map(([id, n]) => [id, Math.max(0, n - state.stock[id])]));
    return { low, high, missing, cost: basketCost(missing), general, reserve };
  }

  function basketCost(basket) {
    return Object.entries(basket).reduce((cost, [id, n]) => cost + balance.ingredients[id] * n, 0);
  }

  function buyStock(state, basket) {
    const entries = Object.entries(basket);
    if (state.phase !== 'prep' || !entries.every(([id, n]) => Object.hasOwn(balance.ingredients, id) && count(n) && n <= 99)) return false;
    const cost = basketCost(basket);
    if (!cost || cost > state.money) return false;
    for (const [id, n] of entries) state.stock[id] += n;
    state.money -= cost;
    state.expense += cost;
    state.accounting.purchases += cost;
    return true;
  }

  function unlocked(state, id) {
    const item = items[id];
    if (state.week.owned[id]) return true;
    return state.day >= item.day && (item.unlock === 'first_close' ? state.week.firstClosed :
      item.unlock === 'special_close' ? state.day > 7 || state.day === 7 && state.phase === 'closed' : true);
  }

  function place(state, slot, id) {
    if (state.phase === 'open' || !Object.hasOwn(slots, slot)) return false;
    if (id === null) {
      delete state.week.placements[slot];
      state.week.undo = null;
      syncUpgrades(state);
      return true;
    }
    if (!validPlacement(slot, id) || !unlocked(state, id)) return false;
    const cost = state.week.owned[id] ? 0 : items[id].cost;
    if (cost > 0 && cost > state.money) return false;
    if (!state.week.owned[id]) {
      state.week.undo = { id, cost, placements: { ...state.week.placements } };
      state.week.owned[id] = true;
      state.money -= cost;
      state.expense += cost;
      state.accounting.equipment += cost;
    } else {
      state.week.undo = null;
    }
    for (const key of Object.keys(slots)) if (state.week.placements[key] === id) delete state.week.placements[key];
    state.week.placements[slot] = id;
    syncUpgrades(state);
    return true;
  }

  function syncUpgrades(state) {
    for (const [key, id] of Object.entries({ decor: 'windowLamp', machine: 'machine', seats: 'seats', display: 'display' })) {
      state.upgrades[key] = Number(has(state, id));
    }
  }

  function undo(state) {
    const txn = state.week.undo;
    if (!txn || state.phase === 'open') return false;
    delete state.week.owned[txn.id];
    state.week.placements = txn.placements;
    state.money += txn.cost;
    state.expense -= txn.cost;
    state.accounting.equipment -= txn.cost;
    state.week.undo = null;
    syncUpgrades(state);
    return true;
  }

  function close(state) {
    releaseReserve(state,true);
    if (!state.week.firstClosed) {
      state.week.photos.push({ day:state.day, alias:state.week.alias, placements:{ ...state.week.placements } });
    }
    state.week.firstClosed = true;
    const counts = {};
    for (const row of state.week.shift.ledger) {
      if (!row.menu) continue;
      const item = counts[row.menu] ||= { sold: 0, missed: 0 };
      if (row.reason === 'sold') item.sold++;
      else item.missed++;
    }
    state.week.yesterday = counts;
    if (state.day === 7) {
      state.week.owned.liveMemento = true;
      if (!state.week.photos.some(photo => photo.day === 7)) {
        state.week.photos.push({ day: 7, alias: state.week.alias, placements: { ...state.week.placements } });
      }
    }
    return balance.opening.dailyOverhead + Object.values(state.week.placements).reduce((sum, id) => sum + items[id].upkeep, 0);
  }


  function makeSeconds(state,id,machine=has(state,'machine')) {
    const spec=balance.menu[id];
    return Math.max(1,spec.seconds-Number(spec.station==='espresso'&&machine)+Math.floor(state.fatigue/balance.staff.slowAt));
  }
  function livePhase(state) {
    if(!live(state.day))return 'off';
    const before=Math.floor((5+(state.week.shift?.seconds||schedule(state.day).seconds)-3-10)/2);
    return state.tick<=before?'before':state.tick<before+10?'during':'after';
  }
  function liveAfter(state){if(livePhase(state)!=='after')return '';const rows=state.week.shift?.ledger||[],sold=rows.filter(x=>x.menu==='liveSet'&&x.reason==='sold').length;const id=sold?'sets':rows.some(x=>x.menu==='liveSet'&&x.reason==='price')?'price':rows.some(x=>x.menu==='liveSet'&&x.reason==='stock')?'stock':!state.enabled.liveSet?'off':'noSets';return '타키: '+text('taki.'+id,{count:sold});}
  function dayNotes(state) {
    const rows=state.week.shift?.ledger||[],result=[];
    const rain=rows.filter(x=>x.reason==='sold'&&x.moments?.includes('rain-window')).length;
    const sets=rows.filter(x=>x.reason==='sold'&&x.menu==='liveSet').length;
    if(rain)result.push('창가등 아래 빗소리를 들으며 쉬어 간 손님 '+rain+'명.');
    if(sets)result.push('공연 세트 '+sets+'개를 전달했어요.');
    const jun=rows.find(x=>x.reason==='sold'&&x.moments?.includes('jun-latte'));
    if(jun)result.push('준에게 라테를 전달했어요. 다음 방문의 기억으로 남아요.');
    const prices=rows.filter(x=>x.reason==='price');
    if(prices.length)result.push('가격을 보고 돌아간 주문 '+prices.length+'건. 메뉴별 기록에서 확인해 보세요.');
    const missing=Object.entries(state.failures.missing||{}).filter(([,n])=>n>0);
    if(missing.length)result.push('재료 부족 기록: '+missing.map(([id,n])=>({beans:'원두',milk:'우유',cake:'케이크',matcha:'말차'}[id])+' '+n+'건').join(' · ')+'.');
    return result.slice(0,2);
  }
  function quietLine(state){if(state.customers.length||state.workers.taki)return '';if(livePhase(state)==='after')return liveAfter(state);if(state.week.guestMemory?.jun?.lastServed==='latte')return '타키: '+text('taki.remember');const sold=Object.entries(state.menuHistory.today).filter(([,x])=>x.sold>0).sort((a,b)=>b[1].sold-a[1].sold)[0];return '타키: '+(sold?text('taki.sales',{menu:({coffee:'커피',latte:'라테',cake:'케이크',matcha:'말차 라테',liveSet:'공연 세트'}[sold[0]]),count:sold[1].sold,unit:/cake|liveSet/.test(sold[0])?'개':'잔'}):text('taki.idle'));}
  function facilityCompare(state,id) {
    if(id==='windowLamp')return '창가 손님 대기 '+balance.profiles.window.patience+' → '+(balance.profiles.window.patience+3)+'초 · 창가 방문 비중 +12%p (상한 적용)';
    if(id==='machine')return '현재 피로 기준 · '+menuIds.filter(menu=>balance.menu[menu].station==='espresso')
      .map(menu=>menuNames[menu]+' '+makeSeconds(state,menu,false)+' → '+makeSeconds(state,menu,true)+'초').join(' · ');
    return items[id]?.effect||'';
  }

  function nextAction(state) {
    const rows=state.week.shift?.ledger || [];
    const tally=reason=>rows.filter(row=>row.reason===reason).length;
    if (live(state.day) && state.enabled.liveSet) {
      const stock=rows.filter(row=>row.menu==='liveSet' && row.reason==='stock').length;
      if (stock) {
        const id=Object.keys(balance.menu.liveSet.recipe).find(key=>state.failures.missing[key]) || 'beans';
        return {kind:'stock',id,label:'공연 세트 재료 부족 '+stock+'건 · '+ingredientNames[id]};
      }
    }
    const [reason,n]=[['stock',tally('stock')],['wait',tally('wait')+tally('closing')],['price',tally('price')]]
      .sort((a,b)=>b[1]-a[1])[0];
    if (!n) return null;
    if (reason==='wait') return {kind:'work',id:'priority',label:'대기 중 놓친 주문 '+n+'건 · 업무 방식 확인'};
    if (reason==='stock') {
      const id=Object.keys(ingredientNames).filter(key=>state.failures.missing[key])
        .sort((a,b)=>state.failures.missing[b]-state.failures.missing[a])[0];
      return id ? {kind:'stock',id,label:'재료 부족 '+n+'건 · '+ingredientNames[id]} : null;
    }
    const counts=id=>rows.filter(row=>row.reason==='price'&&row.menu===id).length;
    const id=menuIds.slice().sort((a,b)=>counts(b)-counts(a))[0];
    const price=rows.find(row=>row.menu===id&&row.reason==='price')?.quotedPrice ?? state.prices[id];
    return {kind:'menu',id,label:menuNames[id]+' · ¥'+price.toLocaleString()+'에 '+counts(id)+'건 이탈'};
  }

  function dailyLine(state) {
    const plan=dayPlan(state);
    if (state.day===2 && morningSeen(state,'morning_window')) return plan?.window
      ? '타키: 창가 두 의자는 아침 그대로였어. 그림자는 먼저 퇴근했지만.'
      : '타키: 오늘은 평소처럼 열었어. 토모리가 오면 창가 자리부터 봐야지.';
    if (plan?.board) return state.menuHistory.today[plan.board]?.sold
      ? '타키: '+menuNames[plan.board]+' 나갔어. 아논, 별 그림 덕분이라고는 안 했어.'
      : '타키: '+menuNames[plan.board]+'는 못 건넸네. 내일 칠판은 다시 쓰면 돼.';
    const regular=state.week.shift?.ledger.find(row=>row.id===plan?.regular);
    if (regular) return regularNames[regular.regularId]+' · '+regular.reaction;
    return dayNotes(state)[0] || (live(state.day)?liveAfter(state):'');
  }

  function previousMenu(state) {
    const previous=state.menuHistory.yesterday;
    if (!previous) return null;
    const ranked=menuIds.filter(id=>previous[id]?.priceRejected||previous[id]?.sold);
    return ranked.sort((a,b)=>(previous[b].priceRejected||0)-(previous[a].priceRejected||0) ||
      (previous[b].sold||0)-(previous[a].sold||0))[0] || null;
  }

  return { makeSeconds, livePhase, liveAfter, dayNotes, quietLine, facilityCompare, init, valid, balance, stations, slots, items, profiles, reasons, has, schedule, live, available, setLimit,
    open, command, tick, recommendation, buyStock, basketCost, place, undo, unlocked, syncUpgrades, close,
    enough, alternate, switchOrder, cancel, guestGreeting, regularNames, modeHelp,
    dayPlan, planChoice, morningSeen, reservePreview, usable, firstWork, advancePlan, nextAction, dailyLine, previousMenu };
})();
