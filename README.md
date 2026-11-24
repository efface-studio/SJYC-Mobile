# SJYC Mobile — 중구청소년센터 네이티브 앱 (iOS · Android)

한 코드베이스에서 **사용자 앱**과 **관리자 앱** 두 개를 만든다 (Expo SDK 57, expo-router, React Native 0.86).

| 앱     | 실행                                                                  | 번들 ID                    | 라우트      |
| ------ | --------------------------------------------------------------------- | -------------------------- | ----------- |
| 사용자 | `npm run start` / `npm run ios` / `npm run android`                   | `studio.efface.sjyc`       | `src/user`  |
| 관리자 | `npm run start:admin` / `npm run ios:admin` / `npm run android:admin` | `studio.efface.sjyc.admin` | `src/admin` |

`APP_FLAVOR=admin` 이 라우트 폴더·앱 이름·번들 ID 를 바꾼다(`app.config.ts`). 두 앱을 한 기기에 함께 설치할 수 있다.

## UI 구성

- **OS 기본**: 하단 탭 바(`expo-router/unstable-native-tabs` — iOS 26+ Liquid Glass, Android Material 3), 네이티브 스택 헤더·큰 제목·검색창, `Alert`·iOS 액션 시트·`Alert.prompt`, `Switch`, 날짜 선택기(UIDatePicker / Material 다이얼로그), 당겨서 새로고침, SF Symbols / Material Symbols
- **화면 본문**: 디자인 시스템 `src/ds` — Pretendard, 토큰(라이트/다크, AA 대비), `Screen`·`ListRow`·`Card`·`Badge`·`Button`·`Chips`·`Photo`(expo-image)·`TextField`·`SelectField`(iOS 액션 시트 / Android 바텀 시트)·`DateField`·`SwitchRow`·`StickyFooter`
- 사용자 앱 보조 컴포넌트 `src/user-kit`, 관리자 앱 보조 컴포넌트 `src/admin-kit`

## 코드 공유

`@/*` 는 `src/core/*` 를 가리킨다. `src/core` 는 웹 저장소 [efface-studio/SJYC-Client](https://github.com/efface-studio/SJYC-Client)의 도메인 타입·API 계약(`api`)·검증 스키마·mock adapter 복사본이다.

```bash
# SJYC-Client 를 이 저장소 옆(../SJYC-Client)에 두거나 SJYC_CLIENT_DIR 로 지정
npm run sync:core
```

원본은 웹 저장소이므로 `src/core` 를 직접 고치지 않는다. UI 코드는 공유하지 않는다.

## 데이터 모드

기본은 개발용 mock(웹과 같은 샘플 데이터, 앱 메모리에만 저장). 홈·상세 화면에 "개발용 데모" 표시가 나온다.
정식 사용자·관리자 앱은 `eas.json`의 `production`, `production-admin` 프로필을 사용하며 `https://sjyc.efface.dev/api/v1`에 연결합니다.
샘플 데이터로 운영하는 시연 서버에 붙일 때는 `EXPO_PUBLIC_DEMO_DATA=1` 을 함께 주면 http 모드에서도 데모 표시·샘플 안내·데모 계정 입력이 나온다.
세션은 서버 HttpOnly 쿠키(React Native 네이티브 쿠키 저장소)를 전제로 한다. 앱 전용 토큰 방식이 필요하면 서버 설계 때 결정하고 `src/api/http.ts` 어댑터만 바꾼다.

## 검증

```bash
npm run typecheck
npm run doctor
npm run export:user
npm run export:admin
```

- iOS 빌드는 Xcode 26 이 있는 macOS 또는 EAS Build(`eas build -p ios --profile development`) 가 필요하다. Liquid Glass 탭 바는 iOS 26 SDK 로 빌드해야 나타난다.
- 로컬 서버에 붙여 iOS 시뮬레이터로 확인: 시뮬레이터는 Mac 의 `localhost` 에 그대로 닿는다.
  `EXPO_PUBLIC_API_MODE=http EXPO_PUBLIC_API_BASE_URL=http://localhost:4000/api/v1 EXPO_PUBLIC_DEMO_DATA=1 npm run ios` (관리자 앱은 `ios:admin`)
- 저장소 경로에 한글 등 ASCII 가 아닌 문자가 있으면 `pod install` 이 Ruby 인코딩 오류(`incompatible character encodings: BINARY (ASCII-8BIT) and UTF-8`, hermes-engine.podspec)로 실패한다.
  ASCII 경로에 두는 것이 가장 간단하고, 그대로 쓸 때는 `LANG=en_US.UTF-8` 과 함께 `HERMES_ENGINE_TARBALL_PATH` 에 React Native 가 받아 둔 Hermes tarball(`~/Library/Caches/ReactNative/hermes-ios-<버전>-debug.tar.gz`)을 지정한 뒤 `cd ios && pod install` 한다.
- Android: `npm run android` (에뮬레이터 또는 기기 필요), 빌드만 확인하려면 `npx expo prebuild -p android` 후 `cd android && ./gradlew assembleDebug`.

## 범위 메모

- 사용자 앱: 홈, 프로그램 조회·신청·달력, 공간 예약, 동아리 소개·가입, 공지·문의·알림, 갤러리, 정책 문서, MY(신청·예약·동아리 내역, 출석 코드 입력·내 출석 기록, 회원 정보·탈퇴).
- 관리자 앱: 대시보드, 프로그램 신청·공간 예약·동아리 가입 승인/반려, 문의 답변, 공지·프로그램·공간·동아리(담당자 지정 포함)·FAQ·정책 문서 편집, 회원 역할/상태 변경(개발자 역할은 개발자만), 출석부(출석 코드), 감사 로그, 개발자 도구(개발자만).
- 동아리 담당자: 관리자 앱에 로그인하면 하단 탭이 `동아리 운영` 하나로 바뀌고, 담당 동아리의 회원·가입 신청·출석·소식·소개만 관리한다.
- Android 에는 OS 기본 텍스트 입력 다이얼로그가 없어 반려 사유는 별도 입력 화면으로 받는다.
