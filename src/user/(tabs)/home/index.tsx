import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { CENTER, DESK_HOURS, hoursOn } from '@/config/center';
import { Icon } from '~/shared/icon';
import { NOTICE_CATEGORY_LABEL } from '@/domain/labels';
import { formatDate } from '@/lib/format';
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

export default function HomeScreen() {
  const t = useTheme();
  const programs = useQuery({
    queryKey: ['programs', { recruitStatus: 'open', pageSize: 6 }],
    queryFn: () => api.programs.list({ recruitStatus: 'open', pageSize: 6 }),
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
    <Screen onRefresh={() => Promise.all([programs.refetch(), notices.refetch(), media.refetch()])}>
      <Gutter>
        <Tap
          rounded={12}
          onPress={() => router.navigate('/programs')}
          accessibilityLabel="프로그램 찾아보기"
          style={{ backgroundColor: t.card }}
        >
          <Image
            source={require('../../../../assets/center/program-studio.webp')}
            contentFit="cover"
            style={{ width: '100%', aspectRatio: 2.35, borderRadius: 12 }}
          />
          <View style={styles.featureLink}>
            <Txt variant="title2">프로그램 찾아보기</Txt>
            <Icon ios="arrow.up.right" android="north_east" color={t.action} size={20} />
          </View>
        </Tap>
        <View style={[styles.shortcutRow, { borderColor: t.line }]}>
          <Tap
            rounded={6}
            onPress={() => router.navigate('/spaces')}
            style={[styles.shortcut, { borderRightWidth: StyleSheet.hairlineWidth, borderColor: t.line }]}
          >
            <Icon ios="calendar" android="event" color={t.action} size={19} />
            <Txt variant="bodyStrong">공간 예약</Txt>
          </Tap>
          <Tap rounded={6} onPress={() => router.navigate('/clubs')} style={styles.shortcut}>
            <Icon ios="person.3" android="groups" color={t.textSecondary} size={19} />
            <Txt variant="bodyStrong">동아리 찾기</Txt>
          </Tap>
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
            {data.items.slice(0, 3).map((p) => (
              <ProgramRow key={p.id} p={p} category={categoryName(p.categoryId)} />
            ))}
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
  featureLink: {
    paddingHorizontal: 2,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shortcutRow: {
    flexDirection: 'row',
    paddingVertical: 3,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  shortcut: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 8,
    minHeight: 44,
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
