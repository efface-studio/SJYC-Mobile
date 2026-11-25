import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import { NOTIFICATION_KIND_LABEL } from '@/domain/labels';
import type { NotificationKind } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { Gutter, LoadingState, QueryBoundary, Screen, SwitchRow, Txt, useTheme } from '~/ds';
import { notify } from '~/shared/dialogs';
import { SignInPrompt } from '~/user-kit';

const categories: { kind: NotificationKind; description: string }[] = [
  { kind: 'application', description: '신청한 프로그램의 승인·반려 결과' },
  { kind: 'reservation', description: '신청한 공간의 예약 처리 결과' },
  { kind: 'club_application', description: '동아리 가입 신청 결과' },
  { kind: 'club_manager', description: '담당자로 지정된 동아리의 운영 소식' },
  { kind: 'inquiry', description: '내가 남긴 문의에 달린 답변' },
  { kind: 'notice', description: '센터에서 알림으로 보내는 공지' },
];

export default function NotificationSettings() {
  const session = useSession();
  const cache = useQueryClient();
  const t = useTheme();
  const key = ['notification-preferences', session.data?.user.id];
  const preferences = useQuery({ queryKey: key, queryFn: api.me.notificationPreferences, enabled: !!session.data });
  const save = useMutation({
    mutationFn: api.me.setNotificationPreference,
    onSuccess: (value) => cache.setQueryData(key, value),
    onError: (err) => notify('알림 설정을 저장하지 못했습니다', errorMessage(err)),
  });
  if (session.isPending) return <Screen><LoadingState layout="settings" /></Screen>;
  if (!session.data) return <SignInPrompt />;
  return <Screen onRefresh={() => preferences.refetch()}>
    <Gutter style={{ paddingVertical: 16 }}>
      <Txt variant="title3">알림함에서 받을 소식</Txt>
      <Txt variant="caption" color="textSecondary">설정은 앞으로 도착하는 알림부터 적용됩니다.</Txt>
    </Gutter>
    <QueryBoundary layout="settings" query={preferences}>
      {(value) => <Gutter>{categories.map(({ kind, description }) => (
        <View key={kind} style={{ paddingVertical: 12, borderTopWidth: 0.5, borderColor: t.line }}>
          <SwitchRow
            label={NOTIFICATION_KIND_LABEL[kind]}
            description={description}
            value={save.isPending && save.variables.kind === kind ? save.variables.enabled : !value.muted.includes(kind)}
            disabled={save.isPending}
            onValueChange={(enabled) => save.mutate({ kind, enabled })}
          />
        </View>
      ))}</Gutter>}
    </QueryBoundary>
  </Screen>;
}
