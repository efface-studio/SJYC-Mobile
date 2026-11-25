import { confirmSession } from '~/shared/confirm-session';
import { useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef } from 'react';
import { api, errorMessage } from '@/api';
import { canEnterConsole } from '@/domain/permissions';

import { takeAdminClaim } from '~/admin-kit/social-login';
import { LoadingState, Screen } from '~/ds';
import { notify } from '~/shared/dialogs';
export default function AdminReturn() {
  const { receipt } = useLocalSearchParams<{ receipt?: string }>(),
    qc = useQueryClient(),
    started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    async function finish() {
      const claim = takeAdminClaim();
      if (!claim || !receipt) throw new Error('연결 요청이 만료되었거나 취소되었습니다. 다시 시도해 주세요.');
      const result = await api.auth.completeAdminSocial({ receipt, claim });
      if (result.needsLink) {
        router.replace('/oauth-link');
        return;
      }
      const session = await api.auth.me();
      if (!session || !canEnterConsole(session.user)) throw new Error('관리자 권한을 확인할 수 없습니다.');
      confirmSession(qc, session);
    }
    void finish().catch((e) => {
      notify('관리자 로그인', e instanceof Error ? e.message : errorMessage(e));
      router.replace('/login');
    });
  }, [receipt, qc]);
  return (
    <Screen>
      <LoadingState />
    </Screen>
  );
}
