import { openScreen } from '~/shared/navigation';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { USER_STATUS } from '@/domain/labels';
import { ROLE_LABEL } from '@/domain/permissions';
import { formatDate } from '@/lib/format';
import { FilterChip, NoPermission, PagedList, StatusBadge, searchBar, useCan } from '~/admin-kit/components';
import { sortOptions, usePaged, useStatusParam, type Sort } from '~/admin-kit/queries';
import { Chips, ListRow } from '~/ds';

const SORTS = sortOptions('이름순', '최근 가입순', '오래된 가입순');

export default function Members() {
  const allowed = useCan()('member.read');
  const [status, setStatus, statusOpts] = useStatusParam(USER_STATUS, '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const filters = { q: q || undefined, status: status || undefined, sort };
  const paged = usePaged(
    ['admin', 'members', filters],
    (pageSize) => api.admin.members.list({ ...filters, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '회원' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: '회원', headerSearchBarOptions: searchBar('이름 또는 이메일', setQ) }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={<FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />}
        emptyText="조건에 맞는 회원이 없습니다"
        renderRow={(u) => (
          <ListRow
            meta={`${u.roles.map((r) => ROLE_LABEL[r]).join(', ')} · ${formatDate(u.createdAt)} 가입`}
            title={u.name}
            subtitle={u.email}
            trailing={<StatusBadge {...USER_STATUS[u.status]} />}
            onPress={() => openScreen({ pathname: '/more/member/[id]', params: { id: u.id } })}
          />
        )}
      />
    </>
  );
}
