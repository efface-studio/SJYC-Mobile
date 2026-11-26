import { SearchButton } from '~/shared/app-search';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import { BellButton, useHeaderOptions } from '~/user-kit';
import { wordmarkHeader } from '~/shared/wordmark';

export default function HomeStack() {
  const header = useHeaderOptions();
  return (
    <Stack screenOptions={header}>
      <Stack.Screen
        name="index"
        options={{ ...wordmarkHeader, title: '홈', headerRight: () => <View style={{ flexDirection: 'row' }}><SearchButton /><BellButton /></View> }}
      />
    </Stack>
  );
}
