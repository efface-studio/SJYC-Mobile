import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { POLICY_TITLE } from '@/domain/labels';
import { parseValues, policyFormSchema, type FieldErrors, type PolicyFormInput } from '@/domain/schemas';
import type { PolicyDoc } from '@/domain/types';
import { formatDateTime, toDateInput, todayKst } from '@/lib/format';
import { DetailHeader, NoPermission, ScreenMessage, useCan } from '~/admin-kit/components';
import { policiesQuery, useInvalidateAdmin } from '~/admin-kit/queries';
import {
  Button,
  DateField,
  Divider,
  FormSection,
  QueryBoundary,
  Screen,
  StickyFooter,
  TextField,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

export default function PolicyEdit() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const allowed = useCan()('policy.manage');
  const docs = useQuery({ ...policiesQuery, enabled: allowed });
  const doc = docs.data?.find((d) => d.key === key);

  return (
    <>
      <Stack.Screen options={{ title: doc ? `${POLICY_TITLE[doc.key]} 개정` : '정책 문서' }} />
      {allowed ? (
        <QueryBoundary query={docs}>
          {() =>
            doc ? (
              <PolicyEditor key={`${doc.key}-${doc.updatedAt}`} doc={doc} />
            ) : (
              <ScreenMessage title="문서를 찾을 수 없습니다" />
            )
          }
        </QueryBoundary>
      ) : (
        <NoPermission />
      )}
    </>
  );
}

function PolicyEditor({ doc }: { doc: PolicyDoc }) {
  const invalidate = useInvalidateAdmin();
  const [effectiveAt, setEffectiveAt] = useState(doc.effectiveAt ? toDateInput(doc.effectiveAt) : todayKst());
  const [body, setBody] = useState(doc.body);
  const [errors, setErrors] = useState<FieldErrors>({});
  const publish = useMutation({
    mutationFn: (input: PolicyFormInput) => api.admin.policies.update(doc.key, input),
    onSuccess: () => {
      router.back();
      void invalidate();
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('개정본을 게시하지 못했습니다', errorMessage(e));
    },
  });

  const submit = async () => {
    if (publish.isPending) return;
    const parsed = parseValues(policyFormSchema, { body, effectiveAt });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    const ok = await confirm({
      title: `${POLICY_TITLE[doc.key]} 개정본을 게시할까요?`,
      message: `개정본을 게시하면 사용자 화면에 즉시 반영됩니다. 시행일: ${parsed.data.effectiveAt}`,
      confirmLabel: '게시',
    });
    if (ok) publish.mutate(parsed.data);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label="개정본 게시" onPress={() => void submit()} loading={publish.isPending} />
        </StickyFooter>
      }
    >
      <DetailHeader
        meta="정책 문서"
        title={POLICY_TITLE[doc.key]}
        caption={`최종 수정 ${formatDateTime(doc.updatedAt)}`}
        status={
          doc.confirmed ? { text: '확정', tone: 'success' } : { text: '확정본 미등록', tone: 'warning' }
        }
      />
      <Divider thick />
      <FormSection title="개정본">
        <DateField label="시행일" value={effectiveAt} onChange={setEffectiveAt} error={errors.effectiveAt} />
        <TextField
          label="본문"
          value={body}
          onChangeText={setBody}
          hint="일반 텍스트 — 센터가 확정한 문안만 등록하세요"
          multiline
          maxLength={50000}
          error={errors.body}
        />
      </FormSection>
    </Screen>
  );
}
