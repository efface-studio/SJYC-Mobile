export type MemberCommand =
  | { action: 'profile'; name: string; phone: string }
  | { action: 'reset-password' | 'sign-out' | 'withdraw' }
  | { action: 'join-club'; clubId: string }
  | { action: 'enroll'; programId: string };

export interface ActivityOption {
  id: string;
  title: string;
}
export interface MemberActivityOptions {
  clubs: ActivityOption[];
  programs: ActivityOption[];
}

export const memberActionLabels: Record<MemberCommand['action'], string> = {
  profile: '이름·연락처 변경',
  'reset-password': '비밀번호 재설정 링크 발급',
  'sign-out': '모든 기기 로그아웃',
  withdraw: '계정 삭제',
  'join-club': '동아리 추가',
  enroll: '프로그램 참가 등록',
};
