import type { Role, User } from './types';

/**
 * RBAC 설계 초안. 프론트엔드 권한 검사는 화면 표시 용도일 뿐이며,
 * 모든 보호 API는 서버에서 같은 규칙으로 다시 검증해야 한다.
 */
export const PERMISSIONS = [
  'admin.access',
  'notice.write',
  'program.write',
  'application.decide',
  'member.read',
  'member.manage',
  'club.manage',
  'space.manage',
  'inquiry.answer',
  'policy.manage',
  'audit.read',
] as const;

export type Permission = (typeof PERMISSIONS)[number];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  member: [],
  staff: [
    'admin.access',
    'notice.write',
    'program.write',
    'application.decide',
    'member.read',
    'club.manage',
    'space.manage',
    'inquiry.answer',
  ],
  admin: PERMISSIONS,
};

export function can(
  user: Pick<User, 'roles' | 'status'> | null | undefined,
  permission: Permission,
): boolean {
  if (!user || user.status !== 'active') return false;
  return user.roles.some((role) => ROLE_PERMISSIONS[role].includes(permission));
}

export const ROLE_LABEL: Record<Role, string> = {
  member: '회원',
  staff: '센터 직원',
  admin: '최고 관리자',
};
