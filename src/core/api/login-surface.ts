import Constants from 'expo-constants';
export const loginSurface = (): 'user' | 'admin' =>
  Constants.expoConfig?.extra?.flavor === 'admin' ? 'admin' : 'user';
