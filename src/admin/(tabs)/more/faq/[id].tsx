import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { INQUIRY_CATEGORY_LABEL } from '@/domain/labels';
import { faqFormSchema, parseValues, type FaqFormInput, type FieldErrors } from '@/domain/schemas';
import type { Faq, InquiryCategory } from '@/domain/types';
import { DangerTextButton, NoPermission, ScreenMessage, useCan } from '~/admin-kit/components';
import { faqsQuery, useInvalidateAdmin } from '~/admin-kit/queries';
import {
  Button,
  FormSection,
  QueryBoundary,
  Screen,
  SelectField,
  StickyFooter,
  SwitchRow,
  TextField,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

const CATEGORY_OPTIONS = (Object.keys(INQUIRY_CATEGORY_LABEL) as InquiryCategory[]).map((c) => ({
  value: c,
  label: INQUIRY_CATEGORY_LABEL[c],
}));

/** id = 'new' 이면 새 FAQ 등록 */
export default function FaqEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('inquiry.answer');
  const isNew = id === 'new';
  const faqs = useQuery({ ...faqsQuery, enabled: allowed });

  return (
    <>
      <Stack.Screen options={{ title: isNew ? 'FAQ 등록' : 'FAQ 수정' }} />
      {allowed ? (
        <QueryBoundary layout="form" query={faqs}>
          {(list) => {
            const nextOrder = Math.max(0, ...list.map((f) => f.order)) + 1;
            if (isNew) return <FaqForm faq={null} nextOrder={nextOrder} />;
            const faq = list.find((f) => f.id === id);
            return faq ? (
              <FaqForm faq={faq} nextOrder={nextOrder} />
            ) : (
              <ScreenMessage title="FAQ를 찾을 수 없습니다" />
            );
          }}
        </QueryBoundary>
      ) : (
        <NoPermission />
      )}
    </>
  );
}

function FaqForm({ faq, nextOrder }: { faq: Faq | null; nextOrder: number }) {
  const invalidate = useInvalidateAdmin();
  const [category, setCategory] = useState<InquiryCategory>(faq?.category ?? 'program');
  const [order, setOrder] = useState(String(faq?.order ?? nextOrder));
  const [question, setQuestion] = useState(faq?.question ?? '');
  const [answer, setAnswer] = useState(faq?.answer ?? '');
  const [published, setPublished] = useState(faq?.published ?? true);
  const [errors, setErrors] = useState<FieldErrors>({});

  const done = () => {
    router.back();
    void invalidate();
  };
  const save = useMutation({
    mutationFn: (input: FaqFormInput) =>
      faq ? api.admin.faqs.update(faq.id, input) : api.admin.faqs.create(input),
    onSuccess: done,
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('FAQ를 저장하지 못했습니다', errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.faqs.remove(id),
    onSuccess: done,
    onError: (e) => notify('FAQ를 삭제하지 못했습니다', errorMessage(e)),
  });
  const busy = save.isPending || remove.isPending;

  const submit = () => {
    if (busy) return;
    const parsed = parseValues(faqFormSchema, {
      category,
      order,
      question,
      answer,
      published: published ? 'on' : undefined,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const askDelete = async (target: Faq) => {
    const ok = await confirm({
      title: 'FAQ를 삭제할까요?',
      message: `${target.question} 항목을 삭제합니다. 되돌릴 수 없습니다. 잠시 내리려면 '게시'를 해제하세요.`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (ok) remove.mutate(target.id);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button
            label={faq ? '저장' : '등록'}
            onPress={submit}
            loading={save.isPending}
            disabled={remove.isPending}
          />
        </StickyFooter>
      }
    >
      <FormSection title="설정">
        <SelectField
          label="분류"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
          error={errors.category}
        />
        <TextField
          label="표시 순서"
          value={order}
          onChangeText={setOrder}
          keyboardType="number-pad"
          hint="0~999 · 작은 숫자가 위에 표시됩니다"
          error={errors.order}
        />
        <SwitchRow label="사용자 화면에 게시" value={published} onValueChange={setPublished} />
      </FormSection>
      <FormSection title="내용">
        <TextField
          label="질문"
          value={question}
          onChangeText={setQuestion}
          maxLength={200}
          error={errors.question}
        />
        <TextField
          label="답변"
          value={answer}
          onChangeText={setAnswer}
          multiline
          maxLength={5000}
          error={errors.answer}
        />
      </FormSection>
      {faq && <DangerTextButton label="FAQ 삭제" onPress={() => void askDelete(faq)} disabled={busy} />}
    </Screen>
  );
}
