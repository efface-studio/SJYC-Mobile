import { Stack } from 'expo-router';
import { useState, type ReactNode } from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  type NativeSyntheticEvent,
  type TextInputFocusEventData,
} from 'react-native';
import type { Tone } from '@/domain/labels';
import { can, type Permission } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import {
  Badge,
  Button,
  Divider,
  EmptyState,
  FormSection,
  GUTTER,
  QueryBoundary,
  Screen,
  Tap,
  Txt,
  pickOption,
  radius,
  space,
  useTheme,
} from '~/ds';
import { Icon } from '~/shared/icon';
import type { Option, Paged } from './queries';

/** 각 탭의 내비게이션 스택 — 탭 첫 화면은 iOS 큰 제목 (제목은 화면마다 Stack.Screen 으로 지정) */
export function TabStack() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Screen name="index" options={{ headerLargeTitle: true, headerLargeTitleShadowVisible: false }} />
    </Stack>
  );
}

/** 화면 표시용 권한 확인 — 판단 근거는 서버 세션이며, 서버가 다시 검증한다 */
export function useCan(): (permission: Permission) => boolean {
  const user = useSession().data?.user;
  return (permission) => can(user, permission);
}

/** 화면 전체를 차지하는 안내 (권한 없음·찾을 수 없음 등) */
export function ScreenMessage({ title, description }: { title: string; description?: string }) {
  return (
    <Screen>
      <EmptyState title={title} description={description} />
    </Screen>
  );
}

export function NoPermission() {
  return (
    <ScreenMessage
      title="권한이 없습니다"
      description="이 메뉴를 사용할 권한이 있는 계정으로 로그인해 주세요."
    />
  );
}

type SearchEvent = NativeSyntheticEvent<TextInputFocusEventData>;

/** 네이티브 검색 바(내비게이션 헤더) 옵션: 검색 버튼으로 조회, 지우거나 취소하면 전체 목록 */
export function searchBar(placeholder: string, onSearch: (q: string) => void) {
  return {
    placeholder,
    autoCapitalize: 'none' as const,
    onSearchButtonPress: (e: SearchEvent) => onSearch(e.nativeEvent.text.trim()),
    onChangeText: (e: SearchEvent) => {
      if (e.nativeEvent.text === '') onSearch('');
    },
    onCancelButtonPress: () => onSearch(''),
  };
}

/** 내비게이션 헤더 오른쪽 텍스트 버튼 */
export function HeaderButton({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={label} rounded={radius.sm} style={styles.headerButton}>
      <Txt variant="label" color="action">
        {label}
      </Txt>
    </Tap>
  );
}

/** 목록 행 오른쪽 상태 배지 (행 높이 가운데 정렬) */
export function StatusBadge({ text, tone }: { text: string; tone: Tone }) {
  return (
    <View>
      <Badge text={text} tone={tone} />
    </View>
  );
}

/** 드롭다운 필터 칩 — 누르면 iOS 액션 시트 / Android 바텀 시트. 첫 선택지가 기본값 */
export function FilterChip<V extends string>({
  title,
  value,
  options,
  onChange,
  display,
}: {
  title: string;
  value: V;
  options: Option<V>[];
  onChange: (value: V) => void;
  /** 칩에 표시할 문구 (기본: 선택된 항목 라벨) */
  display?: string;
}) {
  const t = useTheme();
  const index = options.findIndex((o) => o.value === value);
  const active = index > 0;
  const text = display ?? options[index]?.label ?? title;
  return (
    <Tap
      rounded={radius.pill}
      accessibilityLabel={`${title}: ${text}`}
      onPress={async () => {
        const i = await pickOption(
          title,
          options.map((o) => o.label),
          index,
        );
        const picked = i === null ? undefined : options[i];
        if (picked) onChange(picked.value);
      }}
      style={[
        styles.filterChip,
        { backgroundColor: active ? t.brandSoft : t.bg, borderColor: active ? t.brandSoft : t.line },
      ]}
    >
      <Txt
        variant="captionStrong"
        color={active ? 'action' : 'textSecondary'}
        numberOfLines={1}
        style={{ flexShrink: 1 }}
      >
        {text}
      </Txt>
      <Icon ios="chevron.down" android="expand_more" color={active ? t.action : t.textTertiary} size={11} />
    </Tap>
  );
}

/** 목록 상단 도구 줄: 왼쪽 건수, 오른쪽 드롭다운 필터 칩 */
export function ListToolbar({ count, children }: { count?: number; children?: ReactNode }) {
  return (
    <View style={styles.toolbar}>
      <Txt variant="captionStrong" color="textSecondary">
        {count === undefined ? ' ' : `총 ${count.toLocaleString('ko-KR')}건`}
      </Txt>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flex: 1 }}
        contentContainerStyle={styles.toolbarChips}
      >
        {children}
      </ScrollView>
    </View>
  );
}

/** 구분선이 들어간 행 목록 */
export function Rows<T>({
  items,
  rowKey,
  render,
}: {
  items: readonly T[];
  rowKey: (item: T) => string;
  render: (item: T) => ReactNode;
}) {
  return (
    <>
      {items.map((item, i) => (
        <View key={rowKey(item)}>
          {i > 0 && <Divider inset={GUTTER} />}
          {render(item)}
        </View>
      ))}
    </>
  );
}

/**
 * 관리자 목록 화면: 상태 칩 + 도구 줄(건수·필터) + 행 목록 + 더 보기.
 * 필터 영역은 로딩·오류·빈 목록에서도 유지된다.
 */
export function PagedList<T extends { id: string }>({
  paged,
  chips,
  tools,
  below,
  footer,
  bottomInset,
  emptyText,
  renderRow,
}: {
  paged: Paged<T>;
  chips?: ReactNode;
  tools?: ReactNode;
  below?: ReactNode;
  footer?: ReactNode;
  /** 하단 고정 영역이 기본(140)보다 높을 때 목록 끝 여백 */
  bottomInset?: number;
  emptyText: string;
  renderRow: (item: T) => ReactNode;
}) {
  const { query, more } = paged;
  return (
    <Screen onRefresh={() => query.refetch()} footer={footer} bottomInset={bottomInset}>
      {chips}
      <ListToolbar count={query.data?.total}>{tools}</ListToolbar>
      {below}
      <Divider />
      <QueryBoundary
        query={query}
        isEmpty={(page) => page.items.length === 0}
        empty={{ title: emptyText, description: '검색어나 필터를 바꿔 보세요.' }}
      >
        {(page) => (
          <>
            <Rows items={page.items} rowKey={(x) => x.id} render={renderRow} />
            {page.total > page.items.length && (
              <View style={styles.more}>
                <Button
                  label={`더 보기 (${page.items.length}/${page.total})`}
                  variant="secondary"
                  size="md"
                  loading={query.isFetching}
                  onPress={more}
                />
              </View>
            )}
          </>
        )}
      </QueryBoundary>
    </Screen>
  );
}

/** 상세 화면 상단: 분류 줄 + 큰 제목 + 상태 배지 + 보조 설명 */
export function DetailHeader({
  meta,
  title,
  status,
  caption,
}: {
  meta?: string;
  title: string;
  status?: { text: string; tone: Tone };
  caption?: string;
}) {
  return (
    <View style={styles.detailHeader}>
      {meta && (
        <Txt variant="captionStrong" color="textTertiary">
          {meta}
        </Txt>
      )}
      <Txt variant="title1" accessibilityRole="header">
        {title}
      </Txt>
      {caption && (
        <Txt variant="label" color="textSecondary">
          {caption}
        </Txt>
      )}
      {status && (
        <View style={{ marginTop: space.xs }}>
          <Badge text={status.text} tone={status.tone} />
        </View>
      )}
    </View>
  );
}

/** 회색 상자 안 긴 본문 (요청 사항·이용 목적·문의 본문 등) */
export function TextBlock({ children }: { children: string }) {
  const t = useTheme();
  return (
    <View style={[styles.textBlock, { backgroundColor: t.bgSubtle }]}>
      <Txt variant="body" color="textSecondary">
        {children}
      </Txt>
    </View>
  );
}

/** 하단 고정 영역의 두 버튼 (보조 | 주요) */
export function ButtonPair({ left, right }: { left: ReactNode; right: ReactNode }) {
  return (
    <View style={styles.pair}>
      <View style={{ flex: 1 }}>{left}</View>
      <View style={{ flex: 1 }}>{right}</View>
    </View>
  );
}

/** 폼 맨 아래 삭제 같은 위험 동작 — 빨간 텍스트 버튼 */
export function DangerTextButton({
  label,
  onPress,
  disabled,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  return (
    <Tap
      onPress={onPress}
      disabled={disabled}
      accessibilityLabel={label}
      rounded={radius.md}
      style={[styles.dangerText, { opacity: disabled ? 0.4 : 1 }]}
    >
      <Txt variant="label" color={t.tone.danger.fg}>
        {label}
      </Txt>
    </Tap>
  );
}

/**
 * 추가·삭제 가능한 반복 행 상태 (사진·활동·출처 등).
 * 행마다 고정 id 를 두어 중간 행을 지워도 다른 행의 입력값이 유지된다.
 */
export function useRows<T>(initial: readonly T[]) {
  const [state, setState] = useState(() => ({
    next: initial.length,
    rows: initial.map((value, id) => ({ id, value })),
  }));
  return {
    rows: state.rows,
    values: state.rows.map((r) => r.value),
    add: (blank: T) =>
      setState((s) => ({ next: s.next + 1, rows: [...s.rows, { id: s.next, value: blank }] })),
    remove: (id: number) => setState((s) => ({ ...s, rows: s.rows.filter((r) => r.id !== id) })),
    update: (id: number, value: T) =>
      setState((s) => ({ ...s, rows: s.rows.map((r) => (r.id === id ? { id, value } : r)) })),
  };
}

/** 행 단위 오류가 있으면 목록 전체 오류는 중복이라 숨긴다 (parseValues 는 `photos`·`photos.0.url` 둘 다 기록) */
export function listError(errors: Record<string, string>, key: string): string | undefined {
  return Object.keys(errors).some((k) => k.startsWith(`${key}.`)) ? undefined : errors[key];
}

/** 반복 행 묶음: 제목·안내 + 행들 + 목록 오류 + 추가 버튼 */
export function RowGroup({
  title,
  hint,
  addLabel,
  onAdd,
  error,
  children,
}: {
  title: string;
  hint?: string;
  addLabel: string;
  onAdd: () => void;
  error?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <FormSection title={title}>
      {hint && (
        <Txt variant="caption" color="textTertiary" style={{ marginTop: -space.sm }}>
          {hint}
        </Txt>
      )}
      {children}
      {error && (
        <Txt variant="caption" color={t.tone.danger.fg}>
          {error}
        </Txt>
      )}
      <Button label={addLabel} variant="secondary" size="md" onPress={onAdd} />
    </FormSection>
  );
}

/** 반복 행 하나 — 테두리 상자 안에 "사진 1 · 삭제" 머리줄과 입력 필드 */
export function RowItem({
  label,
  onRemove,
  children,
}: {
  label: string;
  onRemove: () => void;
  children: ReactNode;
}) {
  const t = useTheme();
  return (
    <View style={[styles.rowItem, { borderColor: t.line }]}>
      <View style={styles.rowItemHead}>
        <Txt variant="captionStrong" color="textSecondary">
          {label}
        </Txt>
        <Tap
          onPress={onRemove}
          accessibilityLabel={`${label} 삭제`}
          rounded={radius.sm}
          style={styles.rowItemRemove}
        >
          <Txt variant="captionStrong" color={t.tone.danger.fg}>
            삭제
          </Txt>
        </Tap>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  rowItem: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: space.md,
  },
  rowItemHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowItemRemove: { paddingHorizontal: space.sm, paddingVertical: space.xs, marginRight: -space.sm },
  headerButton: { paddingHorizontal: space.sm, paddingVertical: 6 },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 32,
    maxWidth: 240,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  toolbar: { flexDirection: 'row', alignItems: 'center', paddingLeft: GUTTER, minHeight: 48 },
  toolbarChips: {
    flexGrow: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: space.sm,
    paddingLeft: space.md,
    paddingRight: GUTTER,
    paddingVertical: space.sm,
  },
  more: { paddingHorizontal: GUTTER, paddingTop: space.lg },
  detailHeader: { paddingHorizontal: GUTTER, paddingTop: space.lg, paddingBottom: space.xxl, gap: space.xs },
  textBlock: { borderRadius: radius.md, padding: space.lg },
  pair: { flexDirection: 'row', gap: space.sm },
  dangerText: {
    alignSelf: 'center',
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    marginTop: space.xxl,
  },
});
