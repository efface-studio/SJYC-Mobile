import { useTheme } from '~/ds/tokens';
import { Platform, PlatformColor, useColorScheme, type ColorValue } from 'react-native';

/**
 * 색은 OS 기본을 따른다.
 * - iOS: UIKit 시스템 색(PlatformColor) — 라이트/다크·고대비가 자동 반영된다.
 * - Android: Material 3 기본 톤(라이트/다크).
 * 브랜드 색은 웹과 같은 토큰(docs/design-system.md): 라이트 brand-700, 다크 brand-500 (각각 AA 대비).
 */
export interface Colors {
  label: ColorValue;
  secondaryLabel: ColorValue;
  background: ColorValue;
  surface: ColorValue;
  separator: ColorValue;
  pressed: ColorValue;
  tint: string;
  onTint: string;
  destructive: ColorValue;
  success: ColorValue;
  warning: ColorValue;
  info: ColorValue;
  inputBackground: ColorValue;
}

const BRAND = { light: '#B35400', dark: '#F6891F' } as const;

const ios = (dark: boolean): Colors => ({
  label: PlatformColor('label'),
  secondaryLabel: PlatformColor('secondaryLabel'),
  background: PlatformColor('systemGroupedBackground'),
  surface: PlatformColor('secondarySystemGroupedBackground'),
  separator: PlatformColor('separator'),
  pressed: PlatformColor('systemGray4'),
  tint: dark ? BRAND.dark : BRAND.light,
  onTint: dark ? '#1C1B1F' : '#FFFFFF',
  destructive: PlatformColor('systemRed'),
  success: PlatformColor('systemGreen'),
  warning: PlatformColor('systemOrange'),
  info: PlatformColor('systemBlue'),
  inputBackground: PlatformColor('tertiarySystemFill'),
});

const android = (dark: boolean): Colors =>
  dark
    ? {
        label: '#E6E1E5',
        secondaryLabel: '#CAC4D0',
        background: '#141218',
        surface: '#1D1B20',
        separator: '#49454F',
        pressed: '#2B2930',
        tint: BRAND.dark,
        onTint: '#1C1B1F',
        destructive: '#F2B8B5',
        success: '#8FD49C',
        warning: '#F5C46B',
        info: '#A8C7FA',
        inputBackground: '#2B2930',
      }
    : {
        label: '#1D1B20',
        secondaryLabel: '#49454F',
        background: '#FEF7FF',
        surface: '#FFFFFF',
        separator: '#CAC4D0',
        pressed: '#ECE6F0',
        tint: BRAND.light,
        onTint: '#FFFFFF',
        destructive: '#B3261E',
        success: '#1D6B2F',
        warning: '#7A4D00',
        info: '#1F5FA8',
        inputBackground: '#F3EDF7',
      };

export function useColors(): Colors {
  const dark = useColorScheme() === 'dark';
  const t = useTheme();
  const system = Platform.OS === 'ios' ? ios(dark) : android(dark);
  return { ...system, tint: t.action, onTint: t.onAction };
}

export const IS_IOS = Platform.OS === 'ios';
