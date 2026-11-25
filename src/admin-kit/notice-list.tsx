import { openScreen } from '~/shared/navigation';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { NOTICE_CATEGORY_LABEL, PUBLISH_STATUS } from '@/domain/labels';
import { formatDate } from '@/lib/format';
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

const SORTS = sortOptions();

export function NoticeList({ editorPath }: { editorPath: '/dashboard/notice/[id]' | '/more/notice/[id]' }) {
  const open = (id: string) => openScreen({ pathname: editorPath, params: { id } });
  const allowed = useCan()('notice.write');
  const [status, setStatus, statusOpts] = useStatusParam(PUBLISH_STATUS, '');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const filters = { q: q || undefined, status: status || undefined, sort };
  const paged = usePaged(
    ['admin', 'notices', filters],
    (pageSize) => api.admin.notices.list({ ...filters, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '공지 관리' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '공지 관리',
          headerSearchBarOptions: searchBar('제목으로 검색', setQ),
          headerRight: () => <HeaderButton label="새 공지" onPress={() => open('new')} />,
        }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={<FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />}
        emptyText="조건에 맞는 공지가 없습니다"
        renderRow={(n) => (
          <ListRow
            meta={[
              n.pinned ? '상단 고정' : '',
              NOTICE_CATEGORY_LABEL[n.category],
              `${formatDate(n.updatedAt)} 수정`,
            ]
              .filter(Boolean)
              .join(' · ')}
            title={n.title}
            trailing={<StatusBadge {...PUBLISH_STATUS[n.status]} />}
            onPress={() => open(n.id)}
          />
        )}
      />
    </>
  );
}
