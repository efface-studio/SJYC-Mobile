import { Stack } from 'expo-router';
import AccountScreen from '~/user/my/devices';

export default function AccountSettings() {
  return (
    <>
      <Stack.Screen options={{ title: '로그인 기기' }} />
      <AccountScreen />
    </>
  );
}
