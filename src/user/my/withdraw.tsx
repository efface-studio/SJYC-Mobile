import { useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { parseValues, withdrawSchema, type FieldErrors } from '@/domain/schemas';
import { SESSION_KEY } from '@/features/auth/session';
import { Button, FormSection, Gutter, Screen, StickyFooter, SwitchRow, TextField, Txt, space } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Bullets } from '~/user-kit';

export default function WithdrawScreen() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const withdraw = useMutation({
    mutationFn: () => api.me.withdraw(),
    onSuccess: () => {
      // 다른 사용자 데이터가 남지 않도록 캐시를 비운 뒤 홈으로
      qc.clear();
      qc.setQueryData(SESSION_KEY, null);
      notify('탈퇴가 완료되었습니다', '그동안 이용해 주셔서 감사합니다.');
      router.dismissAll();
      router.replace('/home');
    },
    onError: (e) => notify('탈퇴하지 못했습니다', errorMessage(e)),
  });

  const submit = async () => {
    if (withdraw.isPending) return;
    const parsed = parseValues(withdrawSchema, {
      confirmText: text,
      agreeWithdraw: agree ? 'on' : undefined,
    });
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    const ok = await confirm({
      title: '정말 탈퇴할까요?',
      message: '탈퇴 후에는 신청·예약·동아리 내역을 확인할 수 없습니다.',
      confirmLabel: '탈퇴',
      destructive: true,
    });
    if (ok) withdraw.mutate();
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button
            label="탈퇴하기"
            variant="danger"
            onPress={() => void submit()}
            loading={withdraw.isPending}
          />
        </StickyFooter>
      }
    >
      <Gutter style={{ paddingTop: space.xl, gap: space.lg }}>
        <Txt variant="title1" accessibilityRole="header">
          탈퇴 전에 확인해 주세요
        </Txt>
        <Bullets
          items={[
            '진행 중인 프로그램 신청과 동아리 활동 정보는 더 이상 확인할 수 없습니다.',
            '관계 법령·운영 정책에 따라 일정 기간 보관해야 하는 정보는 해당 기간 후 파기됩니다.',
            '같은 이메일로 다시 가입할 수 있는 시점은 운영 정책에 따릅니다.',
          ]}
        />
      </Gutter>
      <FormSection>
        <TextField
          label='확인을 위해 "탈퇴합니다"를 입력해 주세요'
          value={text}
          onChangeText={setText}
          placeholder="탈퇴합니다"
          error={errors.confirmText}
        />
        <SwitchRow
          label="위 내용을 확인했으며 탈퇴에 동의합니다"
          value={agree}
          onValueChange={setAgree}
          error={errors.agreeWithdraw}
        />
      </FormSection>
    </Screen>
  );
}
