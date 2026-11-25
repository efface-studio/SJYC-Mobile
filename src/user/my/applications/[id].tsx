import { openScreen } from '~/shared/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { APPLICATION_STATUS } from '@/domain/labels';
import type { StatusHistoryEntry } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  Gutter,
  InfoRow,
  Screen,
  SectionHeader,
  StickyFooter,
  Tap,
  Txt,
  space,
  useTheme,
} from '~/ds';
import { confirm, notify } from '~/shared/dialogs';
import { Callout, Hero, QueryScreen } from '~/user-kit';

const ACTOR = { applicant: '신청자', staff: '센터', system: '시스템' } as const;

function History({ items }: { items: StatusHistoryEntry[] }) {
  const t = useTheme();
  return (
    <Gutter>
      {items.map((h, i) => {
        const s = APPLICATION_STATUS[h.status];
        const last = i === items.length - 1;
        return (
          <View key={i} style={styles.hRow}>
            <View style={styles.hRail}>
              <View style={[styles.hDot, { backgroundColor: last ? t.tone[s.tone].fg : t.lineStrong }]} />
              {!last && <View style={[styles.hLine, { backgroundColor: t.line }]} />}
            </View>
            <View style={{ flex: 1, gap: 2, paddingBottom: space.lg }}>
              <Txt variant="label">
                {s.text} · {ACTOR[h.actor]}
              </Txt>
              <Txt variant="small" color="textTertiary">
                {formatDateTime(h.at)}
              </Txt>
              {h.reason ? (
                <Txt variant="caption" color="textSecondary">
                  사유: {h.reason}
                </Txt>
              ) : null}
            </View>
          </View>
        );
      })}
    </Gutter>
  );
}

export default function MyApplicationScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const qc = useQueryClient();
  const app = useQuery({ queryKey: ['my-application', id], queryFn: () => api.me.application(id) });
  const cancel = useMutation({
    mutationFn: () => api.me.cancelApplication(id),
    onSuccess: (updated) => {
      qc.setQueryData(['my-application', id], updated);
      void qc.invalidateQueries({ queryKey: ['my-applications'] });
      void qc.invalidateQueries({ queryKey: ['programs'] });
    },
    onError: (e) => notify('취소하지 못했습니다', errorMessage(e)),
  });

  const onCancel = async () => {
    const ok = await confirm({
      title: '신청을 취소할까요?',
      message: '취소 후 정원이 마감되면 다시 신청하지 못할 수 있습니다.',
      confirmLabel: '신청 취소',
      cancelLabel: '유지',
      destructive: true,
    });
    if (ok) cancel.mutate();
  };

  return (
    <QueryScreen query={app}>
      {(a) => {
        const s = APPLICATION_STATUS[a.status];
        return (
          <Screen
            footer={
              a.cancellable ? (
                <StickyFooter>
                  <Button
                    label="신청 취소"
                    variant="danger"
                    onPress={() => void onCancel()}
                    loading={cancel.isPending}
                  />
                </StickyFooter>
              ) : undefined
            }
          >
            <Hero title={a.programTitle}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
                <Badge text={s.text} tone={s.tone} />
                <Txt variant="caption" color="textTertiary">
                  접수 번호 {a.receiptNo ?? '센터 확인 후 안내'}
                </Txt>
              </View>
              <Tap
                onPress={() => openScreen(`/programs/${a.programId}`)}
                accessibilityLabel="프로그램 상세 보기"
                style={{ alignSelf: 'flex-start', paddingVertical: 8 }}
              >
                <Txt variant="captionStrong" color="action">
                  프로그램 상세 보기
                </Txt>
              </Tap>
            </Hero>
            <SectionHeader title="신청 정보" />
            <Gutter>
              <InfoRow label="신청자" value={a.applicantName} />
              <InfoRow label="연락처" value={a.phone} />
              <InfoRow label="요청 사항" value={a.note || '없음'} />
            </Gutter>
            <SectionHeader title="처리 이력" />
            <History items={a.history} />
            {!a.cancellable && (
              <Gutter style={{ paddingTop: space.sm }}>
                <Callout title="온라인 취소 불가">
                  취소 기한이 지났거나 이미 처리된 신청입니다. 센터로 문의해 주세요.
                </Callout>
              </Gutter>
            )}
          </Screen>
        );
      }}
    </QueryScreen>
  );
}

const styles = StyleSheet.create({
  hRow: { flexDirection: 'row', gap: space.md },
  hRail: { width: 12, alignItems: 'center', paddingTop: 5 },
  hDot: { width: 10, height: 10, borderRadius: 5 },
  hLine: { width: 2, flex: 1, marginTop: 4 },
});
