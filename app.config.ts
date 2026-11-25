/// <reference types="node" />
import { X509Certificate } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
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
    iosBundleId: "dev.efface.sjyc",
    androidPackage: "studio.efface.sjyc",
    scheme: "sjyc",
  },
  admin: {
    name: "중구청소년센터 관리자",
    slug: "sjyc-admin",
    iosBundleId: "dev.efface.sjyc.admin",
    androidPackage: "studio.efface.sjyc.admin",
    scheme: "sjyc-admin",
  },
} as const;

const f = FLAVORS[FLAVOR];
const nativeAppleSignIn = FLAVOR === "user" && process.env.SJYC_IOS_APPLE_SIGN_IN === "1";
const otaCertificate = process.env.SJYC_OTA_CERTIFICATE;
const otaBase = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/$/, '');
const channel = process.env.SJYC_OTA_CHANNEL ?? (process.env.EAS_BUILD_PROFILE?.startsWith('preview') ? 'preview' : 'production');
const publicCertPath = ".sjyc-build/ota-certificate.pem";
let otaTrust: string | undefined;
if (otaCertificate) {
  if (!otaBase || !["production", "preview"].includes(channel)) {
    throw new Error("업데이트 API 주소와 배포 채널을 확인해 주세요.");
  }
  const url = new URL(otaBase);
  const localPreview = channel === "preview" && url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname);
  if (url.protocol !== "https:" && !localPreview) throw new Error("운영 업데이트에는 HTTPS가 필요합니다.");
  const cert = new X509Certificate(readFileSync(resolve(otaCertificate)));
  otaTrust = cert.fingerprint256;
  mkdirSync(join(__dirname, ".sjyc-build"), { recursive: true });
  writeFileSync(join(__dirname, publicCertPath), cert.toString());
}
if (process.env.EAS_BUILD_PROFILE?.startsWith("production") && !otaCertificate) {
  throw new Error("운영 빌드에 SJYC_OTA_CERTIFICATE를 지정해 주세요.");
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: f.name,
  slug: f.slug,
  scheme: f.scheme,
  version: "0.1.0",
  runtimeVersion: { policy: 'fingerprint' },
  updates: otaCertificate && otaBase ? {
    enabled:true, url:otaBase+'/ota/manifest', checkAutomatically:'ON_ERROR_RECOVERY', fallbackToCacheTimeout:0,
    requestHeaders:{'x-sjyc-flavor':FLAVOR,'expo-channel-name':channel},
    codeSigningCertificate:publicCertPath,codeSigningMetadata:{keyid:'sjyc',alg:'rsa-v1_5-sha256'},
  }: {enabled:false},
  icon: `./assets/brand/launcher/${FLAVOR}.png`,
  orientation: "portrait",
  // 시스템 라이트/다크 설정을 따른다 (색은 OS 시스템 색 사용)
  userInterfaceStyle: "automatic",
  ios: {
    bundleIdentifier: f.iosBundleId,
    buildNumber: '2',
    usesAppleSignIn: nativeAppleSignIn,
    supportsTablet: FLAVOR === "admin",
    config: { usesNonExemptEncryption: false },
    infoPlist: { CFBundleAllowMixedLocalizations: true },
  },
  android: {
    package: f.androidPackage,
    adaptiveIcon: {
      foregroundImage: `./assets/brand/launcher/${FLAVOR}-foreground.png`,
      backgroundColor: FLAVOR === "admin" ? "#F4F0FA" : "#FFFFFF",
      monochromeImage: "./assets/brand/launcher/monochrome.png",
    },
    predictiveBackGestureEnabled: true,
    blockedPermissions: [
      "android.permission.RECORD_AUDIO",

    ],
  },
  plugins: [
    ['expo-build-properties', { ios: { enableSceneSupport: true } }],
    "./scripts/with-apple-sign-in.cjs",
    ["expo-location",{locationWhenInUsePermission:"동아리 QR 출석을 시작하거나 스캔할 때 현장 위치를 확인합니다.",isIosBackgroundLocationEnabled:false,isAndroidBackgroundLocationEnabled:false}],
    ["expo-image-picker",{photosPermission:"프로필이나 게시물에 사용할 사진을 선택합니다.",microphonePermission:false}],
    ...(nativeAppleSignIn ? ['expo-apple-authentication'] : []),
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
  extra: { flavor: FLAVOR, nativeAppleSignIn, otaTrust },
});
