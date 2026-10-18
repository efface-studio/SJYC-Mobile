'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/api';
import type { Session } from '@/domain/types';

export const SESSION_KEY = ['session'] as const;
/** 가입 직후 인증 안내 화면에 이메일을 넘길 때 사용 (URL 에 개인정보를 싣지 않기 위해) */
export const PENDING_VERIFY_KEY = 'sjyc.pendingVerifyEmail';

/** 서버가 판단한 현재 세션. 권한 판단의 근거는 항상 이 값(서버 응답)이다. */
export function useSession() {
  return useQuery<Session | null>({
    queryKey: SESSION_KEY,
    queryFn: () => api.auth.me(),
    staleTime: 60_000,
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.auth.logout(),
    onSettled: () => {
      // 다른 사용자 데이터가 캐시에 남지 않도록 전부 비운다
      qc.clear();
      qc.setQueryData(SESSION_KEY, null);
    },
  });
}
