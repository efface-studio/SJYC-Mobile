import { openScreen } from '~/shared/navigation';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS } from '@/domain/labels';
import { formatDate } from '@/lib/format';
import { FilterChip, NoPermission, PagedList, StatusBadge, searchBar, useCan } from '~/admin-kit/components';
import { sortOptions, usePaged, useStatusParam, type Sort } from '~/admin-kit/queries';
import { Chips, ListRow } from '~/ds';

const SORTS = sortOptions();

export default function Inquiries() {
  const allowed = useCan()('inquiry.answer');
  const [status, setStatus, statusOpts] = useStatusParam(INQUIRY_STATUS, 'open');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const filters = { q: q || undefined, status: status || undefined, sort };
  const paged = usePaged(
    ['admin', 'inquiries', filters],
    (pageSize) => api.admin.inquiries.list({ ...filters, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '문의' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: '문의', headerSearchBarOptions: searchBar('제목 또는 작성자', setQ) }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={<FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />}
        emptyText="조건에 맞는 문의가 없습니다"
        renderRow={(x) => (
          <ListRow
            meta={`${INQUIRY_CATEGORY_LABEL[x.category]} · ${x.authorName} · ${formatDate(x.createdAt)}`}
            title={x.title}
            trailing={<StatusBadge {...INQUIRY_STATUS[x.status]} />}
            onPress={() => openScreen({ pathname: '/inquiries/[id]', params: { id: x.id } })}
          />
        )}
      />
    </>
  );
}
