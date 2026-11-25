import { openScreen } from '~/shared/navigation';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import { useSession } from '@/features/auth/session';
import { ListRow, LoadingState, Screen, SectionHeader, Txt } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Rows, SignInPrompt } from '~/user-kit';
import { SOCIAL_ORDER, SocialMark, useSocialAccounts } from '~/user-kit/social-accounts';

export default function Settings() {
  const session = useSession();
  const user = session.data?.user;
  const social = useSocialAccounts(user?.id);
  if (session.isPending)
    return (
      <Screen>
        <LoadingState />
      </Screen>
    );
  if (!user) return <SignInPrompt />;
  const reset = async () => {
    if (
      !(await confirm({
        title: '비밀번호 재설정 메일을 받을까요?',
        message: user.email,
        confirmLabel: '메일 받기',
      }))
    )
      return;
    try {
      await api.auth.requestPasswordReset(user.email);
      notify('메일을 확인해 주세요', '메일의 링크에서 비밀번호를 설정할 수 있습니다.');
    } catch (e) {
      notify('메일을 요청하지 못했습니다', errorMessage(e));
    }
  };
  return (
    <Screen>
      <SectionHeader title="계정" />
      <Rows>
        <ListRow title="프로필" onPress={() => openScreen('/my/profile')} />
        <ListRow
          title="이메일 인증"
          subtitle={user.email}
          trailing={
            <Txt variant="caption" color={user.emailVerified ? 'textSecondary' : 'action'}>
              {user.emailVerified ? '인증됨' : '미인증'}
            </Txt>
          }
          onPress={
            user.emailVerified
              ? undefined
              : () => void api.auth.resendVerification(user.email).then(() => notify('메일을 확인해 주세요', '받은 메일의 링크를 눌러 이메일 인증을 완료해 주세요.')).catch((e) => notify('메일을 요청하지 못했습니다', errorMessage(e)))
          }
        />
      </Rows>
      <SectionHeader title="로그인 · 보안" />
      <Rows>
        <ListRow title="비밀번호" onPress={() => void reset()} />
        <ListRow
          title="연결된 소셜 계정"
          onPress={() => openScreen('/my/social-accounts')}
          trailing={
            social.data && (
              <View
                accessibilityLabel={'연결된 계정 ' + social.data.linked.length + '개'}
                style={{ flexDirection: 'row', gap: 4 }}
              >
                {SOCIAL_ORDER.map((p) => (
                  <SocialMark key={p} provider={p} size={23} muted={!social.data.linked.includes(p)} />
                ))}
              </View>
            )
          }
        />
        <ListRow title="로그인 기기" onPress={() => openScreen('/my/devices')} />
      </Rows>
      <SectionHeader title="알림" />
      <Rows>
        <ListRow title="알림 설정" onPress={() => openScreen('/my/notification-settings')} />
      </Rows>
      <SectionHeader title="계정 관리" />
      <Rows>
        <ListRow title="회원 탈퇴" onPress={() => openScreen('/my/withdraw')} />
      </Rows>
    </Screen>
  );
}
