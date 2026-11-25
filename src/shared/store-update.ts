import { requireOptionalNativeModule } from 'expo';
import { Platform } from 'react-native';

export function newerVersion(current: string, store: string) {
  const valid = /^\d+(?:\.\d+){0,3}$/;
  if (!valid.test(current) || !valid.test(store)) return false;
  const a = current.split('.').map(Number),
    b = store.split('.').map(Number);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}
const application = requireOptionalNativeModule<{
  applicationId: string;
  nativeApplicationVersion: string;
  nativeBuildVersion: string;
}>('ExpoApplication');
export async function storeUpdate() {
  const id = application?.applicationId;
  if (!id || !['studio.efface.sjyc', 'studio.efface.sjyc.admin'].includes(id)) return null;
  if (Platform.OS === 'android') {
    const play = requireOptionalNativeModule<{ availableVersion(): Promise<number | null> }>('SjycStore');
    const update = await play?.availableVersion();
    return update && update > Number(application.nativeBuildVersion)
      ? { key: String(update), url: 'https://play.google.com/store/apps/details?id=' + id }
      : null;
  }
  if (Platform.OS !== 'ios') return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(
      'https://itunes.apple.com/lookup?country=kr&entity=software&bundleId=' + encodeURIComponent(id),
      { signal: controller.signal },
    );
    if (!response.ok) return null;
    const body = (await response.json()) as {
      results?: { bundleId?: string; version?: string; trackId?: number; minimumOsVersion?: string }[];
    };
    const item = body.results?.find((app) => app.bundleId === id);
    if (
      !item?.version ||
      !Number.isSafeInteger(item.trackId) ||
      !newerVersion(application.nativeApplicationVersion, item.version) ||
      (item.minimumOsVersion && newerVersion(String(Platform.Version), item.minimumOsVersion))
    )
      return null;
    return { key: item.version, url: 'https://apps.apple.com/kr/app/id' + item.trackId };
  } finally {
    clearTimeout(timer);
  }
}
