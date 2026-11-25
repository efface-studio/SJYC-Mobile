import { openScreen } from '~/shared/navigation';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { router, Stack, type Href } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { APPLICATION_STATUS, PUBLISH_STATUS } from '@/domain/labels';
import { primaryRole, ROLE_LABEL, type Permission } from '@/domain/permissions';
import type { DashboardSummary } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate, formatDateTime } from '@/lib/format';
import { Rows, StatusBadge, useCan } from '~/admin-kit/components';
import { dashboardQuery } from '~/admin-kit/queries';
import { wordmarkHeader } from '~/shared/wordmark';
import {
  Divider,
  EmptyState,
  GUTTER,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  space,
  useTheme,
} from '~/ds';

type CountKey = {
  [K in keyof DashboardSummary]: DashboardSummary[K] extends number ? K : never;
}[keyof DashboardSummary];

interface Link {
  href: Href;
  permission: Permission;
}

/** 처리 대기 — 승인·답변이 필요한 일. 탭하면 해당 상태로 걸러진 목록이 열린다 */
const PENDING: { key: CountKey; title: string; link: Link }[] = [
  {
    key: 'applicationsSubmitted',
    title: '프로그램 신청 승인',
    link: {
      href: { pathname: '/applications', params: { status: 'submitted' } },
      permission: 'application.decide',
    },
  },
  {
    key: 'reservationsPending',
    title: '공간 예약 확정',
    link: { href: { pathname: '/reservations', params: { status: 'pending' } }, permission: 'space.manage' },
  },
  {
    key: 'clubApplicationsPending',
    title: '동아리 가입 검토',
    link: {
      href: { pathname: '/more/club-applications', params: { status: 'pending' } },
      permission: 'club.manage',
    },
  },
  {
    key: 'inquiriesOpen',
    title: '문의 답변',
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
    key: 'programsOpen',
    label: () => '모집 중 프로그램',
    unit: '개',
    link: {
      href: { pathname: '/more/programs', params: { status: 'published' } },
      permission: 'program.write',
    },
  },
];

const PERIODS = [
  { value: '7', label: '최근 7일' },
  { value: '30', label: '최근 30일' },
];

/** 역할 · 오늘 날짜 */
function Context() {
  const user = useSession().data?.user;
  const today = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(new Date());
  if (!user) return null;
  return (
    <Gutter style={styles.context}>
      <Txt variant="title1" accessibilityRole="header">
        업무 현황
      </Txt>
      <Txt variant="caption" color="textTertiary">
        {ROLE_LABEL[primaryRole(user)]} · {today}
      </Txt>
    </Gutter>
  );
}

export default function Dashboard() {
  const t = useTheme();
  const allowed = useCan();
  const [days, setDays] = useState(7);
  const query = useQuery({ ...dashboardQuery(days), placeholderData: keepPreviousData });

  const open = (link: Link) => (allowed(link.permission) ? () => router.navigate(link.href) : undefined);
  const pending = PENDING.filter((p) => allowed(p.link.permission));

  return (
    <>
      <Stack.Screen
        options={{
          title: '업무 요약',
          ...wordmarkHeader,
        }}
      />
      <Screen onRefresh={() => query.refetch()}>
        <Context />
        <QueryBoundary layout="dashboard" query={query}>
          {(d) => {
            const inbox = pending.filter((p) => d[p.key] > 0);
            const total = inbox.reduce((sum, p) => sum + d[p.key], 0);
            return (
              <>
                {pending.length > 0 && (
                  <View>
                    <Gutter style={[styles.inboxHead, { borderColor: t.line }]}>
                      <Txt variant="title3" accessibilityRole="header">
                        처리할 업무
                      </Txt>
                      <Txt variant="label" color="textSecondary">
                        총 {total.toLocaleString('ko-KR')}건
                      </Txt>
                    </Gutter>
                    {inbox.length > 0 ? (
                      <Rows
                        items={inbox}
                        rowKey={(p) => p.key}
                        render={(p) => (
                          <ListRow
                            title={p.title}
                            trailing={
                              <Txt variant="bodyStrong" color="action">
                                {d[p.key]}건
                              </Txt>
                            }
                            onPress={() => router.navigate(p.link.href)}
                          />
                        )}
                      />
                    ) : (
                      <Gutter style={{ paddingVertical: space.lg }}>
                        <Txt color="textSecondary">현재 처리할 업무가 없습니다.</Txt>
                      </Gutter>
                    )}
                  </View>
                )}
                <Divider />
                <Gutter style={styles.period}>
                  <Txt variant="title3" accessibilityRole="header">
                    운영 현황
                  </Txt>
                  <View style={styles.segment}>
                    <SegmentedControl
                      values={PERIODS.map((p) => p.label)}
                      selectedIndex={days === 7 ? 0 : 1}
                      onChange={(e) => setDays(e.nativeEvent.selectedSegmentIndex === 0 ? 7 : 30)}
                    />
                  </View>
                </Gutter>
                <View style={styles.grid}>
                  {KPIS.map((k, i) => (
                    <Tap
                      key={k.key}
                      onPress={open(k.link)}
                      accessibilityLabel={`${k.label(days)} ${d[k.key]}${k.unit}`}
                      style={[
                        styles.kpi,
                        i > 0 && {
                          borderLeftWidth: StyleSheet.hairlineWidth,
                          borderColor: t.line,
                          paddingLeft: space.xl,
                        },
                      ]}
                    >
                      <Txt variant="caption" color="textSecondary">
                        {k.label(days)}
                      </Txt>
                      <Txt variant="title1">
                        {d[k.key].toLocaleString('ko-KR')}
                        {k.unit}
                      </Txt>
                    </Tap>
                  ))}
                </View>

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
                            ? () => openScreen({ pathname: '/applications/[id]', params: { id: a.id } })
                            : undefined
                        }
                      />
                    )}
                  />
                )}

                <SectionHeader
                  title="최근 수정된 공지"
                  action={allowed('notice.write') ? '전체 보기' : undefined}
                  onAction={() => openScreen('/dashboard/notices')}
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
                            ? () => openScreen({ pathname: '/dashboard/notice/[id]', params: { id: n.id } })
                            : undefined
                        }
                      />
                    )}
                  />
                )}

                <Gutter style={styles.updated}>
                  <Txt variant="caption" color="textTertiary">
                    {formatDateTime(d.generatedAt)} 기준
                  </Txt>
                </Gutter>
              </>
            );
          }}
        </QueryBoundary>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  context: { paddingTop: space.xs, paddingBottom: space.lg, gap: 2 },
  inboxHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  period: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: space.md,
    gap: 8,
  },
  segment: { width: 156 },
  grid: { flexDirection: 'row', marginHorizontal: GUTTER },
  kpi: { flex: 1, paddingVertical: space.sm, gap: 2 },
  updated: { alignItems: 'center', paddingTop: space.xxl },
});
