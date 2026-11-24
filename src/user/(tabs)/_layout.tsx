import { router, Tabs } from 'expo-router';
import { GlassView, isGlassEffectAPIAvailable, isLiquidGlassAvailable } from 'expo-glass-effect';
import { BlurView } from 'expo-blur';
import { Image, Keyboard, Platform, StyleSheet, View } from 'react-native';
import { useEffect, useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '~/shared/icon';
import { FONT, Tap, useTheme } from '~/ds';

const tabs = [
  {
    name: 'home',
    label: '홈',
    art: require('../../../assets/navigation/home.png'),
    rest: require('../../../assets/navigation/home-rest.png'),
  },
  {
    name: 'programs',
    label: '프로그램',
    art: require('../../../assets/navigation/programs.png'),
    rest: require('../../../assets/navigation/programs-rest.png'),
  },
  {
    name: 'spaces',
    label: '공간 예약',
    art: require('../../../assets/navigation/spaces.png'),
    rest: require('../../../assets/navigation/spaces-rest.png'),
  },
  {
    name: 'clubs',
    label: '동아리',
    art: require('../../../assets/navigation/clubs.png'),
    rest: require('../../../assets/navigation/clubs-rest.png'),
  },
  {
    name: 'my',
    label: 'MY',
    art: require('../../../assets/navigation/my.png'),
    rest: require('../../../assets/navigation/my-rest.png'),
  },
] as const;

function TabGlass() {
  if (isLiquidGlassAvailable() && isGlassEffectAPIAvailable())
    return <GlassView pointerEvents="none" glassEffectStyle="regular" style={styles.glass} />;
  return <BlurView pointerEvents="none" tint="systemMaterial" intensity={80} style={styles.glass} />;
}

function TabNavigator() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const ios = Platform.OS === 'ios';
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: t.action,
        tabBarInactiveTintColor: t.textSecondary,
        tabBarLabelStyle: { fontFamily: FONT.semibold, fontSize: 11, lineHeight: 15 },
        tabBarLabelPosition: 'below-icon',
        tabBarItemStyle: ios ? styles.tabItem : undefined,
        tabBarActiveBackgroundColor: ios ? t.pressed : undefined,
        tabBarBackground: ios ? TabGlass : undefined,
        tabBarStyle: ios
          ? [styles.iosBar, { marginBottom: Math.max(6, insets.bottom - 16) }]
          : { backgroundColor: t.card, borderTopColor: t.line },
      }}
    >
      {tabs.map(({ name, label, art, rest }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: label,
            tabBarAccessibilityLabel: label,
            tabBarIcon: ({ focused }) => (
              <Image source={focused ? art : rest} resizeMode="contain" style={styles.tabIcon} />
            ),
          }}
        />
      ))}
    </Tabs>
  );
}

export default function UserTabsLayout() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [keyboard, setKeyboard] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener('keyboardDidShow', () => setKeyboard(true));
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboard(false));
    return () => {
      show.remove();
      hide.remove();
    };
  }, []);
  return (
    <View style={{ flex: 1 }}>
      <TabNavigator />
      {!keyboard && (
        <Tap
          accessibilityLabel="출석 QR 스캔"
          onPress={() => router.push('/my/check-in')}
          rounded={24}
          style={[
            styles.scan,
            { backgroundColor: t.action, right: Math.max(insets.right, 16), bottom: insets.bottom + 65 },
          ]}
        >
          <Icon ios="qrcode.viewfinder" android="qr_code_scanner" size={22} color={t.onAction} />
        </Tap>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  // 각 탭이 같은 폭을 쓰므로 선택/해제와 글꼴 전환 때 한글 레이블의 기준선이 유지된다.
  iosBar: {
    height: 60,
    marginHorizontal: 12,
    padding: 4,
    paddingBottom: 4,
    borderTopWidth: 0,
    borderRadius: 30,
    backgroundColor: 'transparent',
    elevation: 0,
  },
  tabItem: { flex: 1, minWidth: 0, borderRadius: 26, overflow: 'hidden', paddingVertical: 2 },
  glass: { ...StyleSheet.absoluteFill, borderRadius: 30, overflow: 'hidden' },
  tabIcon: { width: 24, height: 24 },
  scan: {
    position: 'absolute',
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    elevation: 4,
    shadowColor: '#25150D',
    shadowOpacity: 0.16,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
});
