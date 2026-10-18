import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS } from '@/domain/labels';
import { formatDateTime } from '@/lib/format';
import { Badge, Card, Divider, Gutter, Screen, Txt, space } from '~/ds';
import { Article, QueryScreen } from '~/user-kit';

export default function InquiryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const inquiry = useQuery({ queryKey: ['my-inquiry', id], queryFn: () => api.me.inquiry(id) });
  return (
    <QueryScreen query={inquiry}>
      {(q) => {
        const s = INQUIRY_STATUS[q.status];
        return (
          <Screen onRefresh={() => inquiry.refetch()}>
            <Gutter style={styles.head}>
              <View style={styles.meta}>
                <Badge text={s.text} tone={s.tone} />
                <Txt variant="caption" color="textTertiary">
                  {INQUIRY_CATEGORY_LABEL[q.category]} · {formatDateTime(q.createdAt)}
                </Txt>
              </View>
              <Txt variant="title2" accessibilityRole="header">
                {q.title}
              </Txt>
            </Gutter>
            <Gutter style={{ paddingBottom: space.xxl }}>
              <Article>{q.body}</Article>
            </Gutter>
            <Divider />
            <Gutter style={{ paddingTop: space.xxl }}>
              {q.answer ? (
                <View style={{ gap: space.sm }}>
                  <View style={styles.answerHead}>
                    <Txt variant="title3" accessibilityRole="header">
                      센터 답변
                    </Txt>
                    <Txt variant="small" color="textTertiary">
                      {formatDateTime(q.answer.answeredAt)}
                    </Txt>
                  </View>
                  <Article>{q.answer.body}</Article>
                </View>
              ) : (
                <Card tone="subtle" style={{ gap: 4 }}>
                  <Txt variant="bodyStrong">답변 대기 중입니다</Txt>
                  <Txt variant="caption" color="textTertiary">
                    담당자가 확인 후 답변을 등록하면 이곳에 표시됩니다.
                  </Txt>
                </Card>
              )}
            </Gutter>
          </Screen>
        );
      }}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xl, paddingBottom: space.lg, gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  answerHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
