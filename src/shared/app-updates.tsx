import { defaultSplash, type SplashOptions } from '@/domain/app-update';
import { API_BASE_URL } from '@/config/env';
import { readPreference, writePreference } from './device-preferences';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, AppState, Linking, Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import type { Manifest } from 'expo-updates';
import { createStartupUpdates, type StartupUpdater, type UpdateSplashState } from './ota-startup';
import { formatReleaseNotes } from './release-notes.mjs';
import { storeUpdate } from './store-update';

function updateMessage(manifest?: Manifest) {
  const extra = manifest && 'extra' in manifest ? manifest.extra : undefined;
  return extra && 'message' in extra && typeof extra.message === 'string'
    ? formatReleaseNotes([extra.message])
    : '';
}

function parseSplash(value: unknown): SplashOptions {
  const v = value as Partial<SplashOptions> | null;
  return v && typeof v.percent === 'boolean' && typeof v.bar === 'boolean' && typeof v.notes === 'boolean'
    ? { percent: v.percent, bar: v.bar, notes: v.notes }
    : defaultSplash;
}
function savedSplash() {
  try {
    return parseSplash(JSON.parse(readPreference('ota-splash') ?? 'null'));
  } catch {
    return defaultSplash;
  }
}
async function nativeUpdater(show: (s: SplashOptions) => void): Promise<StartupUpdater | null> {
  if (__DEV__ || Platform.OS === 'web' || !requireOptionalNativeModule('ExpoUpdates')) return null;
  const native = await import('expo-updates');
  if (!native.isEnabled) return null;
  return {
    async check() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      let ticket: string | null = null;
      try {
        const response = await fetch(API_BASE_URL + '/ota/context', {
          credentials: 'include',
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (response.ok) {
          const result = await response.json();
          if (result.success === true && result.data?.splash) {
            const options = parseSplash(result.data.splash);
            show(options);
            ticket = typeof result.data.ticket === 'string' ? result.data.ticket : null;
            try {
              writePreference('ota-splash', JSON.stringify(options));
            } catch {
              /* 저장 공간이 잠겨 있어도 진행한다. */
            }
          }
        }
      } catch {
        /* 이전 서버와 오프라인 설치에서는 공용 배포 경로를 사용한다. */
      } finally {
        clearTimeout(timeout);
      }
      await native.setExtraParamAsync('sjyc_audience', ticket);
      const result = await native.checkForUpdateAsync();
      if (!result.isAvailable && !result.isRollBackToEmbedded) return null;
      const pending = native.latestContext;
      const cached =
        !!pending?.isUpdatePending &&
        (result.isRollBackToEmbedded
          ? !!pending.rollback
          : !!result.manifest && pending.downloadedManifest?.id === result.manifest.id);
      return { cached, notes: result.isRollBackToEmbedded ? '' : updateMessage(result.manifest) };
    },
    async download() {
      const result = await native.fetchUpdateAsync();
      return result.isNew || result.isRollBackToEmbedded || !!native.latestContext?.isUpdatePending;
    },
    subscribeProgress(listener) {
      const sub = native.addUpdatesStateChangeListener(({ context }) => listener(context.downloadProgress));
      return () => sub.remove();
    },
    reload: native.reloadAsync,
  };
}

export function useStartupUpdates() {
  const [splash, setSplash] = useState(savedSplash);
  const [update, setUpdate] = useState<UpdateSplashState | null>({ phase: 'checking' });
  const controller = useRef<ReturnType<typeof createStartupUpdates> | null>(null);
  useEffect(() => {
    const lifecycle = createStartupUpdates(() => nativeUpdater(setSplash), setUpdate);
    controller.current = lifecycle;
    if (AppState.currentState !== 'background') void lifecycle.enter();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') lifecycle.background();
      if (state === 'active') void lifecycle.enter();
    });
    return () => {
      sub.remove();
      lifecycle.dispose();
      controller.current = null;
    };
  }, []);
  const retry = useCallback(() => {
    void controller.current?.enter(true);
  }, []);
  const skip = useCallback(() => controller.current?.skip(), []);
  return { update, retry, skip, splash };
}

// Native store updates need a separate OS install; offer them after the startup gate.
export function useStoreUpdate(enabled: boolean) {
  const last = useRef(0);
  const shown = useRef('');
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let mounted = true;
    async function check() {
      if (AppState.currentState !== 'active' || Date.now() - last.current < 15 * 60_000) return;
      last.current = Date.now();
      const update = await storeUpdate().catch(() => null);
      if (!mounted || AppState.currentState !== 'active') {
        last.current = 0;
        return;
      }
      if (!update || shown.current === update.key) return;
      shown.current = update.key;
      Alert.alert('앱 업데이트가 있어요', '스토어에서 최신 버전을 받아 주세요.', [
        { text: '나중에', style: 'cancel' },
        {
          text: '스토어 열기',
          onPress: () => {
            void Linking.openURL(update.url).catch(() => {
              shown.current = '';
            });
          },
        },
      ]);
    }
    void check();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    const timer = setInterval(() => void check(), 15 * 60_000);
    return () => {
      mounted = false;
      sub.remove();
      clearInterval(timer);
    };
  }, [enabled]);
}
