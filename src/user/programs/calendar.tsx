import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { RECRUIT_STATUS } from '@/domain/labels';
import type { Program } from '@/domain/types';
import { monthGrid, programsOn, shiftMonth } from '@/lib/calendar';
import { formatPeriod, formatShortDate, todayKst } from '@/lib/format';
import {
  Badge,
  Divider,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { Icon } from '~/shared/icon';
import { Rows } from '~/user-kit';

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const monthLabel = (month: string) => `${month.slice(0, 4)}년 ${Number(month.slice(5))}월`;

function Agenda({ title, items, empty }: { title: string; items: Program[]; empty: string }) {
  return (
    <>
      <SectionHeader title={`${title} ${items.length}`} />
      {items.length === 0 ? (
        <Gutter style={{ paddingBottom: space.sm }}>
          <Txt variant="caption" color="textTertiary">
            {empty}
          </Txt>
        </Gutter>
      ) : (
        <Rows>
          {items.map((p) => {
            const s = RECRUIT_STATUS[p.recruitStatus];
            return (
              <ListRow
                key={p.id}
                title={p.title}
                subtitle={`${p.target} · ${formatPeriod(p.startsAt, p.endsAt)}`}
                trailing={<Badge text={s.text} tone={s.tone} />}
                onPress={() => router.push(`/programs/${p.id}`)}
              />
            );
          })}
        </Rows>
      )}
    </>
  );
}

export default function ProgramCalendarScreen() {
  const t = useTheme();
  const today = todayKst();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [selected, setSelected] = useState(today);
  const programs = useQuery({
    queryKey: ['programs', { pageSize: 100 }],
    queryFn: () => api.programs.list({ pageSize: 100 }),
  });
  const all = programs.data?.items ?? [];

  const go = (n: number) => {
    const m = shiftMonth(month, n);
    setMonth(m);
    setSelected(today.startsWith(m) ? today : `${m}-01`);
  };
  const day = programsOn(selected, all);

  return (
    <Screen onRefresh={() => programs.refetch()}>
      <View style={styles.monthBar}>
        <Tap
          onPress={() => go(-1)}
          rounded={22}
          accessibilityLabel={`이전 달 ${monthLabel(shiftMonth(month, -1))}`}
          style={styles.navBtn}
        >
          <Icon ios="chevron.left" android="chevron_left" color={t.text} size={18} />
        </Tap>
        <Txt variant="title2" accessibilityRole="header">
          {monthLabel(month)}
        </Txt>
        <Tap
          onPress={() => go(1)}
          rounded={22}
          accessibilityLabel={`다음 달 ${monthLabel(shiftMonth(month, 1))}`}
          style={styles.navBtn}
        >
          <Icon ios="chevron.right" android="chevron_right" color={t.text} size={18} />
        </Tap>
      </View>

      <Gutter>
        <View style={styles.week}>
          {WEEKDAYS.map((w, i) => (
            <Txt
              key={w}
              variant="small"
              color={i === 0 ? t.tone.danger.fg : i === 6 ? t.tone.info.fg : t.textTertiary}
              style={styles.weekday}
            >
              {w}
            </Txt>
          ))}
        </View>
        {monthGrid(month).map((week) => (
          <View key={week[0]} style={styles.week}>
            {week.map((date) => {
              const inMonth = date.startsWith(month);
              const active = date === selected;
              const isToday = date === today;
              const marks = programsOn(date, all);
              return (
                <Tap
                  key={date}
                  onPress={() => {
                    if (!inMonth) setMonth(date.slice(0, 7));
                    setSelected(date);
                  }}
                  rounded={radius.md}
                  accessibilityLabel={`${formatShortDate(`${date}T12:00:00+09:00`)}, 마감 ${marks.deadline.length}개, 운영 ${marks.running.length}개${active ? ', 선택됨' : ''}`}
                  style={[styles.cell, active && { backgroundColor: t.text }]}
                >
                  <Txt
                    variant={isToday || active ? 'captionStrong' : 'caption'}
                    color={active ? t.bg : !inMonth ? t.lineStrong : isToday ? t.action : t.text}
                  >
                    {Number(date.slice(8))}
                  </Txt>
                  <View style={styles.marks}>
                    {marks.deadline.length > 0 && (
                      <View style={[styles.mark, { backgroundColor: t.action }]} />
                    )}
                    {marks.running.length > 0 && (
                      <View style={[styles.mark, { backgroundColor: t.tone.info.fg }]} />
                    )}
                  </View>
                </Tap>
              );
            })}
          </View>
        ))}
        <View style={styles.legend}>
          <View style={[styles.mark, { backgroundColor: t.action }]} />
          <Txt variant="small" color="textTertiary">
            모집 마감
          </Txt>
          <View style={[styles.mark, { backgroundColor: t.tone.info.fg, marginLeft: space.md }]} />
          <Txt variant="small" color="textTertiary">
            운영 중
          </Txt>
        </View>
      </Gutter>

      <Divider />
      <Gutter style={{ paddingTop: space.xl }}>
        <Txt variant="captionStrong" color="action">
          {formatShortDate(`${selected}T12:00:00+09:00`)}
        </Txt>
      </Gutter>
      <QueryBoundary query={programs}>
        {() => (
          <>
            <Agenda
              title="모집 마감"
              items={day.deadline}
              empty="이 날 모집이 마감되는 프로그램이 없습니다."
            />
            <Agenda title="운영 중" items={day.running} empty="이 날 운영하는 프로그램이 없습니다." />
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: space.md,
  },
  navBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row' },
  weekday: { flex: 1, textAlign: 'center', paddingVertical: space.sm },
  cell: { flex: 1, height: 48, alignItems: 'center', justifyContent: 'center', gap: 3 },
  marks: { flexDirection: 'row', gap: 3, height: 5 },
  mark: { width: 5, height: 5, borderRadius: 3 },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingTop: space.md,
    paddingBottom: space.lg,
  },
});
