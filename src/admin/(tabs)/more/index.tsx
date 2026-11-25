import { DeveloperMenu } from '~/admin-kit/developer/menu';
import { SOCIAL_ORDER, SocialMark, useSocialAccounts } from '~/user-kit/social-accounts';
import { AppearanceRow } from '~/shared/appearance-row';
import { openScreen } from '~/shared/navigation';
import Constants from 'expo-constants';
import { Stack, type Href } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { can, canManageAttendance, managesAnyClub, ROLE_LABEL, type Permission } from '@/domain/permissions';
import type { User } from '@/domain/types';
import { useLogout, useSession } from '@/features/auth/session';
import { Rows } from '~/admin-kit/components';
import { Badge, Button, Divider, EmptyState, Gutter, ListRow, Screen, Txt, space, useTheme } from '~/ds';
import { Icon, type IconProps } from '~/shared/icon';
import { confirm } from '~/shared/dialogs';

interface Menu {
  title: string;
  subtitle: string;
  icon: Pick<IconProps, 'ios' | 'android'>;
  href: Href;
  /** 권한 이름 또는 조건 (동아리 담당자처럼 역할만으로 정해지지 않는 메뉴) */
  permission: Permission | ((user: User | undefined) => boolean);
}

/** 웹 관리자 사이드바와 같은 묶음. 대시보드·프로그램 신청·공간 예약·문의는 하단 탭에 있다 */
const GROUPS: { group: string; items: Menu[] }[] = [
  {
    group: '콘텐츠',
    items: [
      {
        title: '공지',
        icon: { ios: 'megaphone', android: 'campaign' },
        subtitle: '작성 · 게시 상태 · 상단 고정',
        href: '/more/notices',
        permission: 'notice.write',
      },
      {
        title: '프로그램',
        icon: { ios: 'calendar', android: 'event' },
        subtitle: '등록 · 모집 일정 · 정원',
        href: '/more/programs',
        permission: 'program.write',
      },
    ],
  },
  {
    group: '신청·예약',
    items: [
      {
        title: '공간 설정',
        icon: { ios: 'door.left.hand.open', android: 'meeting_room' },
        subtitle: '예약 접수 · 수용 인원',
        href: '/more/spaces',
        permission: 'space.manage',
      },
    ],
  },
  {
    group: '커뮤니티',
    items: [
      {
        title: '동아리 운영',
        icon: { ios: 'person.2', android: 'group' },
        subtitle: '담당 동아리 회원 · 가입 신청 · 소식 · 소개',
        href: '/more/my-clubs',
        permission: managesAnyClub,
      },
      {
        title: '동아리',
        icon: { ios: 'person.3', android: 'groups' },
        subtitle: '등록 · 운영 상태 · 모집',
        href: '/more/clubs',
        permission: 'club.manage',
      },
      {
        title: '동아리 가입 신청',
        icon: { ios: 'person.badge.plus', android: 'person_add' },
        subtitle: '가입 승인 · 반려',
        href: '/more/club-applications',
        permission: 'club.manage',
      },
      {
        title: '출석',
        icon: { ios: 'checkmark.circle', android: 'fact_check' },
        subtitle: '출석부 · 출석 코드 · 회원별 출석률',
        href: '/more/attendance',
        permission: canManageAttendance,
      },
      {
        title: 'FAQ',
        icon: { ios: 'questionmark.circle', android: 'help' },
        subtitle: '자주 묻는 질문 관리',
        href: '/more/faqs',
        permission: 'inquiry.answer',
      },
    ],
  },
  {
    group: '회원',
    items: [
      {
        title: '회원',
        icon: { ios: 'person.crop.circle', android: 'account_circle' },
        subtitle: '역할 · 이용 정지',
        href: '/more/members',
        permission: 'member.read',
      },
    ],
  },
  {
    group: '설정',
    items: [
      {
        title:'앱 업데이트',icon:{ios:'arrow.down.circle',android:'system_update'},href:'/more/app-updates',subtitle:'유저·관리자 앱 배포와 적용 현황',permission:'site.manage',
      },
      {
        title: '정책 문서',
        icon: { ios: 'doc.text', android: 'description' },
        subtitle: '약관 · 개인정보 처리방침 개정',
        href: '/more/policies',
        permission: 'policy.manage',
      },
      {
        title: '감사 로그',
        icon: { ios: 'clock.arrow.circlepath', android: 'history' },
        subtitle: '관리 작업 기록',
        href: '/more/audit',
        permission: 'audit.read',
      },
    ],
  },

];

export default function More() {
  const user = useSession().data?.user;
  const social = useSocialAccounts(user?.id);
  const logout = useLogout();
  const t = useTheme();
  const allowed = (m: Menu) =>
    typeof m.permission === 'function' ? m.permission(user) : can(user, m.permission);
  const developer = can(user, 'developer.view');
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter(m => allowed(m) && !(developer && (m.href === '/more/members' || m.href === '/more/app-updates'))) })).filter(
    (g) => g.items.length > 0,
  );

  const signOut = async () => {
    const ok = await confirm({ title: '로그아웃할까요?', confirmLabel: '로그아웃', destructive: true });
    // 세션이 비워지면 루트 게이트가 로그인 화면으로 전환한다
    if (ok) logout.mutate();
  };

  return (
    <>
      <Stack.Screen options={{ title: '운영 메뉴' }} />
      <Screen>
        {user && (
          <View style={[styles.profile, { borderColor: t.line }]}>
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
        {groups.length === 0 ? (
          <EmptyState
            title="사용할 수 있는 메뉴가 없습니다"
            description="권한이 필요하면 최고 관리자에게 문의해 주세요."
          />
        ) : (
          groups.map((g) => (
            <View key={g.group}>
              <Gutter style={styles.groupLabel}>
                <Txt variant="captionStrong" color="textTertiary" accessibilityRole="header">
                  {g.group}
                </Txt>
              </Gutter>
              <View style={[styles.group, { borderColor: t.line }]}>
                <Rows
                  items={g.items}
                  rowKey={(m) => m.title}
                  render={(m) => (
                    <ListRow
                      leading={<Icon {...m.icon} size={19} color={t.textTertiary} />}
                      title={m.title}
                      subtitle={m.subtitle}
                      onPress={() => openScreen(m.href)}
                    />
                  )}
                />
              </View>
            </View>
          ))
        )}
        {developer && <DeveloperMenu/>}
        <Gutter style={styles.groupLabel}>
          <Txt variant="captionStrong" color="textTertiary" accessibilityRole="header">
            앱 설정
          </Txt>
        </Gutter>
        <ListRow
          title="연결된 소셜 계정"
          onPress={() => openScreen('/more/account/social')}
          trailing={
            social.data && (
              <View
                accessibilityLabel={'연결된 계정 ' + social.data.linked.length + '개'}
                style={{ flexDirection: 'row', gap: 4 }}
              >
                {SOCIAL_ORDER.map((p) => (
                  <SocialMark key={p} provider={p} size={23} muted={!social.data.linked.includes(p)} />
                ))}
              </View>
            )
          }
        />
        <ListRow title="로그인 기기" onPress={() => openScreen('/more/account/devices')} />
        <ListRow title="알림 설정" onPress={() => openScreen('/more/account/notifications')} />
        <ListRow title="약관 및 정책" onPress={() => openScreen('/more/account/policies')} />
        <AppearanceRow />
        <Divider />
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
  group: { borderBottomWidth: StyleSheet.hairlineWidth },
  profile: {
    marginHorizontal: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: space.lg,
  },
  roles: { gap: space.xs, alignItems: 'flex-end' },
  groupLabel: { paddingTop: space.xxl, paddingBottom: space.xs },
  footer: { gap: space.md, paddingTop: space.xxl },
});
