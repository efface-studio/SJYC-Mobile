import { OAUTH_PROVIDER_LABEL } from '@/domain/labels';
import type { OAuthProvider } from '@/domain/types';
import { safeRedirect } from '@/lib/safe-redirect';
import { API_BASE_URL, IS_MOCK } from './env';

/**
 * 소셜 로그인 연동 경계.
 * - 인가 요청·state/nonce·PKCE·client secret·토큰 교환은 모두 서버가 담당한다.
 * - 프론트엔드는 서버의 시작 URL로 이동만 하고, 결과는 서버가 세션 쿠키를 발급한 뒤
 *   /login?error=... 또는 원래 경로로 돌려보낸다 (docs/api-contracts.md "OAuth").
 * - 서버에 실제로 설정된 공급자만 NEXT_PUBLIC_OAUTH_PROVIDERS 에 나열한다.
 */
export const OAUTH_PROVIDERS: OAuthProvider[] = ['kakao', 'naver', 'apple', 'google'];

const configured = new Set(
  (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? '')
    .split(',')
    .map((s: string) => s.trim())
    .filter(Boolean),
);

export interface ProviderState {
  provider: OAuthProvider;
  label: string;
  /** 서버 설정이 확인된 공급자만 true. mock 모드에서는 항상 false (성공을 흉내 내지 않는다). */
  enabled: boolean;
}

export function providerStates(): ProviderState[] {
  return OAUTH_PROVIDERS.map((provider) => ({
    provider,
    label: OAUTH_PROVIDER_LABEL[provider],
    enabled: !IS_MOCK && configured.has(provider),
  }));
}

export function oauthStartUrl(provider: OAuthProvider, next: string | null): string {
  const redirect = encodeURIComponent(safeRedirect(next, '/my'));
  return `${API_BASE_URL}/auth/oauth/${provider}/start?redirect=${redirect}`;
}

/** 서버가 /login?error=<code> 로 돌려보낼 때 사용하는 코드와 안내 문구 */
export const OAUTH_ERROR_MESSAGE: Record<string, string> = {
  oauth_cancelled: '소셜 로그인을 취소했습니다. 다시 시도하거나 다른 방법으로 로그인해 주세요.',
  oauth_denied: '필수 정보 제공에 동의하지 않아 로그인할 수 없습니다.',
  oauth_expired: '로그인 요청 시간이 만료되었습니다. 처음부터 다시 시도해 주세요.',
  oauth_account_exists:
    '이미 같은 이메일로 가입된 계정이 있습니다. 기존 방법으로 로그인한 뒤 내 정보에서 소셜 계정을 연결해 주세요.',
  oauth_failed: '소셜 로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.',
  session_expired: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
};
