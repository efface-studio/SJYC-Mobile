const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// CI가 변환 캐시를 재사용해도 각 앱에는 해당 빌드의 API 주소가 포함되어야 한다.
config.cacheVersion = JSON.stringify([
  config.cacheVersion,
  process.env.APP_FLAVOR ?? 'user',
  process.env.EXPO_PUBLIC_API_MODE ?? '',
  process.env.EXPO_PUBLIC_API_BASE_URL ?? '',
  process.env.EXPO_PUBLIC_DEMO_DATA ?? '',
]);

module.exports = config;
