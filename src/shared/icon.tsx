import { SymbolView, type AndroidSymbol, type SFSymbol } from 'expo-symbols';
import type { ColorValue } from 'react-native';

/** 시스템 아이콘: iOS 는 SF Symbols, Android 는 Material Symbols */
export function Icon({
  ios,
  android,
  color,
  size = 20,
}: {
  ios: SFSymbol;
  android: AndroidSymbol;
  color: ColorValue;
  size?: number;
}) {
  return <SymbolView name={{ ios, android, web: android }} tintColor={color} size={size} />;
}
