import { Stack } from 'expo-router';
import { DeveloperMenu } from '~/admin-kit/developer/menu';
import { useCan, NoPermission } from '~/admin-kit/components';
import { Screen } from '~/ds';

export default function DeveloperTools() {
  const allowed = useCan()('developer.view');
  return (
    <>
      <Stack.Screen options={{ title: '개발자 도구' }} />
      {allowed ? (
        <Screen>
          <DeveloperMenu />
        </Screen>
      ) : (
        <NoPermission />
      )}
    </>
  );
}
