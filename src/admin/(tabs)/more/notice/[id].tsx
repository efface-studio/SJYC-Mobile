import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { NOTICE_CATEGORY_LABEL, PUBLISH_STATUS } from '@/domain/labels';
import { noticeFormSchema, parseValues, type FieldErrors, type NoticeFormInput } from '@/domain/schemas';
import type { Notice, NoticeCategory, PublishStatus } from '@/domain/types';
import { ButtonPair, DangerTextButton, NoPermission, useCan } from '~/admin-kit/components';
import { openNoticePreview } from '~/admin-kit/notice-preview';
import { useInvalidateAdmin } from '~/admin-kit/queries';
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

const CATEGORY_OPTIONS = (Object.keys(NOTICE_CATEGORY_LABEL) as NoticeCategory[]).map((c) => ({
  value: c,
  label: NOTICE_CATEGORY_LABEL[c],
}));
const STATUS_OPTIONS = (Object.keys(PUBLISH_STATUS) as PublishStatus[]).map((s) => ({
  value: s,
  label: PUBLISH_STATUS[s].text,
}));

/** id = 'new' 이면 새 공지 작성 */
export default function NoticeEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('notice.write');
  const isNew = id === 'new';
  const query = useQuery({
    queryKey: ['admin', 'notice', id],
    queryFn: () => api.admin.notices.get(id),
    enabled: allowed && !isNew,
  });

  return (
    <>
      <Stack.Screen options={{ title: isNew ? '새 공지' : '공지 수정' }} />
      {!allowed ? (
        <NoPermission />
      ) : isNew ? (
        <NoticeForm notice={null} />
      ) : (
        <QueryBoundary query={query}>{(n) => <NoticeForm notice={n} />}</QueryBoundary>
      )}
    </>
  );
}

function NoticeForm({ notice }: { notice: Notice | null }) {
  const qc = useQueryClient();
  const invalidate = useInvalidateAdmin();
  const [title, setTitle] = useState(notice?.title ?? '');
  const [category, setCategory] = useState<NoticeCategory>(notice?.category ?? 'center');
  const [body, setBody] = useState(notice?.body ?? '');
  const [pinned, setPinned] = useState(notice?.pinned ?? false);
  const [status, setStatus] = useState<PublishStatus>(notice?.status ?? 'draft');
  const [errors, setErrors] = useState<FieldErrors>({});

  // 먼저 화면을 닫고 갱신한다 — 삭제된 항목을 다시 조회하지 않도록
  const done = () => {
    router.back();
    void invalidate();
  };
  const save = useMutation({
    mutationFn: (input: NoticeFormInput) =>
      notice ? api.admin.notices.update(notice.id, input) : api.admin.notices.create(input),
    onSuccess: done,
    onError: (e) => {
      if (isApiError(e, 'VALIDATION') && e.fieldErrors) setErrors(e.fieldErrors);
      notify('공지를 저장하지 못했습니다', errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.notices.remove(id),
    onSuccess: done,
    onError: (e) => notify('공지를 삭제하지 못했습니다', errorMessage(e)),
  });
  const busy = save.isPending || remove.isPending;

  const submit = () => {
    if (busy) return;
    // 웹 FormData 와 같은 모양으로 검증한다 (체크박스 = 'on' | undefined)
    const parsed = parseValues(noticeFormSchema, {
      title,
      category,
      body,
      pinned: pinned ? 'on' : undefined,
      status,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  const askDelete = async (target: Notice) => {
    const ok = await confirm({
      title: '공지를 삭제할까요?',
      message: `"${target.title}" 공지가 삭제되며 되돌릴 수 없습니다.`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (ok) remove.mutate(target.id);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <ButtonPair
            left={
              <Button
                label="미리보기"
                variant="secondary"
                onPress={() =>
                  openNoticePreview(qc, { title, category, body, publishedAt: notice?.publishedAt ?? null })
                }
              />
            }
            right={
              <Button
                label={notice ? '저장' : '등록'}
                onPress={submit}
                loading={save.isPending}
                disabled={remove.isPending}
              />
            }
          />
        </StickyFooter>
      }
    >
      <FormSection title="기본 정보">
        <TextField
          label="제목"
          value={title}
          onChangeText={setTitle}
          placeholder="2~100자"
          maxLength={100}
          error={errors.title}
        />
        <SelectField
          label="분류"
          value={category}
          options={CATEGORY_OPTIONS}
          onChange={setCategory}
          error={errors.category}
        />
        <SelectField
          label="게시 상태"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
          error={errors.status}
        />
        <SwitchRow
          label="상단 고정"
          description="공지 목록 맨 위에 표시합니다"
          value={pinned}
          onValueChange={setPinned}
        />
      </FormSection>
      <FormSection title="본문">
        <TextField value={body} onChangeText={setBody} placeholder="본문" multiline error={errors.body} />
      </FormSection>
      {notice && (
        <DangerTextButton label="공지 삭제" onPress={() => void askDelete(notice)} disabled={busy} />
      )}
    </Screen>
  );
}
