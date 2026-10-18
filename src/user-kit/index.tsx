/**
 * 사용자 앱 화면 공통 조합 — ~/ds 컴포넌트를 묶은 것만 둔다 (라우트 아님).
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { router, type Href } from 'expo-router';
import { Children, Fragment, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { api } from '@/api';
import type { Tone } from '@/domain/labels';
import { useSession } from '@/features/auth/session';
import { formatDate } from '@/lib/format';
import { Icon } from '~/shared/icon';
import {
  Button,
  Divider,
  EmptyState,
  FONT,
  GUTTER,
  Gutter,
  QueryBoundary,
  Screen,
  Tap,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';

/** 상세 화면: 데이터가 준비되기 전(로딩·오류)에는 빈 Screen 안에서 상태를 보여준다 */
export function QueryScreen<T>({
  query,
  children,
}: {
  query: UseQueryResult<T>;
  children: (data: T) => ReactNode;
}) {
  if (query.isSuccess) return <>{children(query.data)}</>;
  return (
    <Screen>
      <QueryBoundary query={query}>{() => null}</QueryBoundary>
    </Screen>
  );
}

/** 행 사이에 들여쓴 얇은 구분선 */
export function Rows({ children, inset = GUTTER }: { children: ReactNode; inset?: number }) {
  return (
    <>
      {Children.toArray(children).map((c, i) => (
        <Fragment key={i}>
          {i > 0 && <Divider inset={inset} />}
          {c}
        </Fragment>
      ))}
    </>
  );
}

/** 상세 화면 상단 제목 영역 */
export function Hero({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <Gutter style={styles.hero}>
      {eyebrow ? (
        <Txt variant="captionStrong" color="action">
          {eyebrow}
        </Txt>
      ) : null}
      <Txt variant="title1" accessibilityRole="header">
        {title}
      </Txt>
      {children}
    </Gutter>
  );
}

/** 안내 박스 (데모·주의·미확정 등) */
export function Callout({
  tone = 'neutral',
  title,
  children,
}: {
  tone?: Tone;
  title?: string;
  children: ReactNode;
}) {
  const t = useTheme();
  const c = t.tone[tone];
  return (
    <View style={[styles.callout, { backgroundColor: c.bg }]}>
      {title ? (
        <Txt variant="captionStrong" color={c.fg}>
          {title}
        </Txt>
      ) : null}
      <Txt variant="caption" color={tone === 'neutral' ? 'textSecondary' : c.fg}>
        {children}
      </Txt>
    </View>
  );
}

/** 글머리 목록 */
export function Bullets({ items }: { items: string[] }) {
  return (
    <View style={{ gap: space.sm }}>
      {items.map((s) => (
        <View key={s} style={{ flexDirection: 'row', gap: space.sm }}>
          <Txt variant="body" color="textTertiary">
            ·
          </Txt>
          <Txt variant="label" color="textSecondary" style={{ flex: 1 }}>
            {s}
          </Txt>
        </View>
      ))}
    </View>
  );
}

/** 긴 본문 (공지·안내) */
export function Article({ children }: { children: string }) {
  return (
    <Txt variant="body" style={styles.article}>
      {children}
    </Txt>
  );
}

/** 로그인이 필요한 화면 */
export function SignInPrompt({
  title = '로그인이 필요합니다',
  description,
  replace = false,
}: {
  title?: string;
  description?: string;
  replace?: boolean;
}) {
  return (
    <Screen>
      <EmptyState
        title={title}
        description={description}
        action={
          <View style={styles.promptAction}>
            <Button
              label="로그인"
              onPress={() => (replace ? router.replace('/login') : router.push('/login'))}
            />
          </View>
        }
      />
    </Screen>
  );
}

/** 외부 링크 — http(s) 만 연다 */
export function openExternal(url: string | null | undefined): void {
  if (url && /^https?:\/\//i.test(url)) void Linking.openURL(url);
}

export function isExternal(url: string | null | undefined): url is string {
  return !!url && /^https?:\/\//i.test(url);
}

export function hostOf(url: string): string {
  return url.replace(/^https?:\/\//i, '').split('/')[0] ?? url;
}

/** 'YYYY-MM' 이면 "2026.05", 날짜면 formatDate */
export function formatLooseDate(value: string): string {
  if (/^\d{4}-\d{2}$/.test(value)) return value.replace('-', '.');
  return formatDate(value);
}

export const NOTIFICATIONS_KEY = ['my-notifications'] as const;

/** 본인 알림 (로그인했을 때만) */
export function useNotifications() {
  const { data: session } = useSession();
  return useQuery({ queryKey: NOTIFICATIONS_KEY, queryFn: () => api.me.notifications(), enabled: !!session });
}

/** 서비스 내부 경로만 앱 라우트로 연다 (웹 경로와 앱 라우트가 같다) */
export function openInternal(link: string): void {
  const path = link.split(/[?#]/)[0] ?? '';
  if (!path.startsWith('/') || path.startsWith('//')) return;
  router.push(path as Href);
}

/** 알림 종 버튼 — 읽지 않은 수 표시 */
export function BellButton() {
  const t = useTheme();
  const list = useNotifications();
  const unread = list.data?.filter((n) => n.readAt === null).length ?? 0;
  return (
    <Tap
      onPress={() => router.push('/notifications')}
      rounded={22}
      accessibilityLabel={unread > 0 ? `알림, 읽지 않은 알림 ${unread}개` : '알림'}
      style={styles.bell}
    >
      <Icon ios="bell" android="notifications" color={t.text} size={22} />
      {unread > 0 && (
        <View style={[styles.bellBadge, { backgroundColor: t.tone.danger.fg, borderColor: t.bg }]}>
          <Txt variant="small" color="#FFFFFF" style={styles.bellCount}>
            {unread > 9 ? '9+' : unread}
          </Txt>
        </View>
      )}
    </Tap>
  );
}

/** 탭 루트·일반 화면 공통 네이티브 헤더 옵션 (Pretendard 제목, iOS 큰 제목) */
export function useHeaderOptions(largeTitle = false) {
  const t = useTheme();
  return {
    headerTitleStyle: { fontFamily: FONT.semibold, color: t.text },
    headerLargeTitle: largeTitle,
    headerLargeTitleStyle: { fontFamily: FONT.bold, color: t.text },
    headerLargeTitleShadowVisible: false,
    headerTintColor: t.action,
    contentStyle: { backgroundColor: t.bg },
  } as const;
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.xl, paddingBottom: space.xxl, gap: space.sm },
  callout: { borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, gap: 2 },
  article: { lineHeight: 27 },
  promptAction: { alignSelf: 'stretch', marginTop: space.lg },
  bell: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  bellBadge: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    paddingHorizontal: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellCount: { fontSize: 10, lineHeight: 12 },
});

/** 모달 닫기 — 딥링크로 열려 닫을 화면이 없으면 뒤로 가거나 fallback 으로 이동한다 */
export function closeModal(fallback: Href): void {
  if (router.canDismiss()) router.dismiss();
  else if (router.canGoBack()) router.back();
  else router.replace(fallback);
}
