import { Redirect } from 'expo-router';

/** 앱 진입(sjyc:///) → 홈 탭 */
export default function Index() {
  return <Redirect href="/home" />;
}
