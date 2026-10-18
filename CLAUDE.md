# CLAUDE.md

이슈·브랜치·커밋·PR·라벨·CI 규칙은 efface-studio 공통 규칙(AI-Markdown `CLAUDE.md`)을 따른다.
커밋 형식 `<gitmoji> (<type>) #<issue> :: <message>`, Claude 서명 금지, 병합은 `xixn2` 만.

## 프로젝트 컨텍스트

- **프로젝트명**: SJYC-Mobile (서울시 중구청소년센터 네이티브 앱 — 사용자 앱 + 관리자 앱, iOS · Android)
- **스택**: Expo SDK 57, expo-router, React Native 0.86, React 19.2, TypeScript strict, TanStack Query 5, Zod 4, @expo/ui, expo-image, Pretendard, npm(package-lock)
- **주요 명령어**:
  - 개발: `npm run start` (사용자 앱) / `npm run start:admin` (관리자 앱)
  - 네이티브 실행: `npm run android` · `npm run ios` (+ `:admin`)
  - 검증: `npm run typecheck && npm run doctor && npm run export:user && npm run export:admin`
  - 공유 코드 동기화: `npm run sync:core`
- **기본 브랜치**: `main`
- **배포**: EAS Build 프로필은 `eas.json` (development / preview / production, `-admin` 변형)
- **기타 규칙**:
  - `APP_FLAVOR=user|admin` 이 라우트 폴더(`src/user` · `src/admin`)·앱 이름·번들 ID 를 바꾼다. flavor 를 바꾸면 Metro 캐시를 지운다.
  - `src/core` 는 웹 저장소(efface-studio/SJYC-Client)의 공유 코드 복사본이다 — 직접 고치지 말고 웹에서 고친 뒤 `npm run sync:core`.
  - 화면 본문은 디자인 시스템 `src/ds` 로, 탭 바·헤더·검색창·Alert·액션 시트·Switch·날짜 선택기는 OS 기본 컴포넌트로 만든다.
  - 사용자 앱 보조 코드는 `src/user-kit`, 관리자 앱은 `src/admin-kit`.
  - `EXPO_PUBLIC_*` 에 비밀 값을 넣지 않는다. 기본은 mock 모드이며 데모 데이터임을 화면에 표시한다.
  - 공식 채널에서 가져온 사진은 출처를 보관하고, 미성년자 얼굴이 식별되는 사진은 쓰지 않는다.
