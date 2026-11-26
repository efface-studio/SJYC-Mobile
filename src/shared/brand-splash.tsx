import { useAppColorScheme } from '~/shared/appearance';
import * as SplashScreen from 'expo-splash-screen';
import type { UpdateSplashState } from './ota-startup';
import { ThemeAudience, useTheme } from '~/ds/tokens';
import { useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';

if (Platform.OS !== 'web') void SplashScreen.preventAutoHideAsync().catch(() => {});

const logo = require('../../assets/brand/wordmark.png');
const inverse = require('../../assets/brand/wordmark-inverse.png');
const userSymbol = require('../../assets/brand/symbol.png');
const adminSymbol = require('../../assets/brand/symbol-admin.png');

type SplashProps = {
  update: UpdateSplashState | null;
  onFinish?: () => void;
  retry: () => void;
  skip: () => void;
};

export function BrandSplash({ onFinish, update, retry, skip }: SplashProps) {
  const t = useTheme();
  const symbol = useContext(ThemeAudience) === 'admin' ? adminSymbol : userSymbol;
  const dark = useAppColorScheme() === 'dark';
  const width = Math.min(useWindowDimensions().width - 48, 288);
  const height = width * 114 / 720;
  const mark = width * 84 / 720;
  const wordWidth = width - mark;
  const reveal = useRef(new Animated.Value(onFinish ? 0 : 1)).current;
  const cover = useRef(new Animated.Value(1)).current;
  const [revealed, setRevealed] = useState(false);
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
      if (reduced || !onFinish) { reveal.setValue(1); setRevealed(true); return; }
      animation = Animated.sequence([
        Animated.delay(100),
        Animated.timing(reveal, {
          toValue: 1, duration: 870, easing: Easing.bezier(0.42, 0, 0.20, 1), useNativeDriver: true,
        }),
        Animated.delay(230),
      ]);
      animation.start(({ finished }) => { if (active && finished) setRevealed(true); });
    }
    void start();
    return () => { active = false; animation?.stop(); };
  }, [layoutReady, markReady, wordReady, reveal, onFinish]);

  useEffect(() => {
    if (!revealed || update || !onFinish) { cover.setValue(1); return; }
    const fade = Animated.timing(cover, { toValue: 0, duration: 220, useNativeDriver: true });
    fade.start(({ finished }) => { if (finished) onFinish(); });
    return () => fade.stop();
  }, [revealed, update, onFinish, cover]);

  const slide = reveal.interpolate({ inputRange: [0, 1], outputRange: [wordWidth / 2, 0] });
  // Move the clipping edge while keeping the wordmark aligned with the symbol.
  const clipLeft = reveal.interpolate({ inputRange: [0, 1], outputRange: [-wordWidth, 0] });
  const wordOffset = reveal.interpolate({ inputRange: [0, 1], outputRange: [wordWidth, 0] });

  return (
    <Animated.View
      accessibilityViewIsModal
      onLayout={() => setLayoutReady(true)}
      style={[styles.cover, { opacity: cover, backgroundColor: t.bg }]}
    >
      <Animated.View accessible accessibilityLabel="중구청소년센터" style={[styles.row, { width, height, transform: [{ translateX: slide }] }]}>
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
      {update && update.phase !== 'checking' && (
        <View style={[styles.details, { width }]}>
          {update.phase === 'error' ? (
            <>
              <Text accessibilityRole="alert" style={[styles.label, { color: t.text }]}>업데이트를 마치지 못했어요</Text>
              <Text style={[styles.notes, { color: t.textSecondary }]}>인터넷 연결을 확인해 주세요.</Text>
              <View style={styles.actions}>
                <Pressable accessibilityRole="button" onPress={retry} style={styles.button}>
                  <Text style={[styles.label, { color: t.tone.brand.fg }]}>다시 시도</Text>
                </Pressable>
                <Pressable accessibilityRole="button" onPress={skip} style={styles.button}>
                  <Text style={{ color: t.textSecondary }}>현재 버전으로 계속</Text>
                </Pressable>
              </View>
            </>
          ) : (
            <View accessible accessibilityRole="progressbar" accessibilityLabel="앱 업데이트"
              accessibilityValue={{ min: 0, max: 100, now: update.percent }}>
              <View style={styles.status}>
                <Text style={[styles.label, { color: t.text }]}>{update.phase === 'applying' ? '업데이트 적용 중' : '업데이트 다운로드 중'}</Text>
                <Text style={[styles.percent, { color: t.tone.brand.fg }]}>{update.percent}%</Text>
              </View>
              <View style={[styles.track, { backgroundColor: t.line }]}>
                <View style={[styles.fill, { backgroundColor: t.tone.brand.fill, width: `${update.percent}%` }]} />
              </View>
            </View>
          )}
          {'notes' in update && !!update.notes && <Text style={[styles.notes, { color: t.textSecondary }]}>{update.notes}</Text>}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cover: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  row: { flexDirection: 'row' },
  details: { marginTop: 32, gap: 10 },
  status: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 },
  label: { fontSize: 15, fontWeight: '600', flexShrink: 1 },
  percent: { fontSize: 15, fontWeight: '700', fontVariant: ['tabular-nums'] },
  track: { height: 5, borderRadius: 3, overflow: 'hidden', marginTop: 10 },
  fill: { height: '100%', borderRadius: 3 },
  notes: { fontSize: 13, lineHeight: 20 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 20 },
  button: { minHeight: 44, justifyContent: 'center' },
  clip: { overflow: 'hidden' },
});
