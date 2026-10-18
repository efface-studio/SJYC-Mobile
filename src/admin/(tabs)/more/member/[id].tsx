import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '@/api';
import { USER_STATUS } from '@/domain/labels';
import { ROLE_LABEL } from '@/domain/permissions';
import type { Role, User, UserStatus } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate } from '@/lib/format';
import { DetailHeader, NoPermission, useCan } from '~/admin-kit/components';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import {
  Divider,
  FormSection,
  Gutter,
  InfoRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  SelectField,
  Txt,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'member', label: ROLE_LABEL.member },
  { value: 'staff', label: ROLE_LABEL.staff },
  { value: 'admin', label: ROLE_LABEL.admin },
];
/** 탈퇴는 회원 본인 절차로만 — 관리자는 정상/이용 정지만 바꾼다 */
const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: USER_STATUS.active.text },
  { value: 'suspended', label: USER_STATUS.suspended.text },
];

/** 역할은 상위 역할이 하위 권한을 포함하므로 가장 높은 역할 하나로 다룬다 */
const topRole = (roles: Role[]): Role =>
  roles.includes('admin') ? 'admin' : roles.includes('staff') ? 'staff' : 'member';

export default function MemberDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan();
  const query = useQuery({
    queryKey: ['admin', 'member', id],
    queryFn: () => api.admin.members.get(id),
    enabled: allowed('member.read'),
  });

  return (
    <>
      <Stack.Screen options={{ title: '회원 정보' }} />
      {allowed('member.read') ? (
        <QueryBoundary query={query}>
          {(u) => <MemberView member={u} canManage={allowed('member.manage')} />}
        </QueryBoundary>
      ) : (
        <NoPermission />
      )}
    </>
  );
}

function MemberView({ member: u, canManage }: { member: User; canManage: boolean }) {
  const me = useSession().data?.user;
  const invalidate = useInvalidateAdmin();
  const update = useMutation({
    mutationFn: (patch: { roles?: Role[]; status?: UserStatus }) => api.admin.members.update(u.id, patch),
    onSuccess: () => invalidate(),
    onError: (e) => notify('변경하지 못했습니다', errorMessage(e)),
  });
  const role = topRole(u.roles);

  const changeRole = async (next: Role) => {
    if (next === role || update.isPending) return;
    const ok = await confirm({
      title: '역할을 변경할까요?',
      message: `${u.name}: ${ROLE_LABEL[role]} → ${ROLE_LABEL[next]}`,
      confirmLabel: '변경',
      destructive: next === 'admin',
    });
    if (ok) update.mutate({ roles: [next] });
  };

  const changeStatus = async (next: UserStatus) => {
    if (next === u.status || update.isPending) return;
    const ok = await confirm({
      title: next === 'suspended' ? '이용을 정지할까요?' : '이용 정지를 해제할까요?',
      message: u.name,
      confirmLabel: next === 'suspended' ? '정지' : '해제',
      destructive: next === 'suspended',
    });
    if (ok) update.mutate({ status: next });
  };

  const isMe = me?.id === u.id;
  const editable = canManage && !isMe && u.status !== 'withdrawn';

  return (
    <Screen>
      <DetailHeader
        meta={u.roles.map((r) => ROLE_LABEL[r]).join(', ')}
        title={u.name}
        caption={u.email}
        status={USER_STATUS[u.status]}
      />
      <Divider thick />
      <SectionHeader title="기본 정보" />
      <Gutter>
        <InfoRow label="연락처" value={u.phone ?? '-'} />
        <InfoRow label="가입일" value={formatDate(u.createdAt)} />
        <InfoRow label="이메일 인증" value={u.emailVerified ? '완료' : '미완료'} />
      </Gutter>
      {editable ? (
        <FormSection title="권한 · 상태">
          <SelectField
            label="역할"
            value={role}
            options={ROLE_OPTIONS}
            onChange={(r) => void changeRole(r)}
          />
          <SelectField
            label="상태"
            value={u.status}
            options={STATUS_OPTIONS}
            onChange={(s) => void changeStatus(s)}
          />
          <Txt variant="caption" color="textTertiary">
            변경하면 확인 후 바로 적용됩니다.
          </Txt>
        </FormSection>
      ) : (
        <>
          <SectionHeader title="권한 · 상태" />
          <Gutter>
            <InfoRow label="역할" value={u.roles.map((r) => ROLE_LABEL[r]).join(', ')} />
            <InfoRow label="상태" value={USER_STATUS[u.status].text} />
            {canManage && isMe && (
              <Txt variant="caption" color="textTertiary">
                자기 자신의 권한·상태는 변경할 수 없습니다.
              </Txt>
            )}
          </Gutter>
        </>
      )}
    </Screen>
  );
}
