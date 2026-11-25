import { useCallback, useEffect, useRef, useState } from 'react';
import { Stack } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import { useDeviceSession } from '~/shared/use-device-session';
import { SESSION_KEY } from '@/features/auth/session';
import { useLoginPermissions } from '~/shared/login-permissions';
import { AppProviders } from '~/shared/providers';
import { useHeaderOptions } from '~/user-kit';
import { Screen, EmptyState, LoadingState, Button } from '~/ds';

export default function UserRootLayout() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);

  return (
    <AppProviders onReady={onReady}>
      <UserNavigator ready={ready}/>
    </AppProviders>
  );
}

function UserNavigator({ready}:{ready:boolean}) {
  const header = useHeaderOptions();
  const {session, access} = useDeviceSession();
  const cache = useQueryClient();
  const userId = session.data?.user.id;
  useLoginPermissions(ready && access === 'signed-in',true);
  const previousUser = useRef(userId);
  useEffect(() => {
    if (previousUser.current && previousUser.current !== userId) {
      cache.removeQueries({ predicate: (query) => query.queryKey[0] !== SESSION_KEY[0] });
      cache.getMutationCache().clear();
    }
    previousUser.current = userId;
  }, [cache, userId]);
  if (access === 'checking')
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (access === 'error')
    return (
      <Screen>
        <EmptyState
          title="로그인 상태를 확인할 수 없어요"
          description="인터넷 연결을 확인하고 다시 시도해 주세요."
          action={<Button label="다시 시도" onPress={() => void session.refetch()} />}
        />
      </Screen>
    );
  const signedIn = access === 'signed-in';
  return (
    <Stack screenOptions={{ ...header, headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="programs/[id]" options={{ title: '프로그램' }} />
        <Stack.Screen name="programs/calendar" options={{ title: '프로그램 캘린더' }} />
        <Stack.Screen name="my/settings" options={{ title: '설정' }} />
        <Stack.Screen name="my/social-accounts" options={{ title: '연결된 소셜 계정' }} />
        <Stack.Screen name="my/devices" options={{ title: '로그인 기기' }} />
        <Stack.Screen name="my/notification-settings" options={{ title: '알림 설정' }} />
        <Stack.Screen name="notifications" options={{ title: '알림' }} />
        <Stack.Screen name="gallery" options={{ title: '센터 소식' }} />
        <Stack.Screen
          name="programs/apply/[id]"
          options={{ presentation: 'modal', title: '프로그램 신청' }}
        />
        <Stack.Screen name="spaces/[id]" options={{ title: '공간 예약' }} />
        <Stack.Screen name="clubs/[id]" options={{ title: '동아리' }} />
        <Stack.Screen name="notices/index" options={{ title: '공지사항' }} />
        <Stack.Screen name="notices/[id]" options={{ title: '공지' }} />
        <Stack.Screen name="qna/index" options={{ title: '질문·문의' }} />
        <Stack.Screen name="qna/new" options={{ presentation: 'modal', title: '문의하기' }} />
        <Stack.Screen name="qna/[id]" options={{ title: '1:1 문의' }} />
        <Stack.Screen name="about" options={{ title: '센터 안내' }} />
        <Stack.Screen name="my/applications/[id]" options={{ title: '신청 내역' }} />
        <Stack.Screen name="my/profile" options={{ title: '내 정보' }} />
        <Stack.Screen name="my/check-in" options={{ presentation: 'modal', title: '출석 체크' }} />
        <Stack.Screen name="my/attendance" options={{ title: '출석' }} />
        <Stack.Screen name="my/withdraw" options={{ title: '회원 탈퇴' }} />
        <Stack.Screen name="dev-tools" options={{ presentation: 'modal', title: '개발 도구' }} />
      </Stack.Protected>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen
          name="login"
          options={{ title: '로그인', headerShown: false, headerBackVisible: false, gestureEnabled: false }}
        />
        <Stack.Screen name="signup" options={{ presentation: 'modal', title: '회원가입' }} />
        <Stack.Screen name="verify-email" options={{ title: '휴대전화 인증' }} />
        <Stack.Screen name="verify-phone" options={{ title: '휴대전화 인증' }} />
        <Stack.Screen name="oauth-profile" options={{ title: '회원 정보 확인' }} />
      </Stack.Protected>
      <Stack.Screen name="oauth-return" options={{ title: '소셜 계정 인증' }} />
      <Stack.Screen name="policies/[key]" options={{ title: '정책 문서' }} />
      <Stack.Screen name="password/reset" options={{ title: '비밀번호 재설정' }} />
    </Stack>
  );
}
