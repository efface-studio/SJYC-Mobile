import { useStartupUpdates, useStoreUpdate } from './app-updates';
import { useAppColorScheme } from '~/shared/appearance';
import { restoreAppearance } from './appearance';
import { LoginSessionGate } from './login-preferences';
import {
  focusManager,
  MutationCache,
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { DarkTheme, DefaultTheme, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { AppState, Modal, Platform, View } from "react-native";
import { BrandSplash } from "./brand-splash";
import { ApiError } from "@/api/errors";
import { SESSION_KEY } from "@/features/auth/session";
import { OptionSheetHost, useAppFonts, useTheme } from "~/ds";

function shouldRetry(count: number, error: unknown): boolean {
  if (
    error instanceof ApiError &&
    error.code !== "NETWORK" &&
    error.code !== "SERVER"
  )
    return false;
  return count < 2;
}

/** 웹과 같은 규칙: 어떤 요청이든 401 이면 세션을 다시 확인해 재인증으로 안내 */
export function AppProviders({
  children,
  onReady,
}: {
  children: ReactNode;
  onReady?: () => void;
}) {
  const [appearanceReady, setAppearanceReady] = useState(false);
  useEffect(() => {
    restoreAppearance();
    setAppearanceReady(true);
  }, []);
  const [launching, setLaunching] = useState(true);
  const finish = useCallback(() => {
    setLaunching(false);
    onReady?.();
  }, [onReady]);
  const { update, retry, skip, splash } = useStartupUpdates();
  const resumingUpdate = !launching && update !== null && update.phase !== 'checking';
  useStoreUpdate(!launching && !update);
  const scheme = useAppColorScheme();
  const t = useTheme();
  const fontsReady = useAppFonts();
  const [client] = useState(() => {
    const onError = (error: unknown) => {
      if (error instanceof ApiError && error.code === "UNAUTHENTICATED") {
        void qc.invalidateQueries({ queryKey: SESSION_KEY });
      }
    };
    const qc: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: {
        queries: { retry: shouldRetry, staleTime: 30_000 },
        mutations: { retry: false },
      },
    });
    return qc;
  });
  useEffect(() => {
    if (Platform.OS === "web") return;
    if (AppState.currentState != null)
      focusManager.setFocused(AppState.currentState === "active");
    const subscription = AppState.addEventListener("change", (state) =>
      focusManager.setFocused(state === "active"),
    );
    return () => {
      subscription.remove();
      focusManager.setFocused(undefined);
    };
  }, []);
  const base = scheme === "dark" ? DarkTheme : DefaultTheme;
  // 폰트가 준비될 때까지 스플래시를 유지한다 (실패 시 시스템 폰트로 진행)
  if (!fontsReady || !appearanceReady) return null;

  return (
    <QueryClientProvider client={client}>
      <ThemeProvider
        value={{
          ...base,
          colors: {
            ...base.colors,
            primary: t.action,
            background: t.bg,
            card: t.bg,
            text: t.text,
            border: t.line,
          },
        }}
      >
        <StatusBar style={scheme === "dark" ? "light" : "dark"} />
        <View style={{ flex: 1 }}>
          <View
            style={{ flex: 1 }}
            accessibilityElementsHidden={launching || resumingUpdate}
            importantForAccessibility={
              launching || resumingUpdate ? "no-hide-descendants" : "auto"
            }
          >
            <LoginSessionGate>{children}</LoginSessionGate>
          </View>
          {launching && <BrandSplash splash={splash} onFinish={finish} update={update} retry={retry} skip={skip} />}
          {resumingUpdate && (
            <Modal visible animationType="none" presentationStyle="fullScreen" onRequestClose={() => {}}>
              <BrandSplash splash={splash} update={update} retry={retry} skip={skip} />
            </Modal>
          )}
        </View>
        <OptionSheetHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
