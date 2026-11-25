import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSession } from '@/features/auth/session';
import { ClubCheckIn } from '~/user-kit/club-check-in';
import { api } from '@/api';
import { attendanceRate } from '@/domain/attendance';
import { ATTENDANCE_STATUS, ATTENDANCE_TARGET_LABEL } from '@/domain/labels';
import type { MyAttendance } from '@/domain/types';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Chips,
  Divider,
  EmptyState,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  Txt,
  space,
} from '~/ds';
import { AttendanceCodeEntry } from '~/shared/attendance-code-entry';
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
  const user = useSession().data?.user;
  const manager = user?.status === 'active' && !!user.managedClubIds?.length;
  const [tab, setTab] = useState<'mine' | 'club'>('mine');
  const list = useQuery({ queryKey: ['me', 'attendance'], queryFn: () => api.me.attendance() });

  return (
    <>
      <Stack.Screen options={{ title: '출석' }} />
      <Screen onRefresh={() => list.refetch()}>
        {manager && (
          <Chips
            options={[
              { value: 'mine', label: '내 출석 기록' },
              { value: 'club', label: '담당 동아리 출석' },
            ]}
            value={tab}
            onChange={setTab}
          />
        )}
        {manager && user && tab === 'club' ? (
          <ClubCheckIn key={user.id} user={user} />
        ) : (
          <>
            <AttendanceCodeEntry />
            <Divider />
            <QueryBoundary query={list}>
              {(items) =>
                items.length === 0 ? (
                  <EmptyState
                    title="출석 기록이 없습니다"
                    description="가입한 동아리나 승인된 프로그램의 출석부가 만들어지면 여기에 표시됩니다."
                  />
                ) : (
                  <View style={{ gap: space.lg, paddingTop: space.xl, paddingBottom: space.xl }}>
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
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  groupHeader: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md, paddingBottom: space.sm },
});
