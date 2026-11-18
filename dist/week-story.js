'use strict';

window.RingWeekStory = (() => {
  const lines = {
    tomori_note: [
      ['토모리','저기… 의자 밑에 종이가 떨어져 있었어.'],
      ['타키','잃어버린 물건인가. 접힌 채로 둘게. 안은 안 봤어.'],
      ['토모리','응. 구겨졌어도 누군가한텐 중요한 걸지도 몰라.'],
      ['타키','주인이 오면 모양부터 물어보자. 이 모서리, 조금 찢어졌네.'],
      ['토모리','나는 가끔 영수증 뒤에 말을 적어 둬.'],
      ['타키','토모리가 노랫말 적는 것처럼?'],
      ['토모리','응. 나중에 읽으면… 그때 생각하던 게 돌아와.'],
      ['타키','그럼 이쪽 분실물함에 넣자. 주인이 찾아오면 바로 알려 줄게.']
    ],
    anon_poster: [
      ['아논','릿키, 포스터 어디에 붙일까? 저 구석이면 아무도 못 보겠는데.'],
      ['타키','통로 한가운데는 안 돼. 손님들 지나가야 하니까.'],
      ['아논','그 정도는 알거든? 입구 벽이면 들어오자마자 보여.'],
      ['타키','무대 옆이면 공연 기다리는 사람도 읽을 수 있고.'],
      ['아논','오, 제법인데? 릿키, 한 번만 들고 서 봐.'],
      ['타키','왜 내가.'],
      ['아논','날짜가 가려지는지 보려고! …좋아, 둘 다 잘 보여.'],
      ['타키','그럼 한 곳 골라. 내가 잡고 있을 테니까 테이프 붙여.']
    ],
    rana_cup: [
      ['라나','이 컵, 좋은 소리.'],
      ['타키','길고양이, 그렇게 세게 치면 깨져.'],
      ['라나','안 두드렸어. 놓을 때 들었어.'],
      ['타키','…그랬어? 미안. 크기가 달라서 소리도 다르네.'],
      ['라나','릿키 드럼도 치는 데마다 달라.'],
      ['타키','그건 맞지. 정리 끝나면 아까 그 부분만 맞춰 보자.'],
      ['라나','응. 이 컵, 여기 둘게.'],
      ['타키','좋아. 높은 거랑 낮은 거 중에 하나만 꺼내 둬.']
    ],
    soyo_table: [
      ['소요','이쪽 테이블, 정리해도 될까? 잔만 남았어.'],
      ['타키','…쟁반만 부탁해. 나머지는 내가 닦을게.'],
      ['소요','응. 의자도 원래 자리로 돌려 놓을까?'],
      ['타키','그건 그대로 둬. 다음 공연 전에 예약한 손님이 같이 앉는대.'],
      ['소요','그렇구나. 빈자리면 누구라도 와도 되는 줄 알았어.'],
      ['타키','말해 두면 헷갈리지 않겠네. 예약 표식, 어디 있지?'],
      ['소요','여기. 빈자리인 채로 기다리는 것도 괜찮네.'],
      ['타키','응. 다음에 올 때 알아볼 수 있게 두자.']
    ]
  };
  const objects = {
    tomori_note: { key:'note', options:[['save','쪽지를 분실물함에']] },
    anon_poster: { key:'poster', options:[['entrance','입구에 붙이기'],['stage','무대에 붙이기']] },
    rana_cup: { key:'cup', options:[['short','낮은 컵'],['tall','높은 컵']] },
    soyo_table: { key:'reserved', options:[['mark','예약 표식 놓기']] }
  };
  const has = id => Object.hasOwn(lines,id);
  function definition(id, original, compact) {
    return compact && has(id) ? { ...original, lines:typeof ringPicoScripts!=='undefined'&&ringPicoScripts[id]?ringPicoLines(id,ringPicoScripts[id]):lines[id] } : original;
  }
  function markup(id, chosen) {
    const object=objects[id];
    if (!object) return '';
    return `<div class="week-vn-props" role="group" aria-label="장면 소품">${object.options.map(([value,label])=>
      `<button data-week-prop="${value}" aria-pressed="${chosen===value}">${label}</button>`).join('')}</div>`;
  }
  function choose(state,id,value) {
    const object=objects[id];
    if (!object?.options.some(option=>option[0]===value)) return false;
    state.week.memories[object.key]=value;
    if (id==='anon_poster') {
      state.week.owned.poster=true;
      if (state.phase!=='open') window.RingWeek.place(state,value,'poster');
    }
    return true;
  }
  function complete(state,id) {
    const object=objects[id];
    if (object && !state.week.memories[object.key]) choose(state,id,object.options[0][0]);
  }
  return { has, definition, markup, choose, complete, memoryKey:id=>objects[id]?.key };
})();

