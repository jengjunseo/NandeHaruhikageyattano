# v52 시스템 조사와 정리
기준 소스: v51 13712ef5fa0c0e2a3b732f083644fbd1757ef20a. 현재 주 작업 폴더 outputs/project-ring.
표시는 cafe-presentation.js와 cafe-v52.css, 아트는 cafe-sprites.js로 분리했다. 새 뷰 상태는 저장에 넣지 않으며 경제·진행 속성은 그대로 유지한다.

|기능|함수/호출부·실제 상태|저장|화면·검사|분류/이유|
|---|---|---|---|---|
|영업 전이|game openDay/tick/closeDay/nextDay, RingWeek.open/tick/close|phase/day/tick/week.shift|문 열기·영수증 / first-week, v51-cafe|유지: 하루 순환의 기준|
|시간·배속|simulation-clock.create → game tick, simulationPaused|simSpeed; 누적 벽시계는 저장하지 않음|1×/2×·정지 / v51-cafe, accessibility-pause|유지: 이미 하나의 시계, 새 타이머 없음|
|주문·예약|RingWeek.command/startNext/terminal/cancel|customers/workers/week.nextJob/shift.ledger|주문표·픽업 / order-boundary, first-week|유지. 기기 라벨 3개와 전용 station 선택 처리 제거; 같은 기능은 주문표 제조 버튼으로 통합|
|업무 5모드|RingWeek.startNext, state.priority|manual/pickup/make/serve/rest|접힌 업무 방식 / v51-cafe 5모드|표시만 간소화. 픽업은 제조 지시 필요, 제조 우선은 픽업 용량·인내 반영, 서빙 우선은 완성품 우선, 휴식은 피로 회복이므로 서로 중복 아님|
|재고·판매|RingWeek.command/terminal, makeSeconds|stock/accounting/served/revenue/failures|현재 주문·펼친 현황 / accounting, cancel|유지: 제조 시 재료, 전달 시 매출 각각 한 번|
|메뉴|setPrice/toggleMenu/RingWeek.candidates|prices/enabled/menuHistory|준비하기→메뉴판 / menu-history, menu-breadth|표시만 간소화. 가격·레시피·조건·전일 기록 유지|
|발주|RingWeek.recommendation/buyStock, week-view cart|stock/money/accounting; 장바구니는 뷰 상태|준비하기→발주 / bulk-buy, stock-recommendation|유지: 추천 입력과 결제 분리. 첫 화면의 양식만 접음|
|현금·손익|closeDay + accounting|money/purchases/equipment/soldCost/lostCost/overhead/loanPaid|영수증·상세 / accounting, major-patch|유지. 상단은 날짜·현금 한 줄, 상세 숫자는 업무 현황/정산|
|가구|RingWeek.place/undo/has/syncUpgrades|week.owned/placements/undo/upgrades|준비하기→꾸미기 / first-week, v51-cafe|유지. 소유·배치를 삭제하지 않고 새 그림/배경에 표시; 진열대는 새 업그레이드 배경으로 전환|
|단골·관계|guestGreeting/terminal/dayNotes/liveAfter|week.guestMemory, ledger.moments|주문·반응·정산 / v51-cafe|유지: 실제 라테, 비+설치+전달, 공연 세트의 조건|
|아침·마감|RingMorning.begin/repair, afterShiftStory|week.morning/queue/pendingStory/bookmarks/stories|자동 아침·대기 중 이야기 / major-patch, story-flow|유지: 후보0/1/다수·선행·날씨·회상 부작용 검사 그대로|
|VN|drawStory/vnInput/showVnLog/titleLoad|pendingStory index/contentVersion, 선택·읽음, 글자 설정|하단 그라데이션·로그 / vn-gesture, choice-replay, v52-render|표시만 간소화: 생각 연출 데이터는 유지, 이름 옆 속마음 배지만 제거|
|저장·복원|validSavedState/validBackupState/RingSaveGuard/titleLoad|기존 KEY, schemaVersion1, 수동5슬롯|메뉴→저장·불러오기 / backup, pending-save, v52-render|유지: 새 필드나 모드 매핑 없음. v51 스냅샷 그대로 이행|
|오디오|RingAudio + music.js + title adapter|sound/volume/기존 BGM 설정|메뉴→설정 / music, refresh-audio|유지: inst/재즈/기존 효과음, 새 연주·합성 음성 없음|
|아트 로딩|RingAssets.load/ensure/hydrate|없음|타이틀 준비/SD fallback / asset-cache, v52-asset|실제 통합: 새 아트도 기존 캐시 1개 사용. 새 아트5종 실패만 안전하게 기존 그림으로 대체|
|화면 레이아웃|RingCafePresentation.selectTab/render/close|없음: panel은 임시 뷰 상태|준비 첫 화면 두 행동, 관리 닫기 / v52-view|실제 통합: 중복 준비 진입 5개→문 열기/준비하기. 상세·스토리는 요청 시|
|반복 표시 갱신|game renderStats, experience lastStock + stockDock.onclick|없음|상단·재고 / v52-render|실제 통합: 변하지 않은 헤더/재고 DOM 재작성 방지. 재고 버튼 이벤트는 mount 1회 위임|
|구버전 자산·CSS|기존 이미지/스타일 경로와 legacy save 흐름|이전 저장·스토리 참조 있음|이미지 실패·구버전 / 기존 전체 테스트|유지: fallback/이전 경로가 실제 참조하므로 임의 삭제하지 않음|

## 정리 전후 검증
- 제거: 3개 기기 클릭 마커, action=station 분기와 station() 함수. 제조 수치는 바뀌지 않으며 주문표의 직접 제조/예약으로 대체한다. 관련 초기 안내도 주문표 기준으로 수정했다.
- 숨긴 것이 아닌 기능 삭제: 없음. 수동 슬롯, 메뉴, 발주, 5모드, 가구/성장, 회상, 지원금, 정산 상세와 경제 규칙은 사용 가능하다.
- UI 상태(panel/접힘)와 SD 표시 상태는 저장에 추가하지 않는다. 날짜/세션/영업 단계 전환 시 뷰만 안전하게 초기화한다.
- 새 엔진 interval/RAF 타이머 없음. 기존 시뮬레이션 1개를 그대로 사용한다. SD 걷기는 CSS 2프레임; 휴식/피로/성공/제조/전달도 실제 상태로 결정한다.
- 기존 stockDock 버튼 매 렌더 재바인딩을 mount의 onclick 1개로 대체했다. 기존 document audio unlock/키보드/visibility 리스너는 중복 추가하지 않았다.
- 같은 Node VM·가짜 DOM에서 정지 상태 render 500회: 상단 innerHTML 쓰기 v51 500회 → v52 0회. 이후 돈 변경 시 정확히 1회 갱신. work/v52-render-metrics.json 참조. 실제 브라우저 FPS/CPU·메모리 감소율은 측정하지 않았다.
- 새 PNG 5종 총 7,610,830바이트 추가. 구 자산은 fallback으로 보존하므로 총 다운로드/패키지는 증가한다. ‘로드가 빨라졌다’는 주장을 하지 않는다.

