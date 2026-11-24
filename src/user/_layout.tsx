import { useCallback, useState } from "react";
import { Stack } from "expo-router";
import { useStartupCameraPermission } from "~/user-kit/startup-camera";
import { AppProviders } from "~/shared/providers";
import { useHeaderOptions } from "~/user-kit";

/** 사용자 앱 루트 — 탭 위에 상세·폼 화면을 쌓는다. 로그인·작성 폼은 OS 기본 모달 시트로 연다. */
export default function UserRootLayout() {
  const [ready, setReady] = useState(false);
  const onReady = useCallback(() => setReady(true), []);
  useStartupCameraPermission(ready);
  const header = useHeaderOptions();
  return (
    <AppProviders onReady={onReady}>
      <Stack
        screenOptions={{ ...header, headerBackButtonDisplayMode: "minimal" }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="login"
          options={{ presentation: "modal", title: "로그인" }}
        />
        <Stack.Screen
          name="signup"
          options={{ presentation: "modal", title: "회원가입" }}
        />
        <Stack.Screen name="programs/[id]" options={{ title: "프로그램" }} />
        <Stack.Screen
          name="programs/calendar"
          options={{ title: "프로그램 캘린더" }}
        />
        <Stack.Screen name="my/notification-settings" options={{ title: "알림 설정" }} />
        <Stack.Screen name="notifications" options={{ title: "알림" }} />
        <Stack.Screen name="gallery" options={{ title: "센터 소식" }} />
        <Stack.Screen
          name="programs/apply/[id]"
          options={{ presentation: "modal", title: "프로그램 신청" }}
        />
        <Stack.Screen name="spaces/[id]" options={{ title: "공간 예약" }} />
        <Stack.Screen name="clubs/[id]" options={{ title: "동아리" }} />
        <Stack.Screen name="notices/index" options={{ title: "공지사항" }} />
        <Stack.Screen name="notices/[id]" options={{ title: "공지" }} />
        <Stack.Screen name="qna/index" options={{ title: "질문·문의" }} />
        <Stack.Screen
          name="qna/new"
          options={{ presentation: "modal", title: "문의하기" }}
        />
        <Stack.Screen name="qna/[id]" options={{ title: "1:1 문의" }} />
        <Stack.Screen name="about" options={{ title: "센터 안내" }} />
        <Stack.Screen name="policies/[key]" options={{ title: "정책 문서" }} />
        <Stack.Screen
          name="my/applications/[id]"
          options={{ title: "신청 내역" }}
        />
        <Stack.Screen name="my/profile" options={{ title: "내 정보" }} />
        <Stack.Screen
          name="my/check-in"
          options={{ presentation: "modal", title: "출석 체크" }}
        />
        <Stack.Screen name="my/attendance" options={{ title: "출석" }} />
        <Stack.Screen name="my/withdraw" options={{ title: "회원 탈퇴" }} />
        <Stack.Screen name="verify-email" options={{ title: "이메일 인증" }} />
        <Stack.Screen
          name="password/reset"
          options={{ title: "비밀번호 재설정" }}
        />
        <Stack.Screen
          name="dev-tools"
          options={{ presentation: "modal", title: "개발 도구" }}
        />
      </Stack>
    </AppProviders>
  );
}
