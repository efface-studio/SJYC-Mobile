import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { attendanceTargetKey, sessionCounts } from '@/domain/attendance';
import { ATTENDANCE_STATUS, ATTENDANCE_TARGET_LABEL } from '@/domain/labels';
import { canManageAttendance } from '@/domain/permissions';
import { attendanceSessionSchema, parseValues, type FieldErrors } from '@/domain/schemas';
import type { AttendanceSession, AttendanceTargetSummary } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { todayKst } from '@/lib/format';
import { NoPermission, Rows } from '~/admin-kit/components';
import {
  Badge,
  Button,
  DateField,
  EmptyState,
  FormSection,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  SelectField,
  TextField,
} from '~/ds';
import { notify } from '~/shared/dialogs';

const STATUSES = ['present', 'late', 'absent', 'excused'] as const;

const summary = (s: AttendanceSession) => {
  const c = sessionCounts(s);
  return [...STATUSES.map((k) => `${ATTENDANCE_STATUS[k].text} ${c[k]}`), `미체크 ${c.unchecked}`].join(
    ' · ',
  );
};

function CreateSession({ target, count }: { target: AttendanceTargetSummary; count: number }) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayKst());
  const [title, setTitle] = useState(target.type === 'program' ? `${count + 1}회차` : '정기 모임');
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useMutation({
    mutationFn: () => api.attendance.create(target, { date, title }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      router.push(`/attendance/${s.id}`);
    },
    onError: (e) => notify('출석부를 만들지 못했습니다', errorMessage(e)),
  });
  const submit = () => {
    const parsed = parseValues(attendanceSessionSchema, { date, title });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    create.mutate();
  };
  return (
    <FormSection title="새 출석부">
      <DateField label="날짜" value={date} onChange={setDate} />
      <TextField
        label="회차 이름"
        value={title}
        onChangeText={setTitle}
        maxLength={50}
        error={errors.title}
      />
      <Button label="출석부 만들기" loading={create.isPending} onPress={submit} />
    </FormSection>
  );
}

function TargetPanel({ target }: { target: AttendanceTargetSummary }) {
  const sessions = useQuery({
    queryKey: ['attendance', 'sessions', attendanceTargetKey(target)],
    queryFn: () => api.attendance.sessions(target),
  });
  const stats = useQuery({
    queryKey: ['attendance', 'stats', attendanceTargetKey(target)],
    queryFn: () => api.attendance.stats(target),
  });
  return (
    <QueryBoundary query={sessions}>
      {(list) => (
        <>
          <CreateSession target={target} count={list.length} />
          <SectionHeader title={`출석부 ${list.length}개 · 명단 ${target.rosterCount}명`} />
          {list.length === 0 ? (
            <EmptyState title="아직 출석부가 없습니다" />
          ) : (
            <Rows
              items={list}
              rowKey={(s) => s.id}
              render={(s) => (
                <ListRow
                  meta={s.date}
                  title={s.title}
                  subtitle={summary(s)}
                  trailing={s.checkInCode ? <Badge text="코드 진행 중" tone="brand" /> : undefined}
                  onPress={() => router.push(`/attendance/${s.id}`)}
                />
              )}
            />
          )}
          <SectionHeader title="회원별 출석" />
          <QueryBoundary query={stats}>
            {(rows) =>
              rows.length === 0 ? (
                <EmptyState title="통계가 없습니다" description="출석을 체크하면 회원별로 누적됩니다." />
              ) : (
                <Rows
                  items={rows}
                  rowKey={(r) => r.userId}
                  render={(r) => (
                    <ListRow
                      title={r.name}
                      subtitle={STATUSES.map((k) => `${ATTENDANCE_STATUS[k].text} ${r[k]}`).join(' · ')}
                      trailing={<Badge text={r.rate === null ? '—' : `${r.rate}%`} tone="brand" />}
                    />
                  )}
                />
              )
            }
          </QueryBoundary>
        </>
      )}
    </QueryBoundary>
  );
}

export default function AttendanceScreen() {
  const user = useSession().data?.user;
  const allowed = canManageAttendance(user);
  const { target } = useLocalSearchParams<{ target?: string }>();
  const [key, setKey] = useState(target ?? '');
  const targets = useQuery({
    queryKey: ['attendance', 'targets'],
    queryFn: () => api.attendance.targets(),
    enabled: allowed,
  });

  return (
    <>
      <Stack.Screen options={{ title: '출석' }} />
      {!allowed ? (
        <NoPermission />
      ) : (
        <Screen onRefresh={() => targets.refetch()}>
          <QueryBoundary query={targets}>
            {(list) => {
              if (list.length === 0) {
                return <EmptyState title="출석을 관리할 동아리·프로그램이 없습니다" />;
              }
              const current =
                list.find((t) => attendanceTargetKey(t) === key) ??
                list.find((t) => t.sessionCount > 0) ??
                list[0]!;
              return (
                <>
                  <FormSection title="출석 대상">
                    <SelectField
                      label="동아리 · 프로그램"
                      value={attendanceTargetKey(current)}
                      options={list.map((t) => ({
                        value: attendanceTargetKey(t),
                        label: `[${ATTENDANCE_TARGET_LABEL[t.type]}] ${t.name} · ${t.rosterCount}명`,
                      }))}
                      onChange={setKey}
                    />
                  </FormSection>
                  <TargetPanel key={attendanceTargetKey(current)} target={current} />
                </>
              );
            }}
          </QueryBoundary>
        </Screen>
      )}
    </>
  );
}
