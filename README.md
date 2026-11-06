# PROJECT RiNG — 버전 47 백업

2026-11-06에 사용자가 승인한 게임 버전의 복원 지점입니다. 게임 실행 파일·모든 이미지·타이틀 inst·카페 재즈·문서·회귀 검사를 포함합니다.

- 배포 사이트: https://project-ring-mygo-cafe.tsiba5021.chatgpt.site/
- Sites 원본 커밋: `3233c3521b4aa68067b44a62e110654c8f1d8e03`
- Git 태그: `v47`
- `dist/`와 `.openai/hosting.json`은 위 배포 원본 커밋을 그대로 추출했습니다.
- `backup-v47.json`에 모든 배포 파일의 SHA-256과 크기가 기록되어 있습니다.

## 실행

Node.js 20 이상이 필요합니다. 외부 npm 패키지를 설치할 필요는 없습니다.

```sh
git clone https://github.com/jengjunseo/NandeHaruhikageyattano.git
cd NandeHaruhikageyattano
git switch --detach v47
npm start
```

http://127.0.0.1:8765/ 를 열면 실행됩니다. 이미지·음원 경로를 위해 HTML 파일을 직접 여는 대신 HTTP 서버를 사용하세요. 다른 정적 호스팅에서는 `dist/`를 게시 루트로 사용합니다.

## 검증

```sh
npm test
```

배포 파일 해시 검증 후 JavaScript 문법과 46개 회귀 스크립트를 실행합니다(문법 포함 67개 검사). 원본 테스트에서 파일 경로만 이 저장소의 `dist/` 구조에 맞췄습니다.

## 포함된 변경

제공 그림의 타이틀, 수동 저장 5칸, 첫 대사 바로 시작, CG 선로딩·디코딩과 이미지 요소 재사용, inst/카페 재즈 전환, 좌우를 마주 보는 손님, 타키의 자리별 이동·전달·복귀를 포함합니다. 상세 기록은 [변경 내역](docs/V47-CHANGES.md)과 [개발 상태](docs/PROJECT-RING-STATUS.md)를 참고하세요.

## 저장 데이터와 음악

이 백업은 게임의 코드와 자산입니다. 개인 플레이 진행은 각 브라우저의 localStorage에 있으며 Git에 포함하지 않았습니다. 진행을 별도로 보관하려면 게임의 설정에서 '백업 내려받기'를 사용하세요.

게임 재즈는 Kevin MacLeod의 Bossa Antigua, CC BY 4.0입니다. [음악 크레딧](dist/assets/MUSIC-CREDITS.txt)과 [자산 출처](docs/ASSET-PROVENANCE.md)를 보존하세요. 타이틀 그림과 inst는 사용자 제공 원본입니다. 이 비공식 팬게임의 원작 캐릭터·제공 자산에 대한 제3자 권리를 새로 부여하는 백업이 아닙니다.

배포용 인증 토큰, 개인 세이브, 로컬 계정 파일은 포함하지 않았습니다. `.openai/hosting.json`은 기존 Sites 프로젝트 식별자와 정적 파일 디렉터리만 담고 있습니다.
