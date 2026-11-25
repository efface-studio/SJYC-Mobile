import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Linking, View } from 'react-native';
import { api } from '@/api';
import type { OAuthProvider } from '@/domain/types';
import { useTheme } from '~/ds';

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
}: {
  provider: OAuthProvider;
  muted?: boolean;
  size?: number;
}) {
  const t = useTheme();
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

let pending: { claim: string; link: boolean } | null = null;
export async function beginSocial(provider: OAuthProvider, link: boolean) {
  const { url, claim } = await api.auth.startSocial(provider, link);
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
