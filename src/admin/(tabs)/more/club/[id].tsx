import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { clubFormSchema, parseValues, type ClubFormInput, type FieldErrors } from '@/domain/schemas';
import type { Club } from '@/domain/types';
import { NoPermission, RowGroup, RowItem, listError, useCan, useRows } from '~/admin-kit/components';
import { ClubManagersSection } from '~/admin-kit/club-managers';
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
import { notify } from '~/shared/dialogs';

type ClubStatus = Club['status'];
const URL_HINT = 'https:// 로 시작하는 주소';

/** 입력 중인 반복 행 — 선택 날짜·주소는 빈 문자열로 두고 검증에서 null 로 바꾼다 */
interface PhotoRow {
  url: string;
  caption: string;
  sourceUrl: string;
  date: string;
}
interface ActivityRow {
  date: string;
  title: string;
  url: string;
}

const STATUS_OPTIONS: { value: ClubStatus; label: string }[] = [
  { value: 'active', label: '운영 중' },
  { value: 'inactive', label: '운영 중지' },
];

/** id = 'new' 이면 새 동아리 등록 */
export default function ClubEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('club.manage');
  const isNew = id === 'new';
  const query = useQuery({
    queryKey: ['admin', 'club', id],
    queryFn: () => api.admin.clubs.get(id),
    enabled: allowed && !isNew,
  });

  return (
    <>
      <Stack.Screen options={{ title: isNew ? '동아리 등록' : '동아리 수정' }} />
      {!allowed ? (
        <NoPermission />
      ) : isNew ? (
        <ClubForm club={null} />
      ) : (
        <QueryBoundary query={query}>{(c) => <ClubForm club={c} />}</QueryBoundary>
      )}
    </>
  );
}

function ClubForm({ club }: { club: Club | null }) {
  const invalidate = useInvalidateAdmin();
  const [text, setText] = useState({
    name: club?.name ?? '',
    field: club?.field ?? '',
    summary: club?.summary ?? '',
    description: club?.description ?? '',
    meetingInfo: club?.meetingInfo ?? '',
    target: club?.target ?? '',
  });
  const photos = useRows<PhotoRow>(club?.photos.map((p) => ({ ...p, date: p.date ?? '' })) ?? []);
  const activities = useRows<ActivityRow>(club?.activities.map((a) => ({ ...a, url: a.url ?? '' })) ?? []);
  const sources = useRows<string>(club?.sourceUrls ?? []);
  const [recruiting, setRecruiting] = useState(club?.recruiting ?? true);
  const [status, setStatus] = useState<ClubStatus>(club?.status ?? 'active');
  const [errors, setErrors] = useState<FieldErrors>({});
  const field = (name: keyof typeof text) => (v: string) => setText((t) => ({ ...t, [name]: v }));

  const save = useMutation({
    mutationFn: (input: ClubFormInput) =>
      club ? api.admin.clubs.update(club.id, input) : api.admin.clubs.create(input),
    onSuccess: () => {
      router.back();
      void invalidate();
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('동아리를 저장하지 못했습니다', errorMessage(e));
    },
  });

  const submit = () => {
    if (save.isPending) return;
    const parsed = parseValues(clubFormSchema, {
      ...text,
      photos: photos.values,
      activities: activities.values,
      sourceUrls: sources.values,
      recruiting: recruiting ? 'on' : undefined,
      status,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate(parsed.data);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label={club ? '저장' : '등록'} onPress={submit} loading={save.isPending} />
        </StickyFooter>
      }
    >
      <FormSection title="기본 정보">
        <TextField
          label="동아리명"
          value={text.name}
          onChangeText={field('name')}
          maxLength={40}
          error={errors.name}
        />
        <TextField
          label="활동 분야"
          value={text.field}
          onChangeText={field('field')}
          maxLength={40}
          error={errors.field}
        />
        <TextField
          label="한 줄 소개"
          value={text.summary}
          onChangeText={field('summary')}
          maxLength={120}
          error={errors.summary}
        />
        <TextField
          label="모임 안내"
          value={text.meetingInfo}
          onChangeText={field('meetingInfo')}
          placeholder="예: 매주 토요일 오후 2시, 2층 미디어실"
          maxLength={200}
          error={errors.meetingInfo}
        />
        <TextField
          label="대상"
          value={text.target}
          onChangeText={field('target')}
          placeholder="예: 중구 거주 또는 관내 학교 재학 14~24세 청소년"
          hint="확인되지 않았으면 비워 두세요"
          maxLength={100}
          error={errors.target}
        />
      </FormSection>
      <FormSection title="운영">
        <SelectField
          label="운영 상태"
          value={status}
          options={STATUS_OPTIONS}
          onChange={setStatus}
          error={errors.status}
        />
        <SwitchRow
          label="신규 회원 모집 중"
          description="끄면 사용자 앱에서 가입 신청을 받지 않습니다"
          value={recruiting}
          onValueChange={setRecruiting}
        />
      </FormSection>
      <FormSection title="소개">
        <TextField
          value={text.description}
          onChangeText={field('description')}
          placeholder="동아리 소개"
          multiline
          maxLength={5000}
          error={errors.description}
        />
      </FormSection>
      <RowGroup
        title="사진"
        hint="센터 공식 채널에 올린 사진만 등록하고 출처(게시물 주소)를 함께 적습니다. 청소년 얼굴이 식별되는 사진은 보호자 동의를 확인한 뒤 등록하세요."
        addLabel="사진 추가"
        onAdd={() => photos.add({ url: '', caption: '', sourceUrl: '', date: '' })}
        error={listError(errors, 'photos')}
      >
        {photos.rows.map((r, i) => {
          const set = (patch: Partial<PhotoRow>) => photos.update(r.id, { ...r.value, ...patch });
          return (
            <RowItem key={r.id} label={`사진 ${i + 1}`} onRemove={() => photos.remove(r.id)}>
              <TextField
                label="이미지 주소"
                value={r.value.url}
                onChangeText={(url) => set({ url })}
                placeholder={URL_HINT}
                keyboardType="url"
                autoCorrect={false}
                error={errors[`photos.${i}.url`]}
              />
              <TextField
                label="사진 설명 (대체 텍스트)"
                value={r.value.caption}
                onChangeText={(caption) => set({ caption })}
                maxLength={100}
                error={errors[`photos.${i}.caption`]}
              />
              <TextField
                label="출처 주소"
                value={r.value.sourceUrl}
                onChangeText={(sourceUrl) => set({ sourceUrl })}
                placeholder={URL_HINT}
                keyboardType="url"
                autoCorrect={false}
                error={errors[`photos.${i}.sourceUrl`]}
              />
              <TextField
                label="게시일 (선택)"
                value={r.value.date}
                onChangeText={(date) => set({ date })}
                placeholder="2026-10-01"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                maxLength={10}
                error={errors[`photos.${i}.date`]}
              />
            </RowItem>
          );
        })}
      </RowGroup>
      <RowGroup
        title="활동"
        hint="최근 활동을 최신순으로 적습니다. 날짜를 월까지만 알면 YYYY-MM 으로 적습니다."
        addLabel="활동 추가"
        onAdd={() => activities.add({ date: '', title: '', url: '' })}
        error={listError(errors, 'activities')}
      >
        {activities.rows.map((r, i) => {
          const set = (patch: Partial<ActivityRow>) => activities.update(r.id, { ...r.value, ...patch });
          return (
            <RowItem key={r.id} label={`활동 ${i + 1}`} onRemove={() => activities.remove(r.id)}>
              <TextField
                label="날짜"
                value={r.value.date}
                onChangeText={(date) => set({ date })}
                placeholder="2026-10-01"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                maxLength={10}
                error={errors[`activities.${i}.date`]}
              />
              <TextField
                label="활동명"
                value={r.value.title}
                onChangeText={(title) => set({ title })}
                maxLength={100}
                error={errors[`activities.${i}.title`]}
              />
              <TextField
                label="관련 게시물 주소 (선택)"
                value={r.value.url}
                onChangeText={(url) => set({ url })}
                placeholder={URL_HINT}
                keyboardType="url"
                autoCorrect={false}
                error={errors[`activities.${i}.url`]}
              />
            </RowItem>
          );
        })}
      </RowGroup>
      <RowGroup
        title="정보 출처"
        hint="소개 내용을 확인한 공식 홈페이지·SNS 게시물 주소"
        addLabel="출처 추가"
        onAdd={() => sources.add('')}
        error={listError(errors, 'sourceUrls')}
      >
        {sources.rows.map((r, i) => (
          <RowItem key={r.id} label={`출처 ${i + 1}`} onRemove={() => sources.remove(r.id)}>
            <TextField
              label="주소"
              value={r.value}
              onChangeText={(url) => sources.update(r.id, url)}
              placeholder={URL_HINT}
              keyboardType="url"
              autoCorrect={false}
              error={errors[`sourceUrls.${i}`]}
            />
          </RowItem>
        ))}
      </RowGroup>
      {club && <ClubManagersSection clubId={club.id} clubName={club.name} />}
    </Screen>
  );
}
