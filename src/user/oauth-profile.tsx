import { useMutation, useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import type { SocialDraft } from '@/domain/social-profile';
import { Button, Gutter, LoadingState, Screen, SwitchRow, TextField, Txt, space } from '~/ds';
import { BirthDateField } from '~/shared/birth-date-field';
import { openScreen } from '~/shared/navigation';

function Fields({ draft }: { draft: SocialDraft }) {
  const [name, setName] = useState(draft.name),
    [email, setEmail] = useState(draft.email),
    [phone, setPhone] = useState(draft.phone),
    [date, setDate] = useState(draft.birthDate);
  const [terms, setTerms] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [marketing, setMarketing] = useState(false);
  const address = email.trim().toLowerCase();
  const save = useMutation({
    mutationFn: api.auth.saveSocialProfile,
    onSuccess: () => router.replace('/verify-phone'),
  });
  return (
    <Gutter style={{ paddingVertical: space.xl, gap: space.lg }}>
      <Txt variant="body" color="textSecondary">
        가져온 정보는 수정할 수 있습니다. 비어 있는 항목을 입력해 주세요.
      </Txt>
      <TextField label="이름" autoComplete="name" value={name} onChangeText={setName} />
      <TextField
        label="휴대전화 (필수)"
        keyboardType="phone-pad"
        autoComplete="tel"
        value={phone}
        onChangeText={setPhone}
      />
      <BirthDateField value={date} onChange={setDate} />
      <TextField
        label="이메일"
        keyboardType="email-address"
        autoComplete="email"
        autoCorrect={false}
        value={email}
        onChangeText={(v) => {
          setEmail(v);
        }}
      />
      {draft.needsConsent && (
        <>
          <SwitchRow label="[필수] 이용약관 동의" value={terms} onValueChange={setTerms}
            link={{ label: '이용약관 보기', onPress: () => openScreen('/policies/terms') }}
          />
          <SwitchRow label="[필수] 개인정보 수집·이용 동의" value={privacy} onValueChange={setPrivacy}
            link={{ label: '개인정보 처리방침 보기', onPress: () => openScreen('/policies/privacy') }}
          />
          <SwitchRow label="[선택] 프로그램 소식 수신" value={marketing} onValueChange={setMarketing} />
        </>
      )}
      {(save.isError) && (
        <Txt variant="caption">{errorMessage(save.error)}</Txt>
      )}
      <Button
        label="확인하고 계속하기"
        loading={save.isPending}
        disabled={
          !name.trim() ||
          !date ||
          !phone ||
          !address ||
          (draft.needsConsent && !(privacy && terms))
        }
        onPress={() =>
          save.mutate({
            name,
            email: address,
            phone,
            birthDate: date,
            agreeTerms: terms,
            agreePrivacy: privacy,
            agreeMarketing: marketing,
          })
        }
      />
    </Gutter>
  );
}
export default function SocialProfile() {
  const draft = useQuery({
    queryKey: ['oauth-onboarding'],
    queryFn: api.auth.socialDraft,
    retry: false,
    gcTime: 0,
  });
  return (
    <Screen>
      {draft.isPending ? (
        <LoadingState />
      ) : draft.isError ? (
        <Gutter>
          <Txt variant="body">{errorMessage(draft.error)}</Txt>
          <Button label="로그인으로 돌아가기" onPress={() => router.replace('/login')} />
        </Gutter>
      ) : (
        <Fields draft={draft.data} />
      )}
    </Screen>
  );
}
