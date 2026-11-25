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

async function nativeUpdater(): Promise<StartupUpdater | null> {
  if (__DEV__ || Platform.OS === 'web' || !requireOptionalNativeModule('ExpoUpdates')) return null;
  const native = await import('expo-updates');
  if (!native.isEnabled) return null;
  return {
    async check() {
      const pending = native.latestContext;
      if (pending?.isUpdatePending) {
        return { cached: true, notes: pending.rollback ? '' : updateMessage(pending.downloadedManifest) };
      }
      const result = await native.checkForUpdateAsync();
      if (!result.isAvailable && !result.isRollBackToEmbedded) return null;
      return { cached: false, notes: result.isRollBackToEmbedded ? '' : updateMessage(result.manifest) };
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
  const [update, setUpdate] = useState<UpdateSplashState | null>({ phase: 'checking' });
  const controller = useRef<ReturnType<typeof createStartupUpdates> | null>(null);
  useEffect(() => {
    const lifecycle = createStartupUpdates(nativeUpdater, setUpdate);
    controller.current = lifecycle;
    if (AppState.currentState !== 'background') void lifecycle.enter();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'background') lifecycle.background();
      if (state === 'active') void lifecycle.enter();
    });
    return () => { sub.remove(); lifecycle.dispose(); controller.current = null; };
  }, []);
  const retry = useCallback(() => { void controller.current?.enter(true); }, []);
  const skip = useCallback(() => controller.current?.skip(), []);
  return { update, retry, skip };
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
      if (!mounted || AppState.currentState !== 'active') { last.current = 0; return; }
      if (!update || shown.current === update.key) return;
      shown.current = update.key;
      Alert.alert('앱 업데이트가 있어요', '스토어에서 최신 버전을 받아 주세요.', [
        { text: '나중에', style: 'cancel' },
        { text: '스토어 열기', onPress: () => { void Linking.openURL(update.url).catch(() => { shown.current = ''; }); } },
      ]);
    }
    void check();
    const sub = AppState.addEventListener('change', (state) => { if (state === 'active') void check(); });
    const timer = setInterval(() => void check(), 15 * 60_000);
    return () => { mounted = false; sub.remove(); clearInterval(timer); };
  }, [enabled]);
}
