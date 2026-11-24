import { editMobilePhone, formatMobilePhone } from '@/lib/phone';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState, type Ref } from 'react';
import {
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  View,
  type KeyboardTypeOptions,
  type TextInputProps,
} from 'react-native';
import { pickOption } from './sheet';
import { Tap } from './components';
import { FONT, Txt } from './text';
import { radius, space, useTheme } from './tokens';
import { Icon } from '~/shared/icon';

function FieldShell({
  label,
  error,
  hint,
  children,
}: {
  label?: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 6 }}>
      {label && (
        <Txt variant="captionStrong" color="textSecondary">
          {label}
        </Txt>
      )}
      {children}
      {error ? (
        <Txt variant="caption" color={t.tone.danger.fg} accessibilityRole="text">
          {error}
        </Txt>
      ) : hint ? (
        <Txt variant="caption" color="textTertiary">
          {hint}
        </Txt>
      ) : null}
    </View>
  );
}

/** 입력 필드 — RN TextInput(OS 기본 키보드·자동완성·붙여넣기 메뉴) */
export function TextField({
  label,
  value,
  onChangeText,
  error,
  hint,
  placeholder,
  multiline,
  keyboardType,
  secureTextEntry,
  maxLength,
  autoComplete,
  autoCapitalize = 'none',
  autoCorrect,
  autoFocus,
  returnKeyType,
  onSubmitEditing,
  ref,
}: {
  label?: string;
  value: string;
  onChangeText: (v: string) => void;
  error?: string;
  hint?: string;
  placeholder?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
  secureTextEntry?: boolean;
  maxLength?: number;
  autoComplete?: TextInputProps['autoComplete'];
  autoCapitalize?: TextInputProps['autoCapitalize'];
  autoCorrect?: boolean;
  autoFocus?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  onSubmitEditing?: () => void;
  /** 다음 입력칸으로 포커스를 옮길 때 사용 (React 19 ref prop) */
  ref?: Ref<TextInput>;
}) {
  const t = useTheme();
  const [focused, setFocused] = useState(false);
  const phone = keyboardType === 'phone-pad' || autoComplete === 'tel';
  const displayed = phone ? formatMobilePhone(value) : value;
  return (
    <FieldShell label={label} error={error} hint={hint}>
      <TextInput
        ref={ref}
        value={displayed}
        onChangeText={phone ? (next) => onChangeText(editMobilePhone(displayed, next)) : onChangeText}
        placeholder={placeholder}
        placeholderTextColor={t.textTertiary}
        multiline={multiline}
        keyboardType={keyboardType}
        secureTextEntry={secureTextEntry}
        maxLength={maxLength}
        autoComplete={autoComplete}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        autoFocus={autoFocus}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing ? () => onSubmitEditing() : undefined}
        submitBehavior={multiline ? 'newline' : undefined}
        accessibilityLabel={label ?? placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        textAlignVertical={multiline ? 'top' : 'center'}
        style={[
          styles.input,
          {
            color: t.text,
            backgroundColor: t.bgSubtle,
            borderColor: error ? t.tone.danger.fg : focused ? t.action : 'transparent',
            minHeight: multiline ? 120 : 52,
            paddingTop: multiline ? 14 : 0,
          },
        ]}
      />
    </FieldShell>
  );
}

/** 선택 필드 — 누르면 iOS 액션 시트 / Android 바텀 시트 */
export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  placeholder = '선택해 주세요',
  error,
}: {
  label?: string;
  value: T | '';
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  placeholder?: string;
  error?: string;
}) {
  const t = useTheme();
  const current = options.find((o) => o.value === value);
  return (
    <FieldShell label={label} error={error}>
      <Tap
        rounded={radius.md}
        accessibilityLabel={`${label ?? ''} ${current?.label ?? placeholder}`}
        onPress={async () => {
          const i = await pickOption(
            label ?? placeholder,
            options.map((o) => o.label),
            options.findIndex((o) => o.value === value),
          );
          const picked = i === null ? undefined : options[i];
          if (picked) onChange(picked.value);
        }}
        style={[
          styles.select,
          { backgroundColor: t.bgSubtle, borderColor: error ? t.tone.danger.fg : 'transparent' },
        ]}
      >
        <Txt variant="body" color={current ? 'text' : 'textTertiary'} style={{ flex: 1 }}>
          {current?.label ?? placeholder}
        </Txt>
        <Icon ios="chevron.down" android="expand_more" color={t.textTertiary} size={14} />
      </Tap>
    </FieldShell>
  );
}

/** 날짜 필드 — OS 기본 날짜 선택기 (iOS UIDatePicker / Android Material 날짜 다이얼로그). 값은 YYYY-MM-DD */
export function DateField({
  label,
  value,
  onChange,
  minimumDate,
  maximumDate,
  error,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  minimumDate?: Date;
  maximumDate?: Date;
  error?: string;
}) {
  const t = useTheme();
  const date = value ? new Date(`${value}T12:00:00`) : new Date();
  const toYmd = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  if (Platform.OS === 'ios') {
    return (
      <FieldShell label={label} error={error}>
        <View style={[styles.select, { backgroundColor: t.bgSubtle }]}>
          <DateTimePicker
            value={date}
            mode="date"
            display="compact"
            locale="ko-KR"
            accentColor={t.action}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            onValueChange={(_e, d) => onChange(toYmd(d))}
          />
        </View>
      </FieldShell>
    );
  }
  return (
    <FieldShell label={label} error={error}>
      <Tap
        rounded={radius.md}
        accessibilityLabel={`${label ?? '날짜'} ${value || '선택'}`}
        onPress={() =>
          DateTimePickerAndroid.open({
            value: date,
            mode: 'date',
            minimumDate,
            maximumDate,
            onValueChange: (_e, d) => onChange(toYmd(d)),
          })
        }
        style={[styles.select, { backgroundColor: t.bgSubtle }]}
      >
        <Txt variant="body" color={value ? 'text' : 'textTertiary'} style={{ flex: 1 }}>
          {value || '날짜 선택'}
        </Txt>
        <Icon ios="calendar" android="calendar_month" color={t.textTertiary} size={16} />
      </Tap>
    </FieldShell>
  );
}

/** 동의·설정 토글 — OS 기본 Switch */
export function SwitchRow({
  label,
  description,
  value,
  onValueChange,
  disabled,
  error,
}: {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
  error?: string;
}) {
  const t = useTheme();
  return (
    <View style={{ gap: 4 }}>
      <View style={styles.switchRow}>
        <Txt variant="label" style={{ flex: 1 }}>{label}</Txt>
        <Switch
          disabled={disabled}
          value={value}
          onValueChange={onValueChange}
          accessibilityLabel={label}
          trackColor={{ true: t.action, false: t.lineStrong }}
          thumbColor={Platform.OS === 'android' ? t.bg : undefined}
        />
      </View>
      {description && <Txt variant="caption" color="textTertiary">{description}</Txt>}
      {error && (
        <Txt variant="caption" color={t.tone.danger.fg}>
          {error}
        </Txt>
      )}
    </View>
  );
}

/** 폼 섹션 — 제목과 필드 묶음 */
export function FormSection({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <View style={{ gap: space.lg, paddingHorizontal: 20, paddingTop: space.xxl }}>
      {title && <Txt variant="title3">{title}</Txt>}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.md,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    fontFamily: FONT.regular,
    fontSize: 16,
  },
  select: {
    minHeight: 52,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: 'transparent',
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.md, minHeight: 36 },
});
