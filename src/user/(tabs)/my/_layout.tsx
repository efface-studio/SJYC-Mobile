import { Stack } from 'expo-router';
import { SettingsButton, useHeaderOptions } from '~/user-kit';

/** 탭 루트 — 기본 높이의 제목 */
export default function MyStack() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: 'MY', headerRight: () => <SettingsButton /> }} />
    </Stack>
  );
}
