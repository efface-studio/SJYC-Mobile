import { Tabs } from 'expo-router';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { Image, Platform } from 'react-native';
import { FONT, useTheme } from '~/ds';

const tabs = [
  { name: 'home', label: '홈', art: require('../../../assets/navigation/home.png'), rest: require('../../../assets/navigation/home-rest.png') },
  { name: 'programs', label: '프로그램', art: require('../../../assets/navigation/programs.png'), rest: require('../../../assets/navigation/programs-rest.png') },
  { name: 'spaces', label: '공간 예약', art: require('../../../assets/navigation/spaces.png'), rest: require('../../../assets/navigation/spaces-rest.png') },
  { name: 'clubs', label: '동아리', art: require('../../../assets/navigation/clubs.png'), rest: require('../../../assets/navigation/clubs-rest.png') },
  { name: 'my', label: 'MY', art: require('../../../assets/navigation/my.png'), rest: require('../../../assets/navigation/my-rest.png') },
] as const;

export default function UserTabsLayout() {
  const t = useTheme();
  // Android Material의 네이티브 탭은 비트맵까지 단색으로 칠한다.
  if (Platform.OS === 'android') {
    return (
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarHideOnKeyboard: true,
          tabBarActiveTintColor: t.action,
          tabBarInactiveTintColor: t.textSecondary,
          tabBarStyle: { backgroundColor: t.card, borderTopColor: t.line },
          tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 11 },
        }}
      >
        {tabs.map(({ name, label, art, rest }) => (
          <Tabs.Screen
            key={name}
            name={name}
            options={{
              title: label,
              tabBarIcon: ({ focused }) => (
                <Image
                  source={focused ? art : rest}
                  resizeMode="contain"
                  style={{ width: 24, height: 24 }}
                />
              ),
            }}
          />
        ))}
      </Tabs>
    );
  }
  return (
    <NativeTabs tintColor={t.action} labelVisibilityMode="labeled" minimizeBehavior="never">
      {tabs.map(({ name, label, art, rest }) => (
        <NativeTabs.Trigger key={name} name={name}>
          <NativeTabs.Trigger.Label>{label}</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon src={{ default: rest, selected: art }} renderingMode="original" />
        </NativeTabs.Trigger>
      ))}
    </NativeTabs>
  );
}
