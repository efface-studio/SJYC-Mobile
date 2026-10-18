import { useQuery } from '@tanstack/react-query';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { dashboardQuery } from '~/admin-kit/queries';
import { useColors } from '~/shared/theme';

/**
 * 하단 탭 — 네이티브 탭 바 (iOS 26 Liquid Glass / Android Material 3 내비게이션 바).
 * 신청 탭 배지 = 승인 대기 신청 수 (대시보드 7일 쿼리와 캐시를 공유한다)
 */
export default function TabsLayout() {
  const c = useColors();
  const dashboard = useQuery({ ...dashboardQuery(7), refetchInterval: 60_000 });
  const pending = dashboard.data?.applicationsSubmitted ?? 0;

  return (
    <NativeTabs tintColor={c.tint} labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="dashboard">
        <NativeTabs.Trigger.Label>대시보드</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'chart.bar', selected: 'chart.bar.fill' }} md="dashboard" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="applications">
        <NativeTabs.Trigger.Label>신청</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'checkmark.circle', selected: 'checkmark.circle.fill' }}
          md="fact_check"
        />
        {pending > 0 && (
          <NativeTabs.Trigger.Badge>{pending > 99 ? '99+' : String(pending)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="reservations">
        <NativeTabs.Trigger.Label>공간 예약</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="calendar" md="event" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="inquiries">
        <NativeTabs.Trigger.Label>문의</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{
            default: 'bubble.left.and.text.bubble.right',
            selected: 'bubble.left.and.text.bubble.right.fill',
          }}
          md="forum"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="more">
        <NativeTabs.Trigger.Label>더보기</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'ellipsis.circle', selected: 'ellipsis.circle.fill' }}
          md="more_horiz"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
