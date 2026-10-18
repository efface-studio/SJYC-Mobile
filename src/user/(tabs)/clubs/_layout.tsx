import { Stack } from 'expo-router';
import { useHeaderOptions } from '~/user-kit';

/** 탭 루트 — iOS 큰 제목 */
export default function ClubsStack() {
  const header = useHeaderOptions(true);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: '동아리' }} />
    </Stack>
  );
}
