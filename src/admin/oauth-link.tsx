import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { router } from 'expo-router';
import { api, errorMessage } from '@/api';
import { OAUTH_PROVIDER_LABEL } from '@/domain/labels';
import { canEnterConsole } from '@/domain/permissions';
import { SESSION_KEY } from '@/features/auth/session';
import { Button, Screen, Gutter, TextField, Txt, LoadingState, space } from '~/ds';
export default function AdminLink() {
  const pending = useQuery({
    queryKey: ['admin-social-link'],
    queryFn: api.auth.adminSocialLink,
    retry: false,
    gcTime: 0,
  });
  const [email, setEmail] = useState(''),
    [password, setPassword] = useState('');
  const qc = useQueryClient();
  const link = useMutation({
    mutationFn: async () => {
      await api.auth.linkAdminSocial({ email, password });
      const user = await api.auth.me();
      if (!user || !canEnterConsole(user.user)) throw new Error('관리자 권한을 확인할 수 없습니다.');
      qc.setQueryData(SESSION_KEY, user);
    },
  });
  return (
    <Screen>
      <Gutter style={{ paddingTop: space.xl, gap: space.lg }}>
        {pending.isPending ? (
          <LoadingState />
        ) : pending.isError ? (
          <Txt variant="body">{errorMessage(pending.error)}</Txt>
        ) : (
          <>
            <Txt variant="body">
              {OAUTH_PROVIDER_LABEL[pending.data.provider]}로 로그인하려면 기존 관리자 계정의 이메일과
              비밀번호를 입력해 주세요.
            </Txt>
            <TextField
              label="관리자 이메일"
              autoCapitalize="none"
              autoComplete="username"
              keyboardType="email-address"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
            />
            <TextField
              label="비밀번호"
              secureTextEntry
              autoComplete="current-password"
              value={password}
              onChangeText={setPassword}
            />
            {link.isError && <Txt variant="caption">{errorMessage(link.error)}</Txt>}
            <Button
              label="계정 연결하고 로그인"
              disabled={!email || !password}
              loading={link.isPending}
              onPress={() => link.mutate()}
            />
          </>
        )}
        <Button label="관리자 로그인으로 돌아가기" variant="text" onPress={() => router.replace('/login')} />
      </Gutter>
    </Screen>
  );
}
