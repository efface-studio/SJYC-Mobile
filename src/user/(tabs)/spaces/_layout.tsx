import { Stack } from 'expo-router';
import { useHeaderOptions } from '~/user-kit';

/** 탭 루트 — iOS 큰 제목 */
export default function SpacesStack() {
  const header = useHeaderOptions(true);
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: '공간 예약' }} />
    </Stack>
  );
}
