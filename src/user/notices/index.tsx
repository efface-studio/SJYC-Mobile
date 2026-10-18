import { useQuery } from '@tanstack/react-query';
import { Stack, router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';
import { api } from '@/api';
import { NOTICE_CATEGORY_LABEL } from '@/domain/labels';
import type { NoticeCategory } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { Badge, Chips, Gutter, ListRow, QueryBoundary, Screen, Txt, space } from '~/ds';
import { Rows } from '~/user-kit';

const CATEGORY_OPTIONS: { value: NoticeCategory | ''; label: string }[] = [
  { value: '', label: '전체' },
  ...(Object.keys(NOTICE_CATEGORY_LABEL) as NoticeCategory[]).map((k) => ({
    value: k,
    label: NOTICE_CATEGORY_LABEL[k],
  })),
];

export default function NoticesScreen() {
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<NoticeCategory | ''>('');
  const query = { q: q || undefined, category: category || undefined, pageSize: 50 };
  const notices = useQuery({ queryKey: ['notices', query], queryFn: () => api.notices.list(query) });

  return (
    <>
      <Stack.Screen
        options={{
          headerSearchBarOptions: {
            placeholder: '제목·내용 검색',
            onChangeText: (e) => setQ(e.nativeEvent.text),
            onCancelButtonPress: () => setQ(''),
          },
        }}
      />
      <Screen onRefresh={() => notices.refetch()}>
        <View style={{ paddingTop: space.sm }}>
          <Chips options={CATEGORY_OPTIONS} value={category} onChange={setCategory} />
        </View>
        {notices.data && (
          <Gutter style={{ paddingVertical: space.sm }}>
            <Txt variant="caption" color="textTertiary">
              총 {notices.data.total}건
            </Txt>
          </Gutter>
        )}
        <QueryBoundary
          query={notices}
          isEmpty={(d) => d.items.length === 0}
          empty={{ title: '공지가 없습니다', description: q ? '다른 검색어로 찾아보세요.' : undefined }}
        >
          {(data) => (
            <Rows>
              {data.items.map((n) => (
                <ListRow
                  key={n.id}
                  meta={`${NOTICE_CATEGORY_LABEL[n.category]} · ${n.publishedAt ? formatDate(n.publishedAt) : ''}`}
                  title={n.title}
                  trailing={n.pinned ? <Badge text="중요" tone="brand" /> : undefined}
                  onPress={() => router.push(`/notices/${n.id}`)}
                />
              ))}
            </Rows>
          )}
        </QueryBoundary>
      </Screen>
    </>
  );
}
