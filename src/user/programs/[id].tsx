import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { IS_MOCK } from '@/config/env';
import { RECRUIT_STATUS } from '@/domain/labels';
import { remainingSeats } from '@/domain/program';
import type { Program } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { daysUntil, formatDate, formatDateTime, formatPeriod, formatShortDate } from '@/lib/format';
import {
  Badge,
  Button,
  Divider,
  Gutter,
  InfoRow,
  Screen,
  SectionHeader,
  StickyFooter,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { Article, Callout, Hero, QueryScreen } from '~/user-kit';

function ApplyFooter({ program }: { program: Program }) {
  const { data: session } = useSession();
  const mine = useQuery({
    queryKey: ['my-applications'],
    queryFn: () => api.me.applications(),
    enabled: !!session,
  });
  const active = mine.data?.find(
    (a) => a.programId === program.id && (a.status === 'submitted' || a.status === 'approved'),
  );

  let button;
  if (active) {
    button = (
      <Button
        label="신청 완료 · 신청 내역 보기"
        variant="secondary"
        onPress={() => router.push(`/my/applications/${active.id}`)}
      />
    );
  } else if (program.recruitStatus === 'upcoming') {
    button = (
      <Button
        label={`${formatDateTime(program.recruitStartsAt)}부터 신청 가능`}
        disabled
        onPress={() => {}}
      />
    );
  } else if (program.recruitStatus !== 'open') {
    button = (
      <Button
        label={`${RECRUIT_STATUS[program.recruitStatus].text} · 신청할 수 없습니다`}
        disabled
        onPress={() => {}}
      />
    );
  } else if (session) {
    button = <Button label="신청하기" onPress={() => router.push(`/programs/apply/${program.id}`)} />;
  } else {
    button = <Button label="로그인하고 신청하기" onPress={() => router.push('/login')} />;
  }
  return <StickyFooter>{button}</StickyFooter>;
}

function SeatsBar({ p }: { p: Program }) {
  const t = useTheme();
  const ratio = p.capacity > 0 ? Math.min(1, p.appliedCount / p.capacity) : 0;
  return (
    <View style={{ gap: 6, marginTop: space.sm }}>
      <View style={styles.seatsText}>
        <Txt variant="captionStrong" color="textSecondary">
          신청 {p.appliedCount}명 / 정원 {p.capacity}명
        </Txt>
        <Txt variant="captionStrong" color={remainingSeats(p) > 0 ? 'action' : 'textTertiary'}>
          잔여 {remainingSeats(p)}석
        </Txt>
      </View>
      <View style={[styles.track, { backgroundColor: t.bgSubtle }]}>
        <View style={[styles.fill, { width: `${ratio * 100}%`, backgroundColor: t.brand }]} />
      </View>
    </View>
  );
}

function ProgramDetail({ p, category }: { p: Program; category?: string }) {
  const s = RECRUIT_STATUS[p.recruitStatus];
  const d = daysUntil(p.recruitEndsAt);
  return (
    <Screen footer={<ApplyFooter program={p} />}>
      <Hero eyebrow={category} title={p.title}>
        <View style={styles.statusLine}>
          <Badge text={s.text} tone={s.tone} />
          {p.recruitStatus === 'open' && (
            <Txt variant="captionStrong" color="action">
              {d <= 0 ? '오늘 마감' : `D-${d}`} · {formatShortDate(p.recruitEndsAt)} 마감
            </Txt>
          )}
        </View>
        {p.summary ? (
          <Txt variant="body" color="textSecondary">
            {p.summary}
          </Txt>
        ) : null}
        <SeatsBar p={p} />
      </Hero>

      <Divider thick />
      <SectionHeader title="모집 정보" />
      <Gutter>
        <InfoRow label="대상" value={p.target} />
        <InfoRow label="장소" value={p.place} />
        <InfoRow label="운영 기간" value={formatPeriod(p.startsAt, p.endsAt)} />
        <InfoRow
          label="모집 기간"
          value={`${formatDateTime(p.recruitStartsAt)} ~\n${formatDateTime(p.recruitEndsAt)}`}
        />
        <InfoRow label="취소 기한" value={`${formatDate(p.cancelDeadline)}까지 MY에서 취소`} />
      </Gutter>

      <Divider thick />
      <SectionHeader title="프로그램 안내" />
      <Gutter style={{ gap: space.lg }}>
        <Article>{p.description}</Article>
        {IS_MOCK && (
          <Callout tone="warning">개발용 샘플 프로그램입니다. 실제 일정·정원·장소가 아닙니다.</Callout>
        )}
      </Gutter>
    </Screen>
  );
}

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const program = useQuery({ queryKey: ['program', id], queryFn: () => api.programs.get(id) });
  const categories = useQuery({ queryKey: ['program-categories'], queryFn: () => api.programs.categories() });
  return (
    <QueryScreen query={program}>
      {(p) => {
        const c = categories.data?.find((x) => x.id === p.categoryId);
        return <ProgramDetail p={p} category={c ? `${c.group} · ${c.name}` : undefined} />;
      }}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  seatsText: { flexDirection: 'row', justifyContent: 'space-between' },
  track: { height: 6, borderRadius: radius.pill, overflow: 'hidden' },
  fill: { height: 6, borderRadius: radius.pill },
});
