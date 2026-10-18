import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { APPLICATION_STATUS } from '@/domain/labels';
import type { ProgramApplication, StatusHistoryEntry } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { ButtonPair, DetailHeader, NoPermission, TextBlock, useCan } from '~/admin-kit/components';
import { useDecision } from '~/admin-kit/decision';
import {
  Button,
  Divider,
  Gutter,
  InfoRow,
  QueryBoundary,
  Screen,
  SectionHeader,
  StickyFooter,
  Txt,
  space,
  useTheme,
} from '~/ds';

const ACTOR: Record<StatusHistoryEntry['actor'], string> = {
  applicant: '신청자',
  staff: '센터',
  system: '시스템',
};

export default function ApplicationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('application.decide');
  const query = useQuery({
    queryKey: ['admin', 'application', id],
    queryFn: () => api.admin.applications.get(id),
    enabled: allowed,
  });

  if (!allowed) return <NoPermission />;
  return <QueryBoundary query={query}>{(a) => <ApplicationView a={a} />}</QueryBoundary>;
}

function ApplicationView({ a }: { a: ProgramApplication }) {
  const decision = useDecision('application');
  return (
    <Screen
      footer={
        a.status === 'submitted' ? (
          <StickyFooter>
            <ButtonPair
              left={
                <Button
                  label="반려"
                  variant="danger"
                  disabled={decision.busy}
                  onPress={() => void decision.reject([a.id])}
                />
              }
              right={
                <Button
                  label="승인"
                  loading={decision.busy}
                  onPress={() => void decision.approve([a.id], `${a.applicantName} · ${a.programTitle}`)}
                />
              }
            />
          </StickyFooter>
        ) : undefined
      }
    >
      <DetailHeader
        meta={`프로그램 신청 · ${a.receiptNo ?? '접수 번호 미발급'}`}
        title={a.applicantName}
        caption={a.programTitle}
        status={APPLICATION_STATUS[a.status]}
      />
      <Divider thick />
      <SectionHeader title="신청 정보" />
      <Gutter>
        <InfoRow label="프로그램" value={a.programTitle} />
        <InfoRow label="접수 번호" value={a.receiptNo ?? '미발급'} />
        <InfoRow label="신청자" value={a.applicantName} />
        <InfoRow label="연락처" value={a.phone} />
        <InfoRow label="신청 일시" value={formatDateTime(a.createdAt)} />
      </Gutter>
      {a.note ? (
        <>
          <SectionHeader title="요청 사항" />
          <Gutter>
            <TextBlock>{a.note}</TextBlock>
          </Gutter>
        </>
      ) : null}
      <SectionHeader title="처리 이력" />
      <Gutter>
        <Timeline entries={a.history} />
      </Gutter>
    </Screen>
  );
}

/** 처리 이력 — 세로 선으로 이은 시간순 기록 */
function Timeline({ entries }: { entries: StatusHistoryEntry[] }) {
  const t = useTheme();
  if (entries.length === 0) {
    return (
      <Txt variant="caption" color="textTertiary">
        기록이 없습니다
      </Txt>
    );
  }
  return (
    <View>
      {entries.map((h, i) => {
        const s = APPLICATION_STATUS[h.status];
        const last = i === entries.length - 1;
        return (
          <View key={`${h.at}-${i}`} style={styles.item}>
            <View style={styles.rail}>
              <View style={[styles.dot, { backgroundColor: t.tone[s.tone].fg }]} />
              {!last && <View style={[styles.line, { backgroundColor: t.line }]} />}
            </View>
            <View style={[styles.body, !last && { paddingBottom: space.xl }]}>
              <Txt variant="bodyStrong" color={t.tone[s.tone].fg}>
                {s.text}
              </Txt>
              <Txt variant="caption" color="textTertiary">
                {formatDateTime(h.at)} · {ACTOR[h.actor]}
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
    </View>
  );
}

const styles = StyleSheet.create({
  item: { flexDirection: 'row', gap: space.md },
  rail: { width: 12, alignItems: 'center' },
  dot: { width: 10, height: 10, borderRadius: 5, marginTop: 7 },
  line: { width: 2, flex: 1, marginTop: 4 },
  body: { flex: 1, gap: 2 },
});
