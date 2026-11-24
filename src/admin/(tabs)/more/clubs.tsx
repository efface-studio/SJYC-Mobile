import { openScreen } from '~/shared/navigation';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { api } from '@/api';
import type { Club } from '@/domain/types';
import {
  HeaderButton,
  ListToolbar,
  NoPermission,
  Rows,
  StatusBadge,
  searchBar,
  useCan,
} from '~/admin-kit/components';
import { Chips, Divider, EmptyState, ListRow, QueryBoundary, Screen } from '~/ds';

const open = (id: string) => openScreen({ pathname: '/more/club/[id]', params: { id } });

const STATES: { value: '' | Club['status']; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'active', label: '운영 중' },
  { value: 'inactive', label: '운영 중지' },
];

/** 동아리는 수가 적어 전체를 받아 기기에서 거른다 */
export default function Clubs() {
  const allowed = useCan()('club.manage');
  const clubs = useQuery({
    queryKey: ['admin', 'clubs'],
    queryFn: () => api.admin.clubs.list(),
    enabled: allowed,
  });
  const [q, setQ] = useState('');
  const [state, setState] = useState<'' | Club['status']>('');
  const filter = (list: Club[]) =>
    list.filter((c) => (!state || c.status === state) && (!q || c.name.includes(q) || c.field.includes(q)));

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: '동아리 관리' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: '동아리 관리',
          headerSearchBarOptions: searchBar('동아리명 또는 분야', setQ),
          headerRight: () => <HeaderButton label="등록" onPress={() => open('new')} />,
        }}
      />
      <Screen onRefresh={() => clubs.refetch()}>
        <Chips options={STATES} value={state} onChange={setState} />
        <ListToolbar count={clubs.data ? filter(clubs.data).length : undefined} />
        <Divider />
        <QueryBoundary query={clubs}>
          {(list) => {
            const items = filter(list);
            return items.length === 0 ? (
              <EmptyState
                title={list.length === 0 ? '등록된 동아리가 없습니다' : '조건에 맞는 동아리가 없습니다'}
              />
            ) : (
              <Rows
                items={items}
                rowKey={(c) => c.id}
                render={(c) => (
                  <ListRow
                    meta={c.field}
                    title={c.name}
                    subtitle={`회원 ${c.memberCount}명 · ${c.recruiting ? '모집 중' : '모집 안 함'}`}
                    trailing={
                      <StatusBadge
                        {...(c.status === 'active'
                          ? { text: '운영 중', tone: 'success' as const }
                          : { text: '운영 중지', tone: 'neutral' as const })}
                      />
                    }
                    onPress={() => open(c.id)}
                  />
                )}
              />
            );
          }}
        </QueryBoundary>
      </Screen>
    </>
  );
}
