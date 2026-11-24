import * as SplashScreen from "expo-splash-screen";
import { useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Image,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  useWindowDimensions,
} from "react-native";

if (Platform.OS !== "web")
  void SplashScreen.preventAutoHideAsync().catch(() => {});

const logo = require("../../assets/brand/wordmark.png");
const inverse = require("../../assets/brand/wordmark-inverse.png");
const symbol = require("../../assets/brand/symbol.png");

export function BrandSplash({ onFinish }: { onFinish: () => void }) {
  const dark = useColorScheme() === "dark";
  const width = Math.min(useWindowDimensions().width - 48, 288);
  const height = (width * 114) / 720;
  const mark = (width * 84) / 720;
  const travel = (width - mark) / 2;
  const reveal = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const [measured, setMeasured] = useState(false);
  const [imagesReady, setImagesReady] = useState({
    symbol: false,
    word: false,
  });
  useEffect(() => {
    if (!measured || !imagesReady.symbol || !imagesReady.word) return;
    let disposed = false;
    let motion: Animated.CompositeAnimation | undefined;
    if (Platform.OS !== "web") SplashScreen.hide();
    async function start() {
      const reduced = await AccessibilityInfo.isReduceMotionEnabled().catch(
        () => false,
      );
      if (disposed) return;
      if (reduced) {
        onFinish();
        return;
      }
      motion = Animated.sequence([
        Animated.delay(200),
        Animated.timing(reveal, {
          toValue: 1,
          duration: 890,
          easing: Easing.inOut(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.delay(230),
        Animated.timing(opacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]);
      motion.start(({ finished }) => {
        if (finished && !disposed) onFinish();
      });
    }
    void start();
    return () => {
      disposed = true;
      motion?.stop();
    };
  }, [
    measured,
    imagesReady.symbol,
    imagesReady.word,
    onFinish,
    opacity,
    reveal,
  ]);
  const offset = (from: number) =>
    reveal.interpolate({ inputRange: [0, 1], outputRange: [from, 0] });
  return (
    <Animated.View
      accessible
      accessibilityLabel="중구청소년센터"
      onLayout={() => setMeasured(true)}
      style={[
        styles.cover,
        { opacity, backgroundColor: dark ? "#1A1716" : "#FFFEFC" },
      ]}
    >
      <View style={{ width, height }} accessible={false}>
        <Animated.View
          style={[
            styles.mask,
            { width, height, transform: [{ translateX: offset(-travel) }] },
          ]}
        >
          <Animated.View
            style={[
              styles.mask,
              {
                left: mark,
                width: width - mark,
                height,
                transform: [{ translateX: offset(travel * 2) }],
              },
            ]}
          >
            <Image
              resizeMode="contain"
              fadeDuration={0}
              source={dark ? inverse : logo}
              style={{ left: -mark, width, height }}
              onLoadEnd={() =>
                setImagesReady((s) => (s.word ? s : { ...s, word: true }))
              }
            />
          </Animated.View>
        </Animated.View>
        <Animated.Image
          resizeMode="contain"
          fadeDuration={0}
          source={symbol}
          style={{
            width: mark,
            height,
            transform: [{ translateX: offset(travel) }],
          }}
          onLoadEnd={() =>
            setImagesReady((s) => (s.symbol ? s : { ...s, symbol: true }))
          }
        />
      </View>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  cover: {
    ...StyleSheet.absoluteFill,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  mask: { position: "absolute", overflow: "hidden" },
});
