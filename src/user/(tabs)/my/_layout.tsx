import { Stack } from 'expo-router';
import { BellButton, useHeaderOptions } from '~/user-kit';

/** 탭 루트 — iOS 큰 제목 */
export default function MyStack() {
  const header = useHeaderOptions(true);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: 'MY', headerRight: () => <BellButton /> }} />
    </Stack>
  );
}
