import { MutationCache, QueryCache, QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { ApiError } from '@/api/errors';
import { SESSION_KEY } from '@/features/auth/session';
import { OptionSheetHost, useAppFonts, useTheme } from '~/ds';

function shouldRetry(count: number, error: unknown): boolean {
  if (error instanceof ApiError && error.code !== 'NETWORK' && error.code !== 'SERVER') return false;
  return count < 2;
}

/** 웹과 같은 규칙: 어떤 요청이든 401 이면 세션을 다시 확인해 재인증으로 안내 */
export function AppProviders({ children }: { children: ReactNode }) {
  const scheme = useColorScheme();
  const t = useTheme();
  const fontsReady = useAppFonts();
  const [client] = useState(() => {
    const onError = (error: unknown) => {
      if (error instanceof ApiError && error.code === 'UNAUTHENTICATED') {
        void qc.invalidateQueries({ queryKey: SESSION_KEY });
      }
    };
    const qc: QueryClient = new QueryClient({
      queryCache: new QueryCache({ onError }),
      mutationCache: new MutationCache({ onError }),
      defaultOptions: { queries: { retry: shouldRetry, staleTime: 30_000 }, mutations: { retry: false } },
    });
    return qc;
  });
  const base = scheme === 'dark' ? DarkTheme : DefaultTheme;
  // 폰트가 준비될 때까지 스플래시를 유지한다 (실패 시 시스템 폰트로 진행)
  if (!fontsReady) return null;

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
        <StatusBar style="auto" />
        {children}
        <OptionSheetHost />
      </ThemeProvider>
    </QueryClientProvider>
  );
}
