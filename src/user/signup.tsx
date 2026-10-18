import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { CENTER } from '@/config/center';
import { parseValues, signupSchema, type FieldErrors } from '@/domain/schemas';
import {
  Button,
  Card,
  Divider,
  FormSection,
  Gutter,
  Screen,
  StickyFooter,
  SwitchRow,
  Tap,
  TextField,
  Txt,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { Callout } from '~/user-kit';

/** 만 14세 미만은 법정대리인 동의 필요 — 온라인 절차 확정 전까지 센터 문의로 안내 */
const MIN_SELF_CONSENT_AGE = 14;

function PolicyLink({ label, href }: { label: string; href: '/policies/terms' | '/policies/privacy' }) {
  return (
    <Tap onPress={() => router.push(href)} accessibilityLabel={label} style={styles.policyLink}>
      <Txt variant="caption" color="action">
        {label}
      </Txt>
    </Tap>
  );
}

export default function SignupScreen() {
  const [v, setV] = useState({ name: '', email: '', password: '', passwordConfirm: '', birthYear: '' });
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const set = (key: keyof typeof v) => (text: string) => setV((prev) => ({ ...prev, [key]: text }));
  const all = terms && privacy && marketing;

  const signup = useMutation({
    mutationFn: api.auth.signup,
    // 웹과 같은 흐름: 가입 → 이메일 인증 안내 (mock 모드는 그 화면에서 개발용 인증 처리)
    onSuccess: (_r, input) => router.replace({ pathname: '/verify-email', params: { email: input.email } }),
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('가입하지 못했습니다', errorMessage(e));
    },
  });

  const submit = () => {
    if (signup.isPending) return;
    const parsed = parseValues(signupSchema, {
      ...v,
      agreeTerms: terms ? 'on' : undefined,
      agreePrivacy: privacy ? 'on' : undefined,
      agreeMarketing: marketing ? 'on' : undefined,
    });
    if (!parsed.ok) return setErrors(parsed.errors);
    if (new Date().getFullYear() - parsed.data.birthYear < MIN_SELF_CONSENT_AGE) {
      return setErrors({
        birthYear: `만 ${MIN_SELF_CONSENT_AGE}세 미만은 법정대리인 동의가 필요합니다. 센터(${CENTER.tel})로 문의해 주세요.`,
      });
    }
    setErrors({});
    signup.mutate(parsed.data);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label="가입하기" onPress={submit} loading={signup.isPending} />
        </StickyFooter>
      }
    >
      <Gutter style={styles.head}>
        <Txt variant="title1" accessibilityRole="header">
          몇 가지 정보만 입력해 주세요
        </Txt>
        <Txt variant="caption" color="textTertiary">
          가입 후 이메일 인증을 완료하면 프로그램 신청과 공간 예약을 이용할 수 있습니다.
        </Txt>
      </Gutter>

      <FormSection title="계정 정보">
        <TextField
          label="이름"
          value={v.name}
          onChangeText={set('name')}
          placeholder="이름"
          autoComplete="name"
          error={errors.name}
        />
        <TextField
          label="이메일 (로그인 아이디)"
          value={v.email}
          onChangeText={set('email')}
          placeholder="example@email.com"
          keyboardType="email-address"
          autoComplete="email"
          error={errors.email}
        />
        <TextField
          label="비밀번호"
          value={v.password}
          onChangeText={set('password')}
          placeholder="비밀번호"
          secureTextEntry
          autoComplete="new-password"
          hint="8~64자, 영문·숫자 포함"
          error={errors.password}
        />
        <TextField
          label="비밀번호 확인"
          value={v.passwordConfirm}
          onChangeText={set('passwordConfirm')}
          placeholder="비밀번호 다시 입력"
          secureTextEntry
          autoComplete="new-password"
          error={errors.passwordConfirm}
        />
        <TextField
          label="출생 연도"
          value={v.birthYear}
          onChangeText={set('birthYear')}
          placeholder="예) 2009"
          keyboardType="number-pad"
          maxLength={4}
          error={errors.birthYear}
        />
        <Callout>
          만 {MIN_SELF_CONSENT_AGE}세 미만은 법정대리인 동의 절차가 필요합니다. 온라인 절차 준비 전까지 센터로
          문의해 주세요.
        </Callout>
      </FormSection>

      <FormSection title="약관 동의">
        <Card style={{ paddingVertical: space.xs }}>
          <SwitchRow
            label="전체 동의"
            description="필수 및 선택 항목에 모두 동의합니다."
            value={all}
            onValueChange={(on) => {
              setTerms(on);
              setPrivacy(on);
              setMarketing(on);
            }}
          />
        </Card>
        <View style={{ gap: space.xs }}>
          <SwitchRow
            label="[필수] 이용약관 동의"
            value={terms}
            onValueChange={setTerms}
            error={errors.agreeTerms}
          />
          <PolicyLink label="이용약관 보기" href="/policies/terms" />
        </View>
        <Divider />
        <View style={{ gap: space.xs }}>
          <SwitchRow
            label="[필수] 개인정보 수집·이용 동의"
            value={privacy}
            onValueChange={setPrivacy}
            error={errors.agreePrivacy}
          />
          <PolicyLink label="개인정보처리방침 보기" href="/policies/privacy" />
        </View>
        <Divider />
        <SwitchRow
          label="[선택] 프로그램 소식 안내 수신"
          description="새 프로그램 모집 소식을 알려 드립니다."
          value={marketing}
          onValueChange={setMarketing}
        />
      </FormSection>
    </Screen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xl, gap: space.sm },
  policyLink: { alignSelf: 'flex-start', paddingVertical: 8 },
});
