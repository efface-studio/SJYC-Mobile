import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage, isApiError } from '@/api';
import { parseValues, spaceFormSchema, type FieldErrors, type SpaceFormInput } from '@/domain/schemas';
import type { Space } from '@/domain/types';
import { DetailHeader, NoPermission, ScreenMessage, useCan } from '~/admin-kit/components';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import {
  Button,
  Divider,
  FormSection,
  QueryBoundary,
  Screen,
  StickyFooter,
  SwitchRow,
  TextField,
} from '~/ds';
import { notify } from '~/shared/dialogs';

export default function SpaceEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('space.manage');
  // 단건 조회 API 가 없어 공간 목록(몇 개뿐)에서 찾는다 — 목록 화면과 캐시를 공유한다
  const spaces = useQuery({
    queryKey: ['admin', 'spaces'],
    queryFn: () => api.admin.spaces.list(),
    enabled: allowed,
  });
  const found = spaces.data?.find((s) => s.id === id);

  return (
    <>
      <Stack.Screen options={{ title: '공간 설정' }} />
      {allowed ? (
        <QueryBoundary layout="form" query={spaces}>
          {() => (found ? <SpaceForm space={found} /> : <ScreenMessage title="공간을 찾을 수 없습니다" />)}
        </QueryBoundary>
      ) : (
        <NoPermission />
      )}
    </>
  );
}

function SpaceForm({ space }: { space: Space }) {
  const invalidate = useInvalidateAdmin();
  const [description, setDescription] = useState(space.description);
  const [capacity, setCapacity] = useState(String(space.capacity));
  const [reservable, setReservable] = useState(space.reservable);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: (input: SpaceFormInput) => api.admin.spaces.update(space.id, input),
    onSuccess: () => {
      router.back();
      void invalidate();
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('저장하지 못했습니다', errorMessage(e));
    },
  });

  const submit = () => {
    if (save.isPending) return;
    const parsed = parseValues(spaceFormSchema, {
      description,
      capacity,
      reservable: reservable ? 'on' : undefined,
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
          <Button label="저장" onPress={submit} loading={save.isPending} />
        </StickyFooter>
      }
    >
      <DetailHeader
        meta={space.floor}
        title={space.name}
        status={reservable ? { text: '예약 받음', tone: 'success' } : { text: '예약 중지', tone: 'warning' }}
      />
      <Divider />
      <FormSection title="예약">
        <SwitchRow
          label="예약 접수"
          description="휴관·점검 중에는 끄세요. 끄면 사용자 앱에서 새 예약을 받지 않습니다."
          value={reservable}
          onValueChange={setReservable}
        />
        <TextField
          label="수용 인원"
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="number-pad"
          error={errors.capacity}
        />
      </FormSection>
      <FormSection title="설명">
        <TextField
          value={description}
          onChangeText={setDescription}
          placeholder="공간 설명"
          multiline
          maxLength={500}
          error={errors.description}
        />
      </FormSection>
    </Screen>
  );
}
