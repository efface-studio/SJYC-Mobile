import { useLiveSearch } from '~/shared/live-search';
import { Stack } from 'expo-router';
import { api } from '@/api';
import { formatDateTime } from '@/lib/format';
import { NoPermission, PagedList, searchBar, useCan } from '~/admin-kit/components';
import { usePaged } from '~/admin-kit/queries';
import { ListRow } from '~/ds';

export default function Audit() {
  const allowed = useCan()('audit.read');
  const [q, setQ] = useLiveSearch();
  const paged = usePaged(
    ['admin', 'audit', q],
    (pageSize) => api.admin.audit.list({ q: q || undefined, pageSize }),
    allowed,
  );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '감사 로그' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{ title: '감사 로그', headerSearchBarOptions: searchBar('내용, 처리자로 검색', setQ) }}
      />
      <PagedList
        paged={paged}
        emptyText="기록이 없습니다"
        renderRow={(e) => (
          <ListRow meta={`${formatDateTime(e.at)} · ${e.actorName}`} title={e.summary} numberOfLines={3} />
        )}
      />
    </>
  );
}
