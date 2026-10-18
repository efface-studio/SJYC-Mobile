import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { attendanceRate } from '@/domain/attendance';
import { ATTENDANCE_STATUS, ATTENDANCE_TARGET_LABEL } from '@/domain/labels';
import { checkInSchema, parseValues } from '@/domain/schemas';
import type { MyAttendance } from '@/domain/types';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  FormSection,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  TextField,
  Txt,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { Rows } from '~/user-kit';

function groupByTarget(items: MyAttendance[]) {
  const groups = new Map<string, MyAttendance[]>();
  for (const a of items) {
    const key = `${a.targetType}:${a.targetId}`;
    groups.set(key, [...(groups.get(key) ?? []), a]);
  }
  return [...groups.values()];
}

function rateOf(items: MyAttendance[]) {
  const count = (s: string) => items.filter((a) => a.status === s).length;
  return attendanceRate({
    present: count('present'),
    late: count('late'),
    absent: count('absent'),
    excused: count('excused'),
  });
}

export default function MyAttendanceScreen() {
  const qc = useQueryClient();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | undefined>();
  const list = useQuery({ queryKey: ['me', 'attendance'], queryFn: () => api.me.attendance() });
  const checkIn = useMutation({
    mutationFn: (value: string) => api.me.checkIn({ code: value }),
    onSuccess: (a) => {
      setCode('');
      setError(undefined);
      void qc.invalidateQueries({ queryKey: ['me', 'attendance'] });
      notify('출석이 확인되었습니다', `${a.targetName} · ${a.title}`);
    },
    onError: (e) => setError(errorMessage(e)),
  });

  const submit = () => {
    if (checkIn.isPending) return;
    const parsed = parseValues(checkInSchema, { code });
    if (!parsed.ok) {
      setError(parsed.errors.code);
      return;
    }
    checkIn.mutate(parsed.data.code);
  };

  return (
    <>
      <Stack.Screen options={{ title: '출석' }} />
      <Screen onRefresh={() => list.refetch()}>
        <FormSection title="출석 코드 입력">
          <Txt variant="caption" color="textTertiary">
            담당 선생님이 알려준 4자리 숫자를 입력하세요. 코드는 연 뒤 10분 동안만 쓸 수 있습니다.
          </Txt>
          <TextField
            label="출석 코드"
            value={code}
            onChangeText={(v) => setCode(v.replace(/\D/g, '').slice(0, 4))}
            keyboardType="number-pad"
            maxLength={4}
            autoComplete="one-time-code"
            placeholder="0000"
            error={error}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <Button label="출석하기" loading={checkIn.isPending} onPress={submit} />
        </FormSection>
        <Divider thick />
        <QueryBoundary query={list}>
          {(items) =>
            items.length === 0 ? (
              <EmptyState
                title="출석 기록이 없습니다"
                description="가입한 동아리나 승인된 프로그램의 출석부가 만들어지면 여기에 표시됩니다."
              />
            ) : (
              <View style={{ gap: space.lg, paddingBottom: space.xl }}>
                {groupByTarget(items).map((group) => {
                  const first = group[0]!;
                  const rate = rateOf(group);
                  return (
                    <View key={`${first.targetType}:${first.targetId}`}>
                      <Gutter style={styles.groupHeader}>
                        <View style={{ flex: 1 }}>
                          <Txt variant="caption" color="textTertiary">
                            {ATTENDANCE_TARGET_LABEL[first.targetType]}
                          </Txt>
                          <Txt variant="title3" accessibilityRole="header">
                            {first.targetName}
                          </Txt>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Txt variant="caption" color="textTertiary">
                            출석률
                          </Txt>
                          <Txt variant="title2">{rate === null ? '—' : `${rate}%`}</Txt>
                        </View>
                      </Gutter>
                      <Rows>
                        {group.map((a) => (
                          <ListRow
                            key={a.sessionId}
                            title={a.title}
                            subtitle={formatDate(`${a.date}T00:00:00+09:00`)}
                            trailing={
                              a.status ? (
                                <Badge
                                  text={ATTENDANCE_STATUS[a.status].text}
                                  tone={ATTENDANCE_STATUS[a.status].tone}
                                />
                              ) : (
                                <Badge text="미확인" />
                              )
                            }
                          />
                        ))}
                      </Rows>
                    </View>
                  );
                })}
              </View>
            )
          }
        </QueryBoundary>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingBottom: space.sm },
});
