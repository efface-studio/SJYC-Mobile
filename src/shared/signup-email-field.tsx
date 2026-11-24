import { useState, type Ref } from 'react';
import { StyleSheet, View, type TextInput } from 'react-native';
import { suggestedEmails } from '@/domain/signup-feedback';
import { Tap, TextField, Txt, radius, useTheme } from '~/ds';
import { Icon } from './icon';

export function SignupEmailField({ value, onChange, error, onNext, ref }: {
  value: string; onChange: (value: string) => void; error?: string; onNext: () => void; ref: Ref<TextInput>;
}) {
  const theme = useTheme();
  const [focused, setFocused] = useState(false);
  const suggestions = focused ? suggestedEmails(value) : [];
  return (
    <View>
      <TextField ref={ref} label="이메일 (로그인 아이디)" value={value} onChangeText={onChange}
        placeholder="example@email.com" keyboardType="email-address" autoComplete="email" autoCorrect={false}
        returnKeyType="next" onSubmitEditing={onNext} error={error}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
      {suggestions.length > 0 && (
        <View style={[styles.list, { borderColor: theme.line }]}>
          {suggestions.map((email, index) => (
            <Tap key={email} accessibilityLabel={email + ' 입력'} onPress={() => onChange(email)}
              style={[styles.row, { borderColor: theme.line, borderTopWidth: index ? StyleSheet.hairlineWidth : 0 }]}>
              <Txt numberOfLines={1} color="textSecondary" variant="body" style={{ flex: 1 }}>{email}</Txt>
              <Icon ios="arrow.up.left" android="north_west" color={theme.textTertiary} size={14} />
            </Tap>
          ))}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  list: { marginTop: 4, borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  row: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 8 },
});
