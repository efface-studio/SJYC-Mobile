import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { api, errorMessage } from '@/api';
import type { SocialDraft } from '@/domain/social-profile';
import { SESSION_KEY } from '@/features/auth/session';
import { Button, Gutter, LoadingState, Screen, SwitchRow, TextField, Txt, space } from '~/ds';
import { BirthDateField } from '~/shared/birth-date-field';
import { openScreen } from '~/shared/navigation';

function Fields({ draft }: { draft: SocialDraft }) {
  const cache = useQueryClient();
  const [name, setName] = useState(draft.name),
    [email, setEmail] = useState(draft.email),
    [phone, setPhone] = useState(draft.phone),
    [date, setDate] = useState(draft.birthDate);
  const [code, setCode] = useState(''),
    [sent, setSent] = useState('');
  const [terms, setTerms] = useState(false),
    [privacy, setPrivacy] = useState(false),
    [marketing, setMarketing] = useState(false);
  const address = email.trim().toLowerCase(),
    needsCode = address !== draft.verifiedEmail;
  const send = useMutation({
    mutationFn: api.auth.requestSocialCode,
    onSuccess: (_, requested) => {
      setSent(requested);
      setCode('');
    },
  });
  const save = useMutation({
    mutationFn: api.auth.saveSocialProfile,
    onSuccess: async () => {
      await cache.invalidateQueries({ queryKey: SESSION_KEY });
      router.replace('/my');
    },
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
          setSent('');
          setCode('');
        }}
      />
      {needsCode && (
        <>
          <Button
            variant="secondary"
            label={sent === address && sent ? '코드 다시 요청' : '이메일 코드 요청'}
            disabled={!address}
            loading={send.isPending}
            onPress={() => send.mutate(address)}
          />
          {!!sent && sent === address && (
            <TextField
              label="이메일 확인 코드"
              value={code}
              keyboardType="number-pad"
              maxLength={6}
              autoComplete="one-time-code"
              hint={
                draft.previewCode
                  ? '테스트 코드 284600을 입력해 주세요.'
                  : '메일에서 받은 여섯 자리 코드를 입력해 주세요.'
              }
              onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
            />
          )}
        </>
      )}
      {draft.needsConsent && (
        <>
          <SwitchRow label="[필수] 이용약관 동의" value={terms} onValueChange={setTerms} />
          <Button
            size="md"
            variant="text"
            label="이용약관 보기"
            onPress={() => openScreen('/policies/terms')}
          />
          <SwitchRow label="[필수] 개인정보 수집·이용 동의" value={privacy} onValueChange={setPrivacy} />
          <Button
            size="md"
            variant="text"
            label="개인정보 처리방침 보기"
            onPress={() => openScreen('/policies/privacy')}
          />
          <SwitchRow label="[선택] 프로그램 소식 수신" value={marketing} onValueChange={setMarketing} />
        </>
      )}
      {(save.isError || send.isError) && (
        <Txt variant="caption">{errorMessage(save.error ?? send.error)}</Txt>
      )}
      <Button
        label="확인하고 계속하기"
        loading={save.isPending}
        disabled={
          !name.trim() ||
          !date ||
          !phone ||
          !address ||
          (needsCode && (!sent || sent !== address || code.length !== 6)) ||
          (draft.needsConsent && !(privacy && terms))
        }
        onPress={() =>
          save.mutate({
            name,
            email: address,
            phone,
            birthDate: date,
            code: needsCode ? code : undefined,
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
