import { useQueryClient, type Query } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Dimensions, Platform, Share, StyleSheet, View } from 'react-native';
import { apiLog } from '@/api';
import { mockDev } from '@/api/mock/client';
import type { Scenario } from '@/api/mock/store';
import { API_BASE_URL, API_MODE, IS_MOCK } from '@/config/env';
import { providerStates } from '@/config/oauth';
import { USER_STATUS } from '@/domain/labels';
import { can, PERMISSION_LABEL, PERMISSIONS, ROLE_LABEL, ROLE_ORDER } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import { formatDateTime } from '@/lib/format';
import { NoPermission, Rows, useCan } from '~/admin-kit/components';
import {
  Badge,
  Button,
  Chips,
  Divider,
  EmptyState,
  FormSection,
  Gutter,
  InfoRow,
  ListRow,
  pickOption,
  Screen,
  SectionHeader,
  SelectField,
  SwitchRow,
  TextField,
  Txt,
  space,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

type Section = 'env' | 'session' | 'requests' | 'cache' | 'data';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'env', label: '환경' },
  { value: 'session', label: '세션·권한' },
  { value: 'requests', label: 'API 요청' },
  { value: 'cache', label: '쿼리 캐시' },
  { value: 'data', label: 'mock 데이터' },
];

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'normal', label: '정상' },
  { value: 'slow', label: '느린 응답 (1.5초)' },
  { value: 'empty', label: '빈 데이터' },
  { value: 'error', label: '서버 오류' },
];

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour12: false, timeZone: 'Asia/Seoul' });

/* ---------- 환경 ---------- */

function Environment() {
  const { width, height, scale } = Dimensions.get('window');
  const rows: [string, string][] = [
    ['앱', `${Constants.expoConfig?.name ?? '-'} ${Constants.expoConfig?.version ?? ''}`],
    ['플랫폼', `${Platform.OS} ${String(Platform.Version)}`],
    ['화면', `${Math.round(width)}×${Math.round(height)} · 배율 ${scale}`],
    ['시간대', Intl.DateTimeFormat().resolvedOptions().timeZone],
    ['API 모드', API_MODE === 'mock' ? 'mock (데모 데이터)' : 'http (실서버)'],
    ['API 주소', API_BASE_URL || '없음 (mock)'],
    [
      '소셜 로그인',
      providerStates()
        .map((p) => `${p.label} ${p.enabled ? '사용' : '설정 필요'}`)
        .join(' · '),
    ],
  ];
  const share = () => {
    const lines = [...rows, ['확인 시각', formatDateTime(new Date().toISOString())]];
    void Share.share({ message: lines.map(([k, v]) => `${k}: ${v}`).join('\n') });
  };
  return (
    <>
      <SectionHeader title="환경 정보" />
      <Gutter>
        {rows.map(([k, v]) => (
          <InfoRow key={k} label={k} value={v} />
        ))}
        <View style={styles.actions}>
          <Button label="진단 정보 공유" variant="secondary" size="md" onPress={share} />
        </View>
      </Gutter>
    </>
  );
}

/* ---------- 세션·권한 ---------- */

function SessionAndPermissions() {
  const session = useSession().data;
  return (
    <>
      <SectionHeader title="내 세션" />
      <Gutter>
        {session ? (
          <>
            <InfoRow label="회원 ID" value={session.user.id} />
            <InfoRow label="이름" value={`${session.user.name} · ${session.user.email}`} />
            <InfoRow label="역할" value={session.user.roles.map((r) => ROLE_LABEL[r]).join(', ')} />
            <InfoRow label="상태" value={USER_STATUS[session.user.status].text} />
            <InfoRow
              label="담당 동아리"
              value={session.user.managedClubIds.length ? session.user.managedClubIds.join(', ') : '없음'}
            />
            <InfoRow label="세션 만료" value={formatDateTime(session.expiresAt)} />
          </>
        ) : (
          <Txt color="textSecondary">세션 정보가 없습니다.</Txt>
        )}
      </Gutter>
      <Divider thick />
      <SectionHeader title="역할별 권한" />
      <Rows
        items={PERMISSIONS}
        rowKey={(p) => p}
        render={(p) => {
          const roles = ROLE_ORDER.filter((r) => can({ roles: [r], status: 'active' }, p));
          const mine = can(session?.user, p);
          return (
            <ListRow
              meta={p}
              title={PERMISSION_LABEL[p]}
              subtitle={roles.map((r) => ROLE_LABEL[r]).join(' · ')}
              trailing={<Badge text={mine ? '나: 허용' : '나: 불가'} tone={mine ? 'success' : 'neutral'} />}
            />
          );
        }}
      />
    </>
  );
}

/* ---------- API 요청 로그 ---------- */

function Requests() {
  const entries = useSyncExternalStore(apiLog.subscribe, apiLog.entries);
  const [errorsOnly, setErrorsOnly] = useState(false);
  const rows = errorsOnly ? entries.filter((e) => !e.ok) : entries;
  const failed = entries.filter((e) => !e.ok).length;
  const avg = entries.length ? Math.round(entries.reduce((n, e) => n + e.durationMs, 0) / entries.length) : 0;
  return (
    <>
      <SectionHeader title="API 요청 로그" />
      <Gutter style={{ gap: space.sm }}>
        <Txt variant="caption" color="textTertiary">
          최근 200건 · 평균 {avg}ms · 실패 {failed}건 · 요청 본문은 기록하지 않습니다
        </Txt>
        <SwitchRow label="실패만 보기" value={errorsOnly} onValueChange={setErrorsOnly} />
        <Button
          label="비우기"
          variant="secondary"
          size="md"
          onPress={() => apiLog.clear()}
          disabled={!entries.length}
        />
      </Gutter>
      {rows.length === 0 ? (
        <EmptyState title="기록된 요청이 없습니다" />
      ) : (
        <Rows
          items={rows}
          rowKey={(e) => String(e.id)}
          render={(e) => (
            <ListRow
              meta={`${clock(e.at)} · ${e.durationMs}ms`}
              title={e.method}
              numberOfLines={1}
              trailing={
                <Badge text={e.ok ? '성공' : (e.error ?? '실패')} tone={e.ok ? 'success' : 'danger'} />
              }
            />
          )}
        />
      )}
    </>
  );
}

/* ---------- 쿼리 캐시 ---------- */

function useCachedQueries(): Query[] {
  const qc = useQueryClient();
  const cache = qc.getQueryCache();
  const [, setTick] = useState(0);
  useEffect(() => cache.subscribe(() => setTick((t) => t + 1)), [cache]);
  return [...cache.getAll()].sort((a, b) => b.state.dataUpdatedAt - a.state.dataUpdatedAt);
}

const QUERY_STATUS = {
  success: { text: '성공', tone: 'success' },
  error: { text: '오류', tone: 'danger' },
  pending: { text: '대기', tone: 'neutral' },
} as const;

function Cache() {
  const qc = useQueryClient();
  const queries = useCachedQueries();
  const act = async (q: Query) => {
    const i = await pickOption(JSON.stringify(q.queryKey), ['다시 불러오기', '캐시에서 삭제']);
    if (i === 0) void qc.refetchQueries({ queryKey: q.queryKey, exact: true });
    if (i === 1) qc.removeQueries({ queryKey: q.queryKey, exact: true });
  };
  return (
    <>
      <SectionHeader title={`쿼리 캐시 ${queries.length}건`} />
      <Gutter style={styles.actions}>
        <Button
          label="전체 무효화"
          variant="secondary"
          size="md"
          onPress={() => void qc.invalidateQueries()}
        />
        <Button
          label="캐시 비우기 (세션 제외)"
          variant="secondary"
          size="md"
          onPress={() => qc.removeQueries({ predicate: (q) => q.queryKey[0] !== 'session' })}
        />
      </Gutter>
      <Rows
        items={queries}
        rowKey={(q) => q.queryHash}
        render={(q) => {
          const status = QUERY_STATUS[q.state.status];
          const updated = q.state.dataUpdatedAt
            ? `갱신 ${clock(new Date(q.state.dataUpdatedAt).toISOString())}`
            : '데이터 없음';
          return (
            <ListRow
              title={JSON.stringify(q.queryKey)}
              numberOfLines={1}
              subtitle={`${updated} · 보는 화면 ${q.getObserversCount()}`}
              trailing={<Badge text={status.text} tone={status.tone} />}
              onPress={() => void act(q)}
            />
          );
        }}
      />
    </>
  );
}

/* ---------- mock 데이터 ---------- */

function MockData() {
  const qc = useQueryClient();
  const [scenario, setScenario] = useState<Scenario>(() => mockDev.readScenario());
  const [json, setJson] = useState('');
  if (!IS_MOCK) {
    return <EmptyState title="실서버(http) 모드에서는 개발용 데이터 도구를 쓰지 않습니다" />;
  }

  const importJson = () => {
    try {
      mockDev.importDb(json);
      setJson('');
      void qc.invalidateQueries();
      notify('불러왔습니다', 'mock 데이터를 교체했습니다.');
    } catch (e) {
      notify('불러오지 못했습니다', e instanceof Error ? e.message : undefined);
    }
  };
  const reset = async () => {
    const ok = await confirm({
      title: 'mock 데이터를 초기화할까요?',
      message: '변경한 데이터와 로그인 세션이 시드 상태로 돌아갑니다.',
      confirmLabel: '초기화',
      destructive: true,
    });
    if (!ok) return;
    mockDev.reset();
    qc.clear();
  };

  return (
    <>
      <FormSection title="응답 시나리오">
        <SelectField
          label="모든 API 응답"
          value={scenario}
          options={SCENARIOS}
          onChange={(v) => {
            mockDev.setScenario(v);
            setScenario(v);
            void qc.invalidateQueries();
          }}
        />
      </FormSection>
      <FormSection title="데이터">
        <Txt variant="caption" color="textTertiary">
          mock 데이터는 앱이 실행되는 동안 메모리에만 있습니다. 내보낸 JSON 으로 같은 상태를 재현할 수
          있습니다.
        </Txt>
        <Button
          label="데이터 내보내기 (공유)"
          variant="secondary"
          onPress={() => void Share.share({ message: mockDev.exportDb() })}
        />
        <TextField
          label="가져올 JSON"
          value={json}
          onChangeText={setJson}
          multiline
          placeholder="내보낸 JSON 을 붙여 넣으세요"
          autoCorrect={false}
        />
        <Button label="데이터 가져오기" variant="secondary" disabled={!json.trim()} onPress={importJson} />
        <Button
          label="세션 만료 재현"
          variant="secondary"
          onPress={() => {
            mockDev.expireSession();
            void qc.invalidateQueries();
          }}
        />
        <Button label="데이터 초기화" variant="danger" onPress={() => void reset()} />
      </FormSection>
    </>
  );
}

export default function DeveloperTools() {
  const allowed = useCan();
  const [section, setSection] = useState<Section>('env');
  return (
    <>
      <Stack.Screen options={{ title: '개발자 도구' }} />
      {allowed('developer.access') ? (
        <Screen>
          <View style={{ paddingVertical: space.md }}>
            <Chips options={SECTIONS} value={section} onChange={setSection} />
          </View>
          <Divider />
          {section === 'env' && <Environment />}
          {section === 'session' && <SessionAndPermissions />}
          {section === 'requests' && <Requests />}
          {section === 'cache' && <Cache />}
          {section === 'data' && <MockData />}
        </Screen>
      ) : (
        <NoPermission />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  actions: { gap: space.sm, paddingTop: space.md },
});
