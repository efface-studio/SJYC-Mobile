/**
 * 공개 환경 변수만 다룬다. NEXT_PUBLIC_* 값은 브라우저 번들에 그대로 포함되므로
 * OAuth client secret, AWS 키 등 비밀 값은 절대 여기에 두지 않는다 (서버에서만 관리).
 */
export type ApiMode = 'mock' | 'http';

// 웹(Next)은 NEXT_PUBLIC_*, 모바일(Expo)은 EXPO_PUBLIC_* 만 번들에 인라인된다 — 둘 다 리터럴로 읽는다
export const API_MODE: ApiMode =
  (process.env.NEXT_PUBLIC_API_MODE ?? process.env.EXPO_PUBLIC_API_MODE) === 'http' ? 'http' : 'mock';
export const IS_MOCK = API_MODE === 'mock';
/** 샘플 데이터로 운영하는 시연 서버 — 실서버(http)라도 데모임을 화면에 계속 표시한다 */
export const DEMO_DATA =
  IS_MOCK || (process.env.NEXT_PUBLIC_DEMO_DATA ?? process.env.EXPO_PUBLIC_DEMO_DATA) === '1';
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.EXPO_PUBLIC_API_BASE_URL ??
  ''
).replace(/\/$/, '');

if (API_MODE === 'http' && !API_BASE_URL) {
  throw new Error('NEXT_PUBLIC_API_MODE=http 에는 NEXT_PUBLIC_API_BASE_URL 이 필요합니다.');
}
