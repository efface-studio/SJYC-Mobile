import { openScreen } from '~/shared/navigation';
import { Stack } from 'expo-router';
import { managesAnyClub } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import { useManagedClubs } from '~/admin-kit/club-ops';
import { NoPermission, Rows } from '~/admin-kit/components';
import { Badge, EmptyState, ListRow, QueryBoundary, Screen } from '~/ds';

/** 동아리 운영 — 담당 동아리(센터 직원 이상은 전체) */
export default function MyClubs() {
  const user = useSession().data?.user;
  const allowed = managesAnyClub(user);
  const clubs = useManagedClubs(allowed);
  return (
    <>
      <Stack.Screen options={{ title: '동아리 운영' }} />
      {!allowed ? (
        <NoPermission />
      ) : (
        <Screen onRefresh={() => clubs.refetch()}>
          <QueryBoundary query={clubs}>
            {(list) =>
              list.length === 0 ? (
                <EmptyState title="운영하는 동아리가 없습니다" />
              ) : (
                <Rows
                  items={list}
                  rowKey={(c) => c.id}
                  render={(c) => (
                    <ListRow
                      meta={`${c.field} · 회원 ${c.memberCount}명`}
                      title={c.name}
                      subtitle={c.summary}
                      trailing={
                        c.recruiting ? <Badge text="모집 중" tone="success" /> : <Badge text="모집 마감" />
                      }
                      onPress={() => openScreen(`/more/my-club/${c.id}`)}
                    />
                  )}
                />
              )
            }
          </QueryBoundary>
        </Screen>
      )}
    </>
  );
}
