import { useFonts } from 'expo-font';
import regular from 'expo-symbols/androidWeights/regular';
import { Text, View } from 'react-native';
import type { IconProps } from './icon';

const materialFont = { [regular.name]: regular.font };

export function Icon({ android, color, size = 20 }: IconProps) {
  const [loaded] = useFonts(materialFont);
  const box = { width: size, height: size };
  if (!loaded) return <View style={box} />;

  // Material의 이름 리거처를 한 글립으로 그린다. 본문 글자 확대는 아이콘 칸에 적용하지 않는다.
  return (
    <Text
      accessible={false}
      importantForAccessibility="no"
      allowFontScaling={false}
      numberOfLines={1}
      style={{
        ...box,
        color,
        fontFamily: regular.name,
        fontSize: size,
        lineHeight: size,
        includeFontPadding: false,
        textAlign: 'center',
        verticalAlign: 'middle',
      }}
    >
      {android}
    </Text>
  );
}
