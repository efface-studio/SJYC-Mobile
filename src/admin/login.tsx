import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { useState } from 'react';
import { ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { api, errorMessage } from '@/api';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '@/api/mock/seed';
import { CENTER } from '@/config/center';
import { IS_MOCK } from '@/config/env';
import { can } from '@/domain/permissions';
import { loginSchema, parseValues, type FieldErrors, type LoginInput } from '@/domain/schemas';
import { SESSION_KEY, useLogout } from '@/features/auth/session';
import { Badge, Button, Chips, GUTTER, TextField, Txt, radius, space, useTheme } from '~/ds';
import { notify } from '~/shared/dialogs';

/** 데모(mock) 모드에서만 노출하는 직원·관리자 계정 */
const STAFF_DEMOS = DEMO_ACCOUNTS.filter((a) =>
  ['staff@demo.test', 'admin@demo.test', 'developer@demo.test'].includes(a.email),
);
const DEMO_OPTIONS = STAFF_DEMOS.map((a) => ({ value: a.email as string, label: a.label as string }));

export default function Login() {
  const t = useTheme();
  const dark = useColorScheme() === 'dark';
  const qc = useQueryClient();
  const logout = useLogout();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});

  const login = useMutation({
    mutationFn: (input: LoginInput) => api.auth.login(input),
    onSuccess: (session) => {
      if (!can(session.user, 'admin.access')) {
        logout.mutate();
        notify('관리자 권한이 없는 계정입니다', '센터 직원 계정으로 로그인해 주세요.');
        return;
      }
      // 세션이 바뀌면 루트 게이트가 관리자 화면으로 전환한다
      qc.setQueryData(SESSION_KEY, session);
    },
    onError: (e) => notify('로그인하지 못했습니다', errorMessage(e)),
  });
  const busy = login.isPending || logout.isPending;

  const submit = () => {
    const parsed = parseValues(loginSchema, { email, password });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
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
        <View style={styles.brand}>
          {dark ? (
            <Txt variant="title2" style={{ textAlign: 'center' }}>
              {CENTER.formalName}
            </Txt>
          ) : (
            <Image
              source={require('../../assets/logo-horizontal.jpg')}
              accessibilityLabel={CENTER.formalName}
              style={styles.logo}
              contentFit="contain"
            />
          )}
          <Badge text="관리자" tone="brand" />
          <Txt variant="label" color="textSecondary" style={{ textAlign: 'center' }}>
            센터 직원 계정으로 로그인해 주세요
          </Txt>
        </View>

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
            error={errors.email}
          />
          <TextField
            label="비밀번호"
            value={password}
            onChangeText={setPassword}
            placeholder="비밀번호"
            secureTextEntry
            autoComplete="current-password"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={submit}
            error={errors.password}
          />
          <View style={{ marginTop: space.sm }}>
            <Button label="로그인" onPress={submit} loading={busy} />
          </View>
        </View>

        {IS_MOCK && (
          <View style={[styles.demo, { backgroundColor: t.tone.warning.bg }]}>
            <Txt variant="captionStrong" color={t.tone.warning.fg} style={{ paddingHorizontal: space.lg }}>
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
  brand: { alignItems: 'center', gap: space.md },
  logo: { width: 216, height: 36 },
  demo: { borderRadius: radius.md, paddingTop: space.md, paddingBottom: space.xs },
});
