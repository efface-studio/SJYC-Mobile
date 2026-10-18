import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { RESERVATION_MAX_DAYS_AHEAD, RESERVATION_MAX_HOURS } from '@/domain/space';
import type { Space } from '@/domain/types';
import { Badge, Gutter, QueryBoundary, Screen, Tap, Txt, radius, space, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { Callout } from '~/user-kit';

function SpaceCard({ s }: { s: Space }) {
  const t = useTheme();
  return (
    <Tap
      onPress={() => router.push(`/spaces/${s.id}`)}
      rounded={radius.lg}
      accessibilityLabel={`${s.floor} ${s.name}, 최대 ${s.capacity}명${s.reservable ? '' : ', 예약 중지'}`}
      style={[styles.card, { borderColor: t.line, backgroundColor: t.card }]}
    >
      <View style={styles.top}>
        <View style={[styles.floor, { backgroundColor: t.brandSoft }]}>
          <Txt variant="captionStrong" color="action">
            {s.floor}
          </Txt>
        </View>
        {!s.reservable && <Badge text="예약 중지" tone="warning" />}
      </View>
      <Txt variant="title3">{s.name}</Txt>
      <Txt variant="caption" color="textSecondary" numberOfLines={2}>
        {s.description}
      </Txt>
      <View style={[styles.bottom, { borderTopColor: t.line }]}>
        <View style={styles.meta}>
          <Icon ios="person.2" android="group" color={t.textTertiary} size={14} />
          <Txt variant="caption" color="textTertiary">
            최대 {s.capacity}명
          </Txt>
        </View>
        <Txt variant="captionStrong" color={s.reservable ? 'action' : 'textTertiary'}>
          {s.reservable ? '예약하기 ›' : '상세 보기 ›'}
        </Txt>
      </View>
    </Tap>
  );
}

export default function SpacesScreen() {
  const spaces = useQuery({ queryKey: ['spaces'], queryFn: () => api.spaces.list() });
  return (
    <Screen onRefresh={() => spaces.refetch()}>
      <Gutter style={{ paddingTop: space.sm, paddingBottom: space.lg }}>
        <Callout tone="brand" title={`내일부터 ${RESERVATION_MAX_DAYS_AHEAD}일 이내 예약`}>
          1시간 단위로 최대 {RESERVATION_MAX_HOURS}시간까지 신청할 수 있으며, 담당자 확인 후 확정됩니다.
        </Callout>
      </Gutter>
      <QueryBoundary
        query={spaces}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '예약할 수 있는 공간이 없습니다' }}
      >
        {(data) => (
          <Gutter style={{ gap: space.md }}>
            {data.map((s) => (
              <SpaceCard key={s.id} s={s} />
            ))}
          </Gutter>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: 6 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  floor: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  bottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: space.sm,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
