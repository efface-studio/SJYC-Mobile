import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Linking, ScrollView, StyleSheet, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '@/api';
import { CENTER, DESK_HOURS, hoursOn } from '@/config/center';
import { IS_MOCK } from '@/config/env';
import { NOTICE_CATEGORY_LABEL, RECRUIT_STATUS } from '@/domain/labels';
import { daysUntil, formatDate, formatShortDate } from '@/lib/format';
import {
  Badge,
  Card,
  Divider,
  Gutter,
  IconCircle,
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
import { BellButton } from '~/user-kit';

const QUICK = [
  { label: '프로그램', href: '/programs', ios: 'calendar', android: 'event' },
  { label: '공간 예약', href: '/spaces', ios: 'door.left.hand.open', android: 'meeting_room' },
  { label: '동아리', href: '/clubs', ios: 'person.3.fill', android: 'groups' },
  { label: '문의', href: '/qna', ios: 'bubble.left.and.text.bubble.right', android: 'forum' },
] as const;

function TodayCard() {
  const now = new Date();
  const today = hoursOn(now);
  const date = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
  }).format(now);
  const desk = DESK_HOURS.find((d) => d.label === (today.weekday === '토' ? '토요일' : '평일'));
  return (
    <Card tone="brand" style={{ gap: space.sm }}>
      <Txt variant="captionStrong" color="action">
        {date} {today.weekday}요일
      </Txt>
      <Txt variant="title1">{today.open ? `오늘 ${today.hours} 운영` : today.hours}</Txt>
      <Txt variant="caption" color="textSecondary">
        {desk && today.weekday !== '일' ? `안내데스크 ${desk.value} · ` : ''}공휴일·임시 휴관은 공지를 확인해
        주세요
      </Txt>
      <Tap
        onPress={() => void Linking.openURL(`tel:${CENTER.tel}`)}
        accessibilityLabel={`대표전화 ${CENTER.telDisplay} 전화 걸기`}
        style={{ alignSelf: 'flex-start', paddingVertical: 6 }}
      >
        <Txt variant="label" color="action">
          전화 {CENTER.telDisplay} ›
        </Txt>
      </Tap>
    </Card>
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

      <Gutter>
        {IS_MOCK && (
          <View style={[styles.demo, { backgroundColor: t.tone.warning.bg }]}>
            <Txt variant="caption" color={t.tone.warning.fg}>
              개발용 데모 데이터로 동작 중입니다
            </Txt>
          </View>
        )}
        <TodayCard />
      </Gutter>

      <View style={styles.quick}>
        {QUICK.map((q) => (
          <Tap
            key={q.href}
            onPress={() => router.navigate(q.href)}
            rounded={radius.md}
            style={styles.quickItem}
            accessibilityLabel={q.label}
          >
            <IconCircle ios={q.ios} android={q.android} />
            <Txt variant="caption" color="textSecondary">
              {q.label}
            </Txt>
          </Tap>
        ))}
      </View>

      <Divider thick />

      <SectionHeader
        title="마감 임박 프로그램"
        action="전체 보기"
        onAction={() => router.navigate('/programs')}
      />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.carousel}>
        {(programs.data?.items ?? []).map((p) => {
          const d = daysUntil(p.recruitEndsAt);
          return (
            <Card
              key={p.id}
              tone="subtle"
              onPress={() => router.push(`/programs/${p.id}`)}
              style={styles.programCard}
            >
              <View style={styles.programTop}>
                <Txt variant="title2" color="action">
                  {d <= 0 ? '오늘 마감' : `D-${d}`}
                </Txt>
                <Badge
                  text={RECRUIT_STATUS[p.recruitStatus].text}
                  tone={RECRUIT_STATUS[p.recruitStatus].tone}
                />
              </View>
              <Txt variant="bodyStrong" numberOfLines={2} style={{ minHeight: 48 }}>
                {p.title}
              </Txt>
              <Txt variant="caption" color="textTertiary" numberOfLines={1}>
                {p.target} · {formatShortDate(p.recruitEndsAt)} 마감
              </Txt>
            </Card>
          );
        })}
        {programs.data?.items.length === 0 && (
          <Txt variant="caption" color="textTertiary">
            지금 모집 중인 프로그램이 없습니다
          </Txt>
        )}
      </ScrollView>

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
          <Divider thick />
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

      <Divider thick />
      <Gutter style={{ paddingVertical: space.xxl, gap: 4 }}>
        <Txt variant="captionStrong" color="textSecondary">
          {CENTER.formalName}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          {CENTER.address} · {CENTER.telDisplay}
        </Txt>
        <Tap onPress={() => router.push('/about')} style={{ alignSelf: 'flex-start', paddingVertical: 6 }}>
          <Txt variant="caption" color="textSecondary">
            센터 안내 · 오시는 길 ›
          </Txt>
        </Tap>
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
  demo: { borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 8, marginBottom: space.md },
  quick: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: space.xl,
  },
  quickItem: { alignItems: 'center', gap: 8, width: 76, paddingVertical: 6 },
  carousel: { gap: space.md, paddingHorizontal: 20, paddingBottom: space.sm },
  programCard: { width: 220, gap: space.sm },
  programTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
