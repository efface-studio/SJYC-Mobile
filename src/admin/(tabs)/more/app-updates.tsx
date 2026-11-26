import { PublicationOptions, WaveManager } from '~/admin-kit/app-updates/distribution';
import type { AppUpdate as OtaUpdateDto } from '@/domain/app-update';
import { useMutation, useQuery } from '@tanstack/react-query';
import { requireOptionalNativeModule } from 'expo';
import { Stack } from 'expo-router';
import { useState } from 'react';
import { Alert, ActionSheetIOS, Platform, StyleSheet, View } from 'react-native';
import { NoPermission, useCan } from '~/admin-kit/components';
import { AdminRow, RowSection } from '~/admin-kit/app-updates/row';
import { Segmented } from '~/admin-kit/app-updates/segmented';
import { QueryBoundary, Screen, Txt, useTheme, pickOption } from '~/ds';
import { formatDateTime as dt } from '@/lib/format';
import { api, errorMessage } from '@/api';

type OtaPlatform = OtaUpdateDto['platform'];
type StatusTone = 'textSecondary' | 'action' | 'warning';
type Option = { label: string; onPress: () => void; destructive?: boolean };
function actionSheet(title: string, options: Option[]) {
  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        title,
        options: [...options.map((o) => o.label), '취소'],
        cancelButtonIndex: options.length,
        destructiveButtonIndex: options.flatMap((o, i) => (o.destructive ? [i] : [])),
      },
      (i) => options[i]?.onPress(),
    );
    return;
  }
  void pickOption(
    title,
    options.map((o) => o.label),
  ).then((i) => {
    if (i !== null) options[i]?.onPress();
  });
}
const PLATFORMS: { value: OtaPlatform; label: string }[] = [
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
];
const ROLLOUTS = [10, 25, 50, 100];
const short = (v: string | null | undefined) => (v ? `${v.slice(0, 8)}…` : '-');

function status(u: OtaUpdateDto, live: boolean): { label: string; tone: StatusTone } | undefined {
  if (u.status === 'ROLLED_BACK') return { label: '되돌림', tone: 'textSecondary' };
  if (u.kind === 'ROLLBACK') return { label: '내장 버전', tone: 'warning' };

  if (live) return { label: '배포 중', tone: 'action' };
  return undefined;
}

export default function UpdatesScreen() {
  const t = useTheme();
  const can = useCan(),
    allowed = can('site.manage'),
    developer = can('developer.access');
  const [selected, select] = useState('');
  const [platform, setPlatform] = useState<OtaPlatform>(Platform.OS === 'android' ? 'android' : 'ios');
  const list = useQuery({
    queryKey: ['admin', 'app-updates'],
    queryFn: api.admin.appUpdates,
    enabled: allowed,
    refetchInterval: 30_000,
  });
  const change = useMutation({
    mutationFn: ({ id, input }: { id: string; input: Parameters<typeof api.admin.changeAppUpdate>[1] }) =>
      api.admin.changeAppUpdate(id, input),
    onSuccess: async (_, v) => {
      await list.refetch();
      Alert.alert(
        v.input.action === 'rollout' ? '배포 비율을 바꿨어요' : '되돌렸어요. 앱을 다음에 열 때 적용돼요.',
      );
    },
    onError: (err) => {
      Alert.alert('배포 설정을 변경하지 못했어요', errorMessage(err));
      void list.refetch();
    },
  });
  if (!allowed) return <NoPermission />;
  const Updates = requireOptionalNativeModule('ExpoUpdates')
    ? (require('expo-updates') as typeof import('expo-updates'))
    : undefined;
  const confirm = (title: string, message: string, onOk: () => void) =>
    Alert.alert(title, message, [
      { text: '취소', style: 'cancel' },
      { text: '되돌리기', style: 'destructive', onPress: onOk },
    ]);

  const open = (u: OtaUpdateDto) =>
    actionSheet(u.message || '업데이트', [
      ...ROLLOUTS.filter((p) => p !== u.rolloutPercent).map((p) => ({
        label: `${p}% 기기에 배포`,
        onPress: () => change.mutate({ id: u.id, input: { action: 'rollout', percent: p } }),
      })),
      {
        label: '이전 업데이트로 되돌리기',
        destructive: true,
        onPress: () =>
          confirm(
            '이전 업데이트로 되돌릴까요?',
            '가장 최근 업데이트를 내리고 바로 전 업데이트를 다시 배포해요.',
            () => change.mutate({ id: u.id, input: { action: 'rollback', target: 'previous' } }),
          ),
      },
      {
        label: '스토어 버전으로 되돌리기',
        destructive: true,
        onPress: () =>
          confirm('스토어 버전으로 되돌릴까요?', '이 런타임의 모든 기기가 앱에 내장된 번들로 돌아가요.', () =>
            change.mutate({ id: u.id, input: { action: 'rollback', target: 'embedded' } }),
          ),
      },
    ]);

  const segment = (
    <View style={styles.segment}>
      <Segmented label="플랫폼" value={platform} onChange={setPlatform} options={PLATFORMS} />
    </View>
  );

  return (
    <Screen onRefresh={list.refetch}>
      <Stack.Screen options={{ title: '앱 업데이트' }} />
      <View style={styles.body}>
        {segment}
        <PublicationOptions editable={developer} />
        <RowSection title="이 기기" footer="같은 런타임(네이티브 코드가 같은 빌드)끼리만 업데이트를 받아요.">
          <AdminRow title="런타임" value={short(Updates?.runtimeVersion)} />
          <AdminRow
            title="실행 중인 번들"
            value={Updates?.isEmbeddedLaunch ? '스토어 버전' : short(Updates?.updateId)}
            meta={Updates?.createdAt ? dt(Updates.createdAt.toISOString()) : undefined}
          />
        </RowSection>
        <QueryBoundary
          query={list}
          isEmpty={(rows) => !rows.some((r) => r.platform === platform)}
          empty={{ title: '배포한 업데이트가 없어요.' }}
        >
          {(rows) => (
            <RowSection title="배포 기록">
              {rows
                .filter((u) => u.platform === platform)
                .map((u) => {
                  const s = status(u, u.live);
                  const actionable = u.live && u.kind === 'UPDATE';
                  return (
                    <View key={u.id}>
                      <AdminRow
                        title={
                          u.message || (u.kind === 'ROLLBACK' ? '스토어 버전으로 되돌림' : '(메모 없음)')
                        }
                        detail={`${u.flavor === 'admin' ? '관리자앱' : '유저앱'} · 런타임 ${short(u.runtime)} · ${u.channel} · 자산 ${u.assetCount}개`}
                        meta={dt(u.createdAt) + ' · 확인 ' + u.seen + '대 · 적용 ' + u.running + '대'}
                        value={
                          u.manual
                            ? u.waves?.length
                              ? '차수 보기'
                              : '발행 대기'
                            : u.kind === 'UPDATE'
                              ? `${u.rolloutPercent}%`
                              : undefined
                        }
                        status={
                          !u.manual &&
                          s && (
                            <Txt variant="label" color={s.tone === 'warning' ? t.tone.warning.fg : s.tone}>
                              {s.label}
                            </Txt>
                          )
                        }
                        dimmed={u.status === 'ROLLED_BACK'}
                        disabled={change.isPending}
                        reserveChevron
                        accessibilityLabel={[u.message, s?.label, `${u.rolloutPercent}%`, dt(u.createdAt)]
                          .filter(Boolean)
                          .join(', ')}
                        onPress={
                          u.manual
                            ? () => select(selected === u.id ? '' : u.id)
                            : actionable
                              ? () => open(u)
                              : undefined
                        }
                      />
                      {u.manual && selected === u.id && <WaveManager release={u} refresh={list.refetch} />}
                    </View>
                  );
                })}
            </RowSection>
          )}
        </QueryBoundary>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingBottom: 48 },
  segment: { paddingHorizontal: 16, paddingTop: 8 },
});
