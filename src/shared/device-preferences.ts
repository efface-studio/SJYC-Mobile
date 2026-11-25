import { File, Paths } from 'expo-file-system';
import { Platform } from 'react-native';

type Key = 'remember-login-off' | 'remember-email' | 'appearance';

export function readPreference(key: Key): string | null {
  if (Platform.OS === 'web') return typeof window === 'undefined' ? null : window.localStorage.getItem('sjyc.' + key);
  const file = new File(Paths.document, 'sjyc-' + key);
  return file.exists ? file.textSync() : null;
}

export function writePreference(key: Key, value: string | null) {
  if (Platform.OS === 'web') {
    if (value === null) window.localStorage.removeItem('sjyc.' + key);
    else window.localStorage.setItem('sjyc.' + key, value);
    return;
  }
  const file = new File(Paths.document, 'sjyc-' + key);
  if (value === null) {
    if (file.exists) file.delete();
    return;
  }
  if (!file.exists) file.create();
  file.write(value);
}
