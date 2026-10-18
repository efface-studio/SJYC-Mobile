import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Linking, StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { CENTER } from '@/config/center';
import { INQUIRY_CATEGORY_LABEL, INQUIRY_STATUS } from '@/domain/labels';
import type { Faq } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Divider,
  Gutter,
  ListRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  space,
  useTheme,
} from '~/ds';
import { Icon } from '~/shared/icon';
import { Rows } from '~/user-kit';

function FaqItem({ f, open, onToggle }: { f: Faq; open: boolean; onToggle: () => void }) {
  const t = useTheme();
  return (
    <View>
      <Tap
        onPress={onToggle}
        accessibilityLabel={`${f.question}, ${open ? '답변 접기' : '답변 펼치기'}`}
        style={styles.q}
      >
        <Txt variant="bodyStrong" color="action">
          Q
        </Txt>
        <View style={{ flex: 1, gap: 2 }}>
          <Txt variant="small" color="textTertiary">
            {INQUIRY_CATEGORY_LABEL[f.category]}
          </Txt>
          <Txt variant="bodyStrong">{f.question}</Txt>
        </View>
        <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
          <Icon ios="chevron.down" android="expand_more" color={t.textTertiary} size={16} />
        </View>
      </Tap>
      {open && (
        <View style={[styles.a, { backgroundColor: t.bgSubtle }]}>
          <Txt variant="bodyStrong" color="textTertiary">
            A
          </Txt>
          <Txt variant="label" color="textSecondary" style={{ flex: 1, lineHeight: 23 }}>
            {f.answer}
          </Txt>
        </View>
      )}
    </View>
  );
}

export default function QnaScreen() {
  const { data: session } = useSession();
  const [openId, setOpenId] = useState<string | null>(null);
  const faqs = useQuery({ queryKey: ['faqs'], queryFn: () => api.faqs.list() });
  const mine = useQuery({
    queryKey: ['my-inquiries'],
    queryFn: () => api.me.inquiries(),
    enabled: !!session,
  });

  return (
    <Screen onRefresh={() => Promise.all([faqs.refetch(), session ? mine.refetch() : null])}>
      <SectionHeader title="자주 묻는 질문" />
      <QueryBoundary query={faqs} isEmpty={(d) => d.length === 0} empty={{ title: '등록된 질문이 없습니다' }}>
        {(data) => (
          <Rows>
            {data.map((f) => (
              <FaqItem
                key={f.id}
                f={f}
                open={openId === f.id}
                onToggle={() => setOpenId(openId === f.id ? null : f.id)}
              />
            ))}
          </Rows>
        )}
      </QueryBoundary>

      <SectionHeader title="1:1 문의" />
      {session ? (
        <QueryBoundary
          query={mine}
          isEmpty={(d) => d.length === 0}
          empty={{
            title: '작성한 문의가 없습니다',
            description: '궁금한 점을 남겨 주시면 담당자가 답변해 드립니다.',
          }}
        >
          {(data) => (
            <Rows>
              {data.map((q) => {
                const s = INQUIRY_STATUS[q.status];
                return (
                  <ListRow
                    key={q.id}
                    meta={`${INQUIRY_CATEGORY_LABEL[q.category]} · ${formatDate(q.createdAt)}`}
                    title={q.title}
                    trailing={<Badge text={s.text} tone={s.tone} />}
                    onPress={() => router.push(`/qna/${q.id}`)}
                  />
                );
              })}
            </Rows>
          )}
        </QueryBoundary>
      ) : (
        <Gutter style={{ paddingBottom: space.sm }}>
          <Txt variant="caption" color="textTertiary">
            1:1 문의는 로그인 후 작성할 수 있으며, 답변은 본인만 볼 수 있습니다.
          </Txt>
        </Gutter>
      )}
      <Gutter style={{ paddingTop: space.md }}>
        <Button
          label={session ? '문의하기' : '로그인하고 문의하기'}
          variant={session ? 'primary' : 'secondary'}
          onPress={() => router.push(session ? '/qna/new' : '/login')}
        />
      </Gutter>

      <View style={{ marginTop: space.xxl }}>
        <Divider />
        <ListRow
          meta="급한 문의는 전화로"
          title={`대표번호 ${CENTER.telDisplay}`}
          onPress={() => void Linking.openURL(`tel:${CENTER.tel}`)}
        />
        <Divider />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  q: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 56,
  },
  a: { flexDirection: 'row', gap: space.md, paddingHorizontal: 20, paddingVertical: 16 },
});
