import { Stack } from 'expo-router';
import AccountScreen from '~/user/my/notification-settings';

export default function AccountSettings() {
  return (
    <>
      <Stack.Screen options={{ title: '알림 설정' }} />
      <AccountScreen />
    </>
  );
}
