import { Stack } from 'expo-router';
import { developerSections } from '@/domain/developer-console';
import { useCan, NoPermission } from '~/admin-kit/components';
import { ListRow, Screen, SectionHeader, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { openScreen } from '~/shared/navigation';

const menus = [
  ['permissions', 'key', 'key', '기본 역할과 직원별 허용 기능'],
  ['logs', 'list.bullet.rectangle', 'receipt_long', '감사 이벤트와 서버 요청'],
  ['security', 'shield', 'shield', '로그인 기기와 강제 로그아웃'],
  ['operations', 'slider.horizontal.3', 'tune', '점검 모드와 기능별 접수 설정'],
  ['system', 'server.rack', 'dns', '서버 연결 상태와 센터 사용량'],
] as const;

export default function DeveloperTools() {
  const allowed = useCan()('developer.access');
  const t = useTheme();
  return (
    <>
      <Stack.Screen options={{ title: '개발자 도구' }} />
      {allowed ? (
        <Screen>
          <SectionHeader title="개발자" />
          {menus.map(([section, ios, android, detail]) => (
            <ListRow
              key={section}
              leading={<Icon ios={ios} android={android} size={21} color={t.tone.brand.fg} />}
              title={developerSections[section]}
              subtitle={detail}
              onPress={() =>
                openScreen({
                  pathname: '/more/dev/[section]/[entry]',
                  params: { section, entry: 'overview' },
                })
              }
            />
          ))}
          <SectionHeader title="진단" />
          <ListRow
            title="이 기기의 진단 도구"
            subtitle="환경 · API 요청 · 캐시"
            onPress={() => openScreen('/more/dev-diagnostics')}
          />
        </Screen>
      ) : (
        <NoPermission />
      )}
    </>
  );
}
