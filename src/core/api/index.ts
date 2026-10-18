import { IS_MOCK } from '@/config/env';
import type { ApiClient } from './client';
import { withLogging } from './devlog';
import { httpClient } from './http';
import { mockClient } from './mock/client';

/**
 * UI 는 이 객체만 사용한다. mock ↔ http 교체는 NEXT_PUBLIC_API_MODE 로만 한다.
 * 호출 기록(메서드·시간·결과)은 개발자 도구의 API 요청 로그에 남는다.
 */
export const api: ApiClient = withLogging(IS_MOCK ? mockClient : httpClient);

export type { ApiClient } from './client';
export * from './errors';
export { apiLog, type ApiLogEntry } from './devlog';
