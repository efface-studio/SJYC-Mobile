import { useMutation } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { birthDateError, confirmFeedback } from '@/domain/signup-feedback';
import { todayKst } from '@/lib/format';
import { BirthDateField } from '~/shared/birth-date-field';
import { SignupPasswordRules } from '~/shared/signup-password-rules';
import { SignupEmailField } from '~/shared/signup-email-field';
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
import { ModalGuard } from '~/user-kit';

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
  const [v, setV] = useState({ name: '', email: '', password: '', passwordConfirm: '', birthDate: '' });
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  // 키보드 return 키로 다음 입력칸으로 이동
  const emailRef = useRef<TextInput>(null);
  const passwordRef = useRef<TextInput>(null);
  const confirmRef = useRef<TextInput>(null);
  const match = confirmFeedback(v.password, v.passwordConfirm);
  const set = (key: keyof typeof v) => (text: string) => {
    setV((prev) => ({ ...prev, [key]: text }));
    setErrors((prev) => ({
      ...prev,
      [key === 'birthDate' ? 'birthYear' : key]: '',
      ...(key === 'password' ? { passwordConfirm: '' } : {}),
    }));
  };
  const all = terms && privacy && marketing;
  const dirty = Object.values(v).some(Boolean) || terms || privacy || marketing;

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
    const dateError = birthDateError(v.birthDate, todayKst());
    const parsed = parseValues(signupSchema, {
      ...v,
      birthYear: v.birthDate.slice(0, 4),
      agreeTerms: terms ? 'on' : undefined,
      agreePrivacy: privacy ? 'on' : undefined,
      agreeMarketing: marketing ? 'on' : undefined,
    });
    if (!parsed.ok || dateError) {
      setErrors({ ...(!parsed.ok && parsed.errors), birthYear: dateError ?? '' });
      return;
    }
    setErrors({});
    signup.mutate(parsed.data);
  };

  return (
    <>
      <ModalGuard dirty={dirty} fallback="/my" />
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
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            error={errors.name}
          />
          <SignupEmailField
            ref={emailRef}
            value={v.email}
            onChange={set('email')}
            onNext={() => passwordRef.current?.focus()}
            error={errors.email}
          />
          <View style={{ gap: space.sm }}>
            <TextField
              ref={passwordRef}
              label="비밀번호"
              value={v.password}
              onChangeText={set('password')}
              placeholder="비밀번호"
              secureTextEntry
              autoComplete="new-password"
              returnKeyType="next"
              onSubmitEditing={() => confirmRef.current?.focus()}
              error={errors.password}
            />
            <SignupPasswordRules password={v.password} />
          </View>
          <TextField
            ref={confirmRef}
            label="비밀번호 확인"
            value={v.passwordConfirm}
            onChangeText={set('passwordConfirm')}
            placeholder="비밀번호 다시 입력"
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="done"
            hint={match === '일치합니다.' ? match : undefined}
            error={errors.passwordConfirm || (match !== '일치합니다.' ? match : undefined)}
          />
          <BirthDateField value={v.birthDate} onChange={set('birthDate')} error={errors.birthYear} />
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
    </>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xl, gap: space.sm },
  policyLink: { alignSelf: 'flex-start', paddingVertical: 8 },
});
