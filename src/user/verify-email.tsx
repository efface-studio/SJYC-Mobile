import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { api, errorMessage } from '@/api';
import { IS_MOCK } from '@/config/env';
import { Button, Gutter, Screen, TextField, Txt, space } from '~/ds';
import { notify } from '~/shared/dialogs';

const RESEND_COOLDOWN_SEC = 60;

/** 가입 직후 이메일 인증 안내 — 웹 /signup/verify 와 같은 기능 */
export default function VerifyEmailScreen() {
  const { email, mode } = useLocalSearchParams<{ email?: string; mode?: string }>();
  const [code, setCode] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = useMutation({
    mutationFn: () => api.auth.resendVerification(email ?? ''),
    onSuccess: () => {
      notify('인증 메일을 다시 보냈습니다');
      setCooldown(RESEND_COOLDOWN_SEC);
    },
    onError: (e) => notify('보내지 못했습니다', errorMessage(e)),
  });

  const verify = useMutation({mutationFn: () => api.auth.confirmPreviewCode(code)});
  if ((mode === 'preview' || IS_MOCK) && email)
    return (
      <Screen>
        <Gutter style={{ gap: space.lg, paddingTop: space.xxl }}>
          <Txt variant="title1" accessibilityRole="header">
            {verify.isSuccess ? '가입이 완료되었습니다' : '이메일 인증'}
          </Txt>
          {verify.isSuccess ? (
            <Button label="로그인하기" onPress={() => router.replace('/login')} />
          ) : (
            <>
              <Txt variant="body">{email}</Txt>
              <TextField
                label="인증 코드"
                value={code}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                maxLength={6}
                onChangeText={(text) => {
                  setCode(text.replace(/\D/g, ''));
                  verify.reset();
                }}
                hint="테스트 코드 284600을 입력해 주세요. 실제 메일은 발송되지 않습니다."
                error={
                  verify.isError
                    ? verify.error instanceof Error
                      ? verify.error.message
                      : errorMessage(verify.error)
                    : undefined
                }
              />
              <Button
                label="확인"
                disabled={code.length !== 6}
                loading={verify.isPending}
                onPress={() => verify.mutate()}
              />
              <Button
                variant="text"
                label="회원가입으로 돌아가기"
                onPress={() => router.replace('/signup')}
              />
            </>
          )}
        </Gutter>
      </Screen>
    );
  return (
    <Screen>
      <Gutter style={styles.hero}>
        <Txt variant="title1" accessibilityRole="header" style={styles.center}>
          인증 메일을 보냈습니다
        </Txt>
        <Txt variant="bodyStrong" color="action" style={styles.center}>
          {email ?? '가입한 이메일'}
        </Txt>
        <Txt variant="caption" color="textTertiary" style={styles.center}>
          받은 메일의 인증 링크를 눌러 가입을 완료해 주세요.{'\n'}메일이 보이지 않으면 스팸함을 확인해 주세요.
        </Txt>
      </Gutter>
      <Gutter style={{ gap: space.sm }}>
        <Button label="로그인 화면으로" onPress={() => router.replace('/login')} />
        <Button
          label={cooldown > 0 ? `인증 메일 다시 보내기 (${cooldown}초 후)` : '인증 메일 다시 보내기'}
          variant="secondary"
          disabled={!email || cooldown > 0}
          loading={resend.isPending}
          onPress={() => resend.mutate()}
        />
      </Gutter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: 48, paddingBottom: space.xxxl },
  center: { textAlign: 'center' },
});
