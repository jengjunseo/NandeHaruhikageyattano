# 현재 개발·게시 흐름

1. `app/`에서 소스와 대본을 편집한다. 표정·thought·beat ID는 comedy-stories.js의 명시적 메타데이터, 영업 반응은 service-lines.js의 ID를 사용한다.
2. `npm ci` 후 `npm test`로 문법·저장·현 경영 엔진·과거 호환·대본·이미지 예산을 검사한다.
3. `npm run build` 후 `npm run verify-build`를 실행한다. 생성 폴더는 정확히 저장소 안의 dist로 제한한다. 원본 자산은 app에 보존한다.
4. `npm run test:browser`는 사전에 설치한 Playwright 브라우저가 필요하다. CI는 고정 Actions SHA와 잠금 파일로 설치하고 Chromium/Firefox/WebKit을 검사한다. 로컬 브라우저 실행을 기본 테스트에 몰래 포함하지 않는다.
5. Actions의 release artifact와 dist/build-manifest.json의 build ID·파일 해시를 확인한다. 테스트, 보존 스냅샷 검사, 현재 빌드 무결성 검사는 별도 명령이다.
6. Sites 게시자는 같은 dist와 기존 .openai/hosting.json을 패키징·버전 저장·원자적으로 배포한다. 인증 정보는 저장소·artifact에 포함하지 않는다. CI가 임의로 공개 배포하지 않는다.
7. 게시 후 버전과 핵심 화면을 확인하고 v53 같은 복원 태그를 남긴다. 되돌릴 때는 태그의 코드와 해당 dist를 함께 사용한다. 개인 진행은 별도로 내보내야 한다.

과거 PROJECT-RING-WORKFLOW.md는 당시 개발 환경의 기록이며 현재 명령 안내는 이 문서를 따른다. 외부 action은 고정 커밋, 기본 토큰 권한은 contents:read, checkout의 credential 저장은 끈다.
