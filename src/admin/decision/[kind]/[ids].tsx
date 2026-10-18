import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { errorMessage } from '@/api';
import { parseValues, rejectReasonSchema } from '@/domain/schemas';
import { ScreenMessage } from '~/admin-kit/components';
import { isDecisionKind, reportResult, submitDecision, type DecisionKind } from '~/admin-kit/decision';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import { Button, FormSection, Screen, StickyFooter, TextField } from '~/ds';
import { notify } from '~/shared/dialogs';

/**
 * 반려 사유 입력 화면 — Android 에는 OS 기본 텍스트 입력 다이얼로그가 없어 화면으로 띄운다.
 * (iOS 는 Alert.prompt 를 쓰므로 보통 이 화면을 거치지 않는다) ids 는 쉼표로 구분한 대상 ID 목록.
 */
export default function RejectReason() {
  const params = useLocalSearchParams<{ kind: string; ids: string }>();
  const ids = (params.ids ?? '').split(',').filter(Boolean);
  if (!isDecisionKind(params.kind) || ids.length === 0) return <ScreenMessage title="잘못된 요청입니다" />;
  return <ReasonForm kind={params.kind} ids={ids} />;
}

function ReasonForm({ kind, ids }: { kind: DecisionKind; ids: string[] }) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAdmin();
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string>();
  const bulk = ids.length > 1;
  const reject = useMutation({
    mutationFn: (text: string) => submitDecision(kind, ids, 'rejected', text),
    onSuccess: async (result) => {
      reportResult(result, qc);
      await invalidate();
      router.back();
    },
    onError: (e) => notify('처리하지 못했습니다', errorMessage(e)),
  });

  const submit = () => {
    const parsed = parseValues(rejectReasonSchema, { reason });
    if (!parsed.ok) {
      setError(parsed.errors.reason);
      return;
    }
    setError(undefined);
    reject.mutate(parsed.data.reason);
  };

  return (
    <>
      <Stack.Screen options={{ title: bulk ? `선택한 ${ids.length}건 반려` : '반려 사유' }} />
      <Screen
        footer={
          <StickyFooter>
            <Button
              label={bulk ? `${ids.length}건 반려` : '반려'}
              variant="danger"
              onPress={submit}
              loading={reject.isPending}
            />
          </StickyFooter>
        }
      >
        <FormSection title="반려 사유">
          <TextField
            value={reason}
            onChangeText={setReason}
            placeholder="신청자에게 안내되는 사유"
            hint={bulk ? '같은 사유가 선택한 모든 신청자에게 안내됩니다 · 2~300자' : '2~300자'}
            multiline
            maxLength={300}
            autoFocus
            error={error}
          />
        </FormSection>
      </Screen>
    </>
  );
}
