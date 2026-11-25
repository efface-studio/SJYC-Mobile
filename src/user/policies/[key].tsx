import { Image, View } from 'react-native';
import { Icon } from '~/shared/icon';
import { useQuery } from '@tanstack/react-query';
import { useSession } from '@/features/auth/session';
import { Redirect, Stack, useLocalSearchParams } from 'expo-router';
import { api } from '@/api';
import { OSS_MOBILE } from '@/config/oss-licenses';
import { POLICY_TITLE } from '@/domain/labels';
import type { PolicyKey } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { Divider, EmptyState, Gutter, ListRow, Screen, Txt, space, useTheme } from '~/ds';
import { Article, Callout, Hero, QueryScreen, Rows, isExternal, openExternal } from '~/user-kit';

const isPolicyKey = (v: string): v is PolicyKey => v in POLICY_TITLE;

const marks: Record<string, number> = {
  '@tanstack/react-query': require('../../../assets/oss/tanstack.png'),
  react: require('../../../assets/oss/react.png'),
  'react-native': require('../../../assets/oss/react.png'),
  'react-dom': require('../../../assets/oss/react.png'),
  zod: require('../../../assets/oss/zod.png'),
  jsbarcode: require('../../../assets/oss/jsbarcode.png'),
  pretendard: require('../../../assets/oss/pretendard.png'),
};

function PackageMark({ name }: { name: string }) {
  const expo = name === 'expo' || name.startsWith('expo-') || name.startsWith('@expo/');
  const source = expo ? require('../../../assets/oss/expo.png') : marks[name];
  const theme = useTheme();
  return (
    <View
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={{
        width: 34,
        height: 34,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 7,
        backgroundColor: source ? '#fff' : theme.bgSubtle,
      }}
    >
      {source ? (
        <Image source={source} resizeMode="contain" style={{ width: 25, height: 25 }} />
      ) : (
        <Icon ios="shippingbox" android="inventory_2" size={20} color={theme.textSecondary} />
      )}
    </View>
  );
}

function OpenSource() {
  return (
    <>
      <Stack.Screen options={{ title: '오픈소스 라이선스' }} />
      <Screen>
        <Hero title="오픈소스 라이선스">
          <Txt variant="caption" color="textTertiary">
            이 앱이 직접 사용하는 오픈소스 패키지 {OSS_MOBILE.length}개
          </Txt>
        </Hero>
        <Divider inset={20} />
        <Rows>
          {OSS_MOBILE.map((p) => (
            <ListRow
              key={p.name}
              title={p.name}
              leading={<PackageMark name={p.name} />}
              subtitle={`${p.version} · ${p.license}`}
              numberOfLines={1}
              onPress={isExternal(p.url) ? () => openExternal(p.url) : undefined}
            />
          ))}
        </Rows>
      </Screen>
    </>
  );
}

export default function PolicyScreen() {
  const { key } = useLocalSearchParams<{ key: string }>();
  const session=useSession();
  const allowed=!!session.data || key==="terms" || key==="privacy";
  const valid = isPolicyKey(key);
  const doc = useQuery({
    queryKey: ['policy', key],
    queryFn: () => api.policies.get(key as PolicyKey),
    enabled: valid && allowed,
  });

  if (!allowed) return <Redirect href="/login"/>;
  if (key === 'opensource') return <OpenSource />;
  if (!valid) {
    return (
      <Screen>
        <EmptyState title="문서를 찾을 수 없습니다" description="주소가 올바른지 확인해 주세요." />
      </Screen>
    );
  }
  return (
    <QueryScreen query={doc}>
      {(d) => (
        <>
          <Stack.Screen options={{ title: d.title }} />
          <Screen>
            <Hero title={d.title}>
              {d.effectiveAt ? (
                <Txt variant="caption" color="textTertiary">
                  시행일 {formatDate(d.effectiveAt)}
                </Txt>
              ) : null}
            </Hero>
            {!d.confirmed && (
              <Gutter style={{ paddingBottom: space.lg }}>
                <Callout tone="warning" title="센터 확정본 미등록">
                  아래 내용은 임시 안내입니다. 확정 문서가 등록되면 이 화면에 표시됩니다.
                </Callout>
              </Gutter>
            )}
            <Divider inset={20} />
            <Gutter style={{ paddingTop: space.xxl }}>
              <Article>{d.body}</Article>
            </Gutter>
          </Screen>
        </>
      )}
    </QueryScreen>
  );
}
