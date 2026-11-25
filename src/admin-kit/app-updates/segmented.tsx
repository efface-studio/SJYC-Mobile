import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  Pressable,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';

import * as Haptics from 'expo-haptics';
import { useTheme } from '~/ds/tokens';
import { Txt as Text } from '~/ds/text';

const PAD = 2;

/**
 * 같은 옵션 묶음의 직전 선택 위치. 탭마다 다른 목록을 그려 세그먼트가 새로 마운트돼도
 * (관리자 목록 머리 등) 직전 자리에서 미끄러져 오게 한다
 */
const lastIndex = new Map<string, number>();

/** iOS 세그먼트 컨트롤 모양의 보기 전환 (2~4개). 선택 표시가 옆으로 미끄러진다 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  const t = useTheme();
  const [width, setWidth] = useState(0);
  const seg = width > 0 ? (width - PAD * 2) / options.length : 0;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  const memoryKey = options.map((o) => o.value).join('|');
  const x = useRef(new Animated.Value(0)).current;
  const dark = useColorScheme() === 'dark';
  const [placed, setPlaced] = useState(false);

  useEffect(() => {
    if (!seg) return;
    let active = true;
    if (!placed) {
      x.setValue((lastIndex.get(memoryKey) ?? index) * seg);
      setPlaced(true);
    }
    lastIndex.set(memoryKey, index);
    void AccessibilityInfo.isReduceMotionEnabled().then((reduce) => {
      if (!active) return;
      if (reduce) x.setValue(seg * index);
      else
        Animated.timing(x, {
          toValue: seg * index,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }).start();
    });
    return () => {
      active = false;
      x.stopAnimation();
    };
  }, [index, seg, placed, x, memoryKey]);
  const height = 32;
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={label}
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
      style={[styles.track, { height, backgroundColor: t.bgSubtle }]}
    >
      {seg > 0 && (
        <Animated.View
          style={[
            styles.thumb,
            { transform: [{ translateX: x }] },
            {
              width: seg,
              height: height - PAD * 2,
              backgroundColor: dark ? '#34343C' : t.bg,
              borderColor: t.line,
            },
          ]}
        />
      )}
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (on) return;
              void Haptics.selectionAsync().catch(() => undefined);
              onChange(o.value);
            }}
            style={styles.item}
          >
            <Text variant="label" color={on ? 'text' : 'textSecondary'} numberOfLines={1}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', padding: PAD, borderRadius: 9 },
  thumb: {
    position: 'absolute',
    top: PAD,
    left: PAD,
    borderRadius: 7,
    borderWidth: StyleSheet.hairlineWidth,
  },
  item: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 8 },
});
