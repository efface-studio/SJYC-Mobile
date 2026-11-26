import { ContentHistory } from '~/shared/application-content';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import { CLUB_APPLICATION_STATUS } from '@/domain/labels';
import type { ClubApplication } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { FilterChip, NoPermission, PagedList, StatusBadge, searchBar, useCan } from '~/admin-kit/components';
import { useDecision } from '~/admin-kit/decision';
import { sortOptions, usePaged, useStatusParam, type Sort } from '~/admin-kit/queries';
import { Chips, Gutter, ListRow } from '~/ds';
import { choose } from '~/shared/dialogs';

const SORTS = sortOptions('동아리명순');

export default function ClubApplications() {
  const allowed = useCan()('club.manage');
  const [status, setStatus, statusOpts] = useStatusParam(CLUB_APPLICATION_STATUS, 'pending');
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('newest');
  const [clubId, setClubId] = useState('');
  const clubs = useQuery({
    queryKey: ['admin', 'clubs'],
    queryFn: api.admin.clubs.list,
    enabled: allowed,
  });
  const options = [
    { value: '', label: '전체 동아리' },
    ...(clubs.data ?? []).map((c) => ({ value: c.id, label: c.name })),
  ];
  const filters = {
    q: q || undefined,
    status,
    sort,
    clubId: clubId || undefined,
  };
  const paged = usePaged(
    ['admin', 'club-applications', filters],
    (pageSize) => api.admin.clubs.applications({ ...filters, pageSize }),
    allowed,
  );
  const decision = useDecision('club');

  /** 가입 동기를 보여주는 OS 액션 시트에서 바로 승인/반려 */
  const handle = async (a: ClubApplication) => {
    const picked = await choose(`${a.applicantName} · ${a.clubName}`, ['승인', '반려'], {
      message: a.motivation,
      destructiveIndex: 1,
    });
    if (picked === 0) await decision.approve([a.id], '', false);
    if (picked === 1) await decision.reject([a.id]);
  };

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '동아리 가입 신청' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '동아리 가입 신청',
          headerSearchBarOptions: searchBar('신청자 또는 동아리명', setQ),
        }}
      />
      <PagedList
        paged={paged}
        chips={<Chips options={statusOpts} value={status} onChange={setStatus} />}
        tools={
          <>
            <FilterChip title="동아리" value={clubId} options={options} onChange={setClubId} />
            <FilterChip title="정렬" value={sort} options={SORTS} onChange={setSort} />
          </>
        }
        emptyText="조건에 맞는 가입 신청이 없습니다"
        renderRow={(a) => (
          <>
            <ListRow
              meta={`${a.clubName} · ${formatDate(a.createdAt)}`}
              title={a.applicantName}
              subtitle={a.reason ? `반려 사유: ${a.reason}` : a.motivation}
              trailing={<StatusBadge {...CLUB_APPLICATION_STATUS[a.status]} />}
              onPress={a.status === 'pending' && !decision.busy ? () => void handle(a) : undefined}
            />
            {a.contentEdits?.length ? (
              <Gutter>
                <ContentHistory edits={a.contentEdits} />
              </Gutter>
            ) : null}
          </>
        )}
      />
    </>
  );
}
