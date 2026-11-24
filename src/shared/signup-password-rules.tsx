import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, View } from 'react-native';
import { passwordRules } from '@/domain/signup-feedback';
import { Txt, useTheme } from '~/ds';
import { Icon } from './icon';

function useProgress(active: boolean, reduce: boolean, delay = 0) {
  const value = useRef(new Animated.Value(active ? 1 : 0)).current;
  useEffect(() => {
    const target = active ? 1 : 0;
    if (reduce) {
      value.setValue(target);
      return;
    }
    const animation = Animated.timing(value, {
      toValue: target,
      duration: 250,
      delay: active ? delay : 0,
      useNativeDriver: true,
    });
    animation.start();
    return () => animation.stop();
  }, [active, delay, reduce, value]);
  return value;
}

function Segment({ active, index, reduce }: { active: boolean; index: number; reduce: boolean }) {
  const theme = useTheme();
  const progress = useProgress(active, reduce, index * 50);
  return (
    <View style={{ flex: 1, height: 4, borderRadius: 2, overflow: 'hidden', backgroundColor: theme.line }}>
      <Animated.View
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: theme.action, transformOrigin: 'left', transform: [{ scaleX: progress }] },
        ]}
      />
    </View>
  );
}

function Rule({ label, met, reduce }: { label: string; met: boolean; reduce: boolean }) {
  const theme = useTheme();
  const progress = useProgress(met, reduce);
  return (
    <View style={styles.rule} accessible accessibilityLabel={label + (met ? ' 충족' : ' 미충족')}>
      <View style={[styles.circle, { borderColor: met ? theme.action : theme.lineStrong }]}>
        <Animated.View
          style={[
            styles.check,
            { backgroundColor: theme.action, opacity: progress, transform: [{ scale: progress }] },
          ]}
        >
          <Icon ios="checkmark" android="check" color={theme.onAction} size={10} />
        </Animated.View>
      </View>
      <View>
        <Txt variant="caption" color="textSecondary">
          {label}
        </Txt>
        <Animated.View
          style={[
            styles.strike,
            {
              backgroundColor: theme.textSecondary,
              transformOrigin: 'left',
              transform: [{ scaleX: progress }],
            },
          ]}
        />
      </View>
    </View>
  );
}

export function SignupPasswordRules({ password }: { password: string }) {
  const [reduce, setReduce] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (active) setReduce(v);
    });
    const listener = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      listener.remove();
    };
  }, []);
  const passed = passwordRules.map((rule) => rule.test(password));
  const count = passed.filter(Boolean).length;
  return (
    <View style={{ gap: 4 }}>
      <View
        style={styles.meter}
        accessible
        accessibilityLabel={'비밀번호 조건 ' + passed.length + '개 중 ' + count + '개 충족'}
        accessibilityLiveRegion="polite"
      >
        {passwordRules.map(({ label }, i) => (
          <Segment key={label} active={i < count} index={i} reduce={reduce} />
        ))}
        <Txt variant="caption" color="textSecondary">
          {count} / {passed.length}
        </Txt>
      </View>
      <View style={styles.rules}>
        {passwordRules.map(({ label }, i) => (
          <Rule key={label} label={label} met={passed[i]!} reduce={reduce} />
        ))}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  meter: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  rules: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 16, rowGap: 4 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  circle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: { width: 16, height: 16, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  strike: { position: 'absolute', top: '50%', left: 0, right: 0, height: 1, opacity: 0.65 },
});
