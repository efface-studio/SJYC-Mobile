import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { mockDev } from '@/api/mock/client';
import { DEMO_ACCOUNTS } from '@/api/mock/seed';
import type { Scenario } from '@/api/mock/store';
import { IS_MOCK } from '@/config/env';
import { Button, Divider, EmptyState, FormSection, ListRow, Screen, SectionHeader, SelectField } from '~/ds';
import { confirm } from '~/shared/dialogs';
import { Rows } from '~/user-kit';

const SCENARIOS: { value: Scenario; label: string }[] = [
  { value: 'normal', label: '정상 — 샘플 데이터' },
  { value: 'slow', label: '느린 응답 (1.5초)' },
  { value: 'empty', label: '빈 데이터' },
  { value: 'error', label: '서버 오류' },
];

/** 웹 상단 "개발 도구"와 같은 기능 — mock 모드에서만 열린다 */
export default function DevToolsScreen() {
  const qc = useQueryClient();
  const [scenario, setScenario] = useState<Scenario>(() => mockDev.readScenario());

  if (!IS_MOCK) {
    return (
      <Screen>
        <EmptyState title="실서버 모드에서는 개발 도구를 쓸 수 없습니다" />
      </Screen>
    );
  }

  return (
    <Screen>
      <FormSection title="응답 시나리오">
        <SelectField
          label="API 응답"
          value={scenario}
          options={SCENARIOS}
          onChange={(s) => {
            mockDev.setScenario(s);
            setScenario(s);
            void qc.invalidateQueries();
          }}
        />
      </FormSection>
      <FormSection title="세션 · 데이터">
        <Button
          label="로그인 세션 만료시키기"
          variant="secondary"
          onPress={() => {
            mockDev.expireSession();
            void qc.invalidateQueries();
          }}
        />
        <Button
          label="샘플 데이터 초기화"
          variant="danger"
          onPress={async () => {
            const ok = await confirm({
              title: '샘플 데이터를 초기화할까요?',
              confirmLabel: '초기화',
              destructive: true,
            });
            if (!ok) return;
            mockDev.reset();
            qc.clear();
            router.dismissAll();
          }}
        />
      </FormSection>
      <Divider thick />
      <SectionHeader title="데모 계정" />
      <Rows>
        {DEMO_ACCOUNTS.map((a) => (
          <ListRow key={a.email} title={a.label} subtitle={`${a.email} · 로그인 화면에서 바로 로그인`} />
        ))}
      </Rows>
    </Screen>
  );
}
