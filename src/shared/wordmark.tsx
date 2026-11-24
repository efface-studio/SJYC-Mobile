import { Image } from 'expo-image';
import { Platform, useColorScheme } from 'react-native';
import { CENTER } from '@/config/center';

export function Wordmark({ width = 168 }: { width?: number }) {
  const dark = useColorScheme() === 'dark';
  return (
    <Image
      source={
        dark ? require('../../assets/brand/wordmark-inverse.png') : require('../../assets/brand/wordmark.png')
      }
      accessibilityLabel={CENTER.formalName}
      accessible
      contentFit="contain"
      style={{ width, height: width / 6 }}
    />
  );
}

const renderWordmark = () => <Wordmark width={152} />;

export const wordmarkHeader = {
  headerTitle: '',
  ...(Platform.OS === 'ios'
    ? {
        unstable_headerLeftItems: () => [
          { type: 'custom' as const, element: renderWordmark(), hidesSharedBackground: true },
        ],
      }
    : { headerLeft: renderWordmark }),
};
