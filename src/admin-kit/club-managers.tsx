import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { managerEmailSchema, parseValues } from '@/domain/schemas';
import type { ClubManager } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { Button, FormSection, ListRow, QueryBoundary, TextField, Txt } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Rows } from './components';
import { useInvalidateAdmin } from './queries';

/** 동아리별 담당자 지정·해제 (센터 직원 이상) — 담당자는 그 동아리의 회원·가입·출석·소식·소개를 관리한다 */
export function ClubManagersSection({ clubId, clubName }: { clubId: string; clubName: string }) {
  const invalidate = useInvalidateAdmin();
  const managers = useQuery({
    queryKey: ['admin', 'club', clubId, 'managers'],
    queryFn: () => api.admin.clubs.managers(clubId),
  });
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | undefined>();
  const assign = useMutation({
    mutationFn: (value: string) => api.admin.clubs.assignManager(clubId, value),
    onSuccess: async (m) => {
      setEmail('');
      setError(undefined);
      await invalidate();
      notify('담당자로 지정했습니다', `${m.name}님에게 알림이 갑니다.`);
    },
    onError: (e) => setError(errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (m: ClubManager) => api.admin.clubs.removeManager(clubId, m.userId),
    onSuccess: () => invalidate(),
    onError: (e) => notify('해제하지 못했습니다', errorMessage(e)),
  });

  const submit = () => {
    const parsed = parseValues(managerEmailSchema, { email });
    if (!parsed.ok) {
      setError(parsed.errors.email);
      return;
    }
    assign.mutate(parsed.data.email);
  };
  const askRemove = async (m: ClubManager) => {
    const ok = await confirm({
      title: '담당자 지정을 해제할까요?',
      message: `${m.name}님은 더 이상 ${clubName}을(를) 운영할 수 없습니다.`,
      confirmLabel: '해제',
      destructive: true,
    });
    if (ok) remove.mutate(m);
  };

  return (
    <FormSection title="동아리 담당자">
      <Txt variant="caption" color="textTertiary">
        담당자는 관리자 앱 더보기 → 동아리 운영에서 이 동아리의 회원·가입 신청·출석·소식·소개만 관리합니다.
      </Txt>
      <QueryBoundary query={managers}>
        {(list) =>
          list.length === 0 ? (
            <Txt variant="body" color="textSecondary">
              지정된 담당자가 없습니다.
            </Txt>
          ) : (
            <Rows
              items={list}
              rowKey={(m) => m.userId}
              render={(m) => (
                <ListRow
                  title={m.name}
                  subtitle={`${m.email} · ${formatDate(m.assignedAt)} 지정`}
                  onPress={() => void askRemove(m)}
                />
              )}
            />
          )
        }
      </QueryBoundary>
      <TextField
        label="담당자로 지정할 회원 이메일"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoComplete="off"
        autoCorrect={false}
        error={error}
        returnKeyType="done"
        onSubmitEditing={submit}
      />
      <Button label="담당자 지정" variant="secondary" loading={assign.isPending} onPress={submit} />
    </FormSection>
  );
}
