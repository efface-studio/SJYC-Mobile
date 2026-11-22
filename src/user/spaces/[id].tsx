import { SpacePhoto } from '~/user-kit/space-photo';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { parseValues, reservationSchema, type FieldErrors } from '@/domain/schemas';
import {
  RESERVATION_HOURS,
  RESERVATION_MAX_DAYS_AHEAD,
  RESERVATION_MAX_HOURS,
  addDays,
  weekdayOf,
} from '@/domain/space';
import type { Session, Space, TimeSlot } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatShortDate, todayKst } from '@/lib/format';
import {
  Button,
  Divider,
  FormSection,
  GUTTER,
  Gutter,
  QueryBoundary,
  Screen,
  SectionHeader,
  StickyFooter,
  SwitchRow,
  Tap,
  TextField,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { notify } from '~/shared/dialogs';
import { Callout, Hero, QueryScreen } from '~/user-kit';

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/** 내일부터 예약 가능 요일만 */
function reservableDates(): string[] {
  const today = todayKst();
  return Array.from({ length: RESERVATION_MAX_DAYS_AHEAD }, (_, i) => addDays(today, i + 1)).filter(
    (d) => RESERVATION_HOURS[weekdayOf(d)],
  );
}

interface Range {
  start: number;
  end: number;
}

/** 웹과 같은 규칙: 탭 한 번 = 시작, 뒤쪽 칸을 탭 = 끝. 중간에 예약된 칸이 있거나 최대 시간을 넘으면 새로 시작 */
function nextRange(slots: TimeSlot[], current: Range | null, i: number): Range | null {
  if (current && current.start === i && current.end === i) return null;
  if (!current || current.start !== current.end || i < current.start) return { start: i, end: i };
  const span = slots.slice(current.start, i + 1);
  if (span.every((s) => s.available) && span.length <= RESERVATION_MAX_HOURS)
    return { start: current.start, end: i };
  return { start: i, end: i };
}

function DateStrip({
  dates,
  value,
  onChange,
}: {
  dates: string[];
  value: string;
  onChange: (d: string) => void;
}) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dates}>
      {dates.map((d) => {
        const active = d === value;
        const wd = weekdayOf(d);
        const dayColor = active ? t.bg : wd === 6 ? t.tone.info.fg : t.text;
        return (
          <Tap
            key={d}
            onPress={() => onChange(d)}
            rounded={radius.md}
            accessibilityLabel={`${formatShortDate(`${d}T12:00:00+09:00`)}${active ? ', 선택됨' : ''}`}
            style={[styles.datePill, { backgroundColor: active ? t.text : t.bgSubtle }]}
          >
            <Txt variant="small" color={active ? t.bg : wd === 6 ? t.tone.info.fg : t.textTertiary}>
              {WEEKDAY[wd]}
            </Txt>
            <Txt variant="title3" color={dayColor}>
              {Number(d.slice(8))}
            </Txt>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

function SlotGrid({
  slots,
  range,
  onChange,
}: {
  slots: TimeSlot[];
  range: Range | null;
  onChange: (r: Range | null) => void;
}) {
  const t = useTheme();
  return (
    <View style={styles.grid}>
      {slots.map((s, i) => {
        const selected = !!range && i >= range.start && i <= range.end;
        const bg = selected ? t.action : s.available ? t.card : t.bgSubtle;
        const border = selected ? t.action : s.available ? t.lineStrong : t.bgSubtle;
        return (
          <View key={s.start} style={styles.cell}>
            <Tap
              onPress={s.available ? () => onChange(nextRange(slots, range, i)) : undefined}
              disabled={!s.available}
              rounded={radius.md}
              accessibilityLabel={`${s.start}부터 ${s.end}까지 ${s.available ? (selected ? '선택됨' : '예약 가능') : '예약됨'}`}
              style={[styles.slot, { backgroundColor: bg, borderColor: border }]}
            >
              <Txt
                variant="label"
                color={selected ? t.onAction : s.available ? t.text : t.textTertiary}
                style={!s.available && { textDecorationLine: 'line-through' }}
              >
                {s.start}
              </Txt>
            </Tap>
          </View>
        );
      })}
    </View>
  );
}

function ReservationForm({ space: sp, session }: { space: Space; session: Session }) {
  const t = useTheme();
  const qc = useQueryClient();
  const dates = useMemo(reservableDates, []);
  const [date, setDate] = useState(dates[0] ?? '');
  const [range, setRange] = useState<Range | null>(null);
  const [headcount, setHeadcount] = useState('');
  const [phone, setPhone] = useState(session.user.phone ?? '');
  const [purpose, setPurpose] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});

  const slots = useQuery({
    queryKey: ['space-availability', sp.id, date],
    queryFn: () => api.spaces.availability(sp.id, date),
    enabled: !!date,
  });
  const startTime = range ? slots.data?.[range.start]?.start : undefined;
  const endTime = range ? slots.data?.[range.end]?.end : undefined;

  const reserve = useMutation({
    mutationFn: (input: Parameters<typeof api.spaces.reserve>[1]) => api.spaces.reserve(sp.id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-reservations'] });
      void qc.invalidateQueries({ queryKey: ['space-availability', sp.id] });
      notify('예약 신청을 보냈습니다', '담당자 확인 후 확정되며, MY 탭에서 상태를 확인할 수 있습니다.');
      router.back();
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      if (isApiError(e, 'CONFLICT')) {
        setRange(null);
        void slots.refetch();
      }
      notify('예약하지 못했습니다', errorMessage(e));
    },
  });

  const submit = () => {
    if (reserve.isPending) return;
    const parsed = parseValues(reservationSchema, {
      date,
      startTime: startTime ?? '',
      endTime: endTime ?? '',
      headcount,
      phone,
      purpose,
      agreePrivacy: agree ? 'on' : undefined,
    });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    reserve.mutate(parsed.data);
  };

  const timeError = errors.startTime ?? errors.endTime ?? errors.date;
  const summary =
    range && startTime && endTime ? `${startTime} – ${endTime} (${range.end - range.start + 1}시간)` : null;

  return (
    <Screen
      footer={
        <StickyFooter>
          <Button
            label={summary ? `예약 신청 · ${startTime}–${endTime}` : '예약 신청'}
            onPress={submit}
            loading={reserve.isPending}
          />
        </StickyFooter>
      }
    >
      <SpaceHero s={sp} />

      <SectionHeader title="날짜 선택" />
      <DateStrip
        dates={dates}
        value={date}
        onChange={(d) => {
          setDate(d);
          setRange(null);
        }}
      />
      <Gutter style={{ paddingTop: space.xs }}>
        <Txt variant="caption" color="textTertiary">
          {date ? `${formatShortDate(`${date}T12:00:00+09:00`)} · 일요일·공휴일은 예약할 수 없습니다` : ''}
        </Txt>
      </Gutter>

      <SectionHeader title="시간 선택" />
      <Gutter style={{ paddingBottom: space.sm }}>
        <Txt variant="caption" color="textTertiary">
          시작 시간을 누른 뒤 끝 시간을 누르세요. (1시간 단위, 최대 {RESERVATION_MAX_HOURS}시간)
        </Txt>
      </Gutter>
      <QueryBoundary
        query={slots}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '선택한 날짜는 예약할 수 없는 날입니다' }}
      >
        {(data) => <SlotGrid slots={data} range={range} onChange={setRange} />}
      </QueryBoundary>
      <Gutter style={{ paddingTop: space.sm, gap: 4 }}>
        <Txt variant="bodyStrong" color={summary ? 'action' : 'textTertiary'}>
          {summary ?? '선택한 시간이 없습니다'}
        </Txt>
        {timeError ? (
          <Txt variant="caption" color={t.tone.danger.fg}>
            {timeError}
          </Txt>
        ) : null}
      </Gutter>

      <Divider />
      <FormSection title="예약 정보">
        <TextField
          label="이용 인원"
          value={headcount}
          onChangeText={setHeadcount}
          placeholder="인원 수"
          keyboardType="number-pad"
          hint={`최대 ${sp.capacity}명`}
          error={errors.headcount}
        />
        <TextField
          label="연락처"
          value={phone}
          onChangeText={setPhone}
          placeholder="010-1234-5678"
          keyboardType="phone-pad"
          autoComplete="tel"
          error={errors.phone}
        />
        <TextField
          label="이용 목적"
          value={purpose}
          onChangeText={setPurpose}
          placeholder="예) 동아리 정기 연습"
          multiline
          maxLength={300}
          error={errors.purpose}
        />
        <SwitchRow
          label="[필수] 개인정보 수집·이용 동의"
          description="예약 확인과 연락을 위해 이름·연락처를 수집·이용합니다."
          value={agree}
          onValueChange={setAgree}
          error={errors.agreePrivacy}
        />
      </FormSection>
    </Screen>
  );
}

function SpaceHero({ s }: { s: Space }) {
  return (
    <>
      <Gutter style={{ paddingTop: space.sm }}>
        <SpacePhoto space={s} />
      </Gutter>
      <Hero eyebrow={s.floor} title={s.name}>
        <Txt variant="body" color="textSecondary">
          {s.description}
        </Txt>
        <Txt variant="caption" color="textTertiary">
          최대 {s.capacity}명 · 1시간 단위, 최대 {RESERVATION_MAX_HOURS}시간 · 담당자 확인 후 확정
        </Txt>
      </Hero>
    </>
  );
}

function SpaceDetail({ s }: { s: Space }) {
  const { data: session } = useSession();
  if (s.reservable && session) return <ReservationForm space={s} session={session} />;
  return (
    <Screen
      footer={
        s.reservable ? (
          <StickyFooter>
            <Button label="로그인하고 예약 신청하기" onPress={() => router.push('/login')} />
          </StickyFooter>
        ) : undefined
      }
    >
      <SpaceHero s={s} />
      <Gutter>
        {s.reservable ? (
          <Callout>예약 신청은 로그인 후 이용할 수 있습니다.</Callout>
        ) : (
          <Callout tone="warning" title="현재 예약을 받지 않는 공간입니다">
            시설 점검 등으로 예약이 중지되었습니다. 자세한 내용은 공지사항을 확인해 주세요.
          </Callout>
        )}
      </Gutter>
    </Screen>
  );
}

export default function SpaceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const space = useQuery({ queryKey: ['space', id], queryFn: () => api.spaces.get(id) });
  return <QueryScreen query={space}>{(s) => <SpaceDetail s={s} />}</QueryScreen>;
}

const styles = StyleSheet.create({
  dates: { gap: space.sm, paddingHorizontal: GUTTER, paddingVertical: space.xs },
  datePill: { width: 56, height: 68, alignItems: 'center', justifyContent: 'center', gap: 2 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: GUTTER - 4 },
  cell: { width: '25%', padding: 4 },
  slot: { height: 48, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
});
