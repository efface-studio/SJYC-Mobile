import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { RECRUIT_STATUS } from '@/domain/labels';
import { remainingSeats } from '@/domain/program';
import type { Program, RecruitStatus } from '@/domain/types';
import { daysUntil, formatShortDate } from '@/lib/format';
import { Chips, Gutter, QueryBoundary, Screen, Tap, Txt, pickOption, radius, space, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { Rows } from '~/user-kit';

type StatusFilter = '' | RecruitStatus;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: '', label: '전체' },
  ...(Object.keys(RECRUIT_STATUS) as RecruitStatus[]).map((s) => ({
    value: s,
    label: RECRUIT_STATUS[s].text,
  })),
];

/** "10.22 (수)" → "10.22" */
const monthDay = (iso: string) => formatShortDate(iso).split(' ')[0] ?? '';

/** 왼쪽 일정 열: 모집 중이면 D-day, 예정이면 접수 시작일, 그 외 상태 */
function DateColumn({ p }: { p: Program }) {
  const t = useTheme();
  if (p.recruitStatus === 'open') {
    const d = daysUntil(p.recruitEndsAt);
    return (
      <View style={styles.dateCol}>
        <Txt variant="title2" color="action">
          {d <= 0 ? 'D-Day' : `D-${d}`}
        </Txt>
        <Txt variant="small" color="textTertiary">
          {monthDay(p.recruitEndsAt)} 마감
        </Txt>
      </View>
    );
  }
  if (p.recruitStatus === 'upcoming') {
    return (
      <View style={styles.dateCol}>
        <Txt variant="title3" color={t.tone.info.fg}>
          {monthDay(p.recruitStartsAt)}
        </Txt>
        <Txt variant="small" color="textTertiary">
          접수 시작
        </Txt>
      </View>
    );
  }
  return (
    <View style={styles.dateCol}>
      <Txt variant="captionStrong" color="textTertiary">
        {RECRUIT_STATUS[p.recruitStatus].text}
      </Txt>
    </View>
  );
}

function ProgramRow({ p, category }: { p: Program; category: string }) {
  const left = remainingSeats(p);
  const muted = p.recruitStatus === 'closed' || p.recruitStatus === 'full';
  return (
    <Tap
      onPress={() => router.push(`/programs/${p.id}`)}
      accessibilityLabel={`${p.title}, ${RECRUIT_STATUS[p.recruitStatus].text}`}
      style={styles.row}
    >
      <DateColumn p={p} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={2} color={muted ? 'textSecondary' : 'text'}>
          {p.title}
        </Txt>
        <Txt variant="caption" color="textTertiary" numberOfLines={1}>
          {[category, p.target].filter(Boolean).join(' · ')}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {muted ? `정원 ${p.capacity}명` : `잔여 ${left}석 · 정원 ${p.capacity}명`}
        </Txt>
      </View>
    </Tap>
  );
}

export default function ProgramsScreen() {
  const t = useTheme();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<StatusFilter>('open');
  const [categoryId, setCategoryId] = useState('');

  const query = {
    q: q || undefined,
    recruitStatus: status || undefined,
    categoryId: categoryId || undefined,
    pageSize: 50,
  };
  const programs = useQuery({ queryKey: ['programs', query], queryFn: () => api.programs.list(query) });
  const categories = useQuery({ queryKey: ['program-categories'], queryFn: () => api.programs.categories() });
  const cats = categories.data ?? [];
  const categoryName = (id: string) => cats.find((c) => c.id === id)?.name ?? '';
  const currentCategory = cats.find((c) => c.id === categoryId);

  const pickCategory = async () => {
    const labels = ['전체', ...cats.map((c) => `${c.group} · ${c.name}`)];
    const selected = currentCategory ? cats.indexOf(currentCategory) + 1 : 0;
    const i = await pickOption('분류', labels, selected);
    if (i === null) return;
    setCategoryId(i === 0 ? '' : (cats[i - 1]?.id ?? ''));
  };

  return (
    <>
      {/* 네이티브 검색창 (iOS UISearchController / Android 검색 바) */}
      <Stack.Screen
        options={{
          headerRight: () => (
            <Tap
              onPress={() => router.push('/programs/calendar')}
              rounded={22}
              accessibilityLabel="프로그램 캘린더"
              style={styles.headerBtn}
            >
              <Icon ios="calendar" android="calendar_month" color={t.text} size={22} />
            </Tap>
          ),
          headerSearchBarOptions: {
            placeholder: '프로그램명, 대상으로 검색',
            onChangeText: (e) => setQ(e.nativeEvent.text),
            onCancelButtonPress: () => setQ(''),
          },
        }}
      />
      <Screen onRefresh={() => Promise.all([programs.refetch(), categories.refetch()])}>
        <View style={{ paddingTop: space.sm }}>
          <Chips options={STATUS_OPTIONS} value={status} onChange={setStatus} />
        </View>
        <Gutter style={styles.toolbar}>
          <Tap
            onPress={() => void pickCategory()}
            rounded={radius.pill}
            accessibilityLabel={`분류 ${currentCategory?.name ?? '전체'}, 변경`}
            style={[styles.select, { borderColor: categoryId ? t.action : t.lineStrong }]}
          >
            <Txt variant="label" color={categoryId ? 'action' : 'textSecondary'}>
              분류: {currentCategory?.name ?? '전체'}
            </Txt>
            <Icon
              ios="chevron.down"
              android="expand_more"
              color={categoryId ? t.action : t.textTertiary}
              size={12}
            />
          </Tap>
          {programs.data && (
            <Txt variant="caption" color="textTertiary">
              총 {programs.data.total}개
            </Txt>
          )}
        </Gutter>
        <QueryBoundary
          query={programs}
          isEmpty={(d) => d.items.length === 0}
          empty={{ title: '조건에 맞는 프로그램이 없습니다', description: '모집 상태나 분류를 바꿔 보세요.' }}
        >
          {(data) => (
            <Rows>
              {data.items.map((p) => (
                <ProgramRow key={p.id} p={p} category={categoryName(p.categoryId)} />
              ))}
            </Rows>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  headerBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: space.xs,
    paddingBottom: space.sm,
  },
  select: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderWidth: 1,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  dateCol: { width: 64, alignItems: 'center', gap: 2 },
});
