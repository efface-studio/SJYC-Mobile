import { useState } from 'react';
import { Stack } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api';
import {
  contactLabels,
  audienceLabels,
  type LoginAudience,
  type ContactRule,
  type ContactSettings,
} from '@/domain/login-contact';
import { useCan, NoPermission } from '~/admin-kit/components';
import { Button, FormSection, Gutter, QueryBoundary, Screen, SwitchRow, Txt } from '~/ds';
import { notify } from '~/shared/dialogs';
const key = ['admin', 'login-contact'];
function AudienceSettings({
  audience,
  record,
}: {
  audience: LoginAudience;
  record: ContactSettings[LoginAudience];
}) {
  const [rule, setRule] = useState<ContactRule>(
    record.rule ?? { allowUnverifiedEmail: true, allowUnverifiedPhone: true },
  );
  const cache = useQueryClient();
  const save = useMutation({
    mutationFn: () => api.admin.setLoginContact({ ...rule, audience, version: record.version }),
    onSuccess: (next) => {
      cache.setQueryData(key, next);
      notify(audienceLabels[audience] + ' 정책을 저장했습니다');
    },
    onError: (e) => {
      notify('정책을 저장하지 못했습니다', errorMessage(e));
      void cache.invalidateQueries({ queryKey: key });
    },
  });
  const unchanged =
    record.rule &&
    record.rule.allowUnverifiedEmail === rule.allowUnverifiedEmail &&
    record.rule.allowUnverifiedPhone === rule.allowUnverifiedPhone;
  return (
    <FormSection title={audienceLabels[audience]}>
      {!record.rule && (
        <Txt variant="caption" color="textSecondary">
          아직 별도 정책이 없습니다. 아래 설정을 저장하면 다음 로그인부터 적용됩니다.
        </Txt>
      )}
      {(['allowUnverifiedEmail', 'allowUnverifiedPhone'] as const).map((k) => (
        <SwitchRow
          key={k}
          label={contactLabels[k]}
          value={rule[k]}
          disabled={save.isPending}
          onValueChange={(v) => setRule({ ...rule, [k]: v })}
        />
      ))}
      <Button
        label={audienceLabels[audience] + ' 정책 저장'}
        variant="secondary"
        size="md"
        disabled={!!unchanged}
        loading={save.isPending}
        onPress={() => save.mutate()}
      />
    </FormSection>
  );
}
export default function ContactSettingsScreen() {
  const allowed = useCan()('site.manage');
  const q = useQuery({ queryKey: key, queryFn: api.admin.loginContact, enabled: allowed });
  if (!allowed) return <NoPermission />;
  return (
    <>
      <Stack.Screen options={{ title: '로그인 정책' }} />
      <Screen onRefresh={q.refetch}>
        <Gutter>
          <Txt variant="caption" color="textSecondary">
            허용을 끈 항목은 다음 로그인부터 인증이 필요합니다.
          </Txt>
        </Gutter>
        <QueryBoundary layout="settings" query={q}>
          {(data) => (
            <>
              {(['user', 'admin'] as const).map((a) => (
                <AudienceSettings key={a + data[a].version} audience={a} record={data[a]} />
              ))}
            </>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}
