import { StyleSheet, View } from 'react-native';
import type { PolicyDoc } from '@/domain/types';
import { formatDate } from '@/lib/format';
import { Txt } from '~/ds';

/** 센터 원문의 빈 줄은 문단, 조 번호·번호 제목은 헤딩으로 보존한다. */
export function PolicyDocument({ doc }: { doc: PolicyDoc }) {
  const paragraphs = doc.body.trim().split(/\r?\n\s*\n/u).filter(Boolean);
  return (
    <View style={styles.document}>
      <Txt variant="caption" color="textSecondary">
        {[doc.effectiveAt && '시행 ' + formatDate(doc.effectiveAt), '최종 수정 ' + formatDate(doc.updatedAt)].filter(Boolean).join(' · ')}
      </Txt>
      {!doc.confirmed && <Txt variant="label" color="textSecondary">센터 확정본 미등록</Txt>}
      {paragraphs.map((block, index) => {
        const [first, ...rest] = block.split(/\r?\n/u);
        const heading = /^(?:제\s*\d+\s*[조장]|\d+[.)]\s|부칙(?:\s|$))/u.test(first ?? '');
        const body = heading ? rest.join('\n') : block;
        return (
          <View key={index} style={styles.section}>
            {heading && <Txt variant="bodyStrong" accessibilityRole="header">{first}</Txt>}
            {!!body && <Txt variant="body" color="textSecondary">{body}</Txt>}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  document: { width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 36, gap: 24 },
  section: { gap: 8 },
});
