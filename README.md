# PROJECT RiNG — v52

MyGO!!!!! 비공식 팬 창작 카페 경영 게임입니다. `main`에는 2026-11-18 배포한 v52의 게임 코드·전체 자산·대본·문서·검사가 들어 있습니다.

- [배포 사이트](https://project-ring-mygo-cafe.tsiba5021.chatgpt.site/)
- 배포 원본 커밋: `42367573362bc8f9d4c3dccd1aba8865c6f5a78b` (Sites 저장소의 커밋이며 GitHub 커밋과는 별개)
- 현재 복원 지점: `v52`. 이전 복원 지점 `v47`도 유지합니다.
- [전체 대본](docs/STORY-BOOK.md) · [변경·검수 기록](docs/V52-CHANGES.md) · [자산 인벤토리](docs/V52-ASSETS.md)

## 실행

Node.js 20 이상을 사용합니다. 외부 패키지 설치는 필요하지 않습니다.

```sh
git clone https://github.com/jengjunseo/NandeHaruhikageyattano.git
cd NandeHaruhikageyattano
npm start
```

http://127.0.0.1:8765/ 를 엽니다. 정적 호스팅의 게시 디렉터리는 `dist/`입니다. 이미지와 음악 로딩을 위해 HTML 파일을 직접 열지 말고 HTTP 서버로 실행하세요.

## 포함된 변경

- Gemini 제공 대본으로 VN 110개, 저장 호환 대본 4개, 영업 대사 82종 교체. 장면 ID·등장 조건·선택지 효과 유지.
- 대화 버전 8: 구 대화의 중간 저장은 같은 장면의 새 첫 줄부터, 선택한 응답은 새 응답부터 이어집니다. 새 버전에서 저장한 대화 위치는 그대로 복원합니다.
- 새 SD 타키·손님, 카페 배경·쇼케이스·가구, 간결한 영업 준비, 하단 그라데이션 VN.
- 타이틀 그림·inst, 카페 재즈, 수동 저장 5칸, 기존 재료·메뉴·경영 진행 보존.

## 검증

```sh
npm test
```

`backup-v52.json`의 89개 배포 파일 해시를 먼저 대조하고 JavaScript 문법 30개와 회귀 검사 57개, 총 87개를 실행합니다. 과거 저장 이행에 필요한 Sites 코드 스냅샷은 `tests/fixtures/sites/`에 포함했으므로 원래 개발 폴더나 별도 Git 기록·접속 권한 없이 검사할 수 있습니다. 테스트 중 출력한 지표·대본 파일은 Git에서 제외합니다.

## 이전 버전 복원

```sh
git switch --detach v47
npm start
```

v52로 돌아오려면 `git switch main` 또는 `git switch --detach v52`를 사용합니다. `v47`의 코드·문서·검사는 해당 태그에서 그대로 확인할 수 있습니다. 루트의 `backup-v47.json`은 이전 배포 기록으로 남겼으며 현재 검사에는 `backup-v52.json`을 사용합니다.

## 저장 데이터·출처

GitHub에는 게임 소스와 자산을 보관합니다. 개인 플레이 진행은 브라우저의 localStorage에 있으며 포함하지 않았습니다. 진행을 옮기려면 게임 설정의 **백업 내려받기**를 사용하세요.

타이틀 그림과 inst는 사용자 제공 원본입니다. 카페 재즈는 Kevin MacLeod의 Bossa Antigua, CC BY 4.0이며 [음악 크레딧](dist/assets/MUSIC-CREDITS.txt)과 [자산 출처](docs/ASSET-PROVENANCE.md)를 보존하세요. 팬게임 백업이 원작 캐릭터나 제공 자산에 대한 제3자 권리를 새로 부여하지 않습니다.

`docs/V52-CHANGES.md`의 대본 교체 설명이 이전 시스템 문서의 ‘대사 번호를 유지한다’는 설명보다 우선합니다. v47에서 보존한 개발 상태·워크플로 문서는 당시 기록입니다.
