import { useContext } from 'react';
import { ThemeAudience } from '~/ds/tokens';
import { useAppColorScheme } from '~/shared/appearance';
import { Image } from 'expo-image';
import { Platform } from 'react-native';
import { CENTER } from '@/config/center';

export function Wordmark({ width = 168 }: { width?: number }) {
  const dark = useAppColorScheme() === 'dark';
  const admin = useContext(ThemeAudience) === 'admin';
  const source = admin
    ? (dark ? require('../../assets/brand/wordmark-admin-inverse.png') : require('../../assets/brand/wordmark-admin.png'))
    : (dark ? require('../../assets/brand/wordmark-inverse.png') : require('../../assets/brand/wordmark.png'));
  return (
    <Image
      source={source}
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
