import { useQueries, useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { Href } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Keyboard, StyleSheet, TextInput, View } from 'react-native';
import type { Page } from '@/domain/types';
import { Button, Divider, EmptyState, Gutter, ListRow, Screen, Tap, Txt, useTheme } from '~/ds';
import { Icon } from './icon';
import { openScreen } from './navigation';

export interface SearchItem {
  title: string;
  href: Href;
  detail?: string;
}

export interface SearchSource {
  label: string;
  find: (query: string, page: number, cache: QueryClient) => Promise<{ items: SearchItem[]; total: number }>;
}

export const pageSize = 6;

export function pageResults<T>(page: Page<T>, item: (value: T) => SearchItem) {
  return { total: page.total, items: page.items.map(item) };
}

export function matches(text: string, term: string) {
  return text.normalize('NFC').toLocaleLowerCase().includes(term.normalize('NFC').toLocaleLowerCase());
}

export function listResults(items: SearchItem[], term: string, page: number) {
  const found = items.filter((item) => matches([item.title, item.detail].join(' '), term));
  return { total: found.length, items: found.slice((page - 1) * pageSize, page * pageSize) };
}

export function SearchButton() {
  const t = useTheme();
  return (
    <Tap
      accessibilityLabel="통합검색"
      onPress={() => openScreen('/search')}
      rounded={22}
      style={styles.iconButton}
    >
      <Icon ios="magnifyingglass" android="search" color={t.text} size={22} />
    </Tap>
  );
}

function ResultRows({ items }: { items: SearchItem[] }) {
  return items.map((item) => (
    <View key={item.title + JSON.stringify(item.href)}>
      <ListRow
        title={item.title}
        subtitle={item.detail}
        onPress={() => {
          Keyboard.dismiss();
          openScreen(item.href);
        }}
      />
      <Divider inset={20} />
    </View>
  ));
}

function GroupTitle({ title }: { title: string }) {
  return (
    <Gutter style={styles.group}>
      <Txt variant="captionStrong" color="textSecondary" accessibilityRole="header">
        {title}
      </Txt>
    </Gutter>
  );
}

function Results({
  term,
  sources,
  scope,
  hasMenus,
}: {
  term: string;
  sources: SearchSource[];
  scope: readonly string[];
  hasMenus: boolean;
}) {
  const t = useTheme();
  const cache = useQueryClient();
  const [pages, setPages] = useState<Record<string, number>>({});
  const results = useQueries({
    queries: sources.map((source) => {
      const page = pages[source.label] ?? 1;
      return {
        queryKey: [...scope, 'global-search', source.label, term, page],
        queryFn: () => source.find(term, page, cache),
        retry: false,
        staleTime: 15_000,
        gcTime: 0,
      };
    }),
  });
  const pending = results.some((r) => r.isPending);
  const failed = results.filter((r) => r.isError);
  const empty = !hasMenus && !pending && !failed.length && results.every((r) => !r.data?.items.length);
  return (
    <>
      {results.map((result, i) => {
        const group = sources[i]!.label;
        const data = result.data;
        if (!data?.items.length) return null;
        const page = pages[group] ?? 1;
        const count = Math.ceil(data.total / pageSize);
        const move = (p: number) => setPages((current) => ({ ...current, [group]: p }));
        return (
          <View key={group}>
            <GroupTitle title={group + ' · ' + data.total + '건'} />
            <ResultRows items={data.items} />
            {count > 1 && (
              <View style={styles.pager}>
                <Button
                  label={group + ' 이전'}
                  variant="text"
                  size="md"
                  disabled={page === 1}
                  onPress={() => move(page - 1)}
                />
                <Txt variant="caption" color="textSecondary">
                  {page} / {count}
                </Txt>
                <Button
                  label={group + ' 다음'}
                  variant="text"
                  size="md"
                  disabled={page >= count}
                  onPress={() => move(page + 1)}
                />
              </View>
            )}
          </View>
        );
      })}
      {pending && <ActivityIndicator accessibilityLabel="검색 중" color={t.action} style={styles.group} />}
      {failed.length > 0 && (
        <EmptyState
          title="일부 검색 결과를 불러오지 못했어요"
          description={sources
            .filter((_, i) => results[i]?.isError)
            .map((s) => s.label)
            .join(' · ')}
          action={
            <Button
              label="다시 시도"
              variant="text"
              onPress={() => failed.forEach((r) => void r.refetch())}
            />
          }
        />
      )}
      {empty && <EmptyState title="검색 결과가 없어요" description="다른 단어로 검색해 보세요." />}
    </>
  );
}

export function AppSearch({
  sources,
  menus,
  scope,
  placeholder,
}: {
  sources: SearchSource[];
  menus: SearchItem[];
  scope: readonly string[];
  placeholder: string;
}) {
  const t = useTheme();
  const [input, setInput] = useState('');
  const [settled, setSettled] = useState('');
  const field = useRef<TextInput>(null);
  const term = input.trim();
  useEffect(() => {
    const timer = setTimeout(() => setSettled(term), 270);
    return () => clearTimeout(timer);
  }, [term]);
  const visible = term ? menus.filter((m) => matches(m.title, term)) : menus.slice(0, 5);
  return (
    <Screen>
      <Gutter style={styles.inputWrap}>
        <View style={[styles.field, { backgroundColor: t.bgSubtle }]}>
          <Icon ios="magnifyingglass" android="search" color={t.textSecondary} size={19} />
          <TextInput
            ref={field}
            autoFocus
            accessibilityLabel="통합검색 검색어"
            placeholder={placeholder}
            placeholderTextColor={t.textTertiary}
            value={input}
            onChangeText={setInput}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            maxLength={100}
            onSubmitEditing={() => setSettled(term)}
            style={[styles.input, { color: t.text }]}
          />
          {input.length > 0 && (
            <Tap
              accessibilityLabel="검색어 지우기"
              style={styles.iconButton}
              onPress={() => {
                setInput('');
                field.current?.focus();
              }}
            >
              <Icon ios="xmark.circle.fill" android="cancel" color={t.textTertiary} size={18} />
            </Tap>
          )}
        </View>
      </Gutter>
      {visible.length > 0 && (
        <>
          <GroupTitle title={term ? '메뉴' : '바로가기'} />
          <ResultRows items={visible} />
        </>
      )}
      {term !== '' && settled === term && (
        <Results key={term} term={term} sources={sources} scope={scope} hasMenus={visible.length > 0} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  iconButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  inputWrap: { paddingTop: 12, paddingBottom: 4 },
  field: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingLeft: 14, minHeight: 48 },
  input: { flex: 1, minWidth: 0, fontSize: 16, paddingHorizontal: 10, paddingVertical: 12 },
  group: { paddingTop: 20, paddingBottom: 4 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
});
