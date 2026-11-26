import { useState } from 'react';
import { View } from 'react-native';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api';
import { ROLE_LABEL, ROLE_ORDER, PERMISSIONS, PERMISSION_LABEL } from '@/domain/permissions';
import {
  scheduledTime,
  waveStateLabels,
  type Audience,
  type AppUpdate,
  type WaveAction,
} from '@/domain/app-update';
import { formatDateTime } from '@/lib/format';
import { Button, DateField, FormSection, QueryBoundary, SelectField, SwitchRow, TextField, Txt } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

export function PublicationOptions() {
  const cache = useQueryClient(),
    key = ['admin', 'publication-settings'];
  const query = useQuery({ queryKey: key, queryFn: api.admin.publicationSettings });
  const save = useMutation({
    mutationFn: api.admin.configurePublication,
    onSuccess: (data) => {
      cache.setQueryData(key, data);
    },
    onError: (err) => {
      notify('설정을 저장하지 못했어요', errorMessage(err));
      void query.refetch();
    },
  });
  return (
    <QueryBoundary query={query}>
      {(s) => (
        <FormSection title="발행 설정">
          <SwitchRow
            label="자동 발행"
            description={
              s.automatic
                ? '준비된 새 릴리스를 전체에 배포합니다.'
                : '새 릴리스는 대기하며 대상과 시각을 선택한 후 배포합니다.'
            }
            value={s.automatic}
            disabled={save.isPending}
            onValueChange={(automatic) => save.mutate({ automatic, version: s.version })}
          />
          <Txt variant="captionStrong">업데이트 스플래시 표시</Txt>
          {(
            [
              ['percent', '퍼센트'],
              ['bar', '진행 막대'],
              ['notes', '업데이트 내용'],
            ] as const
          ).map(([k, label]) => (
            <SwitchRow
              key={k}
              label={label}
              value={s.splash[k]}
              disabled={save.isPending}
              onValueChange={(v) => save.mutate({ version: s.version, splash: { ...s.splash, [k]: v } })}
            />
          ))}
        </FormSection>
      )}
    </QueryBoundary>
  );
}

export function WaveManager({
  release: r,
  refresh,
}: {
  release: AppUpdate;
  refresh: () => Promise<unknown>;
}) {
  const [kind, setKind] = useState<Audience['kind']>('everyone'),
    [emails, setEmails] = useState('');
  const [role, setRole] = useState<(typeof ROLE_ORDER)[number]>('staff'),
    [permission, setPermission] = useState<(typeof PERMISSIONS)[number]>('admin.access');
  const [percent, setPercent] = useState('100'),
    [scheduled, schedule] = useState(false),
    [date, setDate] = useState(new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 10)),
    [time, setTime] = useState('18:00');
  const save = useMutation({
    mutationFn: (input: WaveAction) => api.admin.changeWave(r.id, input),
    onSettled: refresh,
    onError: (err) => notify('배포 설정 오류', errorMessage(err)),
  });
  const version = r.planVersion ?? 0,
    waves = r.waves ?? [],
    remaining = !waves.some((w) => w.everyone && w.state !== 'cancelled');
  async function publish() {
    try {
      const at = scheduled ? scheduledTime(date + ' ' + time) : undefined;
      const scope: Audience =
        kind === 'users'
          ? {
              kind,
              emails: emails
                .trim()
                .split(/[\s,;]+/)
                .filter(Boolean),
            }
          : kind === 'role'
            ? { kind, role }
            : kind === 'permission'
              ? { kind, permission }
              : { kind };
      if (scope.kind === 'users' && !scope.emails.length)
        throw new Error('받을 회원의 이메일을 입력해 주세요.');
      if (
        await confirm({
          title: scheduled ? '배포를 예약할까요?' : '지금 배포할까요?',
          message: '선택한 미배정 대상 중 ' + percent + '%에 적용합니다.',
          confirmLabel: scheduled ? '예약' : '배포',
        })
      )
        save.mutate({ action: 'publish', scope, percent: Number(percent), at, version });
    } catch (e) {
      notify('배포 조건을 확인해 주세요', e instanceof Error ? e.message : '잘못된 입력입니다.');
    }
  }
  return (
    <FormSection title="배포 차수">
      {waves.map((w, i) => (
        <View key={w.id} style={{ gap: 4 }}>
          <Txt variant="bodyStrong">
            {i + 1}차 · {waveStateLabels[w.state]}
          </Txt>
          <Txt variant="caption">
            {formatDateTime(w.at)} ·{' '}
            {ROLE_LABEL[w.label as keyof typeof ROLE_LABEL] ??
              PERMISSION_LABEL[w.label as keyof typeof PERMISSION_LABEL] ??
              w.label}{' '}
            · {w.percent}% · {w.count}명{w.everyone ? ' 및 신규 설치' : ''}
          </Txt>
          {r.live && (w.state === 'scheduled' || w.state === 'active') && (
            <Button
              variant="text"
              size="md"
              label={w.state === 'scheduled' ? '예약 취소' : '이 차수만 롤백'}
              disabled={save.isPending}
              onPress={async () => {
                const cancel = w.state === 'scheduled';
                if (
                  await confirm({
                    title: cancel ? '예약을 취소할까요?' : '이 차수만 되돌릴까요?',
                    message: cancel
                      ? '이 차수의 예약을 해제합니다.'
                      : '이 차수 대상만 직전 전체 배포본 또는 내장 버전으로 돌아갑니다.',
                    confirmLabel: cancel ? '예약 취소' : '롤백',
                    destructive: true,
                  })
                )
                  save.mutate({ action: cancel ? 'cancel' : 'undo', waveId: w.id, version });
              }}
            />
          )}
        </View>
      ))}
      {r.live && remaining && (
        <>
          <SelectField
            label="배포 대상"
            value={kind}
            onChange={setKind}
            options={[
              { value: 'everyone', label: waves.length ? '남은 대상 전체' : '전체' },
              { value: 'users', label: '특정 회원' },
              { value: 'role', label: '역할' },
              { value: 'permission', label: '기능 권한' },
            ]}
          />
          {kind === 'users' && (
            <TextField
              label="회원 이메일"
              value={emails}
              onChangeText={setEmails}
              placeholder="여러 명은 쉼표로 구분"
              autoCapitalize="none"
            />
          )}
          {kind === 'role' && (
            <SelectField
              label="역할"
              value={role}
              onChange={setRole}
              options={ROLE_ORDER.map((value) => ({ value, label: ROLE_LABEL[value] }))}
            />
          )}
          {kind === 'permission' && (
            <SelectField
              label="기능 권한"
              value={permission}
              onChange={setPermission}
              options={PERMISSIONS.map((value) => ({ value, label: PERMISSION_LABEL[value] }))}
            />
          )}
          <SelectField
            label="미배정 대상 중 배포 비율"
            value={percent}
            onChange={setPercent}
            options={['10', '25', '50', '75', '100'].map((value) => ({ value, label: value + '%' }))}
          />
          <SwitchRow label="예약 배포" value={scheduled} onValueChange={schedule} />
          {scheduled && (
            <>
              <DateField label="예약 날짜 (한국시간)" value={date} onChange={setDate} />
              <TextField
                label="예약 시각 (한국시간)"
                value={time}
                onChangeText={setTime}
                placeholder="18:00"
                maxLength={5}
              />
            </>
          )}
          <Button label={scheduled ? '배포 예약' : '지금 배포'} onPress={publish} disabled={save.isPending} />
        </>
      )}
    </FormSection>
  );
}
