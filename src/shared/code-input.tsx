import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, TextInput, View } from 'react-native';
import { Txt, useTheme } from '~/ds';
import { Image } from 'expo-image';

type Phase = 'idle' | 'verifying' | 'success' | 'error';
export function useReducedMotion() {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduce(enabled);
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => { active = false; listener.remove(); };
  }, []);
  return reduce;
}

export function CodeInput({
  length = 6,
  label = '인증 코드',
  code,
  onChange,
  phase,
  reduce,
  disabled,
}: {
  length?: 4 | 6;
  label?: string;
  code: string;
  onChange: (s: string) => void;
  phase: Phase;
  reduce: boolean;
  disabled: boolean;
}) {
  const t = useTheme(),
    [width, setWidth] = useState(0),
    [focus, setFocus] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    progress.setValue(0);
    if (reduce || phase === 'idle') return;
    const single = Animated.timing(progress, {
      toValue: 1,
      duration: phase === 'success' ? 1100 : phase === 'error' ? 420 : 850,
      easing: Easing.linear,
      useNativeDriver: true,
    });
    const sequence = phase === 'verifying' ? Animated.loop(single) : single;
    sequence.start();
    return () => sequence.stop();
  }, [phase, reduce, progress]);
  const errorX =
    !reduce && phase === 'error'
      ? progress.interpolate({ inputRange: [0, 0.2, 0.44, 0.68, 1], outputRange: [0, -7, 6, -3, 0] })
      : 0;
  return (
    <Animated.View
      style={{ transform: [{ translateX: errorX }] }}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      <View
        style={{ flexDirection: 'row', gap: 6 }}
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
      >
        {Array.from({ length }, (_, i) => {
          const start = i * 0.04;
          const collapse = phase === 'success';
          const x =
            collapse && !reduce
              ? progress.interpolate({
                  inputRange: [0, 0.48 + start, 0.8 + start, 1.01],
                  outputRange: [0, 0, (((length - 1) / 2 - i) * (width + 6)) / length, (((length - 1) / 2 - i) * (width + 6)) / length],
                })
              : 0;
          const y =
            phase === 'verifying' && !reduce
              ? progress.interpolate({
                  inputRange: [0, 0.02 + i * 0.1, 0.18 + i * 0.1, 0.34 + i * 0.1, 1],
                  outputRange: [0, 0, -3, 0, 0],
                })
              : 0;
          const fade = collapse
            ? reduce
              ? 0
              : progress.interpolate({
                  inputRange: [0, 0.48 + start, 0.8 + start, 1.01],
                  outputRange: [1, 1, 0, 0],
                })
            : 1;
          const scale =
            collapse && !reduce
              ? progress.interpolate({
                  inputRange: [0, 0.15 + start, 0.48 + start, 0.8 + start, 1.01],
                  outputRange: [1, 1.06, 1, 0.25, 0.25],
                })
              : 1;
          return (
            <Animated.View
              key={i}
              style={{
                flex: 1,
                minWidth: 0,
                height: 54,
                borderRadius: 9,
                borderWidth: focus && i === Math.min(code.length, length - 1) ? 2 : 1,
                borderColor:
                  phase === 'error' || collapse || (focus && i === Math.min(code.length, length - 1))
                    ? t.action
                    : t.line,
                backgroundColor: collapse ? t.action : t.bg,
                alignItems: 'center',
                justifyContent: 'center',
                opacity: fade,
                transform: [{ translateX: x }, { translateY: y }, { scale }],
              }}
            >
              <Txt variant="title2" color={collapse ? t.onAction : t.text}>
                {code[i] ?? ''}
              </Txt>
            </Animated.View>
          );
        })}
      </View>
      {phase === 'success' && (
        <Animated.View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            {
              alignItems: 'center',
              justifyContent: 'center',
              opacity: reduce ? 1 : progress.interpolate({ inputRange: [0, 0.8, 1], outputRange: [0, 0, 1] }),
            },
          ]}
        >
          <View
            style={{
              height: 48,
              width: 48,
              borderRadius: 24,
              backgroundColor: t.action,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Image
              source={require('../../assets/icons/login-check.svg')}
              tintColor={t.onAction}
              accessible={false}
              style={{ width: 26, height: 26 }}
            />
          </View>
        </Animated.View>
      )}
      <TextInput
        accessibilityLabel={label}
        value={code}
        onChangeText={onChange}
        editable={!disabled}
        keyboardType="number-pad"
        textContentType={length === 6 ? 'oneTimeCode' : 'none'}
        autoComplete={length === 6 ? 'one-time-code' : 'off'}
        caretHidden
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={[
          StyleSheet.absoluteFill,
          { color: 'transparent', backgroundColor: 'transparent', fontSize: 20 },
        ]}
      />
    </Animated.View>
  );
}
