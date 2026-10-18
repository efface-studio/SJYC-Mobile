import type { UseQueryResult } from '@tanstack/react-query';
import { Image } from 'expo-image';
import type { SFSymbol, AndroidSymbol } from 'expo-symbols';
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
}: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
  subtle?: boolean;
  footer?: ReactNode;
  /** 하단 고정 영역 높이에 맞춘 스크롤 여백 (기본: footer 가 있으면 140) */
  bottomInset?: number;
}) {
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  return (
    <View style={{ flex: 1, backgroundColor: subtle ? t.bgSubtle : t.bg }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        // iOS: 키보드가 올라오면 스크롤 인셋을 자동 조정해 입력칸·버튼이 가려지지 않게 한다
        automaticallyAdjustKeyboardInsets
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
  return (
    <View style={styles.sectionHeader}>
      <Txt variant="title2" accessibilityRole="header">
        {title}
      </Txt>
      {action && onAction && (
        <Tap onPress={onAction} accessibilityLabel={`${title} ${action}`} style={styles.sectionAction}>
          <Txt variant="label" color="textTertiary">
            {action}
          </Txt>
        </Tap>
      )}
    </View>
  );
}

export function Divider({ inset = 0, thick = false }: { inset?: number; thick?: boolean }) {
  const t = useTheme();
  return thick ? (
    <View style={{ height: 10, backgroundColor: t.bgSubtle }} />
  ) : (
    <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.line, marginLeft: inset }} />
  );
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

export function Badge({ text, tone = 'neutral' }: { text: string; tone?: Tone }) {
  const t = useTheme();
  const c = t.tone[tone];
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Txt variant="small" color={c.fg}>
        {text}
      </Txt>
    </View>
  );
}

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
  const bg = tone === 'brand' ? t.brandSoft : tone === 'subtle' ? t.bgSubtle : t.card;
  return (
    <Tap onPress={onPress} rounded={radius.lg} style={[styles.card, { backgroundColor: bg }, style]}>
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

/** 가로 스크롤 필터 칩 (선택 1개) */
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
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            rounded={radius.pill}
            accessibilityLabel={`${o.label}${active ? ', 선택됨' : ''}`}
            style={[styles.chip, { backgroundColor: active ? t.text : t.bgSubtle }]}
          >
            <Txt variant="label" color={active ? t.bg : t.textSecondary}>
              {o.label}
            </Txt>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

export function IconCircle({
  ios,
  android,
  tone = 'brand',
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  tone?: Tone;
}) {
  const t = useTheme();
  return (
    <View style={[styles.iconCircle, { backgroundColor: t.tone[tone].bg }]}>
      <Icon ios={ios} android={android} color={t.tone[tone].fg} size={20} />
    </View>
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
    paddingHorizontal: GUTTER,
    paddingTop: space.xxl,
    paddingBottom: space.sm,
  },
  sectionAction: { paddingVertical: 8, paddingLeft: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: GUTTER,
    paddingVertical: 14,
    minHeight: 56,
  },
  infoRow: { flexDirection: 'row', gap: space.md, paddingVertical: 10 },
  badge: { alignSelf: 'flex-start', borderRadius: radius.sm - 2, paddingHorizontal: 8, paddingVertical: 3 },
  card: { padding: space.lg },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  chips: { gap: space.sm, paddingHorizontal: GUTTER, paddingVertical: space.sm },
  chip: { paddingHorizontal: 14, height: 36, justifyContent: 'center' },
  iconCircle: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 64,
    paddingHorizontal: GUTTER,
  },
});
