import { useCallback, useState } from 'react';
import { Platform, StyleSheet } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Stack, useFocusEffect } from 'expo-router';
import { api } from '@/api';
import { useSession } from '@/features/auth/session';
import {
  Button,
  EmptyState,
  Gutter,
  InfoRow,
  Photo,
  QueryBoundary,
  Screen,
  Tap,
  Txt,
  pickOption,
  space,
  useTheme,
} from '~/ds';
import { Icon } from '~/shared/icon';
import { openScreen } from '~/shared/navigation';
import { MemberSections } from '~/user-kit/club-member-sections';

function openRecruitment() {
  openScreen('/clubs/recruitment');
}

export default function MyClubsScreen() {
  const t = useTheme();
  const session = useSession();
  const cache = useQueryClient();
  const userId = session.data?.user.id;
  const memberships = useQuery({
    queryKey: ['my-clubs', userId],
    queryFn: api.me.clubs,
    enabled: !!session.data,
  });
  const [selectedId, setSelectedId] = useState<string>();
  const all = memberships.data ?? [];
  const selected = all.find(({ club }) => club.id === selectedId) ?? all[0];
  const club = selected?.club;
  const multiple = all.length > 1;
  useFocusEffect(
    useCallback(() => {
      if (userId) void cache.invalidateQueries({ queryKey: ['my-clubs'] });
    }, [cache, userId]),
  );
  async function switchClub() {
    if (!multiple || !selected) return;
    const index = await pickOption(
      '내 동아리 선택',
      all.map(
        ({ club: item }) => item.name + (Platform.OS === 'ios' && item.id === club?.id ? ' (선택됨)' : ''),
      ),
      all.indexOf(selected),
    );
    if (index !== null && all[index]) setSelectedId(all[index].club.id);
  }
  const refresh = () =>
    Promise.all([
      memberships.refetch(),
      ...(club
        ? [
            ['club-posts', club.id],
            ['club-members', club.id],
          ].map((queryKey) => cache.invalidateQueries({ queryKey }))
        : []),
    ]);
  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Tap onPress={openRecruitment} accessibilityLabel="동아리 모집 보기" style={styles.action}>
              <Icon ios="person.2.badge.plus" android="group_add" size={22} color={t.text} />
            </Tap>
          ),
        }}
      />
      <Screen key={club?.id} onRefresh={refresh}>
        <QueryBoundary query={memberships}>
          {() =>
            club ? (
              <>
                <Gutter style={styles.intro}>
                  <Txt variant="caption" color="textTertiary">
                    {[club.field, selected.role === 'leader' ? '대표' : '동아리원']
                      .filter(Boolean)
                      .join(' · ')}
                  </Txt>
                  {multiple ? (
                    <Tap
                      onPress={() => void switchClub()}
                      accessibilityLabel={club.name + ', 동아리 변경'}
                      style={styles.switcher}
                    >
                      <Txt variant="title1" style={styles.name}>
                        {club.name}
                      </Txt>
                      <Icon ios="chevron.down" android="expand_more" size={18} color={t.textSecondary} />
                    </Tap>
                  ) : (
                    <Txt accessibilityRole="header" variant="title1">
                      {club.name}
                    </Txt>
                  )}
                  {!!club.summary && <Txt color="textSecondary">{club.summary}</Txt>}
                </Gutter>
                {club.photos[0] && (
                  <Photo uri={club.photos[0].url} alt={club.photos[0].caption || club.name} ratio={2.15} />
                )}
                <Gutter style={styles.info}>
                  {!!club.meetingInfo && <InfoRow label="모임 안내" value={club.meetingInfo} />}
                  <Tap
                    onPress={() => openScreen(`/clubs/${club.id}`)}
                    accessibilityLabel="동아리 소개 보기"
                    style={styles.detail}
                  >
                    <Txt variant="label">동아리 소개</Txt>
                    <Icon ios="chevron.right" android="chevron_right" size={16} color={t.textTertiary} />
                  </Tap>
                </Gutter>
                <MemberSections clubId={club.id} />
              </>
            ) : (
              <EmptyState
                title="아직 소속 동아리가 없어요"
                description="모집 중인 동아리를 보고 가입을 신청해 보세요."
                action={<Button label="모집 중인 동아리 보기" onPress={openRecruitment} />}
              />
            )
          }
        </QueryBoundary>
      </Screen>
    </>
  );
}
const styles = StyleSheet.create({
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  intro: { paddingTop: space.lg, paddingBottom: space.xl, gap: space.sm },
  switcher: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    alignSelf: 'flex-start',
  },
  name: { flexShrink: 1 },
  info: { paddingTop: space.md },
  detail: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
