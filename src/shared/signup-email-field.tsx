import type { RefObject } from 'react';
import type { TextInput } from 'react-native';
import { TextField } from '~/ds';

export function SignupEmailField({
  value,
  onChange,
  error,
  onNext,
  ref,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onNext: () => void;
  ref: RefObject<TextInput | null>;
}) {
  return (
    <TextField
      ref={ref}
      label="이메일 (로그인 아이디)"
      value={value}
      onChangeText={onChange}
      placeholder="example@email.com"
      keyboardType="email-address"
      autoComplete="email"
      autoCorrect={false}
      returnKeyType="next"
      onSubmitEditing={onNext}
      error={error}
    />
  );
}
