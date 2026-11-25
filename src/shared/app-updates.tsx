import { useEffect } from 'react';
import { Alert, AppState, Linking } from 'react-native';
import { requireOptionalNativeModule } from 'expo';
import { storeUpdate } from './store-update';

type NativeUpdates = typeof import('expo-updates');
const EVERY_MINUTE = 60_000;
const STORE_INTERVAL = 15 * EVERY_MINUTE;

/** 두 앱의 네이티브 진입점에서 한 번만 마운트한다. 로그인 화면에서도 업데이트할 수 있다. */
export function AppUpdates() {
  useEffect(() => {
    let mounted = true,
      checking = false,
      lastStore = 0,
      showing = false,
      storeKey = '',
      storeUrl = '';
    let updates: NativeUpdates | undefined;
    function showStore(url: string, key: string) {
      if (!mounted || showing || storeKey === key || AppState.currentState !== 'active') return;
      showing = true;
      storeKey = key;
      Alert.alert(
        '앱 업데이트가 있어요',
        '스토어에서 최신 버전을 받아 주세요.',
        [
          {
            text: '나중에',
            style: 'cancel',
            onPress: () => {
              showing = false;
              storeUrl = '';
            },
          },
          {
            text: '스토어 열기',
            onPress: () => {
              showing = false;
              void Linking.openURL(url).catch(() => {
                storeKey = '';
              });
            },
          },
        ],
        { cancelable: false },
      );
    }
    function offerUpdate(native: NativeUpdates, info: string) {
      if (!mounted || showing || AppState.currentState !== 'active') return;
      showing = true;
      const apply = async () => {
        try {
          const downloaded = await native.fetchUpdateAsync();
          if (!mounted) return;
          if (
            !downloaded.isNew &&
            !downloaded.isRollBackToEmbedded &&
            !native.latestContext?.isUpdatePending
          ) {
            showing = false;
            return;
          }
          await native.reloadAsync();
        } catch {
          if (mounted)
            Alert.alert(
              '업데이트를 마치지 못했어요',
              '네트워크를 확인하고 다시 시도해 주세요.',
              [{ text: '다시 시도', onPress: () => void apply() }],
              { cancelable: false },
            );
        }
      };
      Alert.alert(
        '앱 업데이트가 있어요',
        info || '최신 버전을 받은 뒤 앱을 다시 시작합니다.',
        [{ text: '업데이트', onPress: () => void apply() }],
        { cancelable: false },
      );
    }
    async function check(forceStore = false) {
      if (!mounted || checking || showing || AppState.currentState !== 'active') return;
      checking = true;
      try {
        if (forceStore || Date.now() - lastStore > STORE_INTERVAL) {
          lastStore = Date.now();
          const update = await storeUpdate().catch(() => null);
          storeUrl = update?.url ?? '';
          if (update && update.key !== storeKey) {
            showStore(update.url, update.key);
            return;
          }
          storeUrl = '';
        }
        if (!mounted || storeUrl || __DEV__ || !requireOptionalNativeModule('ExpoUpdates')) return;
        updates ??= await import('expo-updates');
        if (!updates.isEnabled) return;
        if (updates.latestContext?.isUpdatePending) {
          offerUpdate(updates, '새 버전이 준비되었습니다. 적용하면 앱이 다시 시작됩니다.');
          return;
        }
        const result = await updates.checkForUpdateAsync();
        if (result.isAvailable || result.isRollBackToEmbedded) {
          const extra = result.isAvailable && 'extra' in result.manifest ? result.manifest.extra : undefined;
          offerUpdate(
            updates,
            extra && 'message' in extra && typeof extra.message === 'string' ? extra.message : '',
          );
        }
      } catch {
        /* 연결이 복구되면 다음 활성화 또는 정기 확인에서 다시 시도한다. */
      } finally {
        checking = false;
      }
    }
    void check(true);
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void check();
    });
    const interval = setInterval(() => void check(), EVERY_MINUTE);
    return () => {
      mounted = false;
      sub.remove();
      clearInterval(interval);
    };
  }, []);
  return null;
}
