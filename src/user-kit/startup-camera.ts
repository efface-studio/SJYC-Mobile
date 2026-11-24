import { Camera } from 'expo-camera';
import { useEffect } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';

/** QR 출석용 카메라 권한은 사용자 앱의 첫 활성 화면에서 OS에 요청한다. */
export function useStartupCameraPermission() {
  useEffect(() => {
    if (Platform.OS !== 'ios' && Platform.OS !== 'android') return;
    let mounted = true;
    let checking = false;
    let finished = false;

    async function onState(state: AppStateStatus | null) {
      if (state !== 'active' || checking || finished) return;
      checking = true;
      try {
        const permission = await Camera.getCameraPermissionsAsync();
        if (!mounted || AppState.currentState !== 'active') return;
        finished = true;
        if (permission.status === 'undetermined' && permission.canAskAgain) {
          await Camera.requestCameraPermissionsAsync();
        }
      } catch {
        // 카메라를 지원하지 않는 환경에서도 홈과 숫자 코드 출석은 열 수 있다.
      } finally {
        checking = false;
      }
    }

    const sub = AppState.addEventListener('change', onState);
    void onState(AppState.currentState);
    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}
