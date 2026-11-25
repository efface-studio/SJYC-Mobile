import { openScreen } from '~/shared/navigation';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import type { Club } from '@/domain/types';
import {
  Badge,
  Chips,
  EmptyState,
  Gutter,
  Photo,
  QueryBoundary,
  Screen,
  Tap,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';

/** 동아리 행 — 사진이 있을 때만 표지를 보여주고, 행 사이는 구분선 (웹 동아리 목록) */
function ClubRow({ c }: { c: Club }) {
  const t = useTheme();
  const photo = c.photos[0];
  return (
    <Tap
      onPress={() => openScreen(`/clubs/${c.id}`)}
      accessibilityLabel={`${c.name}, ${c.field}${c.recruiting ? ', 모집 중' : ''}`}
      style={[styles.row, { borderBottomColor: t.line }]}
    >
      <View style={styles.copy}>
        <View style={styles.badges}>
          <Txt variant="caption" color="textTertiary" numberOfLines={1} style={styles.field}>
            {c.field}
          </Txt>
          {c.recruiting && <Badge text="모집 중" tone="brand" />}
        </View>
        <Txt variant="title3" numberOfLines={2}>
          {c.name}
        </Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={2}>
          {c.summary}
        </Txt>
        <Txt variant="small" color="textTertiary" numberOfLines={1}>
          {[c.target, c.meetingInfo, `${c.memberCount}명 활동`].filter(Boolean).join(' · ')}
        </Txt>
      </View>
      {photo && <Photo uri={photo.url} alt={photo.caption || c.name} ratio={1} style={styles.thumb} />}
    </Tap>
  );
}

export default function ClubsScreen() {
  const [filter, setFilter] = useState<'all' | 'open'>('all');
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.clubs.list() });
  return (
    <Screen onRefresh={() => clubs.refetch()}>
      <Chips
        options={[
          { value: 'all', label: '전체 동아리' },
          { value: 'open', label: '모집 중' },
        ]}
        value={filter}
        onChange={setFilter}
      />
      <QueryBoundary layout="club"
        query={clubs}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 동아리가 없습니다' }}
      >
        {(data) => {
          const visible = filter === 'all' ? data : data.filter((club) => club.recruiting);
          return (
            <Gutter style={{ paddingTop: space.sm }}>
              <Txt variant="caption" color="textTertiary" style={{ paddingBottom: space.sm }}>
                {filter === 'open' ? '모집 중인 동아리' : '전체 동아리'} {visible.length}개
              </Txt>
              <View>
                {visible.length === 0 && <EmptyState title="지금 모집 중인 동아리가 없습니다" />}
                {visible.map((c) => (
                  <ClubRow key={c.id} c={c} />
                ))}
              </View>
            </Gutter>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  copy: { flex: 1, minWidth: 0, gap: 3 },
  field: { minWidth: 0, flexShrink: 1 },
  thumb: { width: 80, flexShrink: 0, borderRadius: radius.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: space.md,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  badges: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
});
