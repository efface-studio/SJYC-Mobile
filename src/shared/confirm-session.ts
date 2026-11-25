import type { QueryClient } from '@tanstack/react-query';
import { SESSION_KEY } from '@/features/auth/session';
import type { Session } from '@/domain/types';

/** 로그인보다 먼저 시작된 게스트 조회의 응답이 새 로그인 상태를 덮어쓰지 않도록 한다. */
export function confirmSession(cache: QueryClient, session: Session) {
  void cache.cancelQueries({ queryKey: SESSION_KEY, exact: true }, { revert: false });
  cache.setQueryData(SESSION_KEY, session);
}
