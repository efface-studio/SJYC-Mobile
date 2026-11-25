import { MemberCommands } from '~/admin-kit/member-commands';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useLocalSearchParams } from 'expo-router';
import { api, errorMessage } from '@/api';
import { USER_STATUS } from '@/domain/labels';
import { assignableRoles, canManageUser, primaryRole, ROLE_LABEL } from '@/domain/permissions';
import type { Role, User, UserStatus } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate } from '@/lib/format';
import { DetailHeader, NoPermission, useCan } from '~/admin-kit/components';
import { useInvalidateAdmin } from '~/admin-kit/queries';
import { FormSection, Gutter, InfoRow, QueryBoundary, Screen, SectionHeader, SelectField, Txt } from '~/ds';
import { confirm, notify } from '~/shared/dialogs';

/** 탈퇴는 회원 본인 절차로만 — 관리자는 정상/이용 정지만 바꾼다 */
const STATUS_OPTIONS: { value: UserStatus; label: string }[] = [
  { value: 'active', label: USER_STATUS.active.text },
  { value: 'suspended', label: USER_STATUS.suspended.text },
];

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
  // 역할은 상위 역할이 하위 권한을 포함하므로 가장 높은 역할 하나로 다룬다
  const role = primaryRole(u);
  // 개발자 역할은 개발자만 부여하고, 개발자 계정은 개발자만 바꾼다 (서버도 거부)
  const roleOptions = assignableRoles(me).map((r) => ({ value: r, label: ROLE_LABEL[r] }));

  const changeRole = async (next: Role) => {
    if (next === role || update.isPending) return;
    const ok = await confirm({
      title: '역할을 변경할까요?',
      message: `${u.name}: ${ROLE_LABEL[role]} → ${ROLE_LABEL[next]}`,
      confirmLabel: '변경',
      destructive: next === 'admin' || next === 'developer',
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
  const protectedAccount = canManage && !canManageUser(me, u);
  const editable = canManage && !isMe && !protectedAccount && u.status !== 'withdrawn';

  return (
    <Screen>
      <DetailHeader
        meta={u.roles.map((r) => ROLE_LABEL[r]).join(', ')}
        title={u.name}
        caption={u.email}
        status={USER_STATUS[u.status]}
      />
      <SectionHeader title="기본 정보" />
      <Gutter>
        <InfoRow label="연락처" value={u.phone ?? '-'} />
        <InfoRow label="가입일" value={formatDate(u.createdAt)} />
        <InfoRow label="이메일 인증" value={u.emailVerified ? '완료' : '미완료'} />
      </Gutter>
      {editable && <MemberCommands key={u.id} user={u} />}
      {editable ? (
        <FormSection title="권한 · 상태">
          <SelectField label="역할" value={role} options={roleOptions} onChange={(r) => void changeRole(r)} />
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
            {protectedAccount && !isMe && (
              <Txt variant="caption" color="textTertiary">
                개발자 계정의 역할·상태는 개발자만 변경할 수 있습니다.
              </Txt>
            )}
          </Gutter>
        </>
      )}
    </Screen>
  );
}
