# 생성 자산 기록

## 타키 영업용 SD 스프라이트

- 파일: `assets/taki-chibi.png`
- 생성 방식: 내장 이미지 생성 도구, 투명 배경 요청.
- 참조 1: 사용자가 제공한 타키 원본 `image-5.png` (헤어스타일, 눈, 귀걸이 등 인물 식별 요소).
- 참조 2: 기존 프로젝트의 `assets/taki.png` (카페 의상과 게임 안에서의 외형 일관성). 기존 스탠딩도 사용자 제공 원본을 기반으로 생성한 팬 창작이다.
- 생성 요청: “Use case: stylized-concept. Asset: transparent 2D cafe-management game character sprite. Reference 1 is the user's original image of Shiina Taki: faithfully preserve her dark brown long straight hair and bangs, purple eyes, face and distinctive long silver earrings. Reference 2 is the game's existing Taki standing illustration: match its white high-neck blouse, dark plum apron and long skirt. Create a single full-body super-deformed chibi version of that same character, approximately 3 heads tall, facing slightly toward camera, arms at her sides in a neutral working stance. Her expression is focused and reserved. Clean hand-painted anime game art, clear silhouette at small screen size, flat front lighting, full hair and shoes visible, transparent background, no shadow outside the figure. No text, no border, no props, no duplicate figure, no sprite sheet.”
- 검수 범위: 원본 이미지와 주요 외형·의상을 대조하고 PNG 알파 채널을 확인했다. 공식 자산이 아닌 생성 시안이며 데스크톱 브라우저의 준비·영업 화면에서 이미지 로딩과 작은 크기의 형태를 확인했으며, 작업 상태에 따라 제조·서빙 클래스를 전환한다. 검수 환경은 움직임 줄이기가 켜져 애니메이션을 실제 눈으로 확인하지 못했다. 인물의 원작 일치도는 추가 검수가 필요하다.


## 케이크 진열대 설치 배경

- 파일: `assets/cafe-display-upgraded.png`. 기존 `assets/cafe.png`를 내장 이미지 생성 도구에 직접 참조로 제공하여 진열대만 금색 장식과 다양한 디저트가 있는 설비로 바꾼 이미지다.
- 기존 카페의 시점·구도·나머지 설비를 유지해 달라고 요청했다. 생성 이미지이며 공식 배경이 아니다. 두 이미지를 대조한 결과 대부분의 구도가 유지되고 기존 진열대가 같은 자리에 업그레이드된 것으로 표현되었다.
- 실제 게임에서는 진열대 구매 후 영업 공간 배경만 전환한다. VN 장면 배경은 기존 카페 이미지를 유지한다.

## 일반 손님 SD 이미지

- 파일: `assets/visitor-teal.png`, `assets/visitor-rust.png`.
- 내장 이미지 생성 도구로 제작한 독창적인 일반 손님이다. 기존 `assets/taki-chibi.png`는 SD 비율·채색의 스타일 참조로만 제공했고, 원작 등장인물이나 공식 자산으로 설정하지 않았다.
- 손님의 주문 ID와 단골 ID를 이용해 두 이미지를 배정하며, 같은 손님의 상태 변화에는 기존 요소를 유지한다. 이미지 로딩에 실패해도 '손님' 표시와 주문 이름·상태·선택 기능이 남는다.
- 알파 채널과 코드상 자산 경로·실패 대체 표시를 확인했다. 게임 화면에 놓였을 때의 크기·배경 조화·기기별 터치 영역은 아직 실제 브라우저에서 검수하지 못했다.

## 창작 단골의 VN·영업 이미지

- 하루: 영업 이미지 `assets/visitor-teal.png`를 인물 외형 참조로, 타키 VN 이미지 `assets/taki.png`를 비율·채색 참조로 제공해 `assets/haru-vn.png`를 생성했다.
- 준: 영업 이미지 `assets/visitor-rust.png`를 인물 외형 참조로, 타키 VN 이미지를 화풍 참조로 제공해 `assets/jun-vn.png`를 생성했다.
- 메이: 타키 VN 이미지는 화풍 참조로만 제공하고 새 창작 인물 `assets/mei-vn.png`를 생성했다. 그 VN 이미지를 외형 참조로 사용해 영업용 `assets/visitor-mei.png`를 생성했다.
- 세 사람은 이 게임에만 등장하는 창작 손님이며 원작에 등장하는 캐릭터나 공식 이미지가 아니다. 타키 및 MyGO!!!!! 인물들의 원본 참조 요구를 이 창작 손님에게 대체 적용한 것이 아니다.
- 이미지 생성 결과의 외형과 알파 채널, 게임 코드의 연결·두 인물 동시 표시를 확인했다. 실제 VN 장면과 영업 화면의 크기·배치는 아직 브라우저 실화면 검수가 필요하다.

## 2026-11-06 메뉴 아이템 세트

`assets/menu-atlas.png`: 내장 ImageGen, 새로운 오리지널 아이템 그림. 1536×1024, 동일한 512×512 셀의 3열2행. 커피·카페 라테·딸기 쇼트케이크 / 말차 라테·커피와 케이크 공연 세트·크라프트 원두 봉투. 투명 알파를 유지하며 CSS에서 동일 셀 비율로 표시한다. 생성 프롬프트는 PROJECT-RING-STATUS.md의 이번 개편 기록에 보존했다. 기존 인물·배경은 수정하지 않았다.

## 2026-11-06 — 사복·코믹 VN 개편

- 사용자가 추가 제공한 사복 그림을 직접 이미지 생성의 참조로 사용했다. MyGO!!!!! 5명 각각 4프레임 투명 표정·포즈 아틀라스(1792×896, 정확한 4열, 머리~무릎)를 새로 제작했다. 개별 파일은 `assets/casual/taki.png`, `anon.png`, `rana.png`, `tomori.png`, `soyo.png`이다. 같은 셀 비율을 CSS에서 표시하며 이미지 픽셀을 임의로 재편집하지 않았다. 화면에서는 얼굴·의상·프레임 정렬과 투명 가장자리를 검수했다.
- 타키는 제공된 흰 셔츠·베이지 앞치마, 아논은 회색 체크 원피스·아이보리 블라우스, 라나는 검정 와이드넥 티와 흰 레이어, 토모리는 크림·남색 후드와 데님 반바지, 소요는 하늘색 프릴 블라우스·크림 꽃무늬 치마를 사용한다. 타키의 영업용 그림도 같은 앞치마로 교체했다. 카메오·창작 단골은 이번 MyGO 사복 교체 대상이 아니다.
- 내장 ImageGen을 사용했다. 공통 프롬프트는 `identity-preserve, production visual novel emotion atlas, 2:1 landscape, four equal cells, same character head-to-knees with aligned scale, exact supplied casual clothing and face, natural asymmetric posture and hands, delicate Japanese anime cel shading, transparent background, no text/background/cell overlap`이다. 캐릭터별 프롬프트의 상태는 타키: 피곤·분노·놀람·부드러운 미소 / 아논: 기본·장난·놀람·윙크 / 라나: 기본·호기심·파르페·미소 / 토모리: 기본·미소·당황·놀람 / 소요: 기본·의미심장한 미소·걱정·웃음이다. 각 인물의 실제 사용자 레퍼런스를 함께 첨부했다. 참조 원본은 work/casual-vn/references에 보존했다.
- 감정 기호 `assets/casual/emotes.png`도 내장 ImageGen으로 제작했다. 프롬프트: `transparent manga comedy emotion atlas, 4 columns×2 rows, equal cells and padding, red anger mark / blue sweat / yellow surprise rays / lavender gloom, white puff / pink musical notes / sleepy Z / heart sparkle, clean readable anime line art, no people/text/background`.
- `assets/taki-chibi.png` 교체 프롬프트: 제공 타키 앞치마 그림을 identity reference로 사용, long dark brown hair/purple eyes/white rolled-sleeve shirt/beige tied café apron/dark skirt/loafers, single full body transparent game sprite, focused tired expression, natural slightly angled pose, no text/scenery/ground shadow. 생성 결과는 약 4~5등신이며 Live2D가 아닌 정적인 이미지다.

## 2026-11-06 — 타이틀 원본·음악

- 타이틀 `assets/title-screen.png`는 사용자가 제공한 `file_00000000a8b08209be21c81743ec801d.png`를 바이트 변경 없이 복사했다. SHA256 `ea3f065b31afb3202f514598e605be897210f4f3b07023171b992d522c7ea63d`.
- `assets/title-inst.mp3`는 사용자 제공 `미성규 inst.mp3`의 원본 복사. SHA256 `601c188fe9b67449284d1ff44ff79b8c6ecb118a4e39c03ef09d2ee44feb3af0`.
- 게임 재즈 `assets/cafe-jazz.mp3`: Kevin MacLeod, Bossa Antigua, ISRC USUAN1700069. 공식 incompetech.com의 트랙 정보·다운로드를 2026-11-06 확인했다. CC BY 4.0 무료 이용 조건에 따라 저작자·곡명·트랙 링크·라이선스를 게임 설정과 음악 메뉴 및 `assets/MUSIC-CREDITS.txt`에 표시한다. MP3는 편집하지 않았고 반복 재생·플레이어 음량만 적용한다. SHA256 `322103dd6ac5fae4872122f91d32cccd4d964b86d300585a5a0cdfaf7048af5d`.
- 이번 타이틀·재즈·손님 방향 및 서빙 배치 변경에서는 새 이미지를 생성하거나 픽셀을 편집하지 않았다. 캐릭터 방향은 CSS 반전으로 처리하고 말풍선은 반전하지 않는다.
