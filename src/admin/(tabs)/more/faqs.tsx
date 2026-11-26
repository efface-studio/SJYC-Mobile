import { useLiveSearch } from '~/shared/live-search';
import { openScreen } from '~/shared/navigation';
import { useQuery } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { INQUIRY_CATEGORY_LABEL } from '@/domain/labels';
import type { Faq, InquiryCategory } from '@/domain/types';
import {
  FilterChip,
  HeaderButton,
  ListToolbar,
  NoPermission,
  Rows,
  StatusBadge,
  searchBar,
  useCan,
} from '~/admin-kit/components';
import { faqsQuery } from '~/admin-kit/queries';
import { Chips, Divider, EmptyState, ListRow, QueryBoundary, Screen } from '~/ds';

const open = (id: string) => openScreen({ pathname: '/more/faq/[id]', params: { id } });

type Visibility = '' | 'published' | 'hidden';
const VISIBILITY: { value: Visibility; label: string }[] = [
  { value: '', label: '전체' },
  { value: 'published', label: '게시' },
  { value: 'hidden', label: '숨김' },
];
const CATEGORIES: { value: '' | InquiryCategory; label: string }[] = [
  { value: '', label: '전체 분류' },
  ...(Object.keys(INQUIRY_CATEGORY_LABEL) as InquiryCategory[]).map((c) => ({
    value: c,
    label: INQUIRY_CATEGORY_LABEL[c],
  })),
];

/** FAQ 목록 (표시 순서대로) — 수가 적어 전체를 받아 기기에서 거른다 */
export default function Faqs() {
  const allowed = useCan()('inquiry.answer');
  const faqs = useQuery({ ...faqsQuery, enabled: allowed });
  const [q, setQ] = useLiveSearch();
  const [visibility, setVisibility] = useState<Visibility>('');
  const [category, setCategory] = useState<'' | InquiryCategory>('');
  const filter = (list: Faq[]) =>
    list.filter(
      (f) =>
        (!visibility || f.published === (visibility === 'published')) &&
        (!category || f.category === category) &&
        (!q || f.question.includes(q) || f.answer.includes(q)),
    );

  if (!allowed) {
    return (
      <>
        <Stack.Screen options={{ title: 'FAQ' }} />
        <NoPermission />
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'FAQ',
          headerSearchBarOptions: searchBar('질문 또는 답변 검색', setQ),
          headerRight: () => <HeaderButton label="등록" onPress={() => open('new')} />,
        }}
      />
      <Screen onRefresh={() => faqs.refetch()}>
        <Chips options={VISIBILITY} value={visibility} onChange={setVisibility} />
        <ListToolbar count={faqs.data ? filter(faqs.data).length : undefined}>
          <FilterChip title="분류" value={category} options={CATEGORIES} onChange={setCategory} />
        </ListToolbar>
        <Divider />
        <QueryBoundary query={faqs}>
          {(list) => {
            const items = filter(list);
            return items.length === 0 ? (
              <EmptyState
                title={list.length === 0 ? '등록된 FAQ가 없습니다' : '조건에 맞는 FAQ가 없습니다'}
              />
            ) : (
              <Rows
                items={items}
                rowKey={(f) => f.id}
                render={(f) => (
                  <ListRow
                    meta={`${INQUIRY_CATEGORY_LABEL[f.category]} · 순서 ${f.order}`}
                    title={f.question}
                    trailing={
                      <StatusBadge
                        {...(f.published
                          ? { text: '게시', tone: 'success' as const }
                          : { text: '숨김', tone: 'neutral' as const })}
                      />
                    }
                    onPress={() => open(f.id)}
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
