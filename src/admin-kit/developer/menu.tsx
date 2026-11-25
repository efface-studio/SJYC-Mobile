import { Image, StyleSheet, View } from 'react-native';
import type { Href } from 'expo-router';
import { developerSections, type DevSection } from '@/domain/developer-console';
import { useCan } from '~/admin-kit/components';
import { openScreen } from '~/shared/navigation';
import { Icon } from '~/shared/icon';
import { Tap, Txt, useTheme } from '~/ds';

const entries = [
  [
    '사용자 관리',
    '회원 정보·동아리·프로그램 관리',
    require('../../../assets/developer/users.png'),
    '/more/members',
  ],
  [
    developerSections.permissions,
    '역할별 메뉴 권한',
    require('../../../assets/developer/permissions.png'),
    'permissions',
  ],
  [developerSections.logs, '감사 로그·서버 로그', require('../../../assets/developer/logs.png'), 'logs'],
  [
    developerSections.security,
    '세션·로그인 보안',
    require('../../../assets/developer/security.png'),
    'security',
  ],
  [
    developerSections.operations,
    '점검 모드·운영 설정',
    require('../../../assets/developer/operations.png'),
    'operations',
  ],
  [developerSections.system, '서버 상태·사용량', require('../../../assets/developer/system.png'), 'system'],
  [
    '앱 업데이트',
    '유저·관리자 앱 배포 및 적용 현황',
    require('../../../assets/developer/updates.png'),
    '/more/app-updates',
  ],
  [
    '기기 진단',
    '이 기기의 환경·API 요청·캐시',
    require('../../../assets/developer/diagnostics.png'),
    '/more/dev-diagnostics',
  ],
] as const;

export function devHref(section: DevSection, entry = 'overview', search?: string): Href {
  return {
    pathname: '/more/dev/[section]/[entry]',
    params: { section, entry: entry.replace('/', '~'), ...(search ? { search } : {}) },
  };
}
export function DeveloperMenu() {
  const t = useTheme();
  const diagnostics = useCan()('developer.access');
  return (
    <View style={{ paddingTop: 24 }}>
      <Txt
        variant="label"
        color="textSecondary"
        accessibilityRole="header"
        style={{ paddingHorizontal: 16, paddingBottom: 6 }}
      >
        개발자
      </Txt>
      {entries.filter(([, , , dest]) => diagnostics || dest !== '/more/dev-diagnostics').map(([label, detail, icon, dest], i) => (
        <View key={label}>
          {i > 0 && (
            <View style={{ marginLeft: 48, height: StyleSheet.hairlineWidth, backgroundColor: t.line }} />
          )}
          <Tap
            accessibilityLabel={label}
            onPress={() =>
              openScreen(dest in developerSections ? devHref(dest as DevSection) : (dest as Href))
            }
            style={styles.row}
          >
            <View style={styles.icon}>
              <Image source={icon} style={{ width: 18, height: 18, tintColor: t.textSecondary }} />
            </View>
            <View style={styles.copy}>
              <Txt variant="body" style={styles.title}>
                {label}
              </Txt>
              <Txt variant="caption" color="textSecondary" style={styles.detail}>
                {detail}
              </Txt>
            </View>
            <Icon ios="chevron.right" android="chevron_right" size={14} color={t.lineStrong} />
          </Tap>
        </View>
      ))}
    </View>
  );
}
const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  icon: { width: 20, alignItems: 'center' },
  copy: { flex: 1, gap: 2 },
  title: { fontSize: 15, lineHeight: 20, letterSpacing: -0.3 },
  detail: { fontSize: 13, lineHeight: 18, letterSpacing: -0.26 },
});
