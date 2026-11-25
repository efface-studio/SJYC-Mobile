import { openScreen } from '~/shared/navigation';
import { ProfilePhoto } from '~/user-kit/profile-photo';
import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { parseValues, profileSchema, type FieldErrors } from '@/domain/schemas';
import type { ConsentRecord, Session } from '@/domain/types';
import { SESSION_KEY, useSession } from '@/features/auth/session';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Divider,
  FormSection,
  Gutter,
  LoadingState,
  Screen,
  SectionHeader,
  StickyFooter,
  SwitchRow,
  TextField,
  Txt,
  space,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { Rows, SignInPrompt } from '~/user-kit';

const CONSENT_LABEL: Record<ConsentRecord['key'], string> = {
  terms: '이용약관',
  privacy: '개인정보 수집·이용',
  marketing: '프로그램 소식 안내 수신',
};

function ProfileForm({ session }: { session: Session }) {
  const qc = useQueryClient();
  const user = session.user;
  const [name, setName] = useState(user.name);
  const [phone, setPhone] = useState(user.phone ?? '');
  const [marketing, setMarketing] = useState(
    user.consents.find((c) => c.key === 'marketing')?.agreed ?? false,
  );
  const [errors, setErrors] = useState<FieldErrors>({});
  const update = useMutation({
    mutationFn: api.me.updateProfile,
    onSuccess: (u) => {
      qc.setQueryData<Session | null>(SESSION_KEY, (prev) => (prev ? { ...prev, user: u } : prev));
      notify('내 정보를 저장했습니다');
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('저장하지 못했습니다', errorMessage(e));
    },
  });

  const save = () => {
    if (update.isPending) return;
    const parsed = parseValues(profileSchema, { name, phone, agreeMarketing: marketing ? 'on' : undefined });
    if (!parsed.ok) return setErrors(parsed.errors);
    setErrors({});
    update.mutate(parsed.data);
  };

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button label="저장" onPress={save} loading={update.isPending} />
        </StickyFooter>
      }
    >
      <Gutter style={styles.account}>
        <ProfilePhoto userId={user.id} editable />
        <Txt variant="captionStrong" color="textTertiary">
          로그인 계정
        </Txt>
        <View style={styles.accountLine}>
          <Txt variant="bodyStrong" style={{ flexShrink: 1 }}>
            {user.email}
          </Txt>
          {user.emailVerified ? (
            <Badge text="인증됨" tone="success" />
          ) : (
            <Badge text="미인증" tone="warning" />
          )}
        </View>
      </Gutter>
      <Divider />

      <FormSection title="기본 정보">
        <TextField
          label="이름"
          value={name}
          onChangeText={setName}
          placeholder="이름"
          autoComplete="name"
          error={errors.name}
        />
        <TextField
          label="휴대전화 (필수)"
          value={phone}
          onChangeText={setPhone}
          placeholder="010-1234-5678"
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.phone}
        />
        <SwitchRow
          label="[선택] 프로그램 소식 안내 수신"
          description="새 프로그램 모집 소식을 알려 드립니다."
          value={marketing}
          onValueChange={setMarketing}
        />
      </FormSection>

      <SectionHeader title="동의 내역" />
      <Rows>
        {user.consents.map((c) => (
          <View key={c.key} style={styles.row}>
            <Txt variant="label" style={{ flex: 1 }}>
              {c.required ? '[필수]' : '[선택]'} {CONSENT_LABEL[c.key]}
            </Txt>
            <Txt variant="caption" color={c.agreed ? 'textSecondary' : 'textTertiary'}>
              {c.agreed ? `동의 ${c.agreedAt ? formatDate(c.agreedAt) : ''}` : '미동의'}
            </Txt>
          </View>
        ))}
      </Rows>

      <Gutter style={{ paddingTop: space.xxl, alignItems: 'flex-start' }}>
        <Button label="회원 탈퇴" variant="text" size="md" onPress={() => openScreen('/my/withdraw')} />
      </Gutter>
    </Screen>
  );
}

export default function ProfileScreen() {
  const { data: session, isPending } = useSession();
  if (isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!session) return <SignInPrompt />;
  return <ProfileForm session={session} />;
}

const styles = StyleSheet.create({
  account: { paddingVertical: space.xl, gap: 4 },
  accountLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    minHeight: 52,
    paddingVertical: 12,
  },
});
