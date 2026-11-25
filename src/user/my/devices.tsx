import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, errorMessage } from '@/api';
import { useSession } from '@/features/auth/session';
import { formatDateTime } from '@/lib/format';
import { ListRow, LoadingState, QueryBoundary, Screen, Txt } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Rows, SignInPrompt } from '~/user-kit';

export default function LoginDevices() {
  const session = useSession();
  const cache = useQueryClient();
  const key = ['login-devices', session.data?.user.id];
  const devices = useQuery({ queryKey: key, queryFn: api.me.loginDevices, enabled: !!session.data });
  const revoke = useMutation({
    mutationFn: api.me.revokeDevice,
    onSuccess: (next) => cache.setQueryData(key, next),
    onError: (err) => notify('로그아웃하지 못했습니다', errorMessage(err)),
  });
  if (session.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (!session.data) return <SignInPrompt />;
  return (
    <Screen onRefresh={() => devices.refetch()}>
      <QueryBoundary query={devices}>
        {(items) => (
          <Rows>
            {items.map((item) => (
              <ListRow
                key={item.id}
                title={item.label}
                subtitle={formatDateTime(item.createdAt) + ' 로그인'}
                chevron={false}
                trailing={
                  <Txt variant="captionStrong" color={item.current ? 'textSecondary' : 'action'}>
                    {item.current ? '현재 기기' : '로그아웃'}
                  </Txt>
                }
                onPress={
                  item.current || revoke.isPending
                    ? undefined
                    : async () => {
                        if (
                          await confirm({
                            title: '이 기기에서 로그아웃할까요?',
                            confirmLabel: '로그아웃',
                            destructive: true,
                          })
                        )
                          revoke.mutate(item.id);
                      }
                }
              />
            ))}
          </Rows>
        )}
      </QueryBoundary>
    </Screen>
  );
}
