import { openScreen } from '~/shared/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { INQUIRY_CATEGORY_LABEL } from '@/domain/labels';
import { inquirySchema, parseValues, type FieldErrors } from '@/domain/schemas';
import type { InquiryCategory } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import {
  Button,
  FormSection,
  Gutter,
  Screen,
  SelectField,
  StickyFooter,
  SwitchRow,
  TextField,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { Callout, ModalGuard, SignInPrompt, closeModal } from '~/user-kit';

const CATEGORY_OPTIONS = (Object.keys(INQUIRY_CATEGORY_LABEL) as InquiryCategory[]).map((k) => ({
  value: k,
  label: INQUIRY_CATEGORY_LABEL[k],
}));

export default function NewInquiryScreen() {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const [category, setCategory] = useState<InquiryCategory | ''>('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const dirty = Boolean(category || title || body) || agree;
  const create = useMutation({
    mutationFn: api.inquiries.create,
    onSuccess: (q) => {
      void qc.invalidateQueries({ queryKey: ['my-inquiries'] });
      closeModal('/qna');
      openScreen(`/qna/${q.id}`);
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('문의를 등록하지 못했습니다', errorMessage(e));
    },
  });

  if (!session) return <SignInPrompt description="1:1 문의는 로그인 후 작성할 수 있습니다." replace />;

  const submit = () => {
    if (create.isPending) return;
    const parsed = parseValues(inquirySchema, {
      category,
      title,
      body,
      agreePrivacy: agree ? 'on' : undefined,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    create.mutate(parsed.data);
  };

  return (
    <>
      <ModalGuard dirty={dirty} fallback="/qna" />
      <Screen
        footer={
          <StickyFooter>
            <Button label="문의 등록" onPress={submit} loading={create.isPending} />
          </StickyFooter>
        }
      >
        <FormSection>
          <SelectField
            label="분류"
            value={category}
            options={CATEGORY_OPTIONS}
            onChange={setCategory}
            error={errors.category}
          />
          <TextField
            label="제목"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
            showCount
            placeholder="제목을 입력해 주세요"
            error={errors.title}
          />
          <TextField
            label="내용"
            value={body}
            onChangeText={setBody}
            multiline
            maxLength={3000}
            placeholder="문의 내용을 자세히 적어 주세요"
            showCount
            error={errors.body}
          />
          <SwitchRow
            label="[필수] 개인정보 수집·이용 동의"
            description="답변을 위해 이름과 문의 내용을 센터 담당자가 확인합니다."
            value={agree}
            onValueChange={setAgree}
            error={errors.agreePrivacy}
          />
        </FormSection>
        <Gutter style={{ paddingTop: space.lg }}>
          <Callout tone="warning">주민등록번호 등 민감한 개인정보는 적지 마세요.</Callout>
        </Gutter>
      </Screen>
    </>
  );
}
