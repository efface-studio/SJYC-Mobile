import { openScreen } from '~/shared/navigation';
import { ProfilePhoto } from '~/user-kit/profile-photo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SFSymbol, AndroidSymbol } from 'expo-symbols';
import { api, errorMessage } from '@/api';
import { IS_MOCK } from '@/config/env';
import { APPLICATION_STATUS, CLUB_APPLICATION_STATUS, POLICY_NAV, RESERVATION_STATUS } from '@/domain/labels';
import type { SpaceReservation, User } from '@/domain/types';
import { useLogout, useSession } from '@/features/auth/session';
import { formatDate, formatShortDate } from '@/lib/format';
import {
  Badge,
  Button,
  Chips,
  Divider,
  EmptyState,
  Gutter,
  ListRow,
  LoadingState,
  QueryBoundary,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  space,
  useTheme,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Icon } from '~/shared/icon';
import { Rows } from '~/user-kit';

type Segment = 'applications' | 'reservations' | 'clubs';

function LinkRow({
  title,
  ios,
  android,
  onPress,
}: {
  title: string;
  ios: SFSymbol;
  android: AndroidSymbol;
  onPress: () => void;
}) {
  const t = useTheme();
  return (
    <ListRow
      title={title}
      numberOfLines={1}
      leading={<Icon ios={ios} android={android} color={t.textSecondary} size={20} />}
      onPress={onPress}
    />
  );
}

/** 고객 지원 · 정책 · 개발 도구 — 로그인 여부와 무관 */
function InfoSections() {
  return (
    <>
      <SectionHeader title="고객 지원" />
      <Rows>
        <LinkRow
          title="질문·문의"
          ios="bubble.left.and.bubble.right"
          android="forum"
          onPress={() => openScreen('/qna')}
        />
        <LinkRow
          title="공지사항"
          ios="megaphone"
          android="campaign"
          onPress={() => openScreen('/notices')}
        />
        <LinkRow
          title="센터 소식·갤러리"
          ios="photo.on.rectangle"
          android="photo_library"
          onPress={() => openScreen('/gallery')}
        />
        <LinkRow
          title="센터 안내·오시는 길"
          ios="info.circle"
          android="info"
          onPress={() => openScreen('/about')}
        />
        {IS_MOCK ? (
          <LinkRow
            title="개발 도구 (mock 모드)"
            ios="wrench.and.screwdriver"
            android="build"
            onPress={() => openScreen('/dev-tools')}
          />
        ) : null}
      </Rows>
      <SectionHeader title="약관 및 정책" />
      <Rows>
        {POLICY_NAV.map((p) => (
          <ListRow
            key={p.key}
            title={p.title}
            numberOfLines={1}
            onPress={() => openScreen(`/policies/${p.key}`)}
          />
        ))}
      </Rows>
    </>
  );
}

function SignedOut() {
  return (
    <Screen>
      <EmptyState
        title="로그인하고 더 편하게 이용하세요"
        description="프로그램 신청, 공간 예약, 동아리 가입 내역을 한곳에서 확인할 수 있습니다."
        action={
          <View style={styles.authButtons}>
            <View style={{ flex: 1 }}>
              <Button label="로그인" onPress={() => openScreen('/login')} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="회원가입" variant="secondary" onPress={() => openScreen('/signup')} />
            </View>
          </View>
        }
      />
      <InfoSections />
    </Screen>
  );
}

function ProfileHeader({ user }: { user: User }) {
  return (
    <Tap onPress={() => openScreen('/my/profile')} accessibilityLabel="내 정보 수정" style={styles.profile}>
      <ProfilePhoto userId={user.id} />
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="title2">{user.name}님</Txt>
        <Txt variant="caption" color="textTertiary" numberOfLines={1}>
          {user.email}
        </Txt>
      </View>
      <Txt variant="captionStrong" color="action">
        내 정보 수정
      </Txt>
    </Tap>
  );
}

const SEGMENTS: { key: Segment; label: string }[] = [
  { key: 'applications', label: '프로그램 신청' },
  { key: 'reservations', label: '공간 예약' },
  { key: 'clubs', label: '동아리' },
];

/** 내역 전환 — 밑줄 탭에 건수를 함께 표시 ("프로그램 신청 3") */
function Segments({
  value,
  onChange,
  counts,
}: {
  value: Segment;
  onChange: (s: Segment) => void;
  counts: Record<Segment, number | undefined>;
}) {
  const options = SEGMENTS.map((it) => ({
    value: it.key,
    label: counts[it.key] === undefined ? it.label : `${it.label} ${counts[it.key]}`,
  }));
  return <Chips options={options} value={value} onChange={onChange} />;
}

function ReservationRow({ r, onCancel }: { r: SpaceReservation; onCancel: () => void }) {
  const t = useTheme();
  const s = RESERVATION_STATUS[r.status];
  return (
    <View style={styles.resRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Txt variant="caption" color="textTertiary">
          {formatShortDate(`${r.date}T12:00:00+09:00`)} · {r.startTime}–{r.endTime}
        </Txt>
        <Txt variant="bodyStrong" numberOfLines={1}>
          {r.spaceName}
        </Txt>
        <Txt variant="caption" color="textSecondary" numberOfLines={2}>
          {r.headcount}명{r.reason ? ` · 사유: ${r.reason}` : ''}
        </Txt>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Badge text={s.text} tone={s.tone} />
        {r.cancellable && (
          <Tap onPress={onCancel} accessibilityLabel={`${r.spaceName} 예약 취소`} style={styles.cancel}>
            <Txt variant="captionStrong" color={t.tone.danger.fg}>
              예약 취소
            </Txt>
          </Tap>
        )}
      </View>
    </View>
  );
}

export default function MyScreen() {
  const t = useTheme();
  const qc = useQueryClient();
  const { data: session, isPending } = useSession();
  const logout = useLogout();
  const signedIn = !!session;
  const [segment, setSegment] = useState<Segment>('applications');
  const applications = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.me.applications(),
    enabled: signedIn,
  });
  const reservations = useQuery({
    queryKey: ['my-reservations'],
    queryFn: () => api.me.reservations(),
    enabled: signedIn,
  });
  const clubs = useQuery({ queryKey: ['my-clubs'], queryFn: () => api.me.clubs(), enabled: signedIn });
  const clubApps = useQuery({
    queryKey: ['my-club-applications'],
    queryFn: () => api.me.clubApplications(),
    enabled: signedIn,
  });
  const cancel = useMutation({
    mutationFn: (id: string) => api.me.cancelReservation(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['my-reservations'] }),
    onError: (e) => notify('예약을 취소하지 못했습니다', errorMessage(e)),
  });

  if (isPending) {
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  }
  if (!session) return <SignedOut />;

  const cancelReservation = async (r: SpaceReservation) => {
    const ok = await confirm({
      title: '예약을 취소할까요?',
      message: `${r.spaceName} · ${r.date} ${r.startTime}–${r.endTime}`,
      confirmLabel: '예약 취소',
      cancelLabel: '유지',
      destructive: true,
    });
    if (ok) cancel.mutate(r.id);
  };
  const pendingClubApps = (clubApps.data ?? []).filter((a) => a.status !== 'approved');

  return (
    <Screen
      onRefresh={() =>
        Promise.all([applications.refetch(), reservations.refetch(), clubs.refetch(), clubApps.refetch()])
      }
    >
      <ProfileHeader user={session.user} />
      <Segments
        value={segment}
        onChange={setSegment}
        counts={{
          applications: applications.data?.length,
          reservations: reservations.data?.length,
          clubs: clubs.data ? clubs.data.length + pendingClubApps.length : undefined,
        }}
      />

      {segment === 'applications' && (
        <>
          <SectionHeader
            title="프로그램 신청 내역"
            action="프로그램 찾기"
            onAction={() => router.navigate('/programs')}
          />
          <QueryBoundary
            query={applications}
            isEmpty={(d) => d.length === 0}
            empty={{ title: '신청한 프로그램이 없습니다', description: '모집 중인 프로그램을 둘러보세요.' }}
          >
            {(data) => (
              <Rows>
                {data.map((a) => {
                  const s = APPLICATION_STATUS[a.status];
                  return (
                    <Tap
                      key={a.id}
                      accessibilityLabel={`${a.programTitle}, ${s.text}, ${formatDate(a.createdAt)} 신청, 상세 보기`}
                      style={styles.applicationRow}
                      onPress={() => openScreen(`/my/applications/${a.id}`)}
                    >
                      <View style={styles.applicationCopy}>
                        <Txt variant="bodyStrong" numberOfLines={2}>
                          {a.programTitle}
                        </Txt>
                        <View style={styles.applicationMeta}>
                          <Txt variant="captionStrong" color={t.tone[s.tone].fg}>
                            {s.text}
                          </Txt>
                          <Txt variant="caption" color="textTertiary">
                            ·
                          </Txt>
                          <Txt variant="caption" color="textTertiary">
                            {formatDate(a.createdAt)} 신청
                          </Txt>
                        </View>
                      </View>
                      <Icon ios="chevron.right" android="chevron_right" size={14} color={t.lineStrong} />
                    </Tap>
                  );
                })}
              </Rows>
            )}
          </QueryBoundary>
        </>
      )}

      {segment === 'reservations' && (
        <>
          <SectionHeader
            title="공간 예약 내역"
            action="공간 예약하기"
            onAction={() => router.navigate('/spaces')}
          />
          <QueryBoundary
            query={reservations}
            isEmpty={(d) => d.length === 0}
            empty={{
              title: '예약 내역이 없습니다',
              description: '스터디룸, 연습실 등을 예약할 수 있습니다.',
            }}
          >
            {(data) => (
              <Rows>
                {data.map((r) => (
                  <ReservationRow key={r.id} r={r} onCancel={() => void cancelReservation(r)} />
                ))}
              </Rows>
            )}
          </QueryBoundary>
        </>
      )}

      {segment === 'clubs' && (
        <>
          <SectionHeader
            title="내 동아리"
            action="동아리 둘러보기"
            onAction={() => router.navigate('/clubs')}
          />
          <QueryBoundary
            query={clubs}
            isEmpty={(d) => d.length === 0 && pendingClubApps.length === 0}
            empty={{
              title: '가입한 동아리가 없습니다',
              description: '관심 있는 동아리에 가입 신청해 보세요.',
            }}
          >
            {(data) => (
              <Rows>
                {data.map(({ club, role }) => (
                  <ListRow
                    key={club.id}
                    title={club.name}
                    subtitle={club.meetingInfo}
                    trailing={role === 'leader' ? <Badge text="대표" tone="brand" /> : undefined}
                    onPress={() => openScreen(`/clubs/${club.id}`)}
                  />
                ))}
                {pendingClubApps.map((a) => {
                  const s = CLUB_APPLICATION_STATUS[a.status];
                  return (
                    <ListRow
                      key={a.id}
                      meta="가입 신청"
                      title={a.clubName}
                      subtitle={a.reason ? `사유: ${a.reason}` : `${formatDate(a.createdAt)} 신청`}
                      trailing={<Badge text={s.text} tone={s.tone} />}
                      onPress={() => openScreen(`/clubs/${a.clubId}`)}
                    />
                  );
                })}
              </Rows>
            )}
          </QueryBoundary>
        </>
      )}

      <SectionHeader title="활동" />
      <Rows>
        <LinkRow title="내 알림" ios="bell" android="notifications" onPress={() => openScreen('/notifications')} />
        <LinkRow
          title="출석 체크 · 내 출석 기록"
          ios="checkmark.circle"
          android="how_to_reg"
          onPress={() => openScreen('/my/attendance')}
        />
      </Rows>
      {session.user.managedClubIds.length > 0 && (
        <Gutter style={{ paddingVertical: space.md }}>
          <Txt variant="caption" color="textSecondary">
            동아리 담당자로 지정되어 있습니다. 회원·가입 신청·출석·소식 관리는 관리자 앱(또는 웹 관리자
            화면)의 동아리 운영에서 할 수 있습니다.
          </Txt>
        </Gutter>
      )}

      <InfoSections />

      <Divider />
      <Gutter style={{ paddingTop: space.lg }}>
        <Button
          label="로그아웃"
          variant="text"
          size="md"
          onPress={async () => {
            const ok = await confirm({
              title: '로그아웃할까요?',
              confirmLabel: '로그아웃',
              destructive: true,
            });
            if (ok) logout.mutate();
          }}
        />
      </Gutter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  authButtons: { flexDirection: 'row', gap: space.sm, alignSelf: 'stretch', marginTop: space.lg },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: space.lg,
  },
  applicationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 13,
    minHeight: 60,
  },
  applicationCopy: { flex: 1, gap: 2 },
  applicationMeta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  resRow: { flexDirection: 'row', gap: space.md, paddingHorizontal: 20, paddingVertical: 14 },
  cancel: { paddingTop: 12, paddingBottom: 8, paddingLeft: 12 },
});
