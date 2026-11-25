// 공유 API의 세션 복원 경로만 네이티브 기기의 로그인 유지 선택에 맞춘다.
import { Platform } from 'react-native';
import { api as base, ApiError, DEFAULT_MESSAGE, type ApiClient } from '@/api/index';
import { API_BASE_URL, IS_MOCK } from '@/config/env';
import type { Session } from '@/domain/types';
import { readPreference } from './device-preferences';

export * from '@/api/index';

function remembersLogin() {
  return !IS_MOCK && Platform.OS !== 'web' && readPreference('remember-login-off') === null;
}

async function rememberedSession(): Promise<Session | null> {
  let response: Response;
  try {
    response = await fetch(API_BASE_URL + '/auth/session/remember', {
      method: 'POST', credentials: 'include', headers: { Accept: 'application/json' },
    });
  } catch {
    throw new ApiError('NETWORK', DEFAULT_MESSAGE.NETWORK);
  }
  const result = await response.json().catch(() => null);
  if (response.status === 401 && result?.error?.code === 'UNAUTHENTICATED') return null;
  if (!response.ok || result?.success !== true || !result.data?.user?.id || !Number.isFinite(Date.parse(result.data.expiresAt))) {
    throw new ApiError('SERVER', DEFAULT_MESSAGE.SERVER);
  }
  return result.data;
}

export const api: ApiClient = {
  ...base,
  auth: {
    ...base.auth,
    me: () => remembersLogin() ? rememberedSession() : base.auth.me(),
    async login(input) {
      const keep = remembersLogin();
      const session = await base.auth.login(input);
      if (!keep) return session;
      // 로그인 직후 연결이 끊겨도 발급된 세션으로 계속하고 다음 복원 시 다시 연장한다.
      const confirmed = await rememberedSession().catch(() => session);
      if (!confirmed) throw new ApiError('UNAUTHENTICATED', DEFAULT_MESSAGE.UNAUTHENTICATED);
      return confirmed;
    },
  },
};
