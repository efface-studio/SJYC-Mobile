import { useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api } from '@/api';
import { CLUB_APPLICATION_STATUS } from '@/domain/labels';
import { formatDateTime } from '@/lib/format';
import { Badge, Gutter, InfoRow, Screen, SectionHeader, Txt } from '~/ds';
import { ApplicationEditor } from '~/shared/application-content';
import { Hero, QueryScreen } from '~/user-kit';

export default function MyClubApplication() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const query = useQuery({
    queryKey: ['my-club-applications'],
    queryFn: api.me.clubApplications,
  });
  return (
    <>
      <Stack.Screen options={{ title: '동아리 가입 신청' }} />
      <QueryScreen query={query}>
        {(items) => {
          const a = items.find((item) => item.id === id);
          if (!a)
            return (
              <Screen>
                <Gutter>
                  <Txt>신청 내역을 찾을 수 없습니다.</Txt>
                </Gutter>
              </Screen>
            );
          const status = CLUB_APPLICATION_STATUS[a.status];
          return (
            <Screen>
              <Hero title={a.clubName}>
                <Badge tone={status.tone} text={status.text} />
              </Hero>
              <SectionHeader title="신청 정보" />
              <Gutter>
                <InfoRow label="신청 일시" value={formatDateTime(a.createdAt)} />
                <InfoRow label="가입 동기" value={a.motivation} />
                {a.reason && <InfoRow label="반려 사유" value={a.reason} />}
                <ApplicationEditor
                  kind="club"
                  id={a.id}
                  value={a.motivation}
                  revision={a.contentEdits?.length ?? 0}
                />
              </Gutter>
            </Screen>
          );
        }}
      </QueryScreen>
    </>
  );
}
