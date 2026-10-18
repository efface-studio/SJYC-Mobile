import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api';
import { CENTER, DESK_HOURS, hoursOn } from '@/config/center';
import { IS_MOCK } from '@/config/env';
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
  radius,
  space,
  useTheme,
} from '~/ds';
import { BellButton, ProgramRow, Rows } from '~/user-kit';

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
  const dark = useColorScheme() === 'dark';
  const insets = useSafeAreaInsets();
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
      <Gutter style={[styles.header, { paddingTop: insets.top + space.sm }]}>
        {dark ? (
          <Txt variant="title2">{CENTER.formalName}</Txt>
        ) : (
          <Image
            source={require('../../../../assets/logo-horizontal.jpg')}
            accessibilityLabel={CENTER.formalName}
            style={{ width: 168, height: 28 }}
            contentFit="contain"
          />
        )}
        <BellButton />
      </Gutter>

      {IS_MOCK && (
        <Gutter>
          <View style={[styles.demo, { backgroundColor: t.tone.warning.bg }]}>
            <Txt variant="caption" color={t.tone.warning.fg}>
              개발용 데모 데이터로 동작 중입니다
            </Txt>
          </View>
        </Gutter>
      )}
      <TodayStatus />

      <SectionHeader
        title="마감 임박 프로그램"
        action="전체 보기"
        onAction={() => router.navigate('/programs')}
      />
      <Rows>
        {(programs.data?.items ?? []).map((p) => (
          <ProgramRow key={p.id} p={p} category={categoryName(p.categoryId)} />
        ))}
      </Rows>
      {programs.data?.items.length === 0 && (
        <Gutter style={{ paddingVertical: space.lg }}>
          <Txt variant="caption" color="textTertiary">
            지금 모집 중인 프로그램이 없습니다
          </Txt>
        </Gutter>
      )}

      <SectionHeader title="공지사항" action="전체 보기" onAction={() => router.push('/notices')} />
      {(notices.data?.items ?? []).map((n, i) => (
        <View key={n.id}>
          {i > 0 && <Divider inset={20} />}
          <ListRow
            meta={`${NOTICE_CATEGORY_LABEL[n.category]} · ${n.publishedAt ? formatDate(n.publishedAt) : ''}`}
            title={n.title}
            trailing={n.pinned ? <Badge text="중요" tone="brand" /> : undefined}
            onPress={() => router.push(`/notices/${n.id}`)}
          />
        </View>
      ))}

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
      <Rows>
        <ListRow
          title="질문·문의"
          subtitle="자주 묻는 질문과 1:1 문의"
          onPress={() => router.push('/qna')}
        />
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: space.md,
    paddingRight: 8,
  },
  mediaCard: { width: 140, gap: 6 },
  demo: { borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: space.sm },
  today: {
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  link: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  carousel: { gap: space.md, paddingHorizontal: 20, paddingBottom: space.sm },
});
