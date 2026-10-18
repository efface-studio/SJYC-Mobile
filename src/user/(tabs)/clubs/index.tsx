import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import type { Club } from '@/domain/types';
import { Badge, Gutter, Photo, QueryBoundary, Screen, Tap, Txt, radius, space, useTheme } from '~/ds';

/** 동아리 행 — 사진이 있을 때만 표지를 보여주고, 행 사이는 구분선 (웹 동아리 목록) */
function ClubRow({ c }: { c: Club }) {
  const t = useTheme();
  const photo = c.photos[0];
  return (
    <Tap
      onPress={() => router.push(`/clubs/${c.id}`)}
      accessibilityLabel={`${c.name}, ${c.field}${c.recruiting ? ', 모집 중' : ''}`}
      style={[styles.row, { borderBottomColor: t.line }]}
    >
      {photo && (
        <Photo
          uri={photo.url}
          alt={photo.caption || c.name}
          style={{ borderRadius: radius.md, marginBottom: space.sm }}
        />
      )}
      <View style={styles.badges}>
        {c.recruiting ? <Badge text="모집 중" tone="brand" /> : <Badge text="현재 모집 없음" />}
        <Txt variant="caption" color="textTertiary">
          {c.field}
        </Txt>
      </View>
      <Txt variant="title3">{c.name}</Txt>
      <Txt variant="caption" color="textSecondary" numberOfLines={2}>
        {c.summary}
      </Txt>
      <Txt variant="caption" color="textTertiary" numberOfLines={1}>
        {[c.target, c.meetingInfo, `${c.memberCount}명 활동`].filter(Boolean).join(' · ')}
      </Txt>
    </Tap>
  );
}

export default function ClubsScreen() {
  const t = useTheme();
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.clubs.list() });
  return (
    <Screen onRefresh={() => clubs.refetch()}>
      <QueryBoundary
        query={clubs}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 동아리가 없습니다' }}
      >
        {(data) => (
          <Gutter style={{ paddingTop: space.sm }}>
            <Txt variant="caption" color="textTertiary" style={{ paddingBottom: space.sm }}>
              활동 중인 동아리 {data.length}개
            </Txt>
            <View style={{ borderTopWidth: 2, borderTopColor: t.text }}>
              {data.map((c) => (
                <ClubRow key={c.id} c={c} />
              ))}
            </View>
          </Gutter>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { paddingVertical: space.lg, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
