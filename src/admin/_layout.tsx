import { Stack } from 'expo-router';
import { View } from 'react-native';
import { errorMessage } from '@/api';
import { canEnterConsole } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import { Button, EmptyState, LoadingState, useTheme } from '~/ds';
import { AppProviders } from '~/shared/providers';

export default function RootLayout() {
  return (
    <AppProviders>
      <Gate />
    </AppProviders>
  );
}

/**
 * 관리자 화면은 서버 세션이 admin.access 권한을 갖거나 동아리 담당자로 지정되어 있을 때만 열린다
 * (담당자에게는 더보기의 동아리 운영·출석만 보인다).
 * 권한 판단의 근거는 항상 서버 응답(useSession)이며, 모든 API 는 서버가 다시 검증한다.
 */
function Gate() {
  const t = useTheme();
  const session = useSession();
  if (session.isPending) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}>
        <LoadingState />
      </View>
    );
  }
  // 이미 세션이 있는 상태에서 재확인이 실패하면 내비게이션 상태를 유지한다
  if (session.isError && session.data === undefined) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: t.bg }}>
        <EmptyState
          title="로그인 상태를 확인하지 못했습니다"
          description={errorMessage(session.error)}
          action={
            <Button label="다시 시도" variant="secondary" size="md" onPress={() => void session.refetch()} />
          }
        />
      </View>
    );
  }
  const allowed = canEnterConsole(session.data?.user);

  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal', headerShadowVisible: false }}>
      <Stack.Protected guard={allowed}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="applications/[id]" options={{ title: '신청 상세' }} />
        <Stack.Screen name="reservations/[id]" options={{ title: '예약 상세' }} />
        <Stack.Screen name="inquiries/[id]" options={{ title: '문의 상세' }} />
        <Stack.Screen name="attendance/[id]" options={{ title: '출석부' }} />
        <Stack.Screen name="decision/[kind]/[ids]" options={{ title: '반려 사유', presentation: 'modal' }} />
        <Stack.Screen name="notice-preview" options={{ title: '미리보기', presentation: 'modal' }} />
      </Stack.Protected>
      <Stack.Protected guard={!allowed}>
        <Stack.Screen name="login" options={{ headerShown: false }} />
      </Stack.Protected>
    </Stack>
  );
}
