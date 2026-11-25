import { useQuery } from '@tanstack/react-query';
import { View, StyleSheet } from 'react-native';
import { api } from '@/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { Badge, Gutter, QueryBoundary, SectionHeader, Txt, space } from '~/ds';
import { Rows } from '~/user-kit';

const POST_KIND = { notice: '공지', schedule: '일정', activity: '활동 기록' } as const;

/** 동아리원 전용: 소식·일정과 마스킹된 명단 */
export function MemberSections({ clubId }: { clubId: string }) {
  const posts = useQuery({ queryKey: ['club-posts', clubId], queryFn: () => api.clubs.posts(clubId) });
  const members = useQuery({ queryKey: ['club-members', clubId], queryFn: () => api.clubs.members(clubId) });
  return (
    <>
      <SectionHeader title="소식 · 일정" />
      <QueryBoundary
        query={posts}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 소식이 없습니다' }}
      >
        {(data) => (
          <Rows>
            {data.map((p) => (
              <View key={p.id} style={styles.post}>
                <View style={styles.postHead}>
                  <Badge
                    text={POST_KIND[p.kind]}
                    tone={p.kind === 'notice' ? 'brand' : p.kind === 'schedule' ? 'info' : 'neutral'}
                  />
                  <Txt variant="small" color="textTertiary">
                    {formatDateTime(p.at)}
                  </Txt>
                </View>
                <Txt variant="bodyStrong">{p.title}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {p.body}
                </Txt>
              </View>
            ))}
          </Rows>
        )}
      </QueryBoundary>

      <SectionHeader title="동아리원" />
      <Gutter style={{ paddingBottom: space.sm }}>
        <Txt variant="caption" color="textTertiary">
          개인정보 보호를 위해 이름 일부만 표시합니다.
        </Txt>
      </Gutter>
      <QueryBoundary query={members}>
        {(data) => (
          <Rows>
            {data.map((m, i) => (
              <View key={i} style={styles.member}>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{m.displayName}</Txt>
                  <Txt variant="small" color="textTertiary">
                    {formatDate(m.joinedAt)} 가입
                  </Txt>
                </View>
                {m.role === 'leader' && <Badge text="대표" tone="brand" />}
              </View>
            ))}
          </Rows>
        )}
      </QueryBoundary>
    </>
  );
}

const styles = StyleSheet.create({
  post: { paddingHorizontal: 20, paddingVertical: space.lg, gap: 4 },
  postHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
});
