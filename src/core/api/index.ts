import { IS_MOCK } from '@/config/env';
import type { ApiClient } from './client';
import { httpClient } from './http';
import { mockClient } from './mock/client';

/** UI 는 이 객체만 사용한다. mock ↔ http 교체는 NEXT_PUBLIC_API_MODE 로만 한다. */
export const api: ApiClient = IS_MOCK ? mockClient : httpClient;

export type { ApiClient } from './client';
export * from './errors';
