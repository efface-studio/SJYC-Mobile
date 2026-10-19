import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { parseValues, programApplySchema, type FieldErrors } from '@/domain/schemas';
import type { Program, Session } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatPeriod } from '@/lib/format';
import {
  Button,
  Card,
  FormSection,
  Gutter,
  InfoRow,
  Screen,
  StickyFooter,
  SwitchRow,
  Tap,
  TextField,
  Txt,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { ModalGuard, QueryScreen, SignInPrompt, closeModal } from '~/user-kit';

function ApplyForm({ program, session }: { program: Program; session: Session }) {
  const qc = useQueryClient();
  const id = program.id;
  const [phone, setPhone] = useState(session.user.phone ?? '');
  const [note, setNote] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const dirty = phone !== (session.user.phone ?? '') || Boolean(note) || agree;

  const apply = useMutation({
    mutationFn: (input: Parameters<typeof api.programs.apply>[1]) => api.programs.apply(id, input),
    onSuccess: (a) => {
      void qc.invalidateQueries({ queryKey: ['programs'] });
      void qc.invalidateQueries({ queryKey: ['program', id] });
      void qc.invalidateQueries({ queryKey: ['my-applications'] });
      notify(
        '신청이 접수되었습니다',
        a.receiptNo ? `접수 번호 ${a.receiptNo}` : '센터 확인 후 결과를 알려 드립니다.',
      );
      closeModal('/programs');
      router.push(`/my/applications/${a.id}`);
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('신청하지 못했습니다', errorMessage(e));
    },
  });

  const submit = () => {
    if (apply.isPending) return;
    const parsed = parseValues(programApplySchema, { phone, note, agreePrivacy: agree ? 'on' : undefined });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    apply.mutate({ ...parsed.data, phone: parsed.data.phone.replace(/-/g, '') });
  };

  return (
    <>
      <ModalGuard dirty={dirty} fallback="/programs" />
      <Screen
        footer={
          <StickyFooter>
            <Button label="신청하기" onPress={submit} loading={apply.isPending} />
          </StickyFooter>
        }
      >
        <Gutter style={{ paddingTop: space.lg }}>
          <Card style={{ gap: space.xs }}>
            <Txt variant="caption" color="textTertiary">
              신청 프로그램
            </Txt>
            <Txt variant="title3">{program.title}</Txt>
            <View style={{ marginTop: space.xs }}>
              <InfoRow label="기간" value={formatPeriod(program.startsAt, program.endsAt)} />
              <InfoRow label="장소" value={program.place} />
              <InfoRow label="신청자" value={session.user.name} />
            </View>
          </Card>
        </Gutter>

        <FormSection title="신청 정보">
          <TextField
            label="연락처"
            value={phone}
            onChangeText={setPhone}
            placeholder="010-1234-5678"
            keyboardType="phone-pad"
            autoComplete="tel"
            error={errors.phone}
          />
          <TextField
            label="요청 사항 (선택)"
            value={note}
            onChangeText={setNote}
            placeholder="참여에 필요한 배려 사항이 있다면 적어 주세요"
            multiline
            maxLength={300}
            hint={`${note.length}/300`}
            error={errors.note}
          />
        </FormSection>

        <FormSection title="개인정보 수집·이용 동의">
          <Card style={{ gap: space.xs }}>
            <InfoRow label="수집 항목" value="이름, 연락처, 요청 사항" />
            <InfoRow label="이용 목적" value="프로그램 신청 접수, 참여 안내 및 연락" />
            <InfoRow label="보유 기간" value="센터 개인정보처리방침에 따름" />
            <Tap
              onPress={() => router.push('/policies/privacy')}
              accessibilityLabel="개인정보처리방침 보기"
              style={{ alignSelf: 'flex-start', paddingVertical: 10 }}
            >
              <Txt variant="captionStrong" color="action">
                개인정보처리방침 보기
              </Txt>
            </Tap>
          </Card>
          <SwitchRow
            label="[필수] 위 내용을 확인했으며 동의합니다"
            value={agree}
            onValueChange={setAgree}
            error={errors.agreePrivacy}
          />
        </FormSection>
      </Screen>
    </>
  );
}

export default function ProgramApplyScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: session } = useSession();
  const program = useQuery({ queryKey: ['program', id], queryFn: () => api.programs.get(id) });

  if (!session) return <SignInPrompt description="프로그램 신청은 로그인 후 이용할 수 있습니다." replace />;
  return <QueryScreen query={program}>{(p) => <ApplyForm program={p} session={session} />}</QueryScreen>;
}
