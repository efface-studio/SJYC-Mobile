import { useFonts } from 'expo-font';
import type { ReactNode } from 'react';
import { Text, type StyleProp, type TextStyle } from 'react-native';
import { useTheme, type Theme } from './tokens';

/** Pretendard — Android 는 굵기마다 별도 패밀리가 필요해 이름으로 지정한다 */
export const FONT = {
  regular: 'Pretendard-Regular',
  medium: 'Pretendard-Medium',
  semibold: 'Pretendard-SemiBold',
  bold: 'Pretendard-Bold',
} as const;

export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    [FONT.regular]: require('pretendard/dist/public/static/Pretendard-Regular.otf'),
    [FONT.medium]: require('pretendard/dist/public/static/Pretendard-Medium.otf'),
    [FONT.semibold]: require('pretendard/dist/public/static/Pretendard-SemiBold.otf'),
    [FONT.bold]: require('pretendard/dist/public/static/Pretendard-Bold.otf'),
  });
  // 폰트 로드에 실패해도 시스템 폰트로 계속 진행한다
  return loaded || !!error;
}

/** 큰 숫자(운영시간·D-day·건수)가 자리에 맞춰 정렬되도록 */
const TABULAR: TextStyle['fontVariant'] = ['tabular-nums'];

const VARIANT = {
  display: { fontFamily: FONT.bold, fontSize: 28, lineHeight: 36, letterSpacing: -0.6, fontVariant: TABULAR },
  title1: { fontFamily: FONT.bold, fontSize: 22, lineHeight: 30, letterSpacing: -0.5, fontVariant: TABULAR },
  title2: { fontFamily: FONT.bold, fontSize: 19, lineHeight: 26, letterSpacing: -0.4, fontVariant: TABULAR },
  title3: { fontFamily: FONT.semibold, fontSize: 17, lineHeight: 24, letterSpacing: -0.3 },
  body: { fontFamily: FONT.regular, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  bodyStrong: { fontFamily: FONT.semibold, fontSize: 16, lineHeight: 24, letterSpacing: -0.2 },
  menuTitle: { fontFamily: FONT.medium, fontSize: 15.5, lineHeight: 22, letterSpacing: -0.2 },
  label: { fontFamily: FONT.medium, fontSize: 15, lineHeight: 21, letterSpacing: -0.2 },
  caption: { fontFamily: FONT.regular, fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  captionStrong: { fontFamily: FONT.semibold, fontSize: 13, lineHeight: 18, letterSpacing: -0.1 },
  small: { fontFamily: FONT.medium, fontSize: 12, lineHeight: 16 },
} satisfies Record<string, TextStyle>;

export type TextVariant = keyof typeof VARIANT;
type ColorKey = 'text' | 'textSecondary' | 'textTertiary' | 'action' | 'onAction' | 'brand';

export function Txt({
  variant = 'body',
  color = 'text',
  numberOfLines,
  style,
  children,
  accessibilityRole,
}: {
  variant?: TextVariant;
  color?: ColorKey | (string & {});
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
  children: ReactNode;
  accessibilityRole?: 'header' | 'text';
}) {
  const t = useTheme();
  const resolved = color in t ? (t[color as keyof Theme] as string) : color;
  return (
    <Text
      numberOfLines={numberOfLines}
      accessibilityRole={accessibilityRole}
      maxFontSizeMultiplier={1.6}
      style={[VARIANT[variant], { color: resolved }, style]}
    >
      {children}
    </Text>
  );
}
