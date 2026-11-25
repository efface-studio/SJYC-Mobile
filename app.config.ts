import type { ConfigContext, ExpoConfig } from "expo/config";

/**
 * 한 코드베이스에서 두 앱을 만든다 — APP_FLAVOR=user(기본) | admin.
 * 번들 ID·이름·라우트 폴더가 분리되어 두 앱을 한 기기에 함께 설치할 수 있다.
 * 라우트 폴더가 바뀌므로 flavor 를 바꿀 때는 Metro 캐시를 지운다 (`expo start --clear`).
 */
const FLAVOR = process.env.APP_FLAVOR === "admin" ? "admin" : "user";

const FLAVORS = {
  user: {
    name: "중구청소년센터",
    slug: "sjyc",
    bundleId: "studio.efface.sjyc",
    scheme: "sjyc",
  },
  admin: {
    name: "중구청소년센터 관리자",
    slug: "sjyc-admin",
    bundleId: "studio.efface.sjyc.admin",
    scheme: "sjyc-admin",
  },
} as const;

const f = FLAVORS[FLAVOR];

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: f.name,
  slug: f.slug,
  scheme: f.scheme,
  version: "0.1.0",
  icon: `./assets/brand/launcher/${FLAVOR}.png`,
  orientation: "portrait",
  // 시스템 라이트/다크 설정을 따른다 (색은 OS 시스템 색 사용)
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: f.bundleId,
    usesAppleSignIn: FLAVOR === "user",
    supportsTablet: FLAVOR === "admin",
    config: { usesNonExemptEncryption: false },
    infoPlist: { CFBundleAllowMixedLocalizations: true },
  },
  android: {
    package: f.bundleId,
    adaptiveIcon: {
      foregroundImage: `./assets/brand/launcher/${FLAVOR}-foreground.png`,
      backgroundColor: FLAVOR === "admin" ? "#F4F0FA" : "#FFFFFF",
      monochromeImage: "./assets/brand/launcher/monochrome.png",
    },
    predictiveBackGestureEnabled: true,
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",
      "android.permission.ACCESS_FINE_LOCATION",
    ],
  },
  plugins: [
    ...(FLAVOR === "user" ? ["expo-apple-authentication"] : []),
    [
      "expo-router",
      { root: FLAVOR === "admin" ? "./src/admin" : "./src/user" },
    ],
    ...(FLAVOR === "user"
      ? [
          './scripts/with-ios-tab-icons.cjs',
          [
            "expo-camera",
            {
              cameraPermission:
                "출석 QR 코드를 스캔하려면 카메라 접근을 허용해 주세요.",
              microphonePermission: false,
              recordAudioAndroid: false,
            },
          ] as [string, Record<string, unknown>],
        ]
      : []),
    [
      "expo-splash-screen",
      {
        image: FLAVOR === "admin" ? "./assets/brand/symbol-admin.png" : "./assets/brand/symbol.png",
        imageWidth: 46,
        resizeMode: "contain",
        backgroundColor: "#FFFEFC",
        dark: { backgroundColor: "#1A1716" },
      },
    ],
    "@react-native-community/datetimepicker",
  ],
  experiments: { typedRoutes: false },
  extra: { flavor: FLAVOR },
});
