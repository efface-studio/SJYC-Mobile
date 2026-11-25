import { Pressable, StyleSheet, View } from 'react-native';
import { GUTTER, Txt, radius, space, useTheme } from '~/ds';
import { modeLabels, modes, setAppearance, useAppearancePreference } from './appearance';
import { notify } from './dialogs';
import { Icon } from './icon';

export function AppearanceRow() {
  const current = useAppearancePreference();
  const theme = useTheme();
  return (
    <View style={styles.section}>
      <Txt variant="label">화면 테마</Txt>
      <View accessibilityRole="radiogroup" accessibilityLabel="화면 테마" style={[styles.group, { backgroundColor: theme.bgSubtle }]}>
        {modes.map((mode) => {
          const selected = current === mode;
          return (
            <Pressable
              key={mode}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={modeLabels[mode]}
              onPress={() => {
                if (selected) return;
                try { setAppearance(mode); }
                catch { notify('테마를 저장하지 못했어요', '기기 저장 공간을 확인해 주세요.'); }
              }}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: selected ? theme.card : 'transparent',
                  borderColor: selected ? theme.lineStrong : 'transparent',
                  opacity: pressed ? 0.75 : 1,
                },
              ]}
            >
              {selected && <Icon ios="checkmark" android="check" color={theme.action} size={14} />}
              <Txt variant={selected ? 'captionStrong' : 'caption'} color={selected ? 'action' : 'textSecondary'}>
                {mode === 'system' ? '시스템' : modeLabels[mode]}
              </Txt>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: GUTTER, paddingVertical: space.md, gap: space.sm },
  group: { flexDirection: 'row', padding: 3, gap: 2, borderRadius: radius.md },
  option: {
    flex: 1, minHeight: 44, paddingVertical: 8, paddingHorizontal: 2,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 3,
    borderRadius: radius.sm, borderWidth: 1,
  },
});
