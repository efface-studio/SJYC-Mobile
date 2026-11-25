import { useSyncExternalStore } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import { readPreference, writePreference } from './device-preferences';

export const modes = ['system', 'light', 'dark'] as const;
type Mode = (typeof modes)[number];
export const modeLabels: Record<Mode, string> = { system: '시스템 설정 따르기', light: '라이트', dark: '다크' };
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
let current: Mode = 'system';

function apply(mode: Mode) {
  Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  current = mode;
  listeners.forEach((listener) => listener());
}

export function restoreAppearance() {
  let value: string | null = null;
  try { value = readPreference('appearance'); } catch { /* 저장 공간이 잠겨 있으면 기기 설정을 사용한다. */ }
  apply(value === 'dark' || value === 'light' ? value : 'system');
}

export function setAppearance(mode: Mode) {
  writePreference('appearance', mode === 'system' ? null : mode);
  apply(mode);
}

export function useAppearancePreference() {
  return useSyncExternalStore(subscribe, () => current, () => 'system' as Mode);
}

export function useAppColorScheme() {
  const preference = useAppearancePreference();
  const system = useColorScheme();
  return preference === 'system' ? system : preference;
}
