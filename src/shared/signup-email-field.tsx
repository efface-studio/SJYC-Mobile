import type { RefObject } from 'react';
import { Keyboard, type TextInput } from 'react-native';
import { emailDomains, emailWithDomain } from '@/domain/signup-feedback';
import { pickOption, Tap, TextField, Txt, useTheme } from '~/ds';
import { Icon } from './icon';

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
  const theme = useTheme();
  const canChoose = !!value.split('@')[0]?.trim();
  async function choose() {
    const wasFocused = ref.current?.isFocused();
    Keyboard.dismiss();
    const index = await pickOption(
      '이메일 도메인 선택',
      [...emailDomains, '직접 입력'],
      emailDomains.indexOf(value.split('@')[1] ?? ''),
    );
    const domain = index === null ? undefined : emailDomains[index];
    if (domain) onChange(emailWithDomain(value, domain));
    if (index === emailDomains.length || (index === null && wasFocused)) ref.current?.focus();
  }
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
      trailing={
        <Tap
          accessibilityLabel="이메일 도메인 선택"
          disabled={!canChoose}
          onPress={choose}
          style={{
            minHeight: 44,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 4,
            paddingHorizontal: 8,
            opacity: canChoose ? 1 : 0.5,
          }}
        >
          <Txt variant="captionStrong" color="textSecondary">
            도메인 선택
          </Txt>
          <Icon ios="chevron.down" android="expand_more" size={12} color={theme.textSecondary} />
        </Tap>
      }
    />
  );
}
