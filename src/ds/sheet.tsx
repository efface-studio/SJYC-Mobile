import { useSyncExternalStore } from 'react';
import { ActionSheetIOS, Modal, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Txt } from './text';
import { GUTTER, radius, useTheme } from './tokens';

interface SheetState {
  title: string;
  options: string[];
  selected?: number;
  resolve: (index: number | null) => void;
}

let current: SheetState | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

/**
 * 선택지 고르기 — iOS 는 시스템 액션 시트, Android 는 Material 바텀 시트 형태.
 * 선택지 수 제한이 없다. 취소하면 null.
 */
export function pickOption(title: string, options: string[], selected?: number): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options, '취소'], cancelButtonIndex: options.length },
        (i) => resolve(i === options.length ? null : i),
      );
      return;
    }
    current = { title, options, selected, resolve };
    emit();
  });
}

function close(index: number | null) {
  current?.resolve(index);
  current = null;
  emit();
}

/** Android 바텀 시트 호스트 — 루트 레이아웃에 한 번 렌더링한다 */
export function OptionSheetHost() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const sheet = useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => current,
  );
  if (!sheet) return null;
  return (
    <Modal visible transparent animationType="slide" onRequestClose={() => close(null)} statusBarTranslucent>
      <Pressable
        accessibilityLabel="닫기"
        style={[styles.backdrop, { backgroundColor: t.overlay }]}
        onPress={() => close(null)}
      />
      <View style={[styles.panel, { backgroundColor: t.card, paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={[styles.handle, { backgroundColor: t.lineStrong }]} />
        <Txt variant="title3" style={styles.title}>
          {sheet.title}
        </Txt>
        <ScrollView style={{ maxHeight: 420 }}>
          {sheet.options.map((o, i) => (
            <Pressable
              key={`${o}-${i}`}
              accessibilityRole="button"
              accessibilityState={{ selected: sheet.selected === i }}
              android_ripple={{ color: t.pressed }}
              onPress={() => close(i)}
              style={styles.option}
            >
              <Txt
                variant={sheet.selected === i ? 'bodyStrong' : 'body'}
                color={sheet.selected === i ? 'action' : 'text'}
              >
                {o}
              </Txt>
            </Pressable>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  panel: { borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, paddingTop: 8 },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginBottom: 8 },
  title: { paddingHorizontal: GUTTER, paddingVertical: 12 },
  option: { paddingHorizontal: GUTTER, paddingVertical: 16 },
});
