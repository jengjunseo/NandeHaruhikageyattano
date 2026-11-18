'use strict';

// These scenes take place before opening. The result-driven stories still use
// the existing close-of-shift queue and its bookmarks.
window.RingMorning = (() => {
  const fallback = 'morning_open_sign';
  const scene = (title, lines, when) => ({title, lines, when});
  const scenes = {
    morning_cups: scene('짝이 맞는 잔', [
      ['타키','컵이 하나 모자라. 어제 마지막에 쓴 사람 누구야?'],
      ['나','건조대 맨 안쪽에 하나 뒤집어 놨어.'],
      ['타키','…있네. 그럼 컵은 됐고, 오늘 팔 메뉴 좀 봐 줄래?']
    ]),
    morning_window: scene('창가 한 칸', [
      ['토모리','타키 쨩, 여기 앉아도 돼? 아직 문 열기 전이지.'],
      ['나','창가는 아직 닦는 중이야. 이쪽 자리 괜찮아?'],
      ['토모리','응. 여기서 보면 의자 그림자가 나란히 있어.'],
      ['타키','그럼 거기 있어. 창가 끝나면 내가 부를게.']
    ]),
    morning_board: scene('칠판의 빈 줄', [
      ['아논','릿키, 오늘 추천은 내 글씨로 써도 돼?'],
      ['타키','일단 뭘 팔 건지부터 정해야지. 어제도 써 놓고 지웠잖아.'],
      ['나','메뉴판 확인하면 알려 줄게. 한 줄만 남겨 둬.'],
      ['아논','한 줄이면 돼! 별은 글자 수에 안 들어가는 거지?'],
      ['타키','…작게 그려.']
    ]),
    morning_stools: scene('통로는 한 사람만', [
      ['소요','타키 쨩, 이 의자 빼면 쟁반 들고 지나가기 편하겠다.'],
      ['나','잠깐, 내가 쟁반 들고 지나가 볼게.'],
      ['타키','좋아. 거기서 돌아 봐. …됐네. 이만큼만 비워 두자.'],
      ['소요','응. 앉는 쪽에서도 가방 놓을 자리는 있겠어.']
    ]),
    morning_strings: scene('문 열기 전 한 소절', [
      ['라나','여기선 기타 소리가 짧아.'],
      ['타키','손님 오기 전이라 의자에 아무도 없으니까. 한 번만 더 해 봐.'],
      ['나','컵은 다 치웠어. 지금은 괜찮아.'],
      ['라나','그럼 두 번.'],
      ['타키','한 번이라니까. …마지막 음은 끝까지 들어 볼게.']
    ]),
    morning_live: scene('공연 전에 맡아 둘 일', [
      ['타키','공연 전에 무대 쪽도 봐야 해. 그때 주문 하나 밀리면 먼저 잡아 줄래?'],
      ['나','응. 세트 팔지 정하고 재료부터 볼게.'],
      ['타키','고마워. 이미 받은 세트는 접수를 닫아도 내야 하니까, 주문표는 따로 빼 두자.']
    ], 'live'),
    morning_live_line: scene('서로 다른 줄', [
      ['아논','오늘 공연 줄이 여기까지 오면 커피 줄이랑 섞이겠다.'],
      ['나','카운터 앞은 주문 줄로 비워 둘게.'],
      ['타키','그럼 무대 쪽 표시는 내가 붙일게. 바빠지면 먼저 만든 것부터 내보내자.']
    ], 'live'),
    morning_rain: scene('우산 끝의 물방울', [
      ['토모리','물방울이 발자국처럼 한 줄로 떨어졌어.'],
      ['나','입구에 수건 깔아 둘게. 잔은 안쪽에 놓으면 돼?'],
      ['타키','응. 따뜻한 음료 찾는 손님도 있을 테니 우유도 한번 확인해 줘.']
    ], 'rain'),
    [fallback]: scene('오픈 전, 카운터에서', [
      ['타키','왔어? 카운터는 닦아 뒀어.'],
      ['나','오늘 메뉴랑 재고 보고 올게.'],
      ['타키','그래. 준비되면 문 열자.']
    ])
  };
  function eligible(id, state, plan) {
    const when = scenes[id].when;
    return !when || (when === 'live' ? ['live','special'].includes(plan.type) : when === plan.type);
  }
  function sample(seed, day) {
    let n = (seed ^ Math.imul(day, 0x9e3779b9) ^ 0x52494e47) >>> 0;
    n = Math.imul(n ^ n >>> 16, 0x21f0aaad);
    n = Math.imul(n ^ n >>> 15, 0x735a2d97);
    return ((n ^ n >>> 15) >>> 0) / 4294967296;
  }
  function select(state, plan, random = sample) {
    const pool = Object.keys(scenes).filter(id => id !== fallback && eligible(id, state, plan) &&
      !state.stories.includes(id) && !state.week.queue.includes(id));
    return pool[Math.floor(random(state.week.seed, state.day) * pool.length)] || fallback;
  }
  function begin(state, plan, random) {
    if (state.week.morning?.day === state.day) return state.week.morning;
    return state.week.morning = { day: state.day, id: select(state,plan,random), source:'morning', status:'active' };
  }
  function repair(state) {
    const morning = state.week?.morning;
    if (morning?.status !== 'active' || morning.day !== state.day || Object.hasOwn(scenes,morning.id)) return;
    console.warn('RiNG: unavailable morning scene; using opening scene', morning.id);
    if (state.pendingStory?.id === morning.id) state.pendingStory = null;
    morning.id = fallback;
  }
  return { scenes, fallback, begin, repair, is:id=>Object.hasOwn(scenes,id) };
})();
