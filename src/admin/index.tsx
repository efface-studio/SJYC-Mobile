import { Redirect } from 'expo-router';

/** 앱 첫 화면 = 대시보드 탭 */
export default function Index() {
  return <Redirect href="/dashboard" />;
}
