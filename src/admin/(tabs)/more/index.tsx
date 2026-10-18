import Constants from 'expo-constants';
import { router, Stack, type Href } from 'expo-router';
import type { AndroidSymbol, SFSymbol } from 'expo-symbols';
import { StyleSheet, View } from 'react-native';
import type { Tone } from '@/domain/labels';
import { can, ROLE_LABEL, type Permission } from '@/domain/permissions';
import { useLogout, useSession } from '@/features/auth/session';
import { Rows } from '~/admin-kit/components';
import { Badge, Button, Divider, EmptyState, Gutter, IconCircle, ListRow, Screen, Txt, space } from '~/ds';
import { confirm } from '~/shared/dialogs';

interface Menu {
  title: string;
  subtitle: string;
  href: Href;
  permission: Permission;
  ios: SFSymbol;
  android: AndroidSymbol;
}

/** 웹 관리자 사이드바와 같은 묶음. 대시보드·프로그램 신청·공간 예약·문의는 하단 탭에 있다 */
const GROUPS: { group: string; tone: Tone; items: Menu[] }[] = [
  {
    group: '콘텐츠',
    tone: 'brand',
    items: [
      {
        title: '공지',
        subtitle: '작성 · 게시 상태 · 상단 고정',
        href: '/more/notices',
        permission: 'notice.write',
        ios: 'megaphone',
        android: 'campaign',
      },
      {
        title: '프로그램',
        subtitle: '등록 · 모집 일정 · 정원',
        href: '/more/programs',
        permission: 'program.write',
        ios: 'calendar',
        android: 'event',
      },
    ],
  },
  {
    group: '신청·예약',
    tone: 'info',
    items: [
      {
        title: '공간 설정',
        subtitle: '예약 접수 · 수용 인원',
        href: '/more/spaces',
        permission: 'space.manage',
        ios: 'door.left.hand.open',
        android: 'meeting_room',
      },
    ],
  },
  {
    group: '커뮤니티',
    tone: 'success',
    items: [
      {
        title: '동아리',
        subtitle: '등록 · 운영 상태 · 모집',
        href: '/more/clubs',
        permission: 'club.manage',
        ios: 'person.3.fill',
        android: 'groups',
      },
      {
        title: '동아리 가입 신청',
        subtitle: '가입 승인 · 반려',
        href: '/more/club-applications',
        permission: 'club.manage',
        ios: 'person.badge.plus',
        android: 'person_add',
      },
      {
        title: 'FAQ',
        subtitle: '자주 묻는 질문 관리',
        href: '/more/faqs',
        permission: 'inquiry.answer',
        ios: 'questionmark.circle',
        android: 'help',
      },
    ],
  },
  {
    group: '회원',
    tone: 'warning',
    items: [
      {
        title: '회원',
        subtitle: '역할 · 이용 정지',
        href: '/more/members',
        permission: 'member.read',
        ios: 'person.2',
        android: 'group',
      },
    ],
  },
  {
    group: '설정',
    tone: 'neutral',
    items: [
      {
        title: '정책 문서',
        subtitle: '약관 · 개인정보 처리방침 개정',
        href: '/more/policies',
        permission: 'policy.manage',
        ios: 'doc.text',
        android: 'description',
      },
      {
        title: '감사 로그',
        subtitle: '관리 작업 기록',
        href: '/more/audit',
        permission: 'audit.read',
        ios: 'list.bullet.clipboard',
        android: 'history',
      },
    ],
  },
];

export default function More() {
  const user = useSession().data?.user;
  const logout = useLogout();
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((m) => can(user, m.permission)) })).filter(
    (g) => g.items.length > 0,
  );

  const signOut = async () => {
    const ok = await confirm({ title: '로그아웃할까요?', confirmLabel: '로그아웃', destructive: true });
    // 세션이 비워지면 루트 게이트가 로그인 화면으로 전환한다
    if (ok) logout.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: '더보기' }} />
      <Screen>
        {user && (
          <View style={styles.profile}>
            <IconCircle ios="person.crop.circle.fill" android="account_circle" tone="brand" />
            <View style={{ flex: 1, gap: 2 }}>
              <Txt variant="title3" numberOfLines={1}>
                {user.name}
              </Txt>
              <Txt variant="caption" color="textTertiary" numberOfLines={1}>
                {user.email}
              </Txt>
            </View>
            <View style={styles.roles}>
              {user.roles.map((r) => (
                <Badge
                  key={r}
                  text={ROLE_LABEL[r]}
                  tone={r === 'admin' || r === 'developer' ? 'brand' : 'neutral'}
                />
              ))}
            </View>
          </View>
        )}
        <Divider thick />
        {groups.length === 0 ? (
          <EmptyState
            title="사용할 수 있는 메뉴가 없습니다"
            description="권한이 필요하면 최고 관리자에게 문의해 주세요."
          />
        ) : (
          groups.map((g, i) => (
            <View key={g.group}>
              {i > 0 && <Divider thick />}
              <Gutter style={styles.groupLabel}>
                <Txt variant="captionStrong" color="textTertiary" accessibilityRole="header">
                  {g.group}
                </Txt>
              </Gutter>
              <Rows
                items={g.items}
                rowKey={(m) => m.title}
                render={(m) => (
                  <ListRow
                    leading={<IconCircle ios={m.ios} android={m.android} tone={g.tone} />}
                    title={m.title}
                    subtitle={m.subtitle}
                    onPress={() => router.push(m.href)}
                  />
                )}
              />
            </View>
          ))
        )}
        <Divider thick />
        <Gutter style={styles.footer}>
          <Button
            label="로그아웃"
            variant="secondary"
            loading={logout.isPending}
            onPress={() => void signOut()}
          />
          <Txt variant="caption" color="textTertiary" style={{ textAlign: 'center' }}>
            관리자 앱 버전 {Constants.expoConfig?.version ?? '-'}
          </Txt>
        </Gutter>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: space.lg,
  },
  roles: { gap: space.xs, alignItems: 'flex-end' },
  groupLabel: { paddingTop: space.lg, paddingBottom: space.xs },
  footer: { gap: space.md, paddingTop: space.xxl },
});
