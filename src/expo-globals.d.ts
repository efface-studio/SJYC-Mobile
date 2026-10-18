// Expo 가 번들에 주입하는 전역(process.env.EXPO_PUBLIC_* 등) 타입.
// expo start 가 만드는 expo-env.d.ts 는 커밋하지 않으므로, CI 타입 검사가 그 파일 없이도 통과하도록 직접 참조한다.
/// <reference types="expo/types" />
