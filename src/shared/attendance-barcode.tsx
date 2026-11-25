import JsBarcode from 'jsbarcode';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

/** 네 자리 숫자(선행 0 포함)를 Code 128 C로 표시한다. 양끝 여백은 최소 10모듈이다. */
export function AttendanceBarcode({ code }: { code: string }) {
  const bars = useMemo(() => {
    const target: { encodings?: { data: string }[] } = {};
    JsBarcode(target, code, { format: 'CODE128C', displayValue: false });
    return (
      target.encodings
        ?.map((part) => part.data)
        .join('')
        .match(/1+|0+/g) ?? []
    );
  }, [code]);
  return (
    <View accessible accessibilityLabel="회원 출석용 바코드" style={styles.background}>
      {bars.map((run, i) => (
        <View
          key={i}
          style={{
            width: run.length * (code.length > 4 ? 1.5 : 2),
            height: 56,
            backgroundColor: run[0] === '1' ? '#000' : '#FFF',
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  background: {
    alignSelf: 'center',
    flexDirection: 'row',
    paddingHorizontal: 22,
    paddingVertical: 10,
    backgroundColor: '#FFF',
  },
});
