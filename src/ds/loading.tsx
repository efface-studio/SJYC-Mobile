import { StyleSheet, View, type DimensionValue, type ViewStyle } from 'react-native';
import { GUTTER, radius, space, useTheme } from './tokens';

export type LoadingLayout =
  | 'list'
  | 'program'
  | 'club'
  | 'banner'
  | 'gallery'
  | 'detail'
  | 'form'
  | 'account'
  | 'dashboard'
  | 'workflow'
  | 'settings';

function Block({ width, height, style }: { width?: DimensionValue; height?: number; style?: ViewStyle }) {
  const theme = useTheme();
  return <View style={[{ width, height, borderRadius: 4, backgroundColor: theme.line }, style]} />;
}

function Lines({ wide = false }: { wide?: boolean }) {
  return (
    <View style={styles.lines}>
      <Block width={wide ? '88%' : '66%'} height={15} />
      <Block width="44%" height={10} />
    </View>
  );
}

function Rows({ layout }: { layout: LoadingLayout }) {
  const theme = useTheme();
  return (
    <>
      {[0, 1, 2].map((i) => (
        <View key={i} style={[styles.row, { borderColor: theme.line }]}>
          {layout === 'program' && <Block width={76} height={64} style={styles.thumb} />}
          <Lines wide={i === 1} />
          {layout === 'club' && <Block width={80} height={80} style={styles.thumb} />}
          {layout === 'workflow' && <Block width={36} height={14} />}
          {layout === 'settings' && <Block width={48} height={29} style={{ borderRadius: 16 }} />}
        </View>
      ))}
    </>
  );
}

function Body({ layout }: { layout: LoadingLayout }) {
  if (layout === 'banner')
    return (
      <Block
        width="100%"
        style={{ aspectRatio: 354 / 202, minHeight: 190, borderRadius: 12, marginBottom: 8 }}
      />
    );
  if (layout === 'gallery')
    return (
      <View style={styles.columns}>
        {[0, 1].map((i) => (
          <View key={i} style={styles.lines}>
            <Block width="100%" style={{ aspectRatio: 1, borderRadius: radius.md }} />
            <Block width="72%" height={14} />
          </View>
        ))}
      </View>
    );
  if (layout === 'dashboard')
    return (
      <>
        <Block width="32%" height={20} />
        <Rows layout="workflow" />
        <View style={styles.columns}>
          {[0, 1, 2].map((i) => (
            <View key={i} style={styles.lines}>
              <Block width="70%" height={12} />
              <Block width="42%" height={28} />
            </View>
          ))}
        </View>
        <Rows layout="workflow" />
      </>
    );
  if (layout === 'detail')
    return (
      <>
        <Block width="32%" height={12} />
        <Block width="74%" height={28} />
        <Block width="50%" height={14} />
        <View style={styles.article}>
          <Block width="95%" height={14} />
          <Block width="90%" height={14} />
          <Block width="67%" height={14} />
        </View>
      </>
    );
  if (layout === 'form')
    return (
      <>
        {[0, 1, 2].map((i) => (
          <View key={i} style={styles.field}>
            <Block width="25%" height={12} />
            <Block height={52} width="100%" style={styles.thumb} />
          </View>
        ))}
      </>
    );
  if (layout === 'account')
    return (
      <>
        <View style={styles.columns}>
          <Block height={60} width={60} style={{ borderRadius: 30 }} />
          <Lines />
        </View>
        <Rows layout="list" />
      </>
    );
  return <Rows layout={layout} />;
}

/** 장식 도형을 노출하지 않고 읽기 도구에는 로딩 상태 한 번만 전달한다. */
export function LoadingState({ layout = 'list' }: { layout?: LoadingLayout }) {
  return (
    <View
      accessible
      accessibilityLabel="불러오는 중"
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      pointerEvents="none"
      style={layout === 'banner' ? undefined : styles.section}
    >
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={styles.body}>
        <Body layout={layout} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { paddingHorizontal: GUTTER, paddingVertical: space.sm },
  body: { gap: space.md },
  row: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  lines: { flex: 1, gap: space.sm, justifyContent: 'center' },
  columns: { flexDirection: 'row', alignItems: 'center', gap: space.md, marginVertical: space.sm },
  field: { gap: space.sm, marginVertical: space.sm },
  article: { gap: space.md, marginTop: space.xl },
  thumb: { borderRadius: radius.sm },
});
