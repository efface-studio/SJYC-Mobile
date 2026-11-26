import { openScreen } from '~/shared/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { NOTIFICATION_KIND_LABEL } from '@/domain/labels';
import type { Notification } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDateTime } from '@/lib/format';
import { LoadingState, QueryBoundary, Screen, Tap, Txt, space, useTheme } from '~/ds';
import { notify } from '~/shared/dialogs';
import { NOTIFICATIONS_KEY, Rows, SignInPrompt, openInternal, useNotifications } from '~/user-kit';

function NotificationRow({ n, onOpen }: { n: Notification; onOpen: () => void }) {
  const t = useTheme();
  const unread = n.readAt === null;
  return (
    <Tap
      onPress={onOpen}
      accessibilityLabel={`${unread ? '읽지 않음, ' : ''}${n.title}`}
      style={[styles.row, unread && { backgroundColor: t.brandSoft }]}
    >
      <View style={[styles.dot, { backgroundColor: unread ? t.brand : 'transparent' }]} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="caption" color="textTertiary">
          {NOTIFICATION_KIND_LABEL[n.kind]} · {formatDateTime(n.createdAt)}
        </Txt>
        <Txt variant={unread ? 'bodyStrong' : 'body'} color={unread ? 'text' : 'textSecondary'}>
          {n.title}
        </Txt>
        {n.body ? (
          <Txt variant="caption" color="textSecondary" numberOfLines={3}>
            {n.body}
          </Txt>
        ) : null}
      </View>
    </Tap>
  );
}

export default function NotificationsScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data: session, isPending } = useSession();
  const list = useNotifications();
  const markRead = useMutation({
    mutationFn: (ids?: string[]) => api.me.markNotificationsRead(ids),
    onSettled: () => void qc.invalidateQueries({ queryKey: NOTIFICATIONS_KEY }),
    onError: (e) => notify('읽음 처리하지 못했습니다', errorMessage(e)),
  });
  const unread = list.data?.filter((n) => n.readAt === null).length ?? 0;

  if (isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!session) return <SignInPrompt description="신청·예약 처리 결과와 문의 답변을 알림으로 받아 보세요." />;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () =>
            unread > 0 ? (
              <Tap
                onPress={() => markRead.mutate(undefined)}
                accessibilityLabel="모두 읽음"
                style={styles.headerAction}
              >
                <Txt variant="label" color="action">
                  모두 읽음
                </Txt>
              </Tap>
            ) : null,
        }}
      />
      <Screen onRefresh={() => list.refetch()}>
        <Tap accessibilityLabel="알림 설정" onPress={() => openScreen('/my/notification-settings')} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 20 }}>
          <Txt variant="label" color="textSecondary">알림 설정</Txt>
        </Tap>
        <QueryBoundary
          query={list}
          isEmpty={(d) => d.length === 0}
          empty={{
            title: '새 알림이 없습니다',
            description: '신청·예약 처리 결과와 문의 답변이 여기에 표시됩니다.',
          }}
        >
          {(data) => (
            <Rows inset={0}>
              {data.map((n) => (
                <NotificationRow
                  key={n.id}
                  n={n}
                  onOpen={() => {
                    if (n.readAt === null) markRead.mutate([n.id]);
                    openInternal(n.link);
                  }}
                />
              ))}
            </Rows>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingHorizontal: 20, paddingVertical: space.lg },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 7 },
  headerAction: { paddingHorizontal: 8, paddingVertical: 10 },
});
