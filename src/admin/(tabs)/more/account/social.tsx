import { Stack } from 'expo-router';
import AccountScreen from '~/user/my/social-accounts';

export default function AccountSettings() {
  return (
    <>
      <Stack.Screen options={{ title: '연결된 소셜 계정' }} />
      <AccountScreen />
    </>
  );
}
