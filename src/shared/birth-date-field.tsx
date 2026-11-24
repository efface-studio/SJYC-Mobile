import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Keyboard, Platform, View } from 'react-native';
import { earliestBirthDate } from '@/domain/signup-feedback';
import { todayKst } from '@/lib/format';
import { Tap, Txt, radius, space, useTheme } from '~/ds';
import { Icon } from './icon';

function localDate(value: string) {
  return new Date(value + 'T12:00:00');
}

function formatDate(date: Date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
}

export function BirthDateField({
  value,
  onChange,
  error,
}: {
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  const theme = useTheme();
  const [draft, setDraft] = useState<Date | null>(null);
  const today = todayKst();
  const minimumDate = localDate(earliestBirthDate);
  const maximumDate = localDate(today);
  function open() {
    Keyboard.dismiss();
    const start = localDate(value || today);
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        mode: 'date',
        value: start,
        minimumDate,
        maximumDate,
        onValueChange: (_, date) => onChange(formatDate(date)),
      });
    } else {
      setDraft(start);
    }
  }
  const displayDate = value && value.split('-').map(Number);
  const label = displayDate
    ? displayDate[0] + '년 ' + displayDate[1] + '월 ' + displayDate[2] + '일'
    : '날짜 선택';
  return (
    <View style={{ gap: 6 }}>
      <Txt variant="captionStrong" color="textSecondary">
        생년월일
      </Txt>
      <Tap
        accessibilityLabel={'생년월일, ' + label}
        onPress={open}
        rounded={radius.md}
        style={{
          minHeight: 50,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingHorizontal: 16,
          borderWidth: 1.5,
          borderRadius: radius.md,
          borderColor: error ? theme.tone.danger.fg : theme.lineStrong,
        }}
      >
        <Txt color={value ? 'text' : 'textTertiary'}>{label}</Txt>
        <Icon ios="calendar" android="calendar_month" size={18} color={theme.textSecondary} />
      </Tap>
      {draft && (
        <View>
          <DateTimePicker
            mode="date"
            value={draft}
            minimumDate={minimumDate}
            maximumDate={maximumDate}
            display="spinner"
            locale="ko-KR"
            textColor={theme.text}
            onValueChange={(_, date) => setDraft(date)}
          />
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: space.xl }}>
            <Tap accessibilityLabel="날짜 선택 취소" style={{ padding: 12 }} onPress={() => setDraft(null)}>
              <Txt color="textSecondary">취소</Txt>
            </Tap>
            <Tap
              accessibilityLabel="생년월일 선택 완료"
              style={{ padding: 12 }}
              onPress={() => {
                onChange(formatDate(draft));
                setDraft(null);
              }}
            >
              <Txt variant="bodyStrong" color="action">
                완료
              </Txt>
            </Tap>
          </View>
        </View>
      )}
      {!!error && (
        <Txt variant="caption" color={theme.tone.danger.fg}>
          {error}
        </Txt>
      )}
    </View>
  );
}
