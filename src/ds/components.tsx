import type { UseQueryResult } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { type ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { errorMessage } from '@/api/errors';
import type { Tone } from '@/domain/labels';
import { Icon } from '~/shared/icon';
import { Txt } from './text';
import { GUTTER, radius, space, useTheme } from './tokens';

/* ---------- 레이아웃 ---------- */

/** 스크롤 화면. iOS 큰 제목·탭 바 여백을 OS 가 자동 조정하고, 당겨서 새로고침은 네이티브 컨트롤 */
export function Screen({
  children,
  onRefresh,
  subtle = false,
  footer,
  bottomInset,
  keyboardInsets = true,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
  subtle?: boolean;
  footer?: ReactNode;
  /** 하단 고정 영역 높이에 맞춘 스크롤 여백 (기본: footer 가 있으면 140) */
  bottomInset?: number;
  /**
   * 키보드에 맞춰 스크롤 인셋을 조정한다 (입력 폼). 입력칸이 없는 화면은 끈다 —
   * iOS 입력 알림(Alert.prompt)의 키보드에도 반응해, 닫은 뒤 목록이 위로 밀린 채 남는다.
   */
  keyboardInsets?: boolean;
}) {
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const bg = subtle ? t.bgSubtle : t.bg;
  const scroll = (
    <ScrollView
      // iOS 큰 제목은 화면의 첫 하위 뷰가 ScrollView 여야 스크롤에 맞춰 접힌다 — 감싸는 View 를 두지 않는다
      style={{ flex: 1, backgroundColor: bg }}
      contentInsetAdjustmentBehavior="automatic"
      // iOS: 키보드가 올라오면 스크롤 인셋을 자동 조정해 입력칸·버튼이 가려지지 않게 한다
      automaticallyAdjustKeyboardInsets={keyboardInsets}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ paddingBottom: bottomInset ?? (footer ? 140 : 48) }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            tintColor={t.textTertiary}
            colors={[t.action]}
            onRefresh={async () => {
              setRefreshing(true);
              try {
                await onRefresh();
              } finally {
                setRefreshing(false);
              }
            }}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  );
  if (!footer) return scroll;
  return (
    <View style={{ flex: 1, backgroundColor: bg }}>
      {scroll}
      {footer}
    </View>
  );
}

/** 화면 하단 고정 행동 영역 (신청하기 등) */
export function StickyFooter({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.sticky,
        { backgroundColor: t.bg, borderTopColor: t.line, paddingBottom: Math.max(insets.bottom, space.lg) },
      ]}
    >
      {children}
    </View>
  );
}

export function Gutter({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[{ paddingHorizontal: GUTTER }, style]}>{children}</View>;
}

export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  const t = useTheme();
  return (
    <View style={[styles.sectionHeader, { borderTopColor: t.text }]}>
      <Txt variant="title2" accessibilityRole="header">
        {title}
      </Txt>
      {action && onAction && (
        <Tap onPress={onAction} accessibilityLabel={`${title} ${action}`} style={styles.sectionAction}>
          <Txt variant="label" color="textSecondary">
            {action}
          </Txt>
        </Tap>
      )}
    </View>
  );
}

export function Divider({ inset = 0 }: { inset?: number }) {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginLeft: inset }} />;
}

/* ---------- 터치 ---------- */

/** OS 기본 터치 피드백: Android 리플 / iOS 눌림 배경 */
export function Tap({
  children,
  onPress,
  style,
  accessibilityLabel,
  disabled,
  rounded,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  disabled?: boolean;
  rounded?: number;
}) {
  const t = useTheme();
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || !onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel}
      android_ripple={onPress ? { color: t.pressed, foreground: true } : undefined}
      style={({ pressed }) => [
        style,
        rounded !== undefined && { borderRadius: rounded, overflow: 'hidden' },
        Platform.OS === 'ios' && pressed && { backgroundColor: t.pressed },
      ]}
    >
      {children}
    </Pressable>
  );
}

/* ---------- 목록 ---------- */

export function ListRow({
  title,
  subtitle,
  meta,
  leading,
  trailing,
  onPress,
  chevron = !!onPress,
  numberOfLines = 2,
}: {
  title: string;
  subtitle?: string;
  meta?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  chevron?: boolean;
  numberOfLines?: number;
}) {
  const t = useTheme();
  return (
    <Tap onPress={onPress} style={styles.row}>
      {leading}
      <View style={{ flex: 1, gap: 2 }}>
        {meta && (
          <Txt variant="caption" color="textTertiary" numberOfLines={1}>
            {meta}
          </Txt>
        )}
        <Txt variant="bodyStrong" numberOfLines={numberOfLines}>
          {title}
        </Txt>
        {subtitle && (
          <Txt variant="caption" color="textSecondary" numberOfLines={2}>
            {subtitle}
          </Txt>
        )}
      </View>
      {trailing}
      {chevron && <Icon ios="chevron.right" android="chevron_right" color={t.lineStrong} size={14} />}
    </Tap>
  );
}

/** 라벨 – 값 정보 행 (상세 화면) */
export function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Txt variant="label" color="textTertiary" style={{ width: 84 }}>
        {label}
      </Txt>
      <Txt variant="label" style={{ flex: 1 }}>
        {value}
      </Txt>
    </View>
  );
}

/* ---------- 표시 ---------- */

/** 상태 표시 — 웹과 같은 색 띠 + 굵은 글자 (색만으로 구분하지 않도록 항상 글자와 함께) */
export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = useTheme();
  const fg = tone === 'neutral' ? t.textTertiary : t.tone[tone].fg;
  const mark = tone === 'neutral' ? t.lineStrong : tone === 'brand' ? t.brand : t.tone[tone].fg;
  return (
    <View style={styles.badge}>
      <View style={[styles.badgeMark, { backgroundColor: mark }]} />
      <Txt variant="captionStrong" color={fg} numberOfLines={1}>
        {text}
      </Txt>
    </View>
  );
}

/**
 * 묶음 블록 — 기본은 채움·반경 없이 위아래 얇은 선으로만 구획한다.
 * tone 은 출석 코드·답변 대기 같은 상태 안내에만 쓴다.
 */
export function Card({
  children,
  onPress,
  style,
  tone,
}: {
  children: ReactNode;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  tone?: 'brand' | 'subtle';
}) {
  const t = useTheme();
  const box = tone
    ? [styles.callout, { backgroundColor: tone === 'brand' ? t.brandSoft : t.bgSubtle }]
    : [styles.block, { borderColor: t.line }];
  return (
    <Tap onPress={onPress} rounded={tone ? radius.md : undefined} style={[box, style]}>
      {children}
    </Tap>
  );
}

/** 원격 이미지 — 디스크 캐시, 로딩 중 회색 자리 표시 */
export function Photo({
  uri,
  alt,
  ratio = 16 / 9,
  style,
}: {
  uri: string;
  alt: string;
  ratio?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  return (
    <View style={[{ aspectRatio: ratio, backgroundColor: t.bgSubtle, overflow: 'hidden' }, style]}>
      <Image
        source={{ uri }}
        alt={alt}
        accessibilityLabel={alt}
        contentFit="cover"
        transition={150}
        cachePolicy="disk"
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  size = 'lg',
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'text' | 'danger';
  loading?: boolean;
  disabled?: boolean;
  size?: 'md' | 'lg';
}) {
  const t = useTheme();
  const bg =
    variant === 'primary'
      ? t.action
      : variant === 'secondary'
        ? t.bgSubtle
        : variant === 'danger'
          ? t.tone.danger.bg
          : 'transparent';
  const fg =
    variant === 'primary'
      ? t.onAction
      : variant === 'danger'
        ? t.tone.danger.fg
        : variant === 'text'
          ? t.textSecondary
          : t.text;
  return (
    <Tap
      onPress={loading || disabled ? undefined : onPress}
      disabled={loading || disabled}
      rounded={radius.md}
      accessibilityLabel={label}
      style={[
        styles.button,
        { height: size === 'lg' ? 54 : 44, backgroundColor: bg, opacity: disabled ? 0.4 : 1 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={fg} />
      ) : (
        <Txt variant={size === 'lg' ? 'title3' : 'label'} color={fg}>
          {label}
        </Txt>
      )}
    </Tap>
  );
}

/** 가로 스크롤 밑줄 탭 (선택 1개) — 웹 목록 상단 탭과 같은 모양 */
export function Chips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  const t = useTheme();
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={[styles.tabs, { borderBottomColor: t.line }]}
      contentContainerStyle={styles.tabsContent}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityLabel={`${o.label}${active ? ', 선택됨' : ''}`}
            style={[styles.tab, { borderBottomColor: active ? t.text : 'transparent' }]}
          >
            <Txt variant="label" color={active ? 'text' : 'textTertiary'}>
              {o.label}
            </Txt>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

/* ---------- 상태 ---------- */

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <View style={styles.state}>
      <Txt variant="bodyStrong" style={{ textAlign: 'center' }}>
        {title}
      </Txt>
      {description && (
        <Txt variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
          {description}
        </Txt>
      )}
      {action}
    </View>
  );
}

export function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator accessibilityLabel="불러오는 중" />
    </View>
  );
}

/** 쿼리의 로딩·오류·빈 상태를 일관되게 처리 (오류는 서버가 준 안전한 메시지만) */
export function QueryBoundary<T>({
  query,
  isEmpty,
  empty,
  children,
}: {
  query: UseQueryResult<T>;
  isEmpty?: (data: T) => boolean;
  empty?: { title: string; description?: string };
  children: (data: T) => ReactNode;
}) {
  if (query.isPending) return <LoadingState />;
  if (query.isError) {
    return (
      <EmptyState
        title="정보를 불러오지 못했습니다"
        description={errorMessage(query.error)}
        action={
          <Button label="다시 시도" variant="secondary" size="md" onPress={() => void query.refetch()} />
        }
      />
    );
  }
  if (isEmpty?.(query.data))
    return <EmptyState title={empty?.title ?? '표시할 내용이 없습니다'} description={empty?.description} />;
  return <>{children(query.data)}</>;
}

const styles = StyleSheet.create({
  sticky: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: GUTTER,
    paddingTop: space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: GUTTER,
    marginTop: space.xxxl,
    borderTopWidth: 2,
    paddingTop: space.md,
    paddingBottom: space.sm,
  },
  sectionAction: { minHeight: 44, justifyContent: 'center', paddingLeft: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    minHeight: 56,
  },
  infoRow: { flexDirection: 'row', gap: space.md, paddingVertical: 10 },
  badge: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6 },
  badgeMark: { width: 3, height: 12 },
  block: {
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callout: { padding: space.lg },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  tabs: { flexGrow: 0, borderBottomWidth: StyleSheet.hairlineWidth },
  tabsContent: { paddingHorizontal: GUTTER - space.md },
  tab: { height: 44, justifyContent: 'center', paddingHorizontal: space.md, borderBottomWidth: 2 },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 64,
    paddingHorizontal: GUTTER,
  },
});
