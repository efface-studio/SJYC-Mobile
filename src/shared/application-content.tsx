import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import type { ApplicationContentEdit } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { Button, TextField, Txt, space } from '~/ds';

export function ContentHistory({ edits }: { edits?: ApplicationContentEdit[] }) {
  const [open, setOpen] = useState(false);
  if (!edits?.length) return null;
  return (
    <View style={{ gap: space.sm }}>
      <Button
        size="md"
        variant="text"
        label={open ? '수정 이력 접기' : `(수정됨) · 이력 ${edits.length}건 보기`}
        onPress={() => setOpen(!open)}
      />
      {open && (
        <>
          <Txt variant="captionStrong" color="textSecondary">
            최초 작성
          </Txt>
          <Txt>{edits[0]?.previous || '내용 없음'}</Txt>
          {edits.map((edit, i) => (
            <View key={i} style={{ gap: space.xs }}>
              <Txt variant="captionStrong" color="textSecondary">
                {formatDateTime(edit.at)} 수정
              </Txt>
              <Txt>{edit.next || '내용 없음'}</Txt>
            </View>
          ))}
        </>
      )}
    </View>
  );
}

export function ApplicationEditor({
  kind,
  id,
  value,
  revision,
}: {
  kind: 'program' | 'club';
  id: string;
  value: string;
  revision: number;
}) {
  const qc = useQueryClient();
  const program = kind === 'program';
  const label = program ? '요청 사항' : '가입 동기';
  const [draft, setDraft] = useState<{
    value: string;
    revision: number;
  } | null>(null);
  const key = program ? ['my-application', id] : ['my-club-applications'];
  const save = useMutation({
    mutationFn: async (input: { value: string; revision: number }) => {
      if (program) await api.me.editApplication(id, input);
      else await api.me.editClubApplication(id, input);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: key });
      if (program) void qc.invalidateQueries({ queryKey: ['my-applications'] });
      setDraft(null);
    },
    onError: () => {
      void qc.invalidateQueries({ queryKey: key });
    },
  });
  if (!draft)
    return (
      <Button
        size="md"
        variant="text"
        label={label + ' 수정'}
        onPress={() => {
          save.reset();
          setDraft({ value, revision });
        }}
      />
    );
  return (
    <View style={{ gap: space.sm }}>
      <TextField
        label={label}
        multiline
        showCount
        maxLength={program ? 300 : 500}
        value={draft.value}
        onChangeText={(text) => setDraft({ ...draft, value: text })}
        error={save.isError ? errorMessage(save.error) : undefined}
      />
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'flex-end',
          gap: space.sm,
        }}
      >
        <Button
          variant="text"
          size="md"
          label="취소"
          disabled={save.isPending}
          onPress={() => setDraft(null)}
        />
        <Button
          size="md"
          label="저장"
          loading={save.isPending}
          disabled={draft.value.trim() === value || (!program && draft.value.trim().length < 10)}
          onPress={() => save.mutate(draft)}
        />
      </View>
    </View>
  );
}
