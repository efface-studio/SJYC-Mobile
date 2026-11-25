import { useAppColorScheme } from '~/shared/appearance';
import { BlurTargetView, BlurView } from 'expo-blur';
import { useRef, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

export function ScrollBackdrop({ height, children }: { height: number; children: ReactNode }) {
  const target = useRef<View>(null);
  const dark = useAppColorScheme() === 'dark';
  if (height <= 0) return <>{children}</>;
  return (
    <View style={styles.fill}>
      <BlurTargetView ref={target} style={styles.fill}>
        {children}
      </BlurTargetView>
      <BlurView
        pointerEvents="none"
        importantForAccessibility="no-hide-descendants"
        blurTarget={target}
        blurMethod="dimezisBlurViewSdk31Plus"
        intensity={32}
        tint={dark ? 'dark' : 'light'}
        style={[styles.bar, { height }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  bar: { position: 'absolute', left: 0, top: 0, right: 0 },
});
