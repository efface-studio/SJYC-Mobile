import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, StyleSheet, View, useColorScheme, useWindowDimensions } from 'react-native';

if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => {});

const logo = require('../../assets/brand/wordmark.png');
const inverse = require('../../assets/brand/wordmark-inverse.png');
const symbol = require('../../assets/brand/symbol.png');

export function BrandSplash({ onFinish }: { onFinish: () => void }) {
  const dark = useColorScheme() === 'dark';
  const width = Math.min(useWindowDimensions().width - 48, 288);
  const height = width * 114 / 720;
  const mark = width * 84 / 720;
  const wordWidth = width - mark;
  const reveal = useRef(new Animated.Value(0)).current;
  const cover = useRef(new Animated.Value(1)).current;
  const [layoutReady, setLayoutReady] = useState(false);
  const [markReady, setMarkReady] = useState(false);
  const [wordReady, setWordReady] = useState(false);

  useEffect(() => {
    if (!layoutReady || !markReady || !wordReady) return;
    let active = true;
    let animation: Animated.CompositeAnimation | undefined;
    async function start() {
      const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      if (!active) return;
      if (reduced) reveal.setValue(1);
      if (Platform.OS !== 'web') SplashScreen.hide();
      const fade = Animated.timing(cover, {
        toValue: 0, duration: reduced ? 140 : 300, easing: Easing.inOut(Easing.sin), useNativeDriver: true,
      });
      animation = reduced ? fade : Animated.sequence([
        Animated.delay(100),
        Animated.timing(reveal, {
          toValue: 1, duration: 870, easing: Easing.bezier(0.42, 0, 0.20, 1), useNativeDriver: true,
        }),
        Animated.delay(230),
        fade,
      ]);
      animation.start(({ finished }) => { if (active && finished) onFinish(); });
    }
    void start();
    return () => { active = false; animation?.stop(); };
  }, [layoutReady, markReady, wordReady, cover, reveal, onFinish]);

  const slide = reveal.interpolate({ inputRange: [0, 1], outputRange: [wordWidth / 2, 0] });
  // Move the clipping edge while keeping the wordmark aligned with the symbol.
  const clipLeft = reveal.interpolate({ inputRange: [0, 1], outputRange: [-wordWidth, 0] });
  const wordOffset = reveal.interpolate({ inputRange: [0, 1], outputRange: [wordWidth, 0] });

  return (
    <Animated.View
      accessible
      accessibilityLabel="중구청소년센터"
      onLayout={() => setLayoutReady(true)}
      style={[styles.cover, { opacity: cover, backgroundColor: dark ? '#1A1716' : '#FFFEFC' }]}
    >
      <Animated.View style={[styles.row, { width, height, transform: [{ translateX: slide }] }]}>
        <Image
          source={symbol}
          resizeMode="contain"
          fadeDuration={0}
          onLoadEnd={() => setMarkReady(true)}
          style={{ width: mark, height }}
        />
        <View style={[styles.clip, { width: wordWidth, height }]}>
          <Animated.View style={[styles.clip, { width: wordWidth, height, transform: [{ translateX: clipLeft }] }]}>
            <Animated.View style={{ transform: [{ translateX: wordOffset }] }}>
              <Image
                source={dark ? inverse : logo}
                resizeMode="contain"
                fadeDuration={0}
                onLoadEnd={() => setWordReady(true)}
                style={{ width, height, marginLeft: -mark }}
              />
            </Animated.View>
          </Animated.View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  row: { flexDirection: 'row' },
  clip: { overflow: 'hidden' },
});
