import { LoginOptions, useLoginPreferences } from '~/shared/login-preferences';
import { AdminSocialButtons } from '~/admin-kit/social-login';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { AuthReveal, LoginSubmit, useLoginMotion } from '~/shared/login-motion';
import { Wordmark } from '~/shared/wordmark';
import { useRef, useState } from 'react';
import { ScrollView, StyleSheet, View, type TextInput } from 'react-native';
import { api, errorMessage } from '@/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/api/mock/seed';
import { DEMO_DATA } from '@/config/env';
import { canEnterConsole } from '@/domain/permissions';
import { loginSchema, parseValues, type FieldErrors, type LoginInput } from '@/domain/schemas';
import { SESSION_KEY, useLogout } from '@/features/auth/session';
import { Button, Chips, GUTTER, TextField, Txt, space, useTheme } from '~/ds';

/** 데모 데이터가 활성화된 환경에서만 노출하는 동아리 담당자·직원·관리자 계정 (웹 관리자 로그인과 같은 목록) */
const STAFF_DEMOS = DEMO_ACCOUNTS.filter((a) =>
  ['leader@demo.test', 'staff@demo.test', 'admin@demo.test', 'developer@demo.test'].includes(a.email),
);
const DEMO_OPTIONS = STAFF_DEMOS.map((a) => ({ value: a.email as string, label: a.label as string }));

export default function Login() {
  const motion = useLoginMotion();
  const [loginError, setLoginError] = useState('');
  const t = useTheme();
  const qc = useQueryClient();
  const logout = useLogout();
  const preferences = useLoginPreferences();
  const [email, setEmail] = useState(preferences.initialEmail);
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (session) => {
      // 루트 게이트와 같은 기준 — 운영자 또는 동아리 담당자
      if (!canEnterConsole(session.user)) {
        logout.mutate();
        motion.fail();
        setLoginError(
          '관리자 권한이 없는 계정입니다. 센터 직원 또는 동아리 담당자 계정으로 로그인해 주세요.',
        );
        return;
      }
      // 세션이 바뀌면 루트 게이트가 관리자 화면으로 전환한다
      preferences.rememberEmail(session.user.email);
      motion.finish(() => qc.setQueryData(SESSION_KEY, session));
    },
    onError: (e) => {
      motion.fail();
      setLoginError(errorMessage(e));
    },
  });
  const busy = login.isPending || logout.isPending;

  const passwordRef = useRef<TextInput>(null);
  const submit = () => {
    if (busy || motion.phase === 'success') return;
    setLoginError('');
    const parsed = parseValues(loginSchema, { email, password });
    if (!parsed.ok) {
      motion.fail();
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    motion.start();
    login.mutate(parsed.data);
  };

  return (
    <ScrollView
      style={{ backgroundColor: t.bg }}
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <View style={styles.inner}>
        <AuthReveal delay={0} reduce={motion.reduce}>
          <View style={styles.brand}>
            <Wordmark width={165} />
            <Txt variant="display" accessibilityRole="header">
              관리자 로그인
            </Txt>
            <Txt variant="label" color="textSecondary">
              센터 직원·동아리 담당자 계정으로 로그인해 주세요
            </Txt>
          </View>
        </AuthReveal>
        <AuthReveal delay={70} reduce={motion.reduce}>
          <View style={{ gap: space.lg }}>
            <TextField
              label="이메일"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoComplete="email"
              autoCorrect={false}
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
              autoComplete="current-password"
              autoCorrect={false}
              returnKeyType="go"
              onSubmitEditing={submit}
              error={errors.password}
            />
            <LoginOptions options={preferences} />
            {!!loginError && (
              <View accessibilityLiveRegion="polite">
                <Txt color={t.tone.danger.fg}>{loginError}</Txt>
              </View>
            )}
            <View style={{ marginTop: space.sm }}>
              <LoginSubmit motion={motion} onPress={submit} disabled={logout.isPending} />
            </View>
          </View>
        </AuthReveal>
        <AdminSocialButtons />
        {DEMO_DATA && (
          <View style={[styles.demo, { borderTopColor: t.line }]}>
            <Txt variant="captionStrong" color="textTertiary" style={{ paddingHorizontal: space.lg }}>
              데모 계정 (개발용) · 눌러서 채우기
            </Txt>
            <View style={{ marginHorizontal: -(GUTTER - space.lg) }}>
              <Chips
                options={DEMO_OPTIONS}
                value=""
                onChange={(demoEmail) => {
                  setEmail(demoEmail);
                  setPassword(DEMO_PASSWORD);
                }}
              />
            </View>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: GUTTER, paddingVertical: 64 },
  inner: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: space.xxxl },
  brand: { alignItems: 'flex-start', gap: space.sm },
  demo: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: space.md, paddingBottom: space.xs },
});
