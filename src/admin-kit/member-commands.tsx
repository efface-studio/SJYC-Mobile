import { Text } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { memberActionLabels, type MemberCommand } from '@/domain/member-actions';
import type { User } from '@/domain/types';
import { FormSection, TextField, SelectField, Button, Txt, useTheme } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

export function MemberCommands({ user }: { user: User }) {
  const completed = (label: string) => notify(label, '적용했습니다.');
  const failed = (message: string) => notify('변경하지 못했습니다', message);
  const theme = useTheme();
  const qc = useQueryClient();
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [club, setClub] = useState('');
  const [program, setProgram] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const options = useQuery({
    queryKey: ['admin', 'member-options', user.id],
    queryFn: () => api.admin.members.activityOptions(user.id),
    enabled: user.status === 'active',
  });
  const available = (items: { id: string; title: string }[] = []) =>
    items.map((i) => ({ value: i.id, label: i.title }));
  const act = useMutation({
    mutationFn: (command: MemberCommand) => api.admin.members.act(user.id, command),
    onMutate: () => setResetUrl(''),
    onSuccess: (result, command) => {
      setResetUrl(result.resetUrl ?? '');
      if (command.action === 'join-club') setClub('');
      if (command.action === 'enroll') setProgram('');
      void qc.invalidateQueries({ queryKey: ['admin'] });
      completed(memberActionLabels[command.action]);
    },
    onError: (error) => failed(errorMessage(error)),
  });
  const busy = act.isPending;
  const active = user.status === 'active';
  const descriptions = (command: MemberCommand) => {
    if (command.action === 'withdraw')
      return (
        user.name + ' 회원은 즉시 로그아웃되며 다시 로그인할 수 없습니다. 신청 및 처리 이력은 보존됩니다.'
      );
    if (command.action === 'reset-password')
      return user.name + ' 회원이 30분 안에 한 번 사용할 수 있는 비밀번호 재설정 링크를 발급합니다.';
    if (command.action === 'join-club')
      return (
        user.name +
        ' 회원을 ' +
        options.data?.clubs.find((x) => x.id === command.clubId)?.title +
        '에 추가합니다.'
      );
    if (command.action === 'enroll')
      return (
        user.name +
        ' 회원의 ' +
        options.data?.programs.find((x) => x.id === command.programId)?.title +
        ' 참가를 확정합니다.'
      );
    return user.name + ' 회원에게 적용합니다.';
  };
  const run = async (command: MemberCommand) => {
    if (busy) return;
    if (
      await confirm({
        title: memberActionLabels[command.action],
        message: descriptions(command),
        confirmLabel: '확인',
        destructive: command.action === 'withdraw',
      })
    )
      act.mutate(command);
  };
  return (
    <>
      <FormSection title="회원 정보">
        <TextField label="이름" value={name} onChangeText={setName} />
        <TextField label="휴대전화 번호" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
        <Button
          label="정보 저장"
          variant="secondary"
          disabled={busy || !name.trim() || !phone || (user.name === name && user.phone === phone)}
          onPress={() => void run({ action: 'profile', name, phone })}
        />
      </FormSection>
      {active && (
        <FormSection title="활동 등록">
          {options.isPending ? (
            <Txt>참가 가능한 활동을 불러오는 중입니다.</Txt>
          ) : options.isError ? (
            <Button label="활동 다시 불러오기" onPress={() => void options.refetch()} />
          ) : (
            <>
              {options.data.clubs.length ? (
                <>
                  <SelectField
                    label="동아리"
                    value={club}
                    options={available(options.data.clubs)}
                    onChange={setClub}
                  />
                  <Button
                    variant="secondary"
                    label="동아리 추가"
                    disabled={!club || busy}
                    onPress={() => void run({ action: 'join-club', clubId: club })}
                  />
                </>
              ) : (
                <Txt>추가할 동아리가 없습니다.</Txt>
              )}
              {options.data.programs.length ? (
                <>
                  <SelectField
                    label="프로그램"
                    value={program}
                    options={available(options.data.programs)}
                    onChange={setProgram}
                  />
                  <Button
                    variant="secondary"
                    label="프로그램 참가 등록"
                    disabled={!program || busy}
                    onPress={() => void run({ action: 'enroll', programId: program })}
                  />
                </>
              ) : (
                <Txt>등록 가능한 프로그램이 없습니다.</Txt>
              )}
            </>
          )}
        </FormSection>
      )}
      <FormSection title="계정 관리">
        {active && (
          <Button
            label="비밀번호 재설정 링크 발급"
            variant="secondary"
            disabled={busy}
            onPress={() => void run({ action: 'reset-password' })}
          />
        )}
        {!!resetUrl && (
          <Text selectable accessibilityLabel="회원에게 전달할 일회용 링크" style={{ color: theme.text }}>
            {resetUrl}
          </Text>
        )}
        <Button
          label="모든 기기 로그아웃"
          variant="secondary"
          disabled={busy}
          onPress={() => void run({ action: 'sign-out' })}
        />
        <Button
          label="계정 삭제"
          variant="danger"
          disabled={busy}
          onPress={() => void run({ action: 'withdraw' })}
        />
      </FormSection>
    </>
  );
}
