import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import type { Club } from '@/domain/types';
import { Badge, Gutter, Photo, QueryBoundary, Screen, Tap, Txt, radius, space, useTheme } from '~/ds';

const COVER_RATIO = 16 / 9;

/** 사진이 없을 때의 표지 — 동아리 이름 첫 글자 */
function ClubCover({ club }: { club: Club }) {
  const t = useTheme();
  const photo = club.photos[0];
  if (photo) return <Photo uri={photo.url} alt={photo.caption || club.name} ratio={COVER_RATIO} />;
  return (
    <View style={[styles.placeholder, { backgroundColor: t.brandSoft }]}>
      <Txt variant="display" color="action" style={styles.initial}>
        {[...club.name][0] ?? ''}
      </Txt>
    </View>
  );
}

function ClubCard({ c }: { c: Club }) {
  const t = useTheme();
  return (
    <Tap
      onPress={() => router.push(`/clubs/${c.id}`)}
      rounded={radius.lg}
      accessibilityLabel={`${c.name}, ${c.field}${c.recruiting ? ', 모집 중' : ''}`}
      style={[styles.card, { borderColor: t.line, backgroundColor: t.card }]}
    >
      <ClubCover club={c} />
      <View style={styles.body}>
        <View style={styles.badges}>
          <Badge text={c.field} />
          {c.recruiting ? <Badge text="모집 중" tone="brand" /> : <Badge text="현재 모집 없음" />}
        </View>
        <Txt variant="title3">{c.name}</Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={2}>
          {c.summary}
        </Txt>
        <Txt variant="small" color="textTertiary" numberOfLines={1}>
          {[c.target, c.meetingInfo, `${c.memberCount}명 활동`].filter(Boolean).join(' · ')}
        </Txt>
      </View>
    </Tap>
  );
}

export default function ClubsScreen() {
  const clubs = useQuery({ queryKey: ['clubs'], queryFn: () => api.clubs.list() });
  return (
    <Screen onRefresh={() => clubs.refetch()}>
      <QueryBoundary
        query={clubs}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 동아리가 없습니다' }}
      >
        {(data) => (
          <Gutter style={{ gap: space.lg, paddingTop: space.sm }}>
            <Txt variant="caption" color="textTertiary">
              활동 중인 동아리 {data.length}개
            </Txt>
            {data.map((c) => (
              <ClubCard key={c.id} c={c} />
            ))}
          </Gutter>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: StyleSheet.hairlineWidth },
  placeholder: { aspectRatio: COVER_RATIO, alignItems: 'center', justifyContent: 'center' },
  initial: { fontSize: 48, lineHeight: 58 },
  body: { padding: space.lg, gap: 6 },
  badges: { flexDirection: 'row', gap: 6 },
});
