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
      (m.lastMenu!==null&&!menuIds.includes(m.lastMenu)) || (m.lastServed!==null&&!menuIds.includes(m.lastServed)) || !Object.hasOwn(reasons,m.lastResult)))) return false;
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
    return state.enabled[id] && (id !== 'liveSet' || live(day) && (day !== state.day || (state.week.shift?.sets || 0) < setLimit(day)));
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
    return Object.entries(balance.menu[id].recipe).every(([k, n]) => state.stock[k] >= n);
  }

  function stat(state, id) {
    return state.menuHistory.today[id] ||= { offered: 0, sold: 0, priceRejected: 0 };
  }

  const narrative=(who,text)=>typeof ringPicoServiceText==='function'?ringPicoServiceText(who,text):text;
  function guestGreetingSource(state, guest) {
    const lines = regularLines[guest.regularId];
    const memory = state.week.guestMemory?.[guest.regularId];
    if (lines) {
      if (!memory?.visits) return lines.first;
      if (memory.lastResult === 'wait' || memory.lastResult === 'stock') return '지난번엔 못 먹었는데, 오늘은 괜찮겠죠?';
      if (memory.lastServed && memory.lastServed === guest.menu) return '지난번 주문이 괜찮았어요. 오늘도 같은 걸로 부탁할게요.';
      return lines.back;
    }
    return guest.takeout ? '포장으로 부탁해요.' : '여기서 먹고 갈게요.';
  }

  function guestGreeting(state,guest){return narrative(regularNames[guest.regularId]||'손님',guestGreetingSource(state,guest));}

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
    reaction=narrative(regularNames[guest.regularId]||'손님',reaction);
    if (Object.hasOwn(regularNames,guest.regularId)) {
      state.week.guestMemory ||= {};
      state.week.guestMemory[guest.regularId] = {visits:(previous?.visits||0)+1,lastDay:state.day,lastMenu:guest.menu||null,
        lastServed:reason==='sold'?guest.menu:previous?.lastServed??null,lastResult:reason};
    }
    shift.ledger.push({ id: guest.id, menu: guest.menu || null, reason, profile: guest.profile || 'general',
      takeout: !!guest.takeout, ...(moments.length?{moments}:{}), ...(guest.regularId?{regularId:guest.regularId}:{}), reaction, revenue: reason === 'sold' ? guest.price : 0, cost: guest.materialCost || 0 });
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
          if (state.stock[key] < n) state.failures.missing[key] = (state.failures.missing[key] || 0) + 1;
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
    if (first) {
      const id = state.nextId++;
      state.customers.push({ id, menu: 'cake', price: state.prices.cake, seat: 0, profile: 'general',
        status: 'waiting', patience: 26, maxPatience: 26 });
      stat(state, 'cake').offered++;
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
      state.workers.taki = { id, kind, remaining: seconds };
    } else {
      guest.status = 'serving';
      const seconds = guest.takeout && has(state, 'pickupShelf') ? 1 : !guest.takeout && guest.seat >= 5 ? 3 : 2;
      state.workers.taki = { id, kind, remaining: seconds };
    }
    if (state.week.nextJob?.id === id && state.week.nextJob.kind === kind) state.week.nextJob = null;
    return kind;
  }

  function candidates(state, profile, budget, preference, favorite) {
    const order = [...balance.profiles[profile].preference];
    if (schedule(state.day).type === 'rain' && profile !== 'fan') order.unshift('matcha');
    if (has(state, 'display') && profile !== 'fan' && preference < .25) {
      const i = order.indexOf('cake');
      if (i > 0) order.splice(i - 1, 0, ...order.splice(i, 1));
    }
    if (favorite && !(profile === 'fan' && available(state,'liveSet'))) order.unshift(favorite);
    const choices = [...new Set(order)].filter(id => available(state, id)).slice(0, 2);
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
    if (guest.menu === 'liveSet') state.week.shift.sets--;
    if (expected === 'liveSet') state.week.shift.sets++;
    guest.menu = expected;
    guest.price = state.prices[expected];
    guest.switched = true;
    stat(state,expected).offered++;
    if (state.week.nextJob?.id === id) state.week.nextJob = null;
    if (state.week.milkOrder === id) state.week.milkOrder = null;
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
    const { choices, pick } = candidates(state, arrival.profile, arrival.budget, arrival.preference,regular?.favorite);
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
    const patience = balance.profiles[arrival.profile].patience +
      (arrival.profile === 'window' && has(state, 'windowLamp') ? 3 : 0) +
      (regular ? Math.min(4, state.regulars[regular.id] || 0) : 0) + (state.nextPerk === 'patient' ? 4 : 0);
    state.customers.push({ id, menu: pick, price: state.prices[pick], seat, profile: arrival.profile, budget: arrival.budget,
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
    if (!coach) state.tick++;
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
    if (!close) {
      const next = startNext(state);
      if (next === 'make' || next === 'serve') events.push(next);
    }
    return { events, close };
  }

  function recommendation(state, day = state.day) {
    const plan = schedule(day);
    const availableMenus = menuIds.filter(id => state.enabled[id] && (id !== 'liveSet' || live(day)));
    const low = { beans: 0, milk: 0, cake: 0, matcha: 0 }, high = { ...low }, target = { ...low };
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
      if (id === 'liveSet') n = Math.min(n, setLimit(day));
      for (const [ingredient, amount] of Object.entries(balance.menu[id].recipe)) {
        low[ingredient] += Math.max(0, n - 1) * amount;
        target[ingredient] += n * amount;
        high[ingredient] += (id==='liveSet'?Math.min(setLimit(day),n+1):n+1) * amount;
      }
    }
    const missing = Object.fromEntries(Object.entries(target).map(([id, n]) => [id, Math.max(0, n - state.stock[id])]));
    return { low, high, missing, cost: basketCost(missing) };
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
  function liveAfterSource(state) {
    if(livePhase(state)!=='after')return '';
    const rows=state.week.shift?.ledger||[],sold=rows.filter(x=>x.menu==='liveSet'&&x.reason==='sold').length;
    if(sold)return '타키: 세트 '+sold+'개 전달했네. 공연 끝나도 조금 더 쉬다 가시겠지.';
    const price=rows.filter(x=>x.menu==='liveSet'&&x.reason==='price').length;
    const stock=rows.filter(x=>x.menu==='liveSet'&&x.reason==='stock').length;
    return price?'타키: 세트 가격을 보고 돌아간 손님이 있었지. 내일 메뉴판에서 확인하자.':
      stock?'타키: 세트 재료가 모자랐네. 다음 공연엔 먼저 챙겨 두자.':
      !state.enabled.liveSet?'타키: 오늘은 세트 없이 영업했네. 잔부터 정리하자.':'타키: 아직 세트 전달은 없네. 남은 주문부터 확인하자.';
  }
  function liveAfter(state){return narrative('타키',liveAfterSource(state));}
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
  function quietLineSource(state) {
    if(state.customers.length||state.workers.taki)return '';
    if(livePhase(state)==='after')return liveAfter(state);
    const memory=state.week.guestMemory?.jun;
    if(memory?.lastServed==='latte')return '타키: 준에게 라테를 낸 적 있었지. 우유 재고를 확인해 둘까.';
    const sold=Object.entries(state.menuHistory.today).filter(([,x])=>x.sold>0).sort((a,b)=>b[1].sold-a[1].sold)[0];
    return sold?'타키: 오늘은 '+({coffee:'커피',latte:'라테',cake:'케이크',matcha:'말차 라테',liveSet:'공연 세트'}[sold[0]])+'가 '+sold[1].sold+'개 나갔네. 잠깐 잔부터 정리하자.':'타키: 잠깐 한산하네. 다음 주문 전에 컵을 정리하자.';
  }
  function quietLine(state){return narrative('타키',quietLineSource(state));}
  function facilityCompare(state,id) {
    if(id==='windowLamp')return '창가 손님 대기 '+balance.profiles.window.patience+' → '+(balance.profiles.window.patience+3)+'초 · 창가 방문 비중 +12%p (상한 적용)';
    if(id==='machine')return '현재 피로 기준 · 커피 '+makeSeconds(state,'coffee',false)+' → '+makeSeconds(state,'coffee',true)+'초 / 라테 '+makeSeconds(state,'latte',false)+' → '+makeSeconds(state,'latte',true)+'초';
    return items[id]?.effect||'';
  }

  return { makeSeconds, livePhase, liveAfter, dayNotes, quietLine, facilityCompare, init, valid, balance, stations, slots, items, profiles, reasons, has, schedule, live, available, setLimit,
    open, command, tick, recommendation, buyStock, basketCost, place, undo, unlocked, syncUpgrades, close,
    enough, alternate, switchOrder, cancel, guestGreeting, regularNames, modeHelp };
})();
