import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View, useColorScheme } from 'react-native';
import { api, errorMessage } from '@/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/api/mock/seed';
import { CENTER } from '@/config/center';
import { IS_MOCK } from '@/config/env';
import { providerStates, type ProviderState } from '@/config/oauth';
import type { OAuthProvider } from '@/domain/types';
import { forgotPasswordSchema, loginSchema, parseValues, type FieldErrors } from '@/domain/schemas';
import { SESSION_KEY } from '@/features/auth/session';
import { Button, Gutter, Screen, Tap, TextField, Txt, radius, space, useTheme } from '~/ds';
import { closeModal } from '~/user-kit';
import { notify } from '~/shared/dialogs';

/** 각 공급자 브랜드 가이드 색 */
const SOCIAL: Record<
  OAuthProvider,
  { bg: string; fg: string; border?: string; darkBg?: string; darkFg?: string }
> = {
  kakao: { bg: '#FEE500', fg: '#191919' },
  naver: { bg: '#03C75A', fg: '#FFFFFF' },
  apple: { bg: '#000000', fg: '#FFFFFF', darkBg: '#FFFFFF', darkFg: '#000000' },
  google: { bg: '#FFFFFF', fg: '#1F1F1F', border: '#DADCE0' },
};

function SocialButton({ p }: { p: ProviderState }) {
  const dark = useColorScheme() === 'dark';
  const c = SOCIAL[p.provider];
  const bg = dark && c.darkBg ? c.darkBg : c.bg;
  const fg = dark && c.darkFg ? c.darkFg : c.fg;
  return (
    <Tap
      rounded={radius.md}
      accessibilityLabel={`${p.label}로 계속하기${p.enabled ? '' : ', 설정 필요'}`}
      onPress={() =>
        notify(
          `${p.label} 로그인`,
          '서버 연동 설정이 끝나지 않아 아직 사용할 수 없습니다. 이메일로 로그인해 주세요.',
        )
      }
      style={[styles.social, { backgroundColor: bg, borderColor: c.border ?? bg }]}
    >
      <Txt variant="label" color={fg} style={{ flex: 1, textAlign: 'center' }}>
        {p.label}로 계속하기
      </Txt>
      {!p.enabled && (
        <Txt variant="small" color={fg} style={styles.socialTag}>
          설정 필요
        </Txt>
      )}
    </Tap>
  );
}

function Header({ title, description }: { title: string; description: string }) {
  const dark = useColorScheme() === 'dark';
  return (
    <Gutter style={styles.header}>
      {dark ? (
        <Txt variant="captionStrong" color="action">
          {CENTER.formalName}
        </Txt>
      ) : (
        <Image
          source={require('../../assets/logo-horizontal.jpg')}
          accessibilityLabel={CENTER.formalName}
          style={{ width: 144, height: 24 }}
          contentFit="contain"
        />
      )}
      <Txt variant="title1" accessibilityRole="header">
        {title}
      </Txt>
      <Txt variant="caption" color="textTertiary">
        {description}
      </Txt>
    </Gutter>
  );
}

export default function LoginScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'login' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: api.auth.login,
    onSuccess: (s) => {
      qc.setQueryData(SESSION_KEY, s);
      closeModal('/my');
    },
    onError: (e) => notify('로그인하지 못했습니다', errorMessage(e)),
  });
  const forgot = useMutation({
    mutationFn: (value: string) => api.auth.requestPasswordReset(value),
    // 가입 여부를 알 수 없도록 항상 같은 안내
    onSuccess: () =>
      notify('메일을 확인해 주세요', '가입된 계정이 있다면 비밀번호 재설정 링크를 보냈습니다.'),
    onError: (e) => notify('요청하지 못했습니다', errorMessage(e)),
  });

  const submitLogin = () => {
    if (login.isPending) return;
    const parsed = parseValues(loginSchema, { email, password });
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
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
      <Screen>
        <Header title="비밀번호 찾기" description="가입한 이메일로 비밀번호 재설정 링크를 보내 드립니다." />
        <Gutter style={styles.form}>
          <TextField
            label="이메일"
            value={email}
            onChangeText={setEmail}
            placeholder="example@email.com"
            keyboardType="email-address"
            autoComplete="email"
            error={errors.email}
          />
          <Button label="재설정 링크 받기" onPress={submitForgot} loading={forgot.isPending} />
          <Button label="로그인으로 돌아가기" variant="text" size="md" onPress={() => switchMode('login')} />
        </Gutter>
      </Screen>
    );
  }

  return (
    <Screen>
      <Header title="반가워요!" description="이메일 계정으로 로그인해 주세요." />
      <Gutter style={styles.form}>
        <TextField
          label="이메일"
          value={email}
          onChangeText={setEmail}
          placeholder="example@email.com"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <TextField
          label="비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="비밀번호"
          secureTextEntry
          autoComplete="password"
          error={errors.password}
        />
        <Button label="로그인" onPress={submitLogin} loading={login.isPending} />
        <View style={styles.links}>
          <Tap onPress={() => switchMode('forgot')} accessibilityLabel="비밀번호 찾기" style={styles.link}>
            <Txt variant="caption" color="textSecondary">
              비밀번호 찾기
            </Txt>
          </Tap>
          <View style={[styles.sep, { backgroundColor: t.line }]} />
          <Tap onPress={() => router.replace('/signup')} accessibilityLabel="회원가입" style={styles.link}>
            <Txt variant="caption" color="textSecondary">
              회원가입
            </Txt>
          </Tap>
        </View>
      </Gutter>

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
          <SocialButton key={p.provider} p={p} />
        ))}
      </Gutter>

      {IS_MOCK && (
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
                rounded={radius.pill}
                accessibilityLabel={`${a.label} 데모 계정으로 로그인`}
                onPress={() => login.mutate({ email: a.email, password: DEMO_PASSWORD })}
                style={[styles.demoChip, { backgroundColor: t.tone.warning.bg }]}
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
  );
}

const styles = StyleSheet.create({
  header: { paddingTop: space.xxl, paddingBottom: space.xl, gap: space.sm },
  form: { gap: space.lg },
  links: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  link: { paddingHorizontal: space.md, paddingVertical: 12 },
  sep: { width: StyleSheet.hairlineWidth, height: 12 },
  socialBlock: { paddingTop: space.xl, gap: space.sm },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginBottom: space.xs },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth },
  social: {
    height: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.lg,
    borderWidth: 1,
  },
  socialTag: { position: 'absolute', right: space.lg, opacity: 0.8 },
  demo: { paddingTop: space.xxl, gap: space.sm },
  demoChips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  demoChip: { height: 40, paddingHorizontal: 14, justifyContent: 'center' },
});
