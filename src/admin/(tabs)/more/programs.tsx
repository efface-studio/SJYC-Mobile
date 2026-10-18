import { router, Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { PUBLISH_STATUS, RECRUIT_STATUS } from '@/domain/labels';
import { formatShortDate } from '@/lib/format';
import {
  FilterChip,
  HeaderButton,
  NoPermission,
  PagedList,
  StatusBadge,
  searchBar,
  useCan,
} from '~/admin-kit/components';
import { sortOptions, usePaged, useStatusParam, type Sort } from '~/admin-kit/queries';
import { Chips, ListRow } from '~/ds';

const SORTS = sortOptions('프로그램명순');

const open = (id: string) => router.push({ pathname: '/more/program/[id]', params: { id } });

export default function Programs() {
  const allowed = useCan()('program.write');
  const [status, setStatus, statusOpts] = useStatusParam(PUBLISH_STATUS, '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const filters = { q: q || undefined, status: status || undefined, sort };
  const paged = usePaged(
    ['admin', 'programs', filters],
    (pageSize) => api.admin.programs.list({ ...filters, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '프로그램 관리' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '프로그램 관리',
          headerSearchBarOptions: searchBar('프로그램명으로 검색', setQ),
          headerRight: () => <HeaderButton label="등록" onPress={() => open('new')} />,
        }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={<FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />}
        emptyText="조건에 맞는 프로그램이 없습니다"
        renderRow={(p) => (
          <ListRow
            meta={`${RECRUIT_STATUS[p.recruitStatus].text} · 신청 ${p.appliedCount}/${p.capacity}명`}
            title={p.title}
            subtitle={`모집 ${formatShortDate(p.recruitStartsAt)} ~ ${formatShortDate(p.recruitEndsAt)}`}
            trailing={<StatusBadge {...PUBLISH_STATUS[p.status]} />}
            onPress={() => open(p.id)}
          />
        )}
      />
    </>
  );
}
