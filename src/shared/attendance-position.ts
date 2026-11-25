import { requireOptionalNativeModule } from 'expo';
import { ApiError } from '@/api/errors';
import { freshPosition, type AttendancePosition } from '@/domain/check-in-location';

export async function currentPosition(): Promise<AttendancePosition> {
  if (!requireOptionalNativeModule('ExpoLocation'))
    throw new ApiError(
      'VALIDATION',
      '위치 출석을 사용하려면 앱을 업데이트해 주세요. 숫자 코드는 바로 입력할 수 있습니다.',
    );
  const location = await import('expo-location');
  const permission = await location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new ApiError(
      'FORBIDDEN',
      'QR 출석에는 현재 위치가 필요합니다. 설정에서 위치를 허용하거나 숫자 코드를 입력해 주세요.',
    );
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const value = await Promise.race([
      location.getCurrentPositionAsync({ accuracy: location.Accuracy.High }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error()), 12000);
      }),
    ]);
    const point = {
      latitude: value.coords.latitude,
      longitude: value.coords.longitude,
      accuracy: value.coords.accuracy ?? Infinity,
      measuredAt: value.timestamp,
    };
    if (freshPosition(point)) return point;
  } catch {
    /* 제한 시간 또는 정확도 부족 시 수동 코드도 이용할 수 있다. */
  } finally {
    clearTimeout(timer);
  }
  throw new ApiError(
    'VALIDATION',
    '위치를 정확하게 확인하지 못했습니다. 잠시 후 다시 시도하거나 숫자 코드를 이용해 주세요.',
  );
}
