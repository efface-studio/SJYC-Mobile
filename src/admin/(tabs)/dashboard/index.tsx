import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { router, Stack, type Href } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { useState } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import { APPLICATION_STATUS, PUBLISH_STATUS } from '@/domain/labels';
import { primaryRole, ROLE_LABEL, type Permission } from '@/domain/permissions';
import type { DashboardSummary } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate, formatDateTime } from '@/lib/format';
import { Rows, StatusBadge, useCan } from '~/admin-kit/components';
import { dashboardQuery } from '~/admin-kit/queries';
import {
  Badge,
  Card,
  Chips,
  Divider,
  EmptyState,
  GUTTER,
  Gutter,
  IconCircle,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  Txt,
  space,
} from '~/ds';

type CountKey = {
  [K in keyof DashboardSummary]: DashboardSummary[K] extends number ? K : never;
}[keyof DashboardSummary];

interface Link {
  href: Href;
  permission: Permission;
}

/** 처리 대기 — 승인·답변이 필요한 일. 탭하면 해당 상태로 걸러진 목록이 열린다 */
const PENDING: { key: CountKey; title: string; ios: SFSymbol; android: AndroidSymbol; link: Link }[] = [
  {
    key: 'applicationsSubmitted',
    title: '프로그램 신청 승인',
    ios: 'checkmark.circle',
    android: 'fact_check',
    link: {
      href: { pathname: '/applications', params: { status: 'submitted' } },
      permission: 'application.decide',
    },
  },
  {
    key: 'reservationsPending',
    title: '공간 예약 확정',
    ios: 'calendar',
    android: 'event',
    link: { href: { pathname: '/reservations', params: { status: 'pending' } }, permission: 'space.manage' },
  },
  {
    key: 'clubApplicationsPending',
    title: '동아리 가입 검토',
    ios: 'person.3.fill',
    android: 'groups',
    link: {
      href: { pathname: '/more/club-applications', params: { status: 'pending' } },
      permission: 'club.manage',
    },
  },
  {
    key: 'inquiriesOpen',
    title: '문의 답변',
    ios: 'bubble.left.and.text.bubble.right',
    android: 'forum',
    link: { href: { pathname: '/inquiries', params: { status: 'open' } }, permission: 'inquiry.answer' },
  },
];

const KPIS: { key: CountKey; label: (days: number) => string; unit: string; link: Link }[] = [
  {
    key: 'applicationsInPeriod',
    label: (days) => `최근 ${days}일 신청`,
    unit: '건',
    link: {
      href: { pathname: '/applications', params: { status: 'all' } },
      permission: 'application.decide',
    },
  },
  {
    key: 'applicationsSubmitted',
    label: () => '승인 대기 신청',
    unit: '건',
    link: {
      href: { pathname: '/applications', params: { status: 'submitted' } },
      permission: 'application.decide',
    },
  },
  {
    key: 'programsOpen',
    label: () => '모집 중 프로그램',
    unit: '개',
    link: {
      href: { pathname: '/more/programs', params: { status: 'published' } },
      permission: 'program.write',
    },
  },
  {
    key: 'noticesPublished',
    label: () => '게시 중 공지',
    unit: '건',
    link: {
      href: { pathname: '/more/notices', params: { status: 'published' } },
      permission: 'notice.write',
    },
  },
];

const PERIODS = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
];

function Greeting() {
  const user = useSession().data?.user;
  const today = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
  if (!user) return null;
  return (
    <Gutter style={styles.greeting}>
      <Txt variant="title3">{user.name}님, 안녕하세요</Txt>
      <Txt variant="caption" color="textTertiary">
        {ROLE_LABEL[primaryRole(user)]} · {today}
      </Txt>
    </Gutter>
  );
}

export default function Dashboard() {
  const allowed = useCan();
  const { width } = useWindowDimensions();
  const [days, setDays] = useState(7);
  const query = useQuery({ ...dashboardQuery(days), placeholderData: keepPreviousData });

  // 휴대폰 2열, 태블릿 4열
  const columns = width >= 700 ? 4 : 2;
  const cardWidth = (width - GUTTER * 2 - space.md * (columns - 1)) / columns;
  const open = (link: Link) => (allowed(link.permission) ? () => router.navigate(link.href) : undefined);
  const pending = PENDING.filter((p) => allowed(p.link.permission));

  return (
    <>
      <Stack.Screen options={{ title: '대시보드' }} />
      <Screen onRefresh={() => query.refetch()}>
        <Greeting />
        <Chips options={PERIODS} value={String(days)} onChange={(v) => setDays(Number(v))} />
        <QueryBoundary query={query}>
          {(d) => (
            <>
              <View style={styles.grid}>
                {KPIS.map((k) => (
                  <Card
                    key={k.key}
                    tone="subtle"
                    onPress={open(k.link)}
                    style={{ width: cardWidth, gap: space.xs }}
                  >
                    <Txt variant="caption" color="textSecondary" numberOfLines={1}>
                      {k.label(days)}
                    </Txt>
                    <View style={styles.kpiValue}>
                      <Txt variant="title1">{d[k.key].toLocaleString('ko-KR')}</Txt>
                      <Txt variant="caption" color="textTertiary">
                        {k.unit}
                      </Txt>
                    </View>
                  </Card>
                ))}
              </View>

              {pending.length > 0 && (
                <>
                  <Divider thick />
                  <SectionHeader title="처리 대기" />
                  <Rows
                    items={pending}
                    rowKey={(p) => p.key}
                    render={(p) => {
                      const n = d[p.key];
                      return (
                        <ListRow
                          leading={
                            <IconCircle ios={p.ios} android={p.android} tone={n > 0 ? 'brand' : 'neutral'} />
                          }
                          title={p.title}
                          subtitle={
                            n > 0
                              ? `${n.toLocaleString('ko-KR')}건이 기다리고 있어요`
                              : '대기 중인 건이 없습니다'
                          }
                          trailing={
                            n > 0 ? (
                              <StatusBadge text={n > 99 ? '99+' : String(n)} tone="danger" />
                            ) : undefined
                          }
                          onPress={() => router.navigate(p.link.href)}
                        />
                      );
                    }}
                  />
                </>
              )}

              <Divider thick />
              <SectionHeader
                title="최근 신청"
                action={allowed('application.decide') ? '전체 보기' : undefined}
                onAction={() => router.navigate({ pathname: '/applications', params: { status: 'all' } })}
              />
              {d.recentApplications.length === 0 ? (
                <EmptyState title="최근 신청이 없습니다" />
              ) : (
                <Rows
                  items={d.recentApplications}
                  rowKey={(a) => a.id}
                  render={(a) => (
                    <ListRow
                      meta={a.programTitle}
                      title={a.applicantName}
                      subtitle={formatDateTime(a.createdAt)}
                      trailing={<StatusBadge {...APPLICATION_STATUS[a.status]} />}
                      onPress={
                        allowed('application.decide')
                          ? () => router.push({ pathname: '/applications/[id]', params: { id: a.id } })
                          : undefined
                      }
                    />
                  )}
                />
              )}

              <SectionHeader
                title="최근 수정된 공지"
                action={allowed('notice.write') ? '전체 보기' : undefined}
                onAction={() => router.navigate('/more/notices')}
              />
              {d.recentNotices.length === 0 ? (
                <EmptyState title="공지가 없습니다" />
              ) : (
                <Rows
                  items={d.recentNotices}
                  rowKey={(n) => n.id}
                  render={(n) => (
                    <ListRow
                      meta={`${formatDate(n.updatedAt)} 수정`}
                      title={n.title}
                      trailing={<StatusBadge {...PUBLISH_STATUS[n.status]} />}
                      onPress={
                        allowed('notice.write')
                          ? () => router.navigate({ pathname: '/more/notice/[id]', params: { id: n.id } })
                          : undefined
                      }
                    />
                  )}
                />
              )}

              <Gutter style={styles.updated}>
                <View>
                  <Badge text={`${formatDateTime(d.generatedAt)} 기준`} />
                </View>
                <Txt variant="caption" color="textTertiary">
                  화면을 아래로 당기면 새로고침됩니다
                </Txt>
              </Gutter>
            </>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  greeting: { paddingTop: space.sm, paddingBottom: space.xs, gap: 2 },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: space.md,
    paddingHorizontal: GUTTER,
    paddingTop: space.sm,
    paddingBottom: space.xxl,
  },
  kpiValue: { flexDirection: 'row', alignItems: 'baseline', gap: 2 },
  updated: { alignItems: 'center', gap: space.sm, paddingTop: space.xxxl },
});
