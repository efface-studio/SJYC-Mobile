// 자동 생성 — scripts/gen-oss-licenses.mjs (pnpm oss:licenses). 직접 수정하지 않는다.
export interface OssPackage {
  name: string;
  version: string;
  license: string;
  url: string;
}

/** 웹 서비스가 직접 사용하는 오픈소스 패키지 */
export const OSS_WEB: OssPackage[] = [
  {
    name: '@tanstack/react-query',
    version: '5.104.3',
    license: 'MIT',
    url: 'https://tanstack.com/query',
  },
  {
    name: 'clsx',
    version: '2.1.1',
    license: 'MIT',
    url: 'https://github.com/lukeed/clsx',
  },
  {
    name: 'lucide-react',
    version: '1.58.0',
    license: 'ISC',
    url: 'https://lucide.dev',
  },
  {
    name: 'next',
    version: '16.4.6',
    license: 'MIT',
    url: 'https://nextjs.org',
  },
  {
    name: 'pretendard',
    version: '1.3.9',
    license: 'OFL-1.1',
    url: 'https://cactus.tistory.com/306',
  },
  {
    name: 'react',
    version: '19.3.1',
    license: 'MIT',
    url: 'https://react.dev/',
  },
  {
    name: 'react-dom',
    version: '19.3.1',
    license: 'MIT',
    url: 'https://react.dev/',
  },
  {
    name: 'simple-icons',
    version: '16.35.0',
    license: 'CC0-1.0',
    url: 'https://simpleicons.org',
  },
  {
    name: 'tailwind-merge',
    version: '3.7.0',
    license: 'MIT',
    url: 'https://github.com/dcastil/tailwind-merge',
  },
  {
    name: 'zod',
    version: '4.6.7',
    license: 'MIT',
    url: 'https://zod.dev',
  },
];

/** 모바일 앱(iOS·Android)이 직접 사용하는 오픈소스 패키지 */
export const OSS_MOBILE: OssPackage[] = [
  {
    name: '@expo/ui',
    version: '57.0.26',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/ui/',
  },
  {
    name: '@react-native-community/datetimepicker',
    version: '9.1.0',
    license: 'MIT',
    url: 'https://github.com/react-native-community/datetimepicker#readme',
  },
  {
    name: '@tanstack/react-query',
    version: '5.104.3',
    license: 'MIT',
    url: 'https://tanstack.com/query',
  },
  {
    name: 'expo',
    version: '57.0.33',
    license: 'MIT',
    url: 'https://github.com/expo/expo/tree/main/packages/expo',
  },
  {
    name: 'expo-apple-authentication',
    version: '57.0.2',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/apple-authentication/',
  },
  {
    name: 'expo-blur',
    version: '57.0.3',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/blur-view/',
  },
  {
    name: 'expo-camera',
    version: '57.0.6',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/camera/',
  },
  {
    name: 'expo-constants',
    version: '57.0.25',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/constants/',
  },
  {
    name: 'expo-font',
    version: '57.0.4',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/font/',
  },
  {
    name: 'expo-haptics',
    version: '57.0.3',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/haptics/',
  },
  {
    name: 'expo-image',
    version: '57.0.5',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/image/',
  },
  {
    name: 'expo-image-manipulator',
    version: '57.0.23',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/imagemanipulator/',
  },
  {
    name: 'expo-image-picker',
    version: '57.0.22',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/imagepicker/',
  },
  {
    name: 'expo-linking',
    version: '57.0.14',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/linking',
  },
  {
    name: 'expo-router',
    version: '57.0.32',
    license: 'MIT',
    url: 'https://docs.expo.dev/routing/introduction/',
  },
  {
    name: 'expo-splash-screen',
    version: '57.0.12',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/splash-screen/',
  },
  {
    name: 'expo-status-bar',
    version: '57.0.1',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/status-bar/',
  },
  {
    name: 'expo-symbols',
    version: '57.0.3',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/symbols/',
  },
  {
    name: 'expo-system-ui',
    version: '57.0.4',
    license: 'MIT',
    url: 'https://docs.expo.dev/versions/latest/sdk/system-ui',
  },
  {
    name: 'jsbarcode',
    version: '3.12.3',
    license: 'MIT',
    url: 'https://github.com/lindell/JsBarcode#readme',
  },
  {
    name: 'patch-package',
    version: '8.0.1',
    license: 'MIT',
    url: 'https://github.com/ds300/patch-package',
  },
  {
    name: 'pretendard',
    version: '1.3.9',
    license: 'OFL-1.1',
    url: 'https://cactus.tistory.com/306',
  },
  {
    name: 'qrcode-generator',
    version: '2.0.4',
    license: 'MIT',
    url: 'https://github.com/kazuhikoarase/qrcode-generator',
  },
  {
    name: 'react',
    version: '19.2.3',
    license: 'MIT',
    url: 'https://react.dev/',
  },
  {
    name: 'react-dom',
    version: '19.2.3',
    license: 'MIT',
    url: 'https://react.dev/',
  },
  {
    name: 'react-native',
    version: '0.86.3',
    license: 'MIT',
    url: 'https://reactnative.dev/',
  },
  {
    name: 'react-native-safe-area-context',
    version: '5.7.0',
    license: 'MIT',
    url: 'https://github.com/AppAndFlow/react-native-safe-area-context#readme',
  },
  {
    name: 'react-native-screens',
    version: '4.26.2',
    license: 'MIT',
    url: 'https://github.com/software-mansion/react-native-screens#readme',
  },
  {
    name: 'zod',
    version: '4.6.7',
    license: 'MIT',
    url: 'https://zod.dev',
  },
];
