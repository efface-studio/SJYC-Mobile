import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { managesAnyClub } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import {
  ApplicationsSection,
  AttendanceSection,
  IntroSection,
  MembersSection,
  PostsSection,
  useManagedClubs,
} from '~/admin-kit/club-ops';
import { NoPermission } from '~/admin-kit/components';
import { Chips, Divider, EmptyState, Gutter, QueryBoundary, Screen, Txt, space } from '~/ds';

type Section = 'members' | 'applications' | 'attendance' | 'posts' | 'intro';

const SECTIONS: { value: Section; label: string }[] = [
  { value: 'members', label: '회원' },
  { value: 'applications', label: '가입 신청' },
  { value: 'attendance', label: '출석' },
  { value: 'posts', label: '소식' },
  { value: 'intro', label: '소개' },
];

export default function ClubOps() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const user = useSession().data?.user;
  const allowed = managesAnyClub(user);
  const clubs = useManagedClubs(allowed);
  const [section, setSection] = useState<Section>('members');

  if (!allowed) return <NoPermission />;
  return (
    <QueryBoundary query={clubs}>
      {(list) => {
        const club = list.find((c) => c.id === id);
        if (!club) return <EmptyState title="운영 권한이 있는 동아리가 아닙니다" />;
        return (
          <>
            <Stack.Screen options={{ title: club.name }} />
            <Screen onRefresh={() => clubs.refetch()}>
              <Gutter style={{ paddingTop: space.md, gap: 2 }}>
                <Txt variant="caption" color="textTertiary">
                  {club.field} · 회원 {club.memberCount}명
                </Txt>
                <Txt variant="caption" color="textSecondary">
                  {club.meetingInfo}
                </Txt>
              </Gutter>
              <View style={{ paddingVertical: space.md }}>
                <Chips options={SECTIONS} value={section} onChange={setSection} />
              </View>
              <Divider />
              {section === 'members' && <MembersSection clubId={club.id} />}
              {section === 'applications' && <ApplicationsSection clubId={club.id} />}
              {section === 'attendance' && <AttendanceSection club={club} />}
              {section === 'posts' && <PostsSection clubId={club.id} />}
              {section === 'intro' && <IntroSection key={club.id} club={club} />}
            </Screen>
          </>
        );
      }}
    </QueryBoundary>
  );
}
