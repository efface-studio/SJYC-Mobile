import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { attendanceSessionSchema, parseValues, type FieldErrors } from '@/domain/schemas';
import type { AttendanceSession, AttendanceTargetSummary } from '@/domain/types';
import { todayKst } from '@/lib/format';
import { Button, Card, DateField, FormSection, Gutter, TextField, Txt, space } from '~/ds';
import { notify } from '~/shared/dialogs';
import { AttendanceQR } from './attendance-qr';
import { AttendanceBarcode } from './attendance-barcode';

export function CreateSession({
  target,
  count,
  onCreated,
}: {
  target: AttendanceTargetSummary;
  count: number;
  onCreated: (session: AttendanceSession) => void;
}) {
  const qc = useQueryClient();
  const [date, setDate] = useState(todayKst());
  const [title, setTitle] = useState(target.type === 'program' ? `${count + 1}회차` : '정기 모임');
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useMutation({
    mutationFn: () => api.attendance.create(target, { date, title }),
    onSuccess: (s) => {
      void qc.invalidateQueries({ queryKey: ['attendance'] });
      onCreated(s);
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

function useRemaining(until: string | null): string | null {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!until) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [until]);
  if (!until) return null;
  const left = Math.max(0, Math.floor((Date.parse(until) - now) / 1000));
  return `${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
}

export function CheckIn({
  session,
  onChange,
  barcode = false,
}: {
  session: AttendanceSession;
  barcode?: boolean;
  onChange: (s: AttendanceSession) => void;
}) {
  const remaining = useRemaining(session.checkInClosesAt);
  const toggle = useMutation({
    mutationFn: (open: boolean) => api.attendance.setCheckIn(session.id, open),
    onSuccess: onChange,
    onError: (e) => notify('출석 코드를 바꾸지 못했습니다', errorMessage(e)),
  });
  const open = !!session.checkInCode && !!remaining && remaining !== '0:00';
  return (
    <Gutter>
      <Card tone={open ? 'brand' : 'subtle'} style={{ gap: space.md }}>
        <Txt variant="captionStrong" color="textSecondary">
          출석 코드
        </Txt>
        {open ? (
          <>
            <AttendanceQR code={session.checkInCode!} />
            <View accessible accessibilityLabel={`출석 코드 ${session.checkInCode!.split('').join(' ')}`}>
              <Txt variant="display" color="action" style={styles.code}>
                {session.checkInCode}
              </Txt>
            </View>
            {barcode && <AttendanceBarcode code={session.checkInCode!} />}
            <Txt variant="caption" color="textSecondary">
              QR 스캔 또는 숫자 입력 · 남은 시간 {remaining}
            </Txt>
            <Button
              label="코드 닫기"
              variant="secondary"
              size="md"
              loading={toggle.isPending}
              onPress={() => toggle.mutate(false)}
            />
          </>
        ) : (
          <>
            <Txt variant="caption" color="textSecondary">
              코드를 열면 명단의 회원이 10분 동안 직접 출석할 수 있습니다. 담당자가 이미 체크한 회원은 바뀌지
              않습니다.
            </Txt>
            <Button
              label="출석 코드 열기"
              size="md"
              loading={toggle.isPending}
              onPress={() => toggle.mutate(true)}
            />
          </>
        )}
      </Card>
    </Gutter>
  );
}

const styles = StyleSheet.create({
  code: { textAlign: 'center', fontSize: 36, lineHeight: 44, letterSpacing: 6 },
});
