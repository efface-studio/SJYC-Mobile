import { Stack, router } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, Keyboard, ScrollView, StyleSheet, View } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api';
import { SESSION_KEY } from '@/features/auth/session';
import { useSignupPhone } from '@/features/auth/use-signup-phone';
import { Button, Gutter, LoadingState, Screen, TextField, Txt, space } from '~/ds';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from '~/shared/icon';
import { useTheme } from '~/ds';
import { SignupOtp } from '~/shared/signup-otp';
export default function VerifyPhone() {
  const [reduce, setReduce] = useState(true),
    [done, setDone] = useState(false);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const s = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      s.remove();
    };
  }, []);
  const f = useSignupPhone(!reduce),
    cache = useQueryClient(),
    success = f.verify.isSuccess;
  useEffect(() => {
    if (!success) return;
    Keyboard.dismiss();
    const t = setTimeout(() => setDone(true), reduce ? 0 : 1250);
    return () => clearTimeout(t);
  }, [success, reduce]);
  const data = f.state.data,
    busy = f.verify.isPending || f.send.isPending || success;
  const t = useTheme();
  if (done) {
    const signedIn = f.verify.data?.signedIn;
    return (
      <SafeAreaView edges={['left', 'right', 'bottom']} style={[styles.page, { backgroundColor: t.bg }]}>
        <Stack.Screen
          options={{
            title: '회원가입 성공',
            headerTransparent: false,
            headerLargeTitle: false,
            headerBackVisible: false,
            gestureEnabled: false,
          }}
        />
        <ScrollView contentContainerStyle={styles.result}>
          <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
            <Icon ios="checkmark.circle.fill" android="check_circle" size={64} color={t.action} />
          </View>
          <Txt variant="display" accessibilityRole="header" style={styles.headline}>
            가입을 완료했어요
          </Txt>
        </ScrollView>
        <Gutter style={styles.footer}>
          <Button
            label={signedIn ? '계속하기' : '로그인하기'}
            onPress={async () => {
              if (signedIn) {
                const session = await api.auth.me();
                if (session) cache.setQueryData(SESSION_KEY, session);
                router.replace('/home');
              } else {
                router.dismissTo('/login');
              }
            }}
          />
        </Gutter>
      </SafeAreaView>
    );
  }
  const title = f.state.isError || (f.verify.isError && !f.editing) ? '회원가입 실패' : '휴대전화 인증';
  return (
    <Screen>
      <Stack.Screen options={{ title, headerTransparent: false, headerLargeTitle: false }} />
      <Gutter style={{ paddingVertical: space.xl, gap: space.lg }}>
        {f.state.isPending ? (
          <LoadingState />
        ) : f.state.isError || !data ? (
          <>
            <Txt>{errorMessage(f.state.error)}</Txt>
            <Button label="회원가입으로 돌아가기" onPress={() => router.replace('/signup')} />
          </>
        ) : f.editing ? (
          <>
            <TextField
              label="새 휴대전화 번호"
              value={f.number}
              keyboardType="phone-pad"
              autoComplete="tel"
              onChangeText={f.setNumber}
            />
            {f.error && <Txt>{f.error}</Txt>}
            <Button
              label="새 번호로 코드 받기"
              disabled={!f.canChange || busy}
              loading={f.send.isPending}
              onPress={() => f.resend(true)}
            />
            <Button variant="text" label="취소" onPress={f.cancel} />
          </>
        ) : (
          <>
            <Txt variant="title1" accessibilityRole="header">
              인증 코드 입력
            </Txt>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: space.sm,
              }}
            >
              <Txt variant="bodyStrong">{data.phone}</Txt>
              <Button size="md" variant="text" label="번호 변경" disabled={busy} onPress={f.edit} />
            </View>
            <Txt color="textSecondary">
              {data.verificationMode === 'preview'
                ? '테스트 코드 284600을 입력해 주세요.'
                : '문자로 받은 6자리 코드를 입력해 주세요.'}
            </Txt>
            <SignupOtp
              code={f.code}
              onChange={f.input}
              phase={
                success ? 'success' : f.verify.isPending ? 'verifying' : f.verify.isError ? 'error' : 'idle'
              }
              reduce={reduce}
              disabled={busy}
            />
            <View accessibilityLiveRegion="polite">
              <Txt variant="caption">
                {f.error ??
                  (success
                    ? '인증됐어요.'
                    : f.verify.isPending
                      ? '코드 확인 중…'
                      : f.expired
                        ? '입력 시간이 지났어요. 새 코드를 받아 주세요.'
                        : f.send.isSuccess
                          ? '새 코드를 요청했어요.'
                          : '')}
              </Txt>
            </View>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
              }}
            >
              <Txt variant="caption" color="textSecondary">
                코드가 오지 않았나요?
              </Txt>
              <Button
                size="md"
                variant="text"
                disabled={!!f.remaining || busy}
                label={
                  f.send.isPending ? '요청 중…' : f.remaining ? f.remaining + '초 후 재발송' : '코드 재발송'
                }
                onPress={() => f.resend(false)}
              />
            </View>
          </>
        )}
      </Gutter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1 },
  result: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 20,
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  headline: { textAlign: 'center' },
  footer: { paddingTop: 12, paddingBottom: 12 },
});
