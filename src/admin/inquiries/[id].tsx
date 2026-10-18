import { useMutation, useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS } from '@/domain/labels';
import { answerSchema, parseValues } from '@/domain/schemas';
import type { Inquiry } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { DetailHeader, NoPermission, TextBlock, useCan } from '~/admin-kit/components';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import {
  Button,
  Divider,
  FormSection,
  Gutter,
  QueryBoundary,
  Screen,
  StickyFooter,
  TextField,
  Txt,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';

export default function InquiryDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('inquiry.answer');
  const query = useQuery({
    queryKey: ['admin', 'inquiry', id],
    queryFn: () => api.admin.inquiries.get(id),
    enabled: allowed,
  });

  if (!allowed) return <NoPermission />;
  return <QueryBoundary query={query}>{(x) => <InquiryView inquiry={x} />}</QueryBoundary>;
}

function InquiryView({ inquiry: x }: { inquiry: Inquiry }) {
  const invalidate = useInvalidateAdmin();
  const [body, setBody] = useState(x.answer?.body ?? '');
  const [error, setError] = useState<string>();
  const save = useMutation({
    mutationFn: (text: string) => api.admin.inquiries.answer(x.id, text),
    onSuccess: async () => {
      await invalidate();
      router.back();
    },
    onError: (e) => notify('답변을 저장하지 못했습니다', errorMessage(e)),
  });

  const submit = () => {
    const parsed = parseValues(answerSchema, { body });
    if (!parsed.ok) {
      setError(parsed.errors.body);
      return;
    }
    setError(undefined);
    save.mutate(parsed.data.body);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label={x.answer ? '답변 수정' : '답변 등록'} onPress={submit} loading={save.isPending} />
        </StickyFooter>
      }
    >
      <DetailHeader
        meta={`${INQUIRY_CATEGORY_LABEL[x.category]} · ${x.authorName} · ${formatDateTime(x.createdAt)}`}
        title={x.title}
        status={INQUIRY_STATUS[x.status]}
      />
      <Gutter>
        <TextBlock>{x.body}</TextBlock>
      </Gutter>
      <Divider thick />
      <FormSection title={x.answer ? '답변 수정' : '답변 작성'}>
        {x.answer && (
          <Txt variant="caption" color="textTertiary" style={{ marginTop: -space.sm }}>
            {x.answer.answeredBy} · {formatDateTime(x.answer.answeredAt)} 등록
          </Txt>
        )}
        <TextField
          value={body}
          onChangeText={setBody}
          placeholder="문의자에게 보낼 답변을 입력해 주세요"
          multiline
          autoFocus={!x.answer}
          error={error}
        />
      </FormSection>
    </Screen>
  );
}
