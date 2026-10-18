import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { mockDev } from '@/api/mock/client';
import { IS_MOCK } from '@/config/env';
import { Button, Gutter, IconCircle, Screen, Txt, space } from '~/ds';
import { notify } from '~/shared/dialogs';
import { Callout } from '~/user-kit';

const RESEND_COOLDOWN_SEC = 60;

/** 가입 직후 이메일 인증 안내 — 웹 /signup/verify 와 같은 기능 */
export default function VerifyEmailScreen() {
  const { email } = useLocalSearchParams<{ email?: string }>();
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

  return (
    <Screen>
      <Gutter style={styles.hero}>
        <IconCircle ios="envelope.fill" android="mail" />
        <Txt variant="title1" accessibilityRole="header" style={styles.center}>
          인증 메일을 보냈어요
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
      {IS_MOCK && email && (
        <Gutter style={{ paddingTop: space.xxl }}>
          <View style={{ gap: space.sm }}>
            <Callout tone="warning" title="개발용">
              실제 메일은 발송되지 않습니다.
            </Callout>
            <Button
              label="인증 링크를 누른 것으로 처리하기"
              variant="text"
              size="md"
              onPress={() => {
                mockDev.verifyEmail(email);
                notify('인증 완료로 처리했습니다', '이제 로그인할 수 있습니다.');
              }}
            />
          </View>
        </Gutter>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: { alignItems: 'center', gap: space.sm, paddingTop: 48, paddingBottom: space.xxxl },
  center: { textAlign: 'center' },
});
