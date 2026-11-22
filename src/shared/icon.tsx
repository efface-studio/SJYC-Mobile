import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

export type IconProps = {
  ios: SFSymbol;
  android: AndroidSymbol;
  color: ColorValue;
  size?: number;
};

/** 시스템 아이콘: iOS 는 SF Symbols, Android 는 Material Symbols */
export function Icon({ ios, android, color, size = 20 }: IconProps) {
  return <SymbolView name={{ ios, android, web: android }} tintColor={color} size={size} />;
}
