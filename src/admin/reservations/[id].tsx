import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { api, ApiError, DEFAULT_MESSAGE } from '@/api';
import { RESERVATION_STATUS } from '@/domain/labels';
import type { SpaceReservation } from '@/domain/types';
import { formatDateTime } from '@/lib/format';
import { ButtonPair, DetailHeader, NoPermission, TextBlock, useCan } from '~/admin-kit/components';
import { useDecision } from '~/admin-kit/decision';
import { Button, Gutter, InfoRow, QueryBoundary, Screen, SectionHeader, StickyFooter } from '~/ds';

/** ponytail: 예약 단건 조회 API 가 없어 목록에서 찾는다 — admin.spaces.reservation(id) 가 생기면 교체 */
async function findReservation(id: string) {
  const page = await api.admin.spaces.reservations({ pageSize: 200 });
  const found = page.items.find((r) => r.id === id);
  if (!found) throw new ApiError('NOT_FOUND', DEFAULT_MESSAGE.NOT_FOUND);
  return found;
}

export default function ReservationDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allowed = useCan()('space.manage');
  const query = useQuery({
    queryKey: ['admin', 'reservation', id],
    queryFn: () => findReservation(id),
    enabled: allowed,
  });

  if (!allowed) return <NoPermission />;
  return <QueryBoundary query={query}>{(r) => <ReservationView r={r} />}</QueryBoundary>;
}

function ReservationView({ r }: { r: SpaceReservation }) {
  const decision = useDecision('reservation');
  const when = `${r.date} ${r.startTime}~${r.endTime}`;
  return (
    <Screen
      footer={
        r.status === 'pending' ? (
          <StickyFooter>
            <ButtonPair
              left={
                <Button
                  label="반려"
                  variant="danger"
                  disabled={decision.busy}
                  onPress={() => void decision.reject([r.id])}
                />
              }
              right={
                <Button
                  label="확정"
                  loading={decision.busy}
                  onPress={() =>
                    void decision.approve(
                      [r.id],
                      `${r.applicantName} · ${r.spaceName} ${r.date} ${r.startTime}`,
                    )
                  }
                />
              }
            />
          </StickyFooter>
        ) : undefined
      }
    >
      <DetailHeader
        meta="공간 예약"
        title={r.spaceName}
        caption={when}
        status={RESERVATION_STATUS[r.status]}
      />
      <SectionHeader title="예약 정보" />
      <Gutter>
        <InfoRow label="이용 일시" value={when} />
        <InfoRow label="이용 인원" value={`${r.headcount}명`} />
        <InfoRow label="신청자" value={r.applicantName} />
        <InfoRow label="연락처" value={r.phone} />
        <InfoRow label="신청 일시" value={formatDateTime(r.createdAt)} />
        {r.reason ? <InfoRow label="반려 사유" value={r.reason} /> : null}
      </Gutter>
      <SectionHeader title="이용 목적" />
      <Gutter>
        <TextBlock>{r.purpose}</TextBlock>
      </Gutter>
    </Screen>
  );
}
