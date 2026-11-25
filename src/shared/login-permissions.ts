import { requireOptionalNativeModule } from 'expo';
import { useEffect } from 'react';
import { AppState, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Camera } from 'expo-camera';

type Permission = { status: string; canAskAgain: boolean };
export function useLoginPermissions(enabled: boolean, camera: boolean) {
  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;
    let active = true,
      busy = false;
    let resume: (() => void) | undefined;
    async function foreground() {
      if (active && AppState.currentState !== 'active')
        await new Promise<void>((resolve) => {
          resume = resolve;
        });
      return active && AppState.currentState === 'active';
    }
    async function ask(read: () => Promise<Permission>, request: () => Promise<unknown>) {
      if (!(await foreground())) return;
      const permission = await read();
      if (permission.status === 'undetermined' && permission.canAskAgain && (await foreground()))
        await request();
    }
    async function check() {
      if (busy || !active || AppState.currentState !== 'active') return;
      busy = true;
      try {
        if (camera)
          await ask(Camera.getCameraPermissionsAsync, Camera.requestCameraPermissionsAsync).catch(() => {});
        if (requireOptionalNativeModule('ExpoLocation')) {
          const loc = await import('expo-location');
          await ask(loc.getForegroundPermissionsAsync, loc.requestForegroundPermissionsAsync).catch(() => {});
        }
        await ask(
          () => ImagePicker.getMediaLibraryPermissionsAsync(false),
          () => ImagePicker.requestMediaLibraryPermissionsAsync(false),
        ).catch(() => {});
      } finally {
        busy = false;
      }
    }
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') {
        resume?.();
        resume = undefined;
        void check();
      }
    });
    void check();
    return () => {
      active = false;
      resume?.();
      sub.remove();
    };
  }, [enabled, camera]);
}
