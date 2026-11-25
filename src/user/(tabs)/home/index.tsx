import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { readBanners, visibleBanners } from '@/domain/mobile-banners';
import { programPhoto } from '~/user-kit/program-photo';
import { HomeBanner } from '~/user-kit/home-banner';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { api } from '@/api';
import { CENTER, DESK_HOURS, hoursOn } from '@/config/center';
import { Icon } from '~/shared/icon';
import { NOTICE_CATEGORY_LABEL } from '@/domain/labels';
import { formatDate, todayKst } from '@/lib/format';
import {
  Badge,
  Divider,
  Gutter,
  Photo,
  ListRow,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  QueryBoundary,
  radius,
  space,
  useTheme,
} from '~/ds';
import { ProgramRow, Rows } from '~/user-kit';

/** 오늘 운영 상태 — 카드 대신 페이지 바탕 위 띠 + 아래 구분선 (웹 TodayStatus) */
function TodayStatus() {
  const t = useTheme();
  const now = new Date();
  const today = hoursOn(now);
  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const desk = DESK_HOURS.find((d) => d.label === (today.weekday === '토' ? '토요일' : '평일'));
  return (
    <Gutter style={[styles.today, { borderBottomColor: t.line }]}>
      <Txt variant="captionStrong" color="textSecondary">
        오늘 {date} {today.weekday}요일
      </Txt>
      <Txt variant="title1" color={today.open ? 'text' : t.tone.danger.fg}>
        {today.open ? `${today.hours} 운영` : today.hours}
      </Txt>
      <Txt variant="caption" color="textSecondary">
        {desk && today.weekday !== '일' ? `안내데스크 ${desk.value} · ` : ''}공휴일·임시 휴관은 공지를 확인해
        주세요.
      </Txt>
      <Tap
        onPress={() => void Linking.openURL(`tel:${CENTER.tel}`)}
        accessibilityLabel={`대표전화 ${CENTER.telDisplay} 전화 걸기`}
        style={styles.link}
      >
        <Txt variant="label" color="action">
          전화 {CENTER.telDisplay}
        </Txt>
      </Tap>
    </Gutter>
  );
}

const HOME_SHORTCUTS = [
  { label: '공간 예약', href: '/spaces', ios: 'calendar', android: 'event' },
  { label: '동아리 찾기', href: '/clubs', ios: 'person.3', android: 'groups' },
] as const;

export default function HomeScreen() {
  const { width, fontScale } = useWindowDimensions();
  const stackedShortcuts = (width - 40) / Math.max(1, fontScale) < 290;
  const t = useTheme();
  const programs = useQuery({
    queryKey: ['programs', { recruitStatus: 'open', pageSize: 6 }],
    queryFn: () => api.programs.list({ recruitStatus: 'open', pageSize: 6 }),
  });
  const settings = useQuery({ queryKey: ['site-settings'], queryFn: () => api.site.settings() });
  const config = useMemo(
    () => settings.data && readBanners(settings.data.values.mobileBanners),
    [settings.data],
  );
  const published = visibleBanners(config?.items ?? [], todayKst());
  const clubs = useQuery({
    queryKey: ['clubs'],
    queryFn: () => api.clubs.list(),
    enabled: config?.automatic === true,
  });
  const notices = useQuery({
    queryKey: ['notices', { pageSize: 4 }],
    queryFn: () => api.notices.list({ pageSize: 4 }),
  });
  const categories = useQuery({ queryKey: ['program-categories'], queryFn: () => api.programs.categories() });
  const categoryName = (id: string) => categories.data?.find((c) => c.id === id)?.name ?? '';
  const media = useQuery({ queryKey: ['media'], queryFn: () => api.media.list() });
  const photos = (media.data ?? []).filter((m) => m.kind === 'photo').slice(0, 8);

  return (
    <Screen
      onRefresh={() =>
        Promise.all([
          programs.refetch(),
          notices.refetch(),
          media.refetch(),
          settings.refetch(),
          ...(config?.automatic ? [clubs.refetch()] : []),
        ])
      }
    >
      <Gutter>
        <HomeBanner config={config} programs={programs.data?.items ?? []} clubs={clubs.data ?? []} />
        <View style={[styles.shortcutRow, stackedShortcuts && styles.shortcutColumn]}>
          {HOME_SHORTCUTS.map((item) => (
            <Tap
              key={item.href}
              rounded={12}
              accessibilityLabel={item.label}
              onPress={() => router.navigate(item.href)}
              style={[styles.shortcut, { borderColor: t.line }]}
            >
              <Icon ios={item.ios} android={item.android} color={t.action} size={18} />
              <Txt variant="label" style={{ flex: 1 }}>{item.label}</Txt>
              <Icon ios="chevron.right" android="chevron_right" color={t.textTertiary} size={12} />
            </Tap>
          ))}
        </View>
      </Gutter>

      <SectionHeader
        title="모집 중인 프로그램"
        action="전체 보기"
        onAction={() => router.navigate('/programs')}
      />
      <QueryBoundary
        query={programs}
        isEmpty={(d) => d.items.length === 0}
        empty={{ title: '지금 모집 중인 프로그램이 없습니다' }}
      >
        {(data) => (
          <Rows>
            {data.items.slice(0, 3).map((p) => {
              const cover = published.find((b) => b.path === '/programs/' + p.id && b.image.startsWith('https://'));
              return <ProgramRow key={p.id} p={p} category={categoryName(p.categoryId)} photo={cover?.image ?? programPhoto(p)} />;
            })}
          </Rows>
        )}
      </QueryBoundary>

      <SectionHeader title="공지사항" action="전체 보기" onAction={() => router.push('/notices')} />
      <QueryBoundary
        query={notices}
        isEmpty={(data) => data.items.length === 0}
        empty={{ title: '등록된 공지사항이 없습니다' }}
      >
        {(data) =>
          data.items.map((n, i) => (
            <View key={n.id}>
              {i > 0 && <Divider inset={20} />}
              <ListRow
                meta={`${NOTICE_CATEGORY_LABEL[n.category]} · ${n.publishedAt ? formatDate(n.publishedAt) : ''}`}
                title={n.title}
                trailing={n.pinned ? <Badge text="중요" tone="brand" /> : undefined}
                onPress={() => router.push(`/notices/${n.id}`)}
              />
            </View>
          ))
        }
      </QueryBoundary>

      {photos.length > 0 && (
        <>
          <SectionHeader title="센터 소식" action="전체 보기" onAction={() => router.push('/gallery')} />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.carousel}
          >
            {photos.map((m, i) => (
              <Tap
                key={`${m.url}-${i}`}
                onPress={() => router.push('/gallery')}
                rounded={radius.md}
                accessibilityLabel={m.title}
                style={styles.mediaCard}
              >
                <Photo
                  uri={m.thumbnailUrl || m.url}
                  alt={m.title}
                  ratio={1}
                  style={{ borderRadius: radius.md }}
                />
                <Txt variant="caption" numberOfLines={2}>
                  {m.title}
                </Txt>
              </Tap>
            ))}
          </ScrollView>
        </>
      )}

      <SectionHeader title="센터 이용" />
      <TodayStatus />
      <Rows>
        <ListRow title="질문·문의" subtitle="자주 묻는 질문과 1:1 문의" onPress={() => router.push('/qna')} />
        <ListRow
          title="센터 안내·오시는 길"
          subtitle="운영시간, 오시는 길, 층별 안내"
          onPress={() => router.push('/about')}
        />
      </Rows>
      <Divider />
      <Gutter style={{ paddingVertical: space.xxl, gap: 4 }}>
        <Txt variant="captionStrong" color="textSecondary">
          {CENTER.formalName}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          {CENTER.address} · {CENTER.telDisplay}
        </Txt>
      </Gutter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  shortcutRow: { flexDirection: 'row', gap: 10, marginTop: 8 },
  shortcutColumn: { flexDirection: 'column' },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  mediaCard: { width: 140, gap: 6 },
  today: {
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  carousel: { gap: space.md, paddingHorizontal: 20, paddingBottom: space.sm },
});
