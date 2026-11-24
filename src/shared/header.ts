import { Platform } from 'react-native';

export const translucentHeader = {
  headerTransparent: true,
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  headerStyle: { backgroundColor: 'transparent' },
  ...(Platform.OS === 'ios' &&
    (Number.parseInt(String(Platform.Version), 10) >= 26
      ? { scrollEdgeEffects: { top: 'soft' as const } }
      : { headerBlurEffect: 'systemUltraThinMaterial' as const })),
} as const;
