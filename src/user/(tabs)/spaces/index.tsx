import { SpacePhoto } from '~/user-kit/space-photo';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { api } from '@/api';
import { RESERVATION_MAX_DAYS_AHEAD, RESERVATION_MAX_HOURS } from '@/domain/space';
import { Badge, Gutter, ListRow, QueryBoundary, Screen, Txt, space } from '~/ds';
import { Rows } from '~/user-kit';

export default function SpacesScreen() {
  const spaces = useQuery({ queryKey: ['spaces'], queryFn: () => api.spaces.list() });
  return (
    <Screen onRefresh={() => spaces.refetch()}>
      <Gutter style={{ gap: space.xs, paddingTop: space.md, paddingBottom: space.xl }}>
        <Txt variant="bodyStrong">내일부터 {RESERVATION_MAX_DAYS_AHEAD}일 이내 예약</Txt>
        <Txt variant="caption" color="textSecondary">
          1시간 단위 · 최대 {RESERVATION_MAX_HOURS}시간
        </Txt>
        <Txt variant="caption" color="textSecondary">담당자가 확인하면 예약이 확정됩니다.</Txt>
      </Gutter>
      <QueryBoundary
        query={spaces}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '예약할 수 있는 공간이 없습니다' }}
      >
        {(data) => (
          <Rows>
            {data.map((s) => (
              <ListRow
                key={s.id}
                leading={<SpacePhoto space={s} compact />}
                meta={`${s.floor} · 최대 ${s.capacity}명`}
                title={s.name}
                subtitle={s.description}
                trailing={s.reservable ? undefined : <Badge text="예약 중지" tone="warning" />}
                onPress={() => router.push(`/spaces/${s.id}`)}
              />
            ))}
          </Rows>
        )}
      </QueryBoundary>
    </Screen>
  );
}
