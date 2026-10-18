import { useQuery } from '@tanstack/react-query';
import { router, Stack } from 'expo-router';
import { api } from '@/api';
import { NoPermission, Rows, StatusBadge, useCan } from '~/admin-kit/components';
import { IconCircle, ListRow, QueryBoundary, Screen } from '~/ds';

/** 공간 설정 목록 (웹 공간 예약 › 공간 설정) — 행을 누르면 공간별 설정 화면 */
export default function Spaces() {
  const allowed = useCan()('space.manage');
  const spaces = useQuery({
    queryKey: ['admin', 'spaces'],
    queryFn: () => api.admin.spaces.list(),
    enabled: allowed,
  });

  return (
    <>
      <Stack.Screen options={{ title: '공간 설정' }} />
      {allowed ? (
        <Screen onRefresh={() => spaces.refetch()}>
          <QueryBoundary
            query={spaces}
            isEmpty={(d) => d.length === 0}
            empty={{ title: '등록된 공간이 없습니다' }}
          >
            {(list) => (
              <Rows
                items={list}
                rowKey={(s) => s.id}
                render={(s) => (
                  <ListRow
                    leading={
                      <IconCircle
                        ios="door.left.hand.open"
                        android="meeting_room"
                        tone={s.reservable ? 'info' : 'neutral'}
                      />
                    }
                    meta={s.floor}
                    title={s.name}
                    subtitle={`수용 ${s.capacity}명`}
                    trailing={
                      <StatusBadge
                        {...(s.reservable
                          ? { text: '예약 받음', tone: 'success' as const }
                          : { text: '예약 중지', tone: 'warning' as const })}
                      />
                    }
                    onPress={() => router.push({ pathname: '/more/space/[id]', params: { id: s.id } })}
                  />
                )}
              />
            )}
          </QueryBoundary>
        </Screen>
      ) : (
        <NoPermission />
      )}
    </>
  );
}
