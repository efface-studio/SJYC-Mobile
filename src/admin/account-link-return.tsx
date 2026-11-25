import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { api, errorMessage } from '@/api';
import { SESSION_KEY } from '@/features/auth/session';
import { LoadingState, Screen } from '~/ds';
import { notify } from '~/shared/dialogs';
import { socialKey, takeSocialAttempt } from '~/user-kit/social-accounts';

export default function SocialReturn() {
  const { receipt } = useLocalSearchParams<{ receipt?: string }>();
  const cache = useQueryClient();
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const attempt = takeSocialAttempt();
    async function finish() {
      try {
        if (!attempt?.link || !receipt)
          throw new Error('인증이 취소되었거나 만료됐습니다. 다시 시도해 주세요.');
        const result = await api.auth.completeSocial({
          receipt,
          claim: attempt.claim,
        });
        if (!result.signedIn || result.needsProfile) throw new Error('연결을 확인하지 못했습니다.');
        const session = await api.auth.me();
        if (!session) throw new Error('로그인 상태를 확인할 수 없습니다.');
        cache.setQueryData(SESSION_KEY, session);
        await cache.invalidateQueries({ queryKey: socialKey(session.user.id) });
        router.replace('/more/account/social');
      } catch (err) {
        notify('소셜 계정 인증', err instanceof Error ? err.message : errorMessage(err));
        router.replace('/more/account/social');
      }
    }
    void finish();
  }, [receipt, cache]);
  return (
    <Screen>
      <LoadingState />
    </Screen>
  );
}
