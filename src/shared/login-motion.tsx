import { Image, useImage } from 'expo-image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';
import { Txt, useTheme } from '~/ds';

type Phase = 'idle' | 'loading' | 'success' | 'error';
const ease = Easing.out(Easing.cubic);

export function useLoginMotion() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [attempt, setAttempt] = useState(0);
  const [reduce, setReduce] = useState(true);
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitOnExit = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    mounted.current = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted.current) setReduce(v);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      mounted.current = false;
      sub.remove();
      clearTimeout(timer.current);
      commitOnExit.current?.();
      commitOnExit.current = undefined;
    };
  }, []);
  return {
    phase,
    attempt,
    reduce,
    start() {
      setPhase('loading');
    },
    fail() {
      setAttempt((n) => n + 1);
      setPhase('error');
    },
    finish(commit: () => void, navigate?: () => void) {
      if (!mounted.current) {
        commit();
        return;
      }
      setPhase('success');
      const complete = () => {
        commitOnExit.current = undefined;
        commit();
        navigate?.();
      };
      if (reduce) {
        complete();
        return;
      }
      commitOnExit.current = commit;
      timer.current = setTimeout(complete, 400);
    },
  };
}

export function AuthReveal({
  children,
  delay,
  reduce,
}: {
  children: ReactNode;
  delay: number;
  reduce: boolean;
}) {
  const progress = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduce) {
      progress.setValue(1);
      return;
    }
    progress.setValue(0);
    const motion = Animated.timing(progress, {
      toValue: 1,
      duration: 460,
      delay,
      easing: ease,
      useNativeDriver: true,
    });
    motion.start();
    return () => motion.stop();
  }, [delay, reduce, progress]);
  return (
    <Animated.View
      style={{
        opacity: progress,
        transform: [{ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [12, 0] }) }],
      }}
    >
      {children}
    </Animated.View>
  );
}

export function LoginSubmit({
  motion,
  onPress,
  disabled,
}: {
  motion: ReturnType<typeof useLoginMotion>;
  onPress: () => void;
  disabled?: boolean;
}) {
  const t = useTheme();
  const { phase, attempt, reduce } = motion;
  const progress = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(1);
  const check = useImage(require('../../assets/icons/login-check.svg'));
  const loading = phase === 'loading';
  const success = phase === 'success';
  const failed = phase === 'error';
  const label = loading ? '확인 중' : success ? '로그인 완료' : failed ? '다시 시도' : '로그인';
  useEffect(() => {
    progress.setValue(0);
    if (reduce || (phase !== 'loading' && phase !== 'error')) return;
    const step = Animated.timing(progress, {
      toValue: 1,
      duration: phase === 'loading' ? 1000 : 400,
      easing: phase === 'loading' ? Easing.inOut(Easing.ease) : ease,
      useNativeDriver: true,
      isInteraction: false,
    });
    const animation = phase === 'loading' ? Animated.loop(step) : step;
    animation.start();
    return () => animation.stop();
  }, [phase, attempt, reduce, progress]);
  const offset = progress.interpolate({
    inputRange: [0, 0.16, 0.32, 0.48, 0.64, 0.82, 1],
    outputRange: [0, -6, 6, -4, 4, -2, 0],
  });
  const fg = failed ? t.tone.danger.fg : t.onAction;
  return (
    <Animated.View style={{ transform: [{ translateX: failed && !reduce ? offset : 0 }] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityState={{ busy: loading, disabled: disabled || loading || success }}
        disabled={disabled || loading || success}
        onPress={onPress}
        onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
        style={({ pressed }) => [
          styles.button,
          {
            backgroundColor: failed ? t.tone.danger.bg : t.action,
            borderRadius: loading || success ? 27 : 8,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        {loading && !reduce && (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.sweep,
              {
                width: width / 3,
                transform: [
                  {
                    translateX: progress.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-width / 3, width],
                    }),
                  },
                ],
              },
            ]}
          />
        )}
        <View style={[styles.result, success && styles.successResult]} accessibilityLiveRegion="polite">
          {loading && (
            <View style={styles.dots}>
              {[0, 1, 2].map((i) => (
                <Animated.View
                  key={i}
                  style={[
                    styles.dot,
                    {
                      backgroundColor: fg,
                      transform: [
                        {
                          translateY: reduce
                            ? 0
                            : progress.interpolate({
                                inputRange: [0, 0.15 + i * 0.12, 0.28 + i * 0.12, 0.42 + i * 0.12, 1],
                                outputRange: [0, 0, -3, 0, 0],
                              }),
                        },
                      ],
                    },
                  ]}
                />
              ))}
            </View>
          )}
          {success && (
            <Image source={check} tintColor={fg} style={styles.check} accessible={false} />
          )}
          <Txt variant="title3" color={fg}>
            {label}
          </Txt>
        </View>
      </Pressable>
    </Animated.View>
  );
}
const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  result: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  successResult: { gap: 6 },
  check: { width: 20, height: 20 },
  dots: { flexDirection: 'row', gap: 3 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  sweep: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    experimental_backgroundImage: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.22), transparent)',
  },
});
