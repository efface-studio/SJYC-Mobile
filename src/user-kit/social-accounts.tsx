import Constants from 'expo-constants';
import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as AppleAuthentication from 'expo-apple-authentication';
import { Linking, Platform, View } from 'react-native';
import { api } from '@/api';
import type { OAuthProvider } from '@/domain/types';
import { useTheme } from '~/ds';
import { useContext } from 'react';
import { ThemeAudience } from '~/ds/tokens';

export const SOCIAL_ORDER: OAuthProvider[] = ['kakao', 'naver', 'google', 'apple'];
export const socialMarks = {
  kakao: require('../../assets/brand/kakao.png'),
  naver: require('../../assets/brand/naver.png'),
  google: require('../../assets/brand/google.png'),
  apple: require('../../assets/brand/apple.png'),
};
const colors = { kakao: '#FEE500', naver: '#03C75A', google: '#FFFFFF', apple: '#F5F5F7' };
export const socialKey = (id?: string) => ['social-accounts', id];
export const useSocialAccounts = (id?: string) =>
  useQuery({ queryKey: socialKey(id), queryFn: api.me.socialAccounts, enabled: !!id });

export function SocialMark({
  provider,
  muted = false,
  size = 30,
  plain = false,
}: {
  provider: OAuthProvider;
  muted?: boolean;
  size?: number;
  plain?: boolean;
}) {
  const t = useTheme();
  const admin = useContext(ThemeAudience) === 'admin';
  if (admin) {
    const color = { kakao: t.text, naver: colors.naver, google: undefined, apple: t.text };
    const iconSize = plain ? size : Math.round(size * 0.58);
    const icon = (
      <Image
        accessible={false}
        source={socialMarks[provider]}
        contentFit="contain"
        tintColor={muted ? t.textTertiary : color[provider]}
        style={{ width: iconSize, height: iconSize }}
      />
    );
    if (plain) return icon;
    return (
      <View accessible={false} style={{
        width: size, height: size, borderRadius: size / 2, borderWidth: 1,
        borderColor: muted ? t.lineStrong : t.tone.brand.fg,
        alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </View>
    );
  }
  const tint = muted
    ? t.textTertiary
    : provider === 'naver'
      ? '#fff'
      : provider === 'google'
        ? undefined
        : '#191919';
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: muted ? t.bgSubtle : colors[provider],
      }}
    >
      <Image
        source={socialMarks[provider]}
        contentFit="contain"
        tintColor={tint}
        style={{ width: size * 0.56, height: size * 0.56 }}
      />
    </View>
  );
}

export const useAppleAvailable = () => useQuery({
  queryKey: ['apple-sign-in-available'], queryFn: AppleAuthentication.isAvailableAsync,
  enabled: Platform.OS === 'ios' && Constants.expoConfig?.extra?.nativeAppleSignIn === true, staleTime: Infinity,
});

let pending: { claim: string; link: boolean } | null = null;
export async function beginSocial(provider: OAuthProvider, link: boolean, adminLink = false) {
  if (provider === 'apple' && Platform.OS === 'ios') {
    const challenge = await api.auth.startNativeApple(link);
    try {
      const credential = await AppleAuthentication.signInAsync({...challenge, requestedScopes:[AppleAuthentication.AppleAuthenticationScope.FULL_NAME,AppleAuthentication.AppleAuthenticationScope.EMAIL]});
      if (!credential.identityToken || credential.state !== challenge.state) {
        throw new Error('Apple 인증을 확인할 수 없습니다. 다시 시도해 주세요.');
      }
      const name = credential.fullName ? AppleAuthentication.formatFullName(credential.fullName) || undefined : undefined;
      const result = await api.auth.finishNativeApple({ state: challenge.state, identityToken: credential.identityToken, name });
      if (result.needsProfile) return 'profile' as const;
      return 'native' as const;
    } catch (err) {
      if (err instanceof Error && 'code' in err && err.code === 'ERR_REQUEST_CANCELED') return 'cancelled' as const;
      throw err;
    }
  }
  const { url, claim } = await api.auth.startSocial(provider, link, adminLink);
  pending = { claim, link };
  try {
    await Linking.openURL(url);
  } catch (error) {
    pending = null;
    throw error;
  }
}
export function takeSocialAttempt() {
  const attempt = pending;
  pending = null;
  return attempt;
}
