import { useMutation } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import { parseValues, resetPasswordSchema, type FieldErrors } from '@/domain/schemas';
import { Button, EmptyState, FormSection, Gutter, Screen, StickyFooter, TextField, Txt, space } from '~/ds';
import { notify } from '~/shared/dialogs';

/**
 * 비밀번호 재설정 — 메일 링크(sjyc://password/reset?token=…, 앱 링크)로 열린다.
 * 웹 /password/reset 과 같은 기능. 토큰 검증은 서버가 한다.
 */
export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const reset = useMutation({
    mutationFn: (pw: string) => api.auth.resetPassword(token ?? '', pw),
    onSuccess: () => {
      notify('비밀번호를 변경했습니다', '새 비밀번호로 로그인해 주세요.');
      router.replace('/login');
    },
    onError: (e) => notify('변경하지 못했습니다', errorMessage(e)),
  });

  if (!token) {
    return (
      <Screen>
        <EmptyState
          title="재설정 링크가 올바르지 않습니다"
          description="메일로 받은 링크를 다시 열거나 로그인 화면의 비밀번호 찾기에서 다시 요청해 주세요."
          action={
            <View style={{ alignSelf: 'stretch', marginTop: space.lg }}>
              <Button label="로그인 화면으로" onPress={() => router.replace('/login')} />
            </View>
          }
        />
      </Screen>
    );
  }

  const submit = () => {
    if (reset.isPending) return;
    const parsed = parseValues(resetPasswordSchema, { password, passwordConfirm });
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    reset.mutate(parsed.data.password);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label="비밀번호 변경" onPress={submit} loading={reset.isPending} />
        </StickyFooter>
      }
    >
      <Gutter style={{ paddingTop: space.xl, gap: space.sm }}>
        <Txt variant="title1" accessibilityRole="header">
          새 비밀번호를 설정해 주세요
        </Txt>
        <Txt variant="caption" color="textTertiary">
          8~64자, 영문과 숫자를 함께 사용해 주세요.
        </Txt>
      </Gutter>
      <FormSection>
        <TextField
          label="새 비밀번호"
          value={password}
          onChangeText={setPassword}
          placeholder="새 비밀번호"
          secureTextEntry
          autoComplete="new-password"
          error={errors.password}
        />
        <TextField
          label="새 비밀번호 확인"
          value={passwordConfirm}
          onChangeText={setPasswordConfirm}
          placeholder="새 비밀번호 다시 입력"
          secureTextEntry
          autoComplete="new-password"
          error={errors.passwordConfirm}
        />
      </FormSection>
    </Screen>
  );
}
