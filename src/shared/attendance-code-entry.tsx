import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Keyboard, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { Button, FormSection, Txt, space, useTheme } from '~/ds';
import { CodeInput, useReducedMotion } from './code-input';

export function AttendanceCodeEntry({ successActions }: { successActions?: ReactNode }) {
  const [digits, setDigits] = useState('');
  const submitting = useRef(false);
  const cache = useQueryClient();
  const reduce = useReducedMotion();
  const theme = useTheme();
  const check = useMutation({
    mutationKey: ['me', 'attendance', 'check-in'],
    retry: false,
    mutationFn: async (code: string) => {
      const [record] = await Promise.all([
        api.me.checkIn({ code }),
        reduce ? undefined : new Promise<void>((resolve) => setTimeout(resolve, 420)),
      ]);
      return record;
    },
    onSuccess: () => {
      Keyboard.dismiss();
      void cache.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: () => { submitting.current = false; },
  });

  useEffect(() => {
    if (!check.isError) return;
    const timer = setTimeout(() => setDigits(''), 650);
    return () => clearTimeout(timer);
  }, [check.isError]);

  function change(text: string) {
    if (submitting.current) return;
    const value = text.replace(/\D/g, '').slice(0, 4);
    setDigits(value);
    check.reset();
    if (value.length === 4) {
      submitting.current = true;
      check.mutate(value);
    }
  }

  function reset() {
    submitting.current = false;
    setDigits('');
    check.reset();
  }

  return (
    <FormSection title="출석 코드 입력">
      <Txt color="textSecondary">담당자가 발급한 숫자 4자리를 입력해 주세요.</Txt>
      <CodeInput
        length={4}
        label="출석 코드"
        code={digits}
        onChange={change}
        phase={check.isSuccess ? 'success' : check.isPending ? 'verifying' : check.isError ? 'error' : 'idle'}
        reduce={reduce}
        disabled={check.isPending || check.isSuccess}
      />
      <View accessibilityLiveRegion="polite" style={{ paddingBottom: space.lg }}>
        <Txt variant="caption" color={check.isError ? theme.tone.danger.fg : 'textSecondary'}>
          {check.isError ? errorMessage(check.error) : check.isSuccess
            ? `${check.data.targetName} · ${check.data.title} 출석했습니다.`
            : check.isPending ? '출석 확인 중…' : '코드는 발급 후 10분간 유효합니다.'}
        </Txt>
      </View>
      {check.isSuccess && (successActions ?? <Button label="다른 코드 입력" variant="text" onPress={reset} />)}
    </FormSection>
  );
}
