import { useAppColorScheme } from '~/shared/appearance';
import { LoginOptions, useLoginPreferences } from '~/shared/login-preferences';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Platform, StyleSheet, View, type TextInput } from 'react-native';
import { api, errorMessage } from '@/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/api/mock/seed';
import { AuthReveal, LoginSubmit, useLoginMotion } from '~/shared/login-motion';
import { Wordmark } from '~/shared/wordmark';
import { DEMO_DATA } from '@/config/env';
import { providerStates, type ProviderState } from '@/config/oauth';
import type { OAuthProvider } from '@/domain/types';
import { forgotPasswordSchema, loginSchema, parseValues, type FieldErrors } from '@/domain/schemas';
import { SESSION_KEY } from '@/features/auth/session';
import { Button, Gutter, Screen, Tap, TextField, Txt, radius, space, useTheme } from '~/ds';
import { beginSocial, socialMarks, useAppleAvailable } from '~/user-kit/social-accounts';
import { notify } from '~/shared/dialogs';

/** 각 공급자 브랜드 가이드 색 */
const SOCIAL: Record<
  OAuthProvider,
  { bg: string; fg: string; border?: string; darkBg?: string; darkFg?: string }
> = {
  kakao: { bg: '#FEE500', fg: '#191919' },
  naver: { bg: '#03C75A', fg: '#092E1A' },
  apple: { bg: '#000000', fg: '#FFFFFF', darkBg: '#FFFFFF', darkFg: '#000000' },
  google: { bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0' },
};

function SocialButton({ p }: { p: ProviderState }) {
  const dark = useAppColorScheme() === 'dark';
  const c = SOCIAL[p.provider];
  const bg = dark && c.darkBg ? c.darkBg : c.bg;
  const fg = dark && c.darkFg ? c.darkFg : c.fg;
  const cache = useQueryClient();
  const start = useMutation({
    mutationFn: async () => {
      const result = await beginSocial(p.provider,false);
      if (result === 'profile') {router.replace('/oauth-profile'); return;}
      if (result === 'native') {
        const session = await api.auth.me();
        if (!session) throw new Error('로그인 상태를 확인할 수 없습니다.');
        cache.setQueryData(SESSION_KEY, session);
      }
    },
    onError: (err) => notify('소셜 로그인', errorMessage(err)),
  });
  if (p.provider === 'apple' && Platform.OS === 'ios' && p.enabled) {
    return <AppleAuthentication.AppleAuthenticationButton
      buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
      buttonStyle={dark ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
      cornerRadius={radius.md}
      style={{ height: 52 }}
      onPress={() => { if (!start.isPending) start.mutate(); }}
    />;
  }
  const unavailableLabel = (p.provider === 'google' || p.provider === 'apple') ? '준비 중' : '설정 필요';
  return (
    <Tap
      rounded={radius.md}
      accessibilityLabel={`${p.label}로 계속하기${p.enabled ? '' : ', ' + unavailableLabel}`}
      disabled={!p.enabled || start.isPending}
      onPress={() => start.mutate()}
      style={[styles.social, { backgroundColor: bg, borderColor: c.border ?? bg }, !p.enabled && styles.unavailable]}
    >
      <View style={styles.socialSide}>
        <Image
          contentFit="contain"
          source={socialMarks[p.provider]}
          tintColor={p.provider === 'google' ? undefined : p.provider === 'naver' ? '#FFFFFF' : fg}
          style={styles.providerMark}
        />
      </View>
      <Txt variant="label" color={fg} style={styles.providerLabel}>
        {p.label}로 계속하기
      </Txt>
      <View style={[styles.socialSide, styles.statusSide]}>
        {!p.enabled && (
          <Txt variant="small" color={fg} style={styles.socialTag}>
            {unavailableLabel}
          </Txt>
        )}
      </View>
    </Tap>
  );
}

export default function LoginScreen() {
  const motion = useLoginMotion();
  const [loginError, setLoginError] = useState('');
  const t = useTheme();
  const apple = useAppleAvailable();
  const providers = useQuery({ queryKey: ['available-social-providers'], queryFn: api.auth.socialProviders, staleTime: 60_000 });
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const preferences = useLoginPreferences();
  const [email, setEmail] = useState(preferences.initialEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (s) => {
      preferences.rememberEmail(s.user.email);
      motion.finish(() => qc.setQueryData(SESSION_KEY, s));
    },
    onError: (e) => {
      motion.fail();
      setLoginError(errorMessage(e));
    },
  });
  const forgot = useMutation({
    mutationFn: (value: string) => api.auth.requestPasswordReset(value),
    // 가입 여부를 알 수 없도록 항상 같은 안내
    onSuccess: () =>
      notify('메일을 확인해 주세요', '가입된 계정이 있다면 비밀번호 재설정 링크를 보냈습니다.'),
    onError: (e) => notify('요청하지 못했습니다', errorMessage(e)),
  });

  const passwordRef = useRef<TextInput>(null);
  const submitLogin = () => {
    if (login.isPending || motion.phase === 'success') return;
    setLoginError('');
    const parsed = parseValues(loginSchema, { email, password });
    if (!parsed.ok) {
      motion.fail();
      return setErrors(parsed.errors);
    }
    setErrors({});
    motion.start();
    login.mutate(parsed.data);
  };
  const submitForgot = () => {
    if (forgot.isPending) return;
    const parsed = parseValues(forgotPasswordSchema, { email });
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    forgot.mutate(parsed.data.email);
  };
  const switchMode = (m: 'login' | 'forgot') => {
    setErrors({});
    setMode(m);
  };

  if (mode === 'forgot') {
    return (
      <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:t.bg}}>
        <Screen>
          <Gutter style={styles.header}>
            <Wordmark width={165} />
            <Txt variant="title1" accessibilityRole="header">비밀번호 찾기</Txt>
            <Txt variant="caption" color="textTertiary">
              가입한 이메일로 비밀번호 재설정 링크를 보내 드립니다.
            </Txt>
          </Gutter>
          <Gutter style={styles.form}>
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="send"
              onSubmitEditing={submitForgot}
              error={errors.email}
            />
            <Button label="재설정 링크 받기" onPress={submitForgot} loading={forgot.isPending} />
            <Button
              label="로그인으로 돌아가기"
              variant="text"
              size="md"
              onPress={() => switchMode('login')}
            />
          </Gutter>
        </Screen>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={{flex:1,backgroundColor:t.bg}}>
      <Screen>
        <AuthReveal delay={0} reduce={motion.reduce}>
          <Gutter style={styles.header}>
            <Wordmark width={165} />
            <Txt variant="display" accessibilityRole="header">로그인</Txt>
          </Gutter>
        </AuthReveal>
        <AuthReveal delay={70} reduce={motion.reduce}>
          <Gutter style={styles.form}>
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="example@email.com"
              keyboardType="email-address"
              autoComplete="email"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              error={errors.email}
            />
            <TextField
              ref={passwordRef}
              label="비밀번호"
              value={password}
              onChangeText={setPassword}
              placeholder="비밀번호"
              secureTextEntry
              autoComplete="password"
              returnKeyType="go"
              onSubmitEditing={submitLogin}
              error={errors.password}
            />
            <LoginOptions options={preferences} />
            {!!loginError && (
              <View accessibilityLiveRegion="polite">
                <Txt color={t.tone.danger.fg}>{loginError}</Txt>
              </View>
            )}
            <LoginSubmit motion={motion} onPress={submitLogin} />
            <View style={styles.links}>
              <Tap
                onPress={() => switchMode('forgot')}
                accessibilityLabel="비밀번호 찾기"
                style={styles.link}
              >
                <Txt variant="caption" color="textSecondary">
                  비밀번호 찾기
                </Txt>
              </Tap>
              <View style={[styles.sep, { backgroundColor: t.line }]} />
              <Tap
                onPress={() => router.push('/signup')}
                accessibilityLabel="회원가입"
                style={styles.link}
              >
                <Txt variant="caption" color="textSecondary">
                  회원가입
                </Txt>
              </Tap>
            </View>
          </Gutter>
        </AuthReveal>
        {/* 서버 OAuth 설정 전에는 성공을 흉내 내지 않고 "설정 필요"로 안내한다 */}
        <Gutter style={styles.socialBlock}>
          <View style={styles.orRow}>
            <View style={[styles.orLine, { backgroundColor: t.line }]} />
            <Txt variant="small" color="textTertiary">
              간편 로그인
            </Txt>
            <View style={[styles.orLine, { backgroundColor: t.line }]} />
          </View>
          {providerStates().map((p) => (
            <SocialButton key={p.provider} p={{ ...p, enabled: p.provider !== 'google' && !!providers.data?.includes(p.provider) && (p.provider !== 'apple' || Platform.OS !== 'ios' || !!apple.data) }} />
          ))}
        </Gutter>

        {DEMO_DATA && (
          <Gutter style={styles.demo}>
            <Txt variant="captionStrong" color="textTertiary">
              개발용 데모 계정으로 바로 로그인
            </Txt>
            <View style={styles.demoChips}>
              {DEMO_ACCOUNTS.filter(
                (a) => a.email === 'member@demo.test' || a.email === 'leader@demo.test',
              ).map((a) => (
                <Tap
                  key={a.email}
                  rounded={radius.md}
                  accessibilityLabel={`${a.label} 데모 계정으로 로그인`}
                  onPress={() => login.mutate({ email: a.email, password: DEMO_PASSWORD })}
                  style={[styles.demoChip, { borderColor: t.tone.warning.fg }]}
                >
                  <Txt variant="label" color={t.tone.warning.fg}>
                    {a.label}
                  </Txt>
                </Tap>
              ))}
            </View>
          </Gutter>
        )}
      </Screen>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.xl, paddingBottom: space.xl, gap: space.lg },
  form: { gap: space.lg },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  link: { paddingHorizontal: space.md, paddingVertical: 12 },
  sep: { width: StyleSheet.hairlineWidth, height: 12 },
  socialBlock: { paddingTop: space.xl, gap: space.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  social: {
    minHeight: 52,
    gap: 4,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
  },
  unavailable: { opacity: 0.55 },
  socialSide: { flex: 1, minWidth: 46 },
  statusSide: { alignItems: 'flex-end' },
  providerMark: { width: 22, height: 22 },
  providerLabel: { flexShrink: 1, textAlign: 'center' },
  socialTag: { textAlign: 'right', opacity: 0.84 },
  demo: { paddingTop: space.xxl, gap: space.sm },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  demoChip: { height: 44, paddingHorizontal: 14, justifyContent: 'center', borderWidth: 1 },
});
