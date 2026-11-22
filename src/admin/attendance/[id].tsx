import { CheckIn } from '~/shared/attendance-controls';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { sessionCounts } from '@/domain/attendance';
import { ATTENDANCE_STATUS, ATTENDANCE_TARGET_LABEL } from '@/domain/labels';
import type { AttendanceMark, AttendanceSession, AttendanceStatus } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { DangerTextButton } from '~/admin-kit/components';
import {
  Button,
  Divider,
  Gutter,
  QueryBoundary,
  Screen,
  SectionHeader,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

const STATUSES: AttendanceStatus[] = ['present', 'late', 'absent', 'excused'];

/** 한 번에 누르는 출석 상태 — 선택된 항목을 다시 누르면 해제 */
function StatusPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: AttendanceStatus | null;
  onChange: (next: AttendanceStatus | null) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.picker} accessibilityRole="radiogroup" accessibilityLabel={`${name} 출석 상태`}>
      {STATUSES.map((s) => {
        const checked = value === s;
        const tone = t.tone[ATTENDANCE_STATUS[s].tone];
        return (
          <Pressable
            key={s}
            onPress={() => onChange(checked ? null : s)}
            accessibilityRole="radio"
            accessibilityState={{ checked }}
            accessibilityLabel={ATTENDANCE_STATUS[s].text}
            android_ripple={{ color: t.pressed, foreground: true }}
            style={({ pressed }) => [
              styles.pick,
              {
                backgroundColor: checked ? tone.fg : pressed ? t.pressed : t.bgSubtle,
                borderColor: checked ? tone.fg : t.line,
              },
            ]}
          >
            <Txt variant="label" color={checked ? t.bg : t.textSecondary}>
              {ATTENDANCE_STATUS[s].text}
            </Txt>
          </Pressable>
        );
      })}
    </View>
  );
}

function SessionView({ session }: { session: AttendanceSession }) {
  const qc = useQueryClient();
  const key = ['attendance', 'session', session.id];
  const update = (s: AttendanceSession) => qc.setQueryData(key, s);
  const mark = useMutation({
    mutationFn: (marks: AttendanceMark[]) => api.attendance.mark(session.id, marks),
    // 누르는 즉시 반영하고, 실패하면 되돌린다
    onMutate: async (marks) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData<AttendanceSession>(key);
      if (prev) {
        qc.setQueryData<AttendanceSession>(key, {
          ...prev,
          records: prev.records.map((r) => {
            const m = marks.find((x) => x.userId === r.userId);
            return m ? { ...r, status: m.status, method: m.status ? 'manager' : null } : r;
          }),
        });
      }
      return { prev };
    },
    onError: (e, _marks, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev);
      notify('저장하지 못했습니다', errorMessage(e));
    },
    onSuccess: (s) => {
      update(s);
      void qc.invalidateQueries({ queryKey: ['attendance', 'sessions'] });
      void qc.invalidateQueries({ queryKey: ['attendance', 'stats'] });
    },
  });
  const remove = useMutation({
    mutationFn: () => api.attendance.remove(session.id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      router.back();
    },
    onError: (e) => notify('삭제하지 못했습니다', errorMessage(e)),
  });
  const c = sessionCounts(session);
  const unchecked = session.records.filter((r) => r.status === null);

  return (
    <Screen>
      <Gutter style={{ gap: 4, paddingVertical: space.lg }}>
        <Txt variant="caption" color="textTertiary">
          {ATTENDANCE_TARGET_LABEL[session.targetType]} · {session.targetName}
        </Txt>
        <Txt variant="title1">
          {session.date} {session.title}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {STATUSES.map((s) => `${ATTENDANCE_STATUS[s].text} ${c[s]}`).join(' · ')} · 미체크 {c.unchecked}
        </Txt>
      </Gutter>
      <CheckIn session={session} onChange={update} />
      <SectionHeader title={`명단 ${session.records.length}명`} />
      <Gutter style={{ paddingBottom: space.md }}>
        <Button
          label={`미체크 ${unchecked.length}명 모두 출석`}
          variant="secondary"
          size="md"
          disabled={unchecked.length === 0 || mark.isPending}
          onPress={() => mark.mutate(unchecked.map((r) => ({ userId: r.userId, status: 'present' })))}
        />
      </Gutter>
      {session.records.map((r, i) => (
        <View key={r.userId}>
          {i > 0 && <Divider inset={20} />}
          <Gutter style={styles.row}>
            <Txt variant="bodyStrong">{r.name}</Txt>
            <Txt variant="caption" color="textTertiary">
              {r.status && r.checkedAt
                ? `${r.method === 'self' ? '본인 출석 코드' : '담당자 체크'} · ${formatDateTime(r.checkedAt)}`
                : '미체크'}
              {r.note ? ` · ${r.note}` : ''}
            </Txt>
            <StatusPicker
              name={r.name}
              value={r.status}
              onChange={(status) => mark.mutate([{ userId: r.userId, status }])}
            />
          </Gutter>
        </View>
      ))}
      <Divider />
      <Gutter style={{ paddingVertical: space.lg }}>
        <DangerTextButton
          label="출석부 삭제"
          disabled={remove.isPending}
          onPress={async () => {
            const ok = await confirm({
              title: '출석부를 삭제할까요?',
              message: '이 회차의 출석 기록이 모두 지워지고 통계에서도 빠집니다.',
              confirmLabel: '삭제',
              destructive: true,
            });
            if (ok) remove.mutate();
          }}
        />
      </Gutter>
    </Screen>
  );
}

export default function AttendanceSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['attendance', 'session', id],
    queryFn: () => api.attendance.get(id),
  });
  return (
    <>
      <Stack.Screen options={{ title: '출석부' }} />
      <QueryBoundary query={query}>{(s) => <SessionView session={s} />}</QueryBoundary>
    </>
  );
}

const styles = StyleSheet.create({
  row: { gap: space.sm, paddingVertical: space.md },
  picker: { flexDirection: 'row', gap: space.xs },
  pick: {
    flex: 1,
    height: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderRadius: radius.md,
    overflow: 'hidden',
  },
});
