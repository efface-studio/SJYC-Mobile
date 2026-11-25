import { useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { SESSION_KEY, useSession } from '@/features/auth/session';
import { sessionAccess } from './session-access';

export function useDeviceSession() {
  const session = useSession();
  const cache = useQueryClient();
  const [, setNow] = useState(Date.now);
  const expiresAt = session.data?.expiresAt;
  useEffect(() => {
    if (!expiresAt) return;
    let timer: ReturnType<typeof setTimeout>;
    const refresh = () => {
      setNow(Date.now());
      void cache.invalidateQueries({ queryKey: SESSION_KEY }, { cancelRefetch: false });
    };
    const schedule = () => {
      const remaining = Date.parse(expiresAt) - Date.now();
      // 한 달은 네이티브 타이머가 한 번에 표현할 수 있는 시간을 넘는다.
      if (remaining <= 0) refresh();
      else timer = setTimeout(schedule, Math.min(remaining, 2147483647));
    };
    schedule();
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') refresh();
    });
    return () => { clearTimeout(timer); sub.remove(); };
  }, [cache, expiresAt]);
  return { session, access: sessionAccess(expiresAt, session.data === null, session.isError, Date.now()) };
}
