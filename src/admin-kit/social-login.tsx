import { useQuery, useMutation } from '@tanstack/react-query';
import { Linking, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { OAUTH_PROVIDERS } from '@/config/oauth';
import { OAUTH_PROVIDER_LABEL } from '@/domain/labels';
import { SocialMark } from '~/user-kit/social-accounts';
import { Tap, Txt, space, useTheme } from '~/ds';
import type { OAuthProvider } from '@/domain/types';

let claim: string | undefined;
export function takeAdminClaim() {
  const captured = claim;
  claim = undefined;
  return captured;
}

export function AdminSocialButtons() {
  const t = useTheme();
  const providers = useQuery({
    queryKey: ['admin-social-providers'],
    queryFn: api.auth.adminProviders,
    staleTime: 60_000,
  });
  const start = useMutation({
    mutationFn: async (provider: OAuthProvider) => {
      const result = await api.auth.startAdminSocial(provider);
      claim = result.claim;
      try {
        await Linking.openURL(result.url);
      } catch (error) {
        claim = undefined;
        throw error;
      }
    },
  });
  return (
    <View style={{ gap: space.sm }}>
      {OAUTH_PROVIDERS.map((provider) => {
        const enabled = providers.data?.includes(provider) ?? false;
        const label = OAUTH_PROVIDER_LABEL[provider];
        return (
          <Tap
            key={provider}
            disabled={!enabled || start.isPending}
            onPress={() => start.mutate(provider)}
            accessibilityLabel={label + ' 관리자 로그인' + (enabled ? '' : ', 준비 중')}
            style={{
              minHeight: 48,
              flexDirection: 'row',
              alignItems: 'center',
              gap: space.sm,
              borderColor: t.line,
              borderWidth: 1,
              borderRadius: 8,
              paddingHorizontal: 12,
              opacity: enabled ? 1 : 0.55,
            }}
          >
            <View style={{ flex: 1 }}>
              <SocialMark provider={provider} size={26} plain />
            </View>
            <Txt variant="label">{label}로 로그인</Txt>
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              {!enabled && <Txt variant="small">준비 중</Txt>}
            </View>
          </Tap>
        );
      })}
      {start.isError && <Txt variant="caption">{errorMessage(start.error)}</Txt>}
    </View>
  );
}
