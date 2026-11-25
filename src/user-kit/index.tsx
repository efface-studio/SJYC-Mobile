/**
 * 사용자 앱 화면 공통 조합 — ~/ds 컴포넌트를 묶은 것만 둔다 (라우트 아님).
 */
import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Stack, router, type Href } from 'expo-router';
import { Children, Fragment, useState, type ReactNode } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { RECRUIT_STATUS, type Tone } from '@/domain/labels';
import { remainingSeats } from '@/domain/program';
import type { Program } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { daysUntil, formatDate, formatShortDate } from '@/lib/format';
import { confirm } from '~/shared/dialogs';
import { Icon } from '~/shared/icon';
import { translucentHeader } from '~/shared/header';
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

/** "10.22 (수)" → "10.22" */
const monthDay = (iso: string) => formatShortDate(iso).split(' ')[0] ?? '';

/** 왼쪽 일정 열: 모집 중이면 D-day, 예정이면 접수 시작일, 그 외 상태 */
function DateColumn({ p, photo }: { p: Program; photo?: number | string }) {
  const [failed, setFailed] = useState<number | string>();
  const hasPhoto = photo !== undefined && failed !== photo;
  const t = useTheme();
  if (p.recruitStatus === 'open') {
    const d = daysUntil(p.recruitEndsAt);
    return (
      <View style={[styles.dateCol, { borderColor: t.line }, hasPhoto && styles.photoDate]}>
        {hasPhoto && (
          <>
            <Image source={photo} contentFit="cover" blurRadius={2} accessible={false}
              recyclingKey={String(photo)} style={StyleSheet.absoluteFill} onError={() => setFailed(photo)} />
            <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.dateShade]} />
          </>
        )}
        <Txt variant="title2" color={hasPhoto ? '#fff' : 'action'}>
          {d <= 0 ? 'D-Day' : `D-${d}`}
        </Txt>
        <Txt variant="small" color={hasPhoto ? '#fff' : 'textTertiary'}>
          {monthDay(p.recruitEndsAt)} 마감
        </Txt>
      </View>
    );
  }
  if (p.recruitStatus === 'upcoming') {
    return (
      <View style={[styles.dateCol, { borderColor: t.line }]}>
        <Txt variant="title3" color={t.tone.info.fg}>
          {monthDay(p.recruitStartsAt)}
        </Txt>
        <Txt variant="small" color="textTertiary">
          접수 시작
        </Txt>
      </View>
    );
  }
  return (
    <View style={[styles.dateCol, { borderColor: t.line }]}>
      <Txt variant="captionStrong" color="textTertiary">
        {RECRUIT_STATUS[p.recruitStatus].text}
      </Txt>
    </View>
  );
}

/** 프로그램 목록 행 — 왼쪽 D-day 열 + 제목·분류·잔여석 (웹 ProgramRow 와 같은 구성) */
export function ProgramRow({ p, category, photo }: { p: Program; category: string; photo?: number | string }) {
  const left = remainingSeats(p);
  const muted = p.recruitStatus === 'closed' || p.recruitStatus === 'full';
  return (
    <Tap
      onPress={() => router.push(`/programs/${p.id}`)}
      accessibilityLabel={[p.title, RECRUIT_STATUS[p.recruitStatus].text, p.recruitStatus === 'open' && formatDate(p.recruitEndsAt) + ' 마감'].filter(Boolean).join(', ')}
      style={styles.programRow}
    >
      <DateColumn p={p} photo={photo} />
      <View style={{ flex: 1, gap: 4 }}>
        <Txt variant="bodyStrong" numberOfLines={2} color={muted ? 'textSecondary' : 'text'}>
          {p.title}
        </Txt>
        <Txt variant="caption" color="textTertiary" numberOfLines={1}>
          {[category, p.target].filter(Boolean).join(' · ')}
        </Txt>
        <Txt variant="caption" color="textSecondary">
          {muted ? `정원 ${p.capacity}명` : `잔여 ${left}석 · 정원 ${p.capacity}명`}
        </Txt>
      </View>
    </Tap>
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
        <Txt variant="caption" color="textTertiary">
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
    ...translucentHeader,
    headerTitleStyle: { fontFamily: FONT.semibold, color: t.text },
    headerLargeTitle: largeTitle,
    headerLargeTitleStyle: { fontFamily: FONT.bold, color: t.text },
    headerLargeTitleShadowVisible: false,
    headerTintColor: t.action,
    contentStyle: { backgroundColor: t.bg },
  } as const;
}

const styles = StyleSheet.create({
  hero: { paddingTop: space.sm, paddingBottom: space.xxl, gap: space.sm },
  programRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.lg,
    paddingHorizontal: GUTTER,
    paddingVertical: 12,
  },
  dateCol: {
    width: 68,
    minHeight: 48,
    paddingVertical: 7,
    gap: 2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: StyleSheet.hairlineWidth,
    paddingRight: space.sm,
  },
  photoDate: {
    width: 76, minHeight: 64, borderRadius: 8, overflow: 'hidden',
    paddingRight: 0, borderRightWidth: 0, backgroundColor: '#322c29',
  },
  dateShade: { backgroundColor: 'rgba(17,14,12,0.56)' },
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
  headerCancel: { minHeight: 44, paddingHorizontal: space.sm, justifyContent: 'center' },
});

/** 모달 닫기 — 딥링크로 열려 닫을 화면이 없으면 뒤로 가거나 fallback 으로 이동한다 */
export function closeModal(fallback: Href): void {
  if (router.canDismiss()) router.dismiss();
  else if (router.canGoBack()) router.back();
  else router.replace(fallback);
}

/**
 * 모달 폼의 닫기 — 헤더에 '취소' 버튼을 두고, 입력 중(dirty)이면 아래로 밀어 닫기를 막고
 * 취소할 때 입력을 버릴지 확인한다 (iOS 기본 앱과 같은 동작).
 */
export function ModalGuard({ dirty, fallback }: { dirty: boolean; fallback: Href }) {
  const t = useTheme();
  const cancel = async () => {
    if (dirty) {
      const ok = await confirm({
        title: '작성을 그만둘까요?',
        message: '입력한 내용은 저장되지 않습니다.',
        confirmLabel: '그만두기',
        cancelLabel: '계속 작성',
        destructive: true,
      });
      if (!ok) return;
    }
    closeModal(fallback);
  };
  return (
    <Stack.Screen
      options={{
        gestureEnabled: !dirty,
        headerLeft: () => (
          <Tap onPress={() => void cancel()} accessibilityLabel="취소" style={styles.headerCancel}>
            <Txt variant="body" color={t.action}>
              취소
            </Txt>
          </Tap>
        ),
      }}
    />
  );
}
