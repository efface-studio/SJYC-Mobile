import { Stack } from 'expo-router';
import { POLICY_NAV } from '@/domain/labels';
import { ListRow, Screen } from '~/ds';
import { openScreen } from '~/shared/navigation';
import { Rows } from '~/user-kit';

export default function Policies() {
  return (
    <Screen>
      <Stack.Screen options={{ title: '약관 및 정책' }} />
      <Rows>
        {POLICY_NAV.map(({ key, title }) => (
          <ListRow key={key} title={title} onPress={() => openScreen({ pathname: '/more/account/policies/[key]', params: { key } })} />
        ))}
      </Rows>
    </Screen>
  );
}
