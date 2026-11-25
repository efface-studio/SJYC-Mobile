import { SegmentedControl } from '@expo/ui/community/segmented-control';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * 누른 뒤 OS 컨트롤이 알약을 옮기는 시간. 그동안은 부모에 알리지 않는다 — 부모가 곧바로 화면을
 * 다시 그리거나(목록 교체) 컨트롤을 새로 만들면 애니메이션이 끊겨 알약이 툭 바뀐다.
 */
const SETTLE_MS = 250;

/**
 * 보기 전환(2~4개) — OS 기본 세그먼트 컨트롤.
 * iOS 는 UISegmentedControl(SwiftUI segmented Picker), Android 는 Material 3 SegmentedButton, 웹은 같은 모양의 대체.
 * 5개 이상이면 Chips 나 헤더 필터 메뉴를 쓴다.
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  style,
}: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (v: T) => void;
  /** 스크린리더 이름(예: '보기') */
  label: string;
  style?: StyleProp<ViewStyle>;
}) {
  // 누른 값을 먼저 여기서 보여 주고, 알약이 다 옮겨진 뒤 부모에 넘긴다.
  const [pending, setPending] = useState<T | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const shown = pending ?? value;
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === shown),
  );

  return (
    <View accessibilityLabel={label} style={style}>
      <SegmentedControl
        values={options.map((o) => o.label)}
        selectedIndex={index}
        onChange={(e) => {
          const next = options[e.nativeEvent.selectedSegmentIndex];
          if (!next || next.value === shown) return;
          setPending(next.value);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => {
            timer.current = null;
            setPending(null);
            if (next.value !== value) onChange(next.value);
          }, SETTLE_MS);
        }}
        style={styles.control}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  control: { alignSelf: 'stretch' },
});
