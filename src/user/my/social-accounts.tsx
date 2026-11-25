import { useContext } from 'react';
import { ThemeAudience } from '~/ds/tokens';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Platform, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { OAUTH_PROVIDER_LABEL } from '@/domain/labels';
import type { OAuthProvider } from '@/domain/types';
import { SESSION_KEY, useSession } from '@/features/auth/session';
import { Gutter, LoadingState, QueryBoundary, Screen, Tap, Txt, useTheme } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Rows, SignInPrompt } from '~/user-kit';
import {
  beginSocial,
  SOCIAL_ORDER,
  SocialMark,
  socialKey,
  useSocialAccounts,
  useAppleAvailable,
} from '~/user-kit/social-accounts';

export default function SocialAccountsScreen() {
  const admin = useContext(ThemeAudience) === 'admin';
  const session = useSession();
  const id = session.data?.user.id;
  const query = useSocialAccounts(id);
  const cache = useQueryClient();
  const t = useTheme();
  const apple = useAppleAvailable();
  const change = useMutation({
    mutationFn: async ({ p, linked }: { p: OAuthProvider; linked: boolean }) => {
      if (!linked) {
        if (await beginSocial(p, true, admin) === 'native') {
          await cache.invalidateQueries({ queryKey: socialKey(id) });
          await cache.invalidateQueries({ queryKey: SESSION_KEY });
        }
        return;
      }
      if (
        await confirm({
          title: OAUTH_PROVIDER_LABEL[p] + ' 연결을 해제할까요?',
          confirmLabel: '연결 해제',
          destructive: true,
        })
      ) {
        const next = await api.me.unlinkSocial(p);
        cache.setQueryData(socialKey(id), next);
        await cache.invalidateQueries({ queryKey: SESSION_KEY });
      }
    },
    onError: (e) => notify('소셜 계정 연결', errorMessage(e)),
  });
  if (session.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (!id) return <SignInPrompt />;
  return (
    <Screen onRefresh={() => query.refetch()}>
      <QueryBoundary query={query}>
        {(data) => (
          <>
            <Gutter style={{ gap: 6, paddingVertical: 24 }}>
              <Txt variant="title3">
                {data.linked.length
                  ? '소셜 계정 ' + data.linked.length + '개가 연결돼 있어요'
                  : '연결된 소셜 계정이 없어요'}
              </Txt>
              <Txt variant="caption" color="textSecondary">
                연결한 계정으로 비밀번호 없이 로그인할 수 있어요.
              </Txt>
            </Gutter>
            <Rows>
              {SOCIAL_ORDER.map((p) => {
                const linked = data.linked.includes(p);
                const available = p !== 'google' && !(admin && p === 'apple') && data.available.includes(p) && (p !== 'apple' || Platform.OS !== 'ios' || !!apple.data);
                const last = linked && !data.hasPassword && !data.linked.some((other) => other !== p && other !== 'google' && (other !== 'apple' || data.available.includes('apple')));
                const label = linked ? '연결 해제' : available ? '연결하기' : '준비 중';
                return (
                  <Gutter
                    key={p}
                    style={{
                      minHeight: 62,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingVertical: 6,
                    }}
                  >
                    <SocialMark provider={p} muted={admin && !linked} />
                    <View
                      style={{
                        flex: 1,
                        flexDirection: 'row',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        gap: 6,
                      }}
                    >
                      <Txt variant="label">{OAUTH_PROVIDER_LABEL[p]}</Txt>
                      {linked && (
                        <Txt variant="caption" color={t.tone.success.fg}>
                          연결됨
                        </Txt>
                      )}
                    </View>
                    <Tap
                      accessibilityLabel={OAUTH_PROVIDER_LABEL[p] + ' ' + label}
                      disabled={last || (!linked && !available) || change.isPending}
                      onPress={() => change.mutate({ p, linked })}
                      style={{ minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}
                    >
                      <Txt variant="label" color={last || (!linked && !available) ? 'textTertiary' : 'text'}>
                        {label}
                      </Txt>
                    </Tap>
                  </Gutter>
                );
              })}
            </Rows>
            {!data.hasPassword && data.linked.filter((p) => p !== 'google').length === 1 && (
              <Gutter style={{ paddingTop: 16 }}>
                <Txt variant="caption" color="textSecondary">
                  마지막 로그인 수단을 해제하려면 먼저 비밀번호를 설정해 주세요.
                </Txt>
              </Gutter>
            )}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}
