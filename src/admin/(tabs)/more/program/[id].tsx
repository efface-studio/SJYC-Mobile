import { useMutation, useQuery } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { PUBLISH_STATUS, RECRUIT_STATUS } from '@/domain/labels';
import type { FieldErrors, ProgramFormInput } from '@/domain/schemas';
import type { Program } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { DangerTextButton, NoPermission, useCan } from '~/admin-kit/components';
import { ProgramForm } from '~/admin-kit/program-form';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import { Badge, Card, Gutter, QueryBoundary, Tap, Txt, space } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

/** id = 'new' 이면 새 프로그램 등록 */
export default function ProgramEdit() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('program.write');
  const isNew = id === 'new';
  const query = useQuery({
    queryKey: ['admin', 'program', id],
    queryFn: () => api.admin.programs.get(id),
    enabled: allowed && !isNew,
  });

  return (
    <>
      <Stack.Screen options={{ title: isNew ? '프로그램 등록' : '프로그램 수정' }} />
      {!allowed ? (
        <NoPermission />
      ) : isNew ? (
        <Editor program={null} />
      ) : (
        <QueryBoundary query={query}>{(p) => <Editor key={p.updatedAt} program={p} />}</QueryBoundary>
      )}
    </>
  );
}

/** 수정 화면 상단 현황 카드 — 모집 상태·신청 현황과 신청자 목록 바로가기 */
function ProgramSummary({ program }: { program: Program }) {
  return (
    <Gutter style={{ paddingTop: space.lg }}>
      <Card tone="subtle" style={{ gap: space.md }}>
        <View style={styles.badges}>
          <Badge {...RECRUIT_STATUS[program.recruitStatus]} />
          <Badge {...PUBLISH_STATUS[program.status]} />
        </View>
        <View style={styles.stats}>
          <Txt variant="title1">
            {program.appliedCount}/{program.capacity}
          </Txt>
          <Txt variant="caption" color="textTertiary">
            명 신청
          </Txt>
        </View>
        <Txt variant="caption" color="textTertiary">
          최종 수정 {formatDateTime(program.updatedAt)}
        </Txt>
        <Tap
          onPress={() =>
            router.navigate({ pathname: '/applications', params: { programId: program.id, status: 'all' } })
          }
          accessibilityLabel="이 프로그램 신청자 보기"
          style={{ alignSelf: 'flex-start', paddingVertical: space.xs }}
        >
          <Txt variant="label" color="action">
            이 프로그램 신청자 보기 ›
          </Txt>
        </Tap>
      </Card>
    </Gutter>
  );
}

function Editor({ program }: { program: Program | null }) {
  const invalidate = useInvalidateAdmin();
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  // 먼저 화면을 닫고 갱신한다 — 삭제된 항목을 다시 조회하지 않도록
  const done = () => {
    router.back();
    void invalidate();
  };
  const save = useMutation({
    mutationFn: (input: ProgramFormInput) =>
      program ? api.admin.programs.update(program.id, input) : api.admin.programs.create(input),
    onMutate: () => setServerErrors({}),
    onSuccess: done,
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setServerErrors(e.fieldErrors);
      notify('프로그램을 저장하지 못했습니다', errorMessage(e));
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => api.admin.programs.remove(id),
    onSuccess: done,
    // 신청 내역이 있으면 서버가 CONFLICT 와 안내 문구를 돌려준다
    onError: (e) => notify('프로그램을 삭제하지 못했습니다', errorMessage(e)),
  });
  const pending = save.isPending || remove.isPending;

  const askDelete = async (p: Program) => {
    const ok = await confirm({
      title: '프로그램을 삭제할까요?',
      message: `${p.title} 프로그램을 삭제합니다. 되돌릴 수 없습니다. 신청 내역이 있으면 삭제할 수 없으니 게시 상태를 '비공개'로 바꾸세요.`,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (ok) remove.mutate(p.id);
  };

  return (
    <ProgramForm
      initial={program ?? undefined}
      submitLabel={program ? '저장' : '등록'}
      pending={pending}
      serverErrors={serverErrors}
      onSubmit={(input) => save.mutate(input)}
      header={program ? <ProgramSummary program={program} /> : undefined}
      extraActions={
        program ? (
          <DangerTextButton
            label="프로그램 삭제"
            onPress={() => void askDelete(program)}
            disabled={pending}
          />
        ) : undefined
      }
    />
  );
}

const styles = StyleSheet.create({
  badges: { flexDirection: 'row', gap: space.xs },
  stats: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
});
