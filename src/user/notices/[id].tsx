import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { NOTICE_CATEGORY_LABEL } from '@/domain/labels';
import { formatBytes, formatDateTime } from '@/lib/format';
import { Badge, Divider, Gutter, Screen, Tap, Txt, radius, space, useTheme } from '~/ds';
import { Icon } from '~/shared/icon';
import { Article, QueryScreen, isExternal, openExternal } from '~/user-kit';

export default function NoticeScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const notice = useQuery({ queryKey: ['notice', id], queryFn: () => api.notices.get(id) });
  return (
    <QueryScreen query={notice}>
      {(n) => (
        <Screen>
          <Gutter style={styles.head}>
            <View style={styles.meta}>
              <Txt variant="captionStrong" color="action">
                {NOTICE_CATEGORY_LABEL[n.category]}
              </Txt>
              {n.pinned && <Badge text="중요" tone="brand" />}
            </View>
            <Txt variant="title1" accessibilityRole="header">
              {n.title}
            </Txt>
            {n.publishedAt ? (
              <Txt variant="caption" color="textTertiary">
                {formatDateTime(n.publishedAt)}
              </Txt>
            ) : null}
          </Gutter>
          <Divider inset={20} />
          <Gutter style={{ paddingVertical: space.xxl }}>
            <Article>{n.body}</Article>
          </Gutter>
          {n.attachments.length > 0 && (
            <Gutter style={{ gap: space.sm }}>
              <Txt variant="captionStrong" color="textSecondary">
                첨부파일 {n.attachments.length}
              </Txt>
              {n.attachments.map((f) => {
                // 앱은 https 주소만 연다 — 열 수 없는 첨부는 누를 수 있는 모양으로 두지 않는다
                const openable = isExternal(f.url) && f.url.startsWith('https://');
                const row = (
                  <>
                    <Icon ios="paperclip" android="attach_file" color={t.textSecondary} size={16} />
                    <Txt variant="label" numberOfLines={1} style={{ flex: 1 }}>
                      {f.name}
                    </Txt>
                    <Txt variant="caption" color="textTertiary">
                      {openable ? formatBytes(f.size) : `${formatBytes(f.size)} · 앱에서 열 수 없음`}
                    </Txt>
                  </>
                );
                return openable ? (
                  <Tap
                    key={f.id}
                    rounded={radius.md}
                    onPress={() => openExternal(f.url)}
                    accessibilityLabel={`첨부파일 ${f.name} ${formatBytes(f.size)} 열기`}
                    style={[styles.file, { backgroundColor: t.bgSubtle }]}
                  >
                    {row}
                  </Tap>
                ) : (
                  <View
                    key={f.id}
                    accessible
                    accessibilityLabel={`첨부파일 ${f.name} ${formatBytes(f.size)}, 앱에서 열 수 없음`}
                    style={[styles.file, { backgroundColor: t.bgSubtle, borderRadius: radius.md }]}
                  >
                    {row}
                  </View>
                );
              })}
            </Gutter>
          )}
        </Screen>
      )}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  head: { paddingTop: space.xl, paddingBottom: space.xl, gap: space.sm },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  file: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: 14, minHeight: 52 },
});
