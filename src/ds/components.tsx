import type { UseQueryResult } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { HeaderHeightContext } from 'expo-router/react-navigation';
import { ScrollBackdrop } from './scroll-backdrop';
import { type ReactNode, createContext, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Keyboard,
  LayoutAnimation,
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
  keyboardInsets = true,
}: {
  children: ReactNode;
  onRefresh?: () => Promise<unknown>;
  subtle?: boolean;
  footer?: ReactNode;
  /**
   * 키보드에 맞춰 스크롤 인셋을 조정한다 (입력 폼). 입력칸이 없는 화면은 끈다 —
   * iOS 입력 알림(Alert.prompt)의 키보드에도 반응해, 닫은 뒤 목록이 위로 밀린 채 남는다.
   */
  keyboardInsets?: boolean;
}) {
  const t = useTheme();
  const [refreshing, setRefreshing] = useState(false);
  const bg = subtle ? t.bgSubtle : t.bg;
  const keyboardOverlap = useKeyboardOverlap(footer != null);
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const topInset = Platform.OS === 'android' ? headerHeight : 0;
  const scroll = (
    <ScrollView
      // iOS 큰 제목은 화면의 첫 하위 뷰가 ScrollView 여야 스크롤에 맞춰 접힌다 — 감싸는 View 를 두지 않는다
      style={{ flex: 1, backgroundColor: bg }}
      contentInsetAdjustmentBehavior="automatic"
      // iOS: 키보드가 올라오면 스크롤 인셋을 자동 조정해 입력칸·버튼이 가려지지 않게 한다
      automaticallyAdjustKeyboardInsets={keyboardInsets}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="interactive"
      contentContainerStyle={{ paddingBottom: 48, paddingTop: topInset }}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            progressViewOffset={topInset}
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
  const content = topInset > 0 ? <ScrollBackdrop height={topInset}>{scroll}</ScrollBackdrop> : scroll;
  if (!footer) return content;
  // 하단 고정 영역은 스크롤 아래에 두고, iOS 에서는 키보드가 올라오면 함께 올린다 (입력 중에도 제출 버튼이 보이게)
  return (
    <View style={{ flex: 1, backgroundColor: bg, paddingBottom: keyboardOverlap }}>
      {content}
      {footer}
    </View>
  );
}

/**
 * iOS 키보드가 화면 아래쪽을 가리는 높이. 하단 고정 영역이 있는 화면은 모두 화면(시트) 맨 아래까지
 * 닿으므로 키보드 윗변과 화면 높이로 잰다 (KeyboardAvoidingView·measureInWindow 는 모달 시트 안에서
 * 시트 기준 좌표를 써서 덜 올라간다).
 */
function useKeyboardOverlap(enabled: boolean): number {
  const [overlap, setOverlap] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios' || !enabled) return;
    const apply = (duration: number, value: number) => {
      if (duration > 0) {
        LayoutAnimation.configureNext({
          duration,
          update: { duration, type: LayoutAnimation.Types.keyboard },
        });
      }
      setOverlap(value);
    };
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) =>
      apply(e.duration, Math.max(0, Dimensions.get('screen').height - e.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener('keyboardWillHide', (e) => apply(e.duration, 0));
    return () => {
      change.remove();
      hide.remove();
    };
  }, [enabled]);
  return overlap;
}

/** iOS 키보드가 떠 있는지 (하단 고정 영역의 홈 인디케이터 여백을 줄이는 데 쓴다) */
function useKeyboardShown(): boolean {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', () => setShown(true));
    const hide = Keyboard.addListener('keyboardWillHide', () => setShown(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return shown;
}

/**
 * 떠 있는 하단 탭 바 위에 그려지는 스택인지 (탭 안에서 쌓이는 화면). iOS 네이티브 탭 바는 RN 안전 영역에
 * 잡히지 않아 하단 고정 영역이 가려지므로, 탭 스택이 이 값을 true 로 내려 준다.
 */
export const OverTabBarContext = createContext(false);
/** iPhone 하단 탭 바 높이 (홈 인디케이터 안전 영역 위). iPad 탭 바는 위쪽, Android 는 내용이 탭 바 위에서 끝난다 */
const TAB_BAR_HEIGHT = Platform.OS === 'ios' && !Platform.isPad ? 49 : 0;

/** 화면 하단 고정 행동 영역 (신청하기 등). 키보드가 떠 있으면 키보드 바로 위에 붙인다 */
export function StickyFooter({ children }: { children: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardShown();
  const overTabBar = useContext(OverTabBarContext);
  const bottom = keyboard
    ? space.md
    : Math.max(insets.bottom, space.lg) + (overTabBar ? TAB_BAR_HEIGHT + space.sm : 0);
  return (
    <View style={[styles.sticky, { backgroundColor: t.bg, borderTopColor: t.line, paddingBottom: bottom }]}>
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
        Platform.OS === 'ios' && pressed && { opacity: 0.72 },
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
      style={styles.tabs}
      contentContainerStyle={styles.tabsContent}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Tap
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityLabel={`${o.label}${active ? ', 선택됨' : ''}`}
            style={[styles.tab, { borderBottomColor: active ? t.action : 'transparent' }]}
          >
            <Txt variant={active ? 'bodyStrong' : 'label'} color={active ? 'action' : 'textSecondary'}>
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
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel="불러오는 중"
      accessibilityLiveRegion="polite"
      style={styles.loadingRows}
    >
      {[0, 1, 2].map((row) => (
        <View
          key={row}
          style={[styles.loadingRow, { borderBottomColor: t.line }]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <View
            style={[styles.loadingTitle, { backgroundColor: t.line, width: row === 1 ? '53%' : '66%' }]}
          />
          <View style={[styles.loadingCaption, { backgroundColor: t.bgSubtle }]} />
        </View>
      ))}
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
  loadingRows: { paddingHorizontal: GUTTER },
  loadingRow: {
    height: 72,
    justifyContent: 'center',
    gap: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  loadingTitle: { height: 15, borderRadius: 4 },
  loadingCaption: { width: '37%', height: 11, borderRadius: 4 },
  sticky: {
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
    gap: space.sm,
    paddingTop: space.xs,
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
  badgeMark: { width: 6, height: 6, borderRadius: 3 },
  block: {
    paddingVertical: space.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  callout: { padding: space.lg },
  button: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: space.lg },
  tabs: { flexGrow: 0 },
  tabsContent: { paddingHorizontal: GUTTER, gap: 14, alignItems: 'center' },
  tab: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 2,
    borderBottomWidth: 2,
  },
  state: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
    paddingVertical: 64,
    paddingHorizontal: GUTTER,
  },
});
