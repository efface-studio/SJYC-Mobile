import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api, errorMessage } from '@/api';
import { editMobilePhone } from '@/lib/phone';

const KEY = ['signup-phone-verification'] as const;
export function useSignupPhone(motion = true) {
  const cache = useQueryClient();
  const state = useQuery({
    queryKey: KEY,
    queryFn: api.auth.signupPhone,
    retry: false,
    gcTime: 0,
    refetchOnWindowFocus: false,
  });
  const [code, setCode] = useState(''),
    [editing, setEditing] = useState(false),
    [number, setNumber] = useState(''),
    [now, setNow] = useState(Date.now);
  const busy = useRef(false);
  const verify = useMutation({
    mutationFn: async (value: string) => {
      const [result] = await Promise.all([
        api.auth.confirmPhone(value),
        motion ? new Promise((resolve) => setTimeout(resolve, 480)) : undefined,
      ]);
      return result;
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const send = useMutation({
    mutationFn: api.auth.resendPhone,
    onSuccess: (fresh) => {
      cache.setQueryData(KEY, fresh);
      setCode('');
      verify.reset();
      setEditing(false);
      setNow(Date.now());
    },
    onSettled: () => {
      busy.current = false;
    },
  });
  const stateData = state.data;
  const remaining = Math.max(0, Math.ceil((Date.parse(stateData?.resendAt ?? '') - now) / 1000)) || 0;
  useEffect(() => {
    if (!stateData || verify.isSuccess) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [stateData, verify.isSuccess]);
  useEffect(() => {
    if (!verify.isError) return;
    const id = setTimeout(() => setCode(''), 650);
    return () => clearTimeout(id);
  }, [verify.isError]);
  function input(text: string) {
    if (busy.current || verify.isSuccess) return;
    const digits = text.replace(/\D/g, '').slice(0, 6);
    setCode(digits);
    verify.reset();
    send.reset();
    if (digits.length === 6) {
      busy.current = true;
      verify.mutate(digits);
    }
  }
  function resend(change: boolean) {
    if (busy.current || verify.isSuccess || !stateData) return;
    const updated = change ? number : stateData.phone;
    if (!/^01[016789]-?\d{3,4}-?\d{4}$/.test(updated) || (stateData.phone === updated && remaining > 0))
      return;
    busy.current = true;
    send.reset();
    send.mutate(change ? updated : undefined);
  }
  return {
    state,
    code,
    input,
    verify,
    send,
    editing,
    number,
    remaining,
    resend,
    expired: stateData ? Date.parse(stateData.expiresAt) <= now : false,
    edit: () => {
      if (!busy.current) {
        setNumber(stateData?.phone ?? '');
        send.reset();
        setEditing(true);
      }
    },
    cancel: () => {
      if (!busy.current) {
        send.reset();
        setEditing(false);
      }
    },
    setNumber: (text: string) => setNumber((prev) => editMobilePhone(prev, text)),
    canChange: /^01[016789]-?\d{3,4}-?\d{4}$/.test(number) && number !== stateData?.phone,
    error: verify.isError ? errorMessage(verify.error) : send.isError ? errorMessage(send.error) : undefined,
  };
}
