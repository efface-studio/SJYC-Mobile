import { Platform } from 'react-native';
import { useLiveSearch } from '~/shared/live-search';
import { openScreen } from '~/shared/navigation';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { RESERVATION_STATUS } from '@/domain/labels';
import { todayKst } from '@/lib/format';
import { FilterChip, NoPermission, PagedList, StatusBadge, searchBar, useCan } from '~/admin-kit/components';
import { sortOptions, usePaged, useStatusParam, type Sort } from '~/admin-kit/queries';
import { Chips, DateField, Gutter, ListRow, space } from '~/ds';

const SORTS = sortOptions('공간명순');
const DATE_MODES = [
  { value: 'all', label: '전체 날짜' },
  { value: 'pick', label: '날짜 지정' },
] as const;

export default function Reservations() {
  const allowed = useCan()('space.manage');
  const [status, setStatus, statusOpts] = useStatusParam(RESERVATION_STATUS, 'pending');
  const spaces = useQuery({
    queryKey: ['admin', 'spaces'],
    queryFn: () => api.admin.spaces.list(),
    enabled: allowed,
  });
  const spaceOpts = [
    { value: '', label: '전체 공간' },
    ...(spaces.data?.map((s) => ({ value: s.id, label: s.name })) ?? []),
  ];
  const [spaceId, setSpaceId] = useState('');
  const [date, setDate] = useState<string | null>(null);
  const [q, setQ] = useLiveSearch();
  const [sort, setSort] = useState<Sort>('newest');
  const filters = {
    q: q || undefined,
    status: status || undefined,
    spaceId: spaceId || undefined,
    date: date ?? undefined,
    sort,
  };
  const paged = usePaged(
    ['admin', 'reservations', filters],
    (pageSize) => api.admin.spaces.reservations({ ...filters, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '공간 예약' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '공간 예약',
          headerTransparent: Platform.OS !== 'ios',
          headerSearchBarOptions: { hideWhenScrolling: false, placement: 'stacked', ...searchBar('신청자, 공간, 이용 목적', setQ) },
        }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={
          <>
            <FilterChip title="공간" value={spaceId} options={spaceOpts} onChange={setSpaceId} />
            <FilterChip
              title="이용 날짜"
              value={date === null ? 'all' : 'pick'}
              options={[...DATE_MODES]}
              display={date ?? '전체 날짜'}
              onChange={(mode) => setDate(mode === 'all' ? null : (date ?? todayKst()))}
            />
            <FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />
          </>
        }
        below={
          date !== null ? (
            <Gutter style={{ paddingBottom: space.md }}>
              <DateField label="이용 날짜" value={date} onChange={setDate} />
            </Gutter>
          ) : undefined
        }
        emptyText="조건에 맞는 예약이 없습니다"
        renderRow={(r) => (
          <ListRow
            meta={`${r.date} · ${r.startTime}~${r.endTime}`}
            title={r.spaceName}
            subtitle={`${r.applicantName} · ${r.headcount}명`}
            trailing={<StatusBadge {...RESERVATION_STATUS[r.status]} />}
            onPress={() => openScreen({ pathname: '/reservations/[id]', params: { id: r.id } })}
          />
        )}
      />
    </>
  );
}
