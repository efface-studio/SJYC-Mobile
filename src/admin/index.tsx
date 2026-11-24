import { Redirect } from 'expo-router';
import { can } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';

/**
 * 앱 첫 화면 = 대시보드 탭. 동아리 담당자 전용 계정은 더보기 첫 화면(동아리 운영·출석·로그아웃) —
 * 동아리 운영 목록으로 바로 보내면 스택에 더보기가 없어 출석·로그아웃으로 갈 수 없다.
 */
export default function Index() {
  const operator = can(useSession().data?.user, 'admin.access');
  return <Redirect href={operator ? '/dashboard' : '/more'} />;
}
