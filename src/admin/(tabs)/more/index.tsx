import { DeveloperMenu } from '~/admin-kit/developer/menu';
import { SOCIAL_ORDER, SocialMark, useSocialAccounts } from '~/user-kit/social-accounts';
import { AppearanceRow } from '~/shared/appearance-row';
import { openScreen } from '~/shared/navigation';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { can, ROLE_LABEL } from '@/domain/permissions';
import { operationGroups } from '~/admin-kit/operation-menu';
import { useLogout, useSession } from '@/features/auth/session';
import { Rows } from '~/admin-kit/components';
import { Badge, Button, Divider, EmptyState, Gutter, ListRow, Screen, Txt, space, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { confirm } from '~/shared/dialogs';

export default function More() {
  const user = useSession().data?.user;
  const social = useSocialAccounts(user?.id);
  const logout = useLogout();
  const t = useTheme();
  const developer = can(user, 'developer.view');
  const groups = operationGroups(user).map((g) => ({ ...g, items: g.items.filter(m => !(developer && (m.href === '/more/members' || m.href === '/more/app-updates'))) })).filter(
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
                      titleVariant="menuTitle"
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
          titleVariant="menuTitle"
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
        <ListRow titleVariant="menuTitle" title="로그인 기기" onPress={() => openScreen('/more/account/devices')} />
        <ListRow titleVariant="menuTitle" title="알림 설정" onPress={() => openScreen('/more/account/notifications')} />
        <ListRow titleVariant="menuTitle" title="약관 및 정책" onPress={() => openScreen('/more/account/policies')} />
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
