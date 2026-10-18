import { Redirect } from 'expo-router';
import { can } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';

/** 앱 첫 화면 = 대시보드 탭 (동아리 담당자 전용 계정은 동아리 운영) */
export default function Index() {
  const operator = can(useSession().data?.user, 'admin.access');
  return <Redirect href={operator ? '/dashboard' : '/more/my-clubs'} />;
}
