import { useQuery } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { api } from '@/api';
import { PUBLISH_STATUS } from '@/domain/labels';
import { parseValues, programFormSchema, type FieldErrors, type ProgramFormInput } from '@/domain/schemas';
import type { Program, PublishStatus } from '@/domain/types';
import { toDateInput, todayKst } from '@/lib/format';
import { Button, DateField, FormSection, Screen, SelectField, StickyFooter, TextField } from '~/ds';

const DATE_FIELDS = [
  { name: 'recruitStartsAt', label: '모집 시작일' },
  { name: 'recruitEndsAt', label: '모집 마감일' },
  { name: 'startsAt', label: '프로그램 시작일' },
  { name: 'endsAt', label: '프로그램 종료일' },
  { name: 'cancelDeadline', label: '취소 마감일' },
] as const;
type DateName = (typeof DATE_FIELDS)[number]['name'];

const STATUS_OPTIONS = (Object.keys(PUBLISH_STATUS) as PublishStatus[]).map((s) => ({
  value: s,
  label: PUBLISH_STATUS[s].text,
}));

/** 웹 ProgramForm 과 같은 필드·검증 (programFormSchema). 날짜는 OS 날짜 선택기로 고른다 */
export function ProgramForm({
  initial,
  submitLabel,
  pending,
  serverErrors,
  onSubmit,
  header,
  extraActions,
}: {
  initial?: Program;
  submitLabel: string;
  pending: boolean;
  serverErrors: FieldErrors;
  onSubmit: (input: ProgramFormInput) => void;
  header?: ReactNode;
  extraActions?: ReactNode;
}) {
  const categories = useQuery({
    queryKey: ['admin', 'program-categories'],
    queryFn: () => api.programs.categories(),
    staleTime: 5 * 60_000,
  });
  const [text, setText] = useState({
    title: initial?.title ?? '',
    summary: initial?.summary ?? '',
    target: initial?.target ?? '',
    place: initial?.place ?? '',
    capacity: initial ? String(initial.capacity) : '',
    description: initial?.description ?? '',
  });
  const [categoryId, setCategoryId] = useState(initial?.categoryId ?? '');
  const [status, setStatus] = useState<PublishStatus>(initial?.status ?? 'draft');
  const [dates, setDates] = useState<Record<DateName, string>>(() => {
    const at = (iso: string | undefined) => (iso ? toDateInput(iso) : todayKst());
    return {
      recruitStartsAt: at(initial?.recruitStartsAt),
      recruitEndsAt: at(initial?.recruitEndsAt),
      startsAt: at(initial?.startsAt),
      endsAt: at(initial?.endsAt),
      cancelDeadline: at(initial?.cancelDeadline),
    };
  });
  const [errors, setErrors] = useState<FieldErrors>({});
  const shown = { ...errors, ...serverErrors };
  const field = (name: keyof typeof text) => (v: string) => setText((t) => ({ ...t, [name]: v }));

  const categoryOptions =
    categories.data?.map((c) => ({ value: c.id, label: `${c.group} · ${c.name}` })) ?? [];

  const submit = () => {
    if (pending) return;
    const parsed = parseValues(programFormSchema, { ...text, ...dates, categoryId, status });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    onSubmit(parsed.data);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label={submitLabel} onPress={submit} loading={pending} />
        </StickyFooter>
      }
    >
      {header}
      <FormSection title="기본 정보">
        <TextField
          label="프로그램명"
          value={text.title}
          onChangeText={field('title')}
          maxLength={100}
          error={shown.title}
        />
        <SelectField
          label="분류"
          value={categoryId}
          options={categoryOptions}
          onChange={setCategoryId}
          placeholder={
            categories.isError ? '분류를 불러오지 못했습니다' : categories.data ? '분류 선택' : '불러오는 중…'
          }
          error={shown.categoryId}
        />
        <SelectField
          label="게시 상태"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
          error={shown.status}
        />
        <TextField
          label="한 줄 요약"
          value={text.summary}
          onChangeText={field('summary')}
          maxLength={120}
          error={shown.summary}
        />
        <TextField
          label="대상"
          value={text.target}
          onChangeText={field('target')}
          maxLength={100}
          error={shown.target}
        />
        <TextField
          label="장소"
          value={text.place}
          onChangeText={field('place')}
          maxLength={100}
          error={shown.place}
        />
        <TextField
          label="정원"
          value={text.capacity}
          onChangeText={field('capacity')}
          keyboardType="number-pad"
          hint={initial ? `현재 신청 ${initial.appliedCount}명 · 1~1,000명` : '1~1,000명'}
          error={shown.capacity}
        />
      </FormSection>
      <FormSection title="일정">
        {DATE_FIELDS.map((f) => (
          <DateField
            key={f.name}
            label={f.label}
            value={dates[f.name]}
            onChange={(v) => setDates((d) => ({ ...d, [f.name]: v }))}
            error={shown[f.name]}
          />
        ))}
      </FormSection>
      <FormSection title="상세 내용">
        <TextField
          value={text.description}
          onChangeText={field('description')}
          placeholder="상세 내용"
          hint="일반 텍스트로 게시됩니다"
          multiline
          maxLength={10000}
          error={shown.description}
        />
      </FormSection>
      {extraActions}
    </Screen>
  );
}
