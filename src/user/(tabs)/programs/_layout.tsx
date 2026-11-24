import { Stack } from 'expo-router';
import { useHeaderOptions } from '~/user-kit';

/** 탭 루트 — 기본 높이의 제목 */
export default function ProgramsStack() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen name="index" options={{ title: '프로그램' }} />
    </Stack>
  );
}
