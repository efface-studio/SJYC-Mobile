import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useColors } from '~/shared/theme';

/**
 * 하단 탭 — 네이티브 탭 바.
 * iOS 26 이상에서는 시스템 Liquid Glass 탭 바, Android 는 Material 3 Navigation bar 로 그려진다.
 * 웹 하단 탭과 같은 순서: 홈 · 프로그램 · 공간 예약 · 동아리 · MY
 */
export default function UserTabsLayout() {
  const c = useColors();
  return (
    <NativeTabs tintColor={c.tint} labelVisibilityMode="labeled">
      <NativeTabs.Trigger name="home">
        <NativeTabs.Trigger.Label>홈</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'house', selected: 'house.fill' }} md="home" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="programs">
        <NativeTabs.Trigger.Label>프로그램</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'calendar', selected: 'calendar' }} md="event" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="spaces">
        <NativeTabs.Trigger.Label>공간 예약</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'door.left.hand.open', selected: 'door.left.hand.open' }}
          md="meeting_room"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="clubs">
        <NativeTabs.Trigger.Label>동아리</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person.3', selected: 'person.3.fill' }} md="groups" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="my">
        <NativeTabs.Trigger.Label>MY</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon
          sf={{ default: 'person.crop.circle', selected: 'person.crop.circle.fill' }}
          md="account_circle"
        />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
