import { router } from 'expo-router';
import { Linking, StyleSheet, View } from 'react-native';
import {
  CENTER,
  CENTER_SERVICES,
  DESK_HOURS,
  DESK_HOURS_NOTE,
  DIRECTIONS,
  FLOORS,
  OFFICIAL_CHANNELS,
  OPERATING_HOURS,
  VERIFIED_AT,
  type HoursRow,
} from '@/config/center';
import {
  Button,
  Card,
  Gutter,
  InfoRow,
  ListRow,
  Screen,
  SectionHeader,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { Rows, openExternal } from '~/user-kit';

/** 라벨 – 값 표 (운영시간 등) */
function Table({ rows }: { rows: HoursRow[] }) {
  const t = useTheme();
  return (
    <View style={[styles.table, { borderColor: t.line }]}>
      {rows.map((r, i) => (
        <View
          key={r.label}
          style={[styles.tr, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line }]}
        >
          <Txt variant="captionStrong" color="textSecondary" style={styles.th}>
            {r.label}
          </Txt>
          <Txt variant="label" style={{ flex: 1 }}>
            {r.value}
          </Txt>
        </View>
      ))}
    </View>
  );
}

export default function AboutScreen() {
  return (
    <Screen>
      <Gutter style={{ paddingTop: space.lg }}>
        <Card style={{ gap: space.sm }}>
          <Txt variant="caption" color="textTertiary">
            {CENTER.formalName}
          </Txt>
          <Txt variant="title2">{CENTER.slogan}</Txt>
          <Txt variant="caption" color="textSecondary">
            {CENTER.address}
          </Txt>
          <View style={styles.contact}>
            <View style={{ flex: 1 }}>
              <Button label="전화 걸기" size="md" onPress={() => void Linking.openURL(`tel:${CENTER.tel}`)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button label="문의하기" size="md" variant="secondary" onPress={() => router.push('/qna')} />
            </View>
          </View>
        </Card>
      </Gutter>

      <SectionHeader title="주요 사업" />
      <Rows>
        {CENTER_SERVICES.map((s) => (
          <ListRow key={s.label} title={s.label} subtitle={s.value} />
        ))}
      </Rows>

      <SectionHeader title="운영시간" />
      <Gutter style={{ gap: space.lg }}>
        <Table rows={OPERATING_HOURS} />
        <Txt variant="captionStrong" color="textSecondary">
          안내데스크 방문 접수
        </Txt>
        <Table rows={DESK_HOURS} />
        <Txt variant="caption" color="textTertiary">
          {DESK_HOURS_NOTE}
        </Txt>
      </Gutter>

      <SectionHeader title="오시는 길" />
      <Gutter style={{ gap: space.md }}>
        <View style={{ gap: 2 }}>
          <Txt variant="bodyStrong">{CENTER.address}</Txt>
          <Txt variant="caption" color="textTertiary">
            우편번호 {CENTER.postalCode} · {CENTER.nearestStation}
          </Txt>
        </View>
        <Table rows={DIRECTIONS} />
      </Gutter>

      <SectionHeader title="층별 안내" />
      <Rows>
        {FLOORS.map((f) => (
          <View key={f.floor} style={styles.floorRow}>
            <View style={styles.floor}>
              <Txt variant="captionStrong">{f.floor}</Txt>
            </View>
            <Txt variant="label" color="textSecondary" style={{ flex: 1 }}>
              {f.spaces.join(' · ')}
            </Txt>
          </View>
        ))}
      </Rows>

      <SectionHeader title="공식 채널" />
      <Rows>
        <ListRow
          title="센터 소식·갤러리"
          subtitle="공식 채널의 사진과 영상 모아 보기"
          onPress={() => router.push('/gallery')}
        />
        {OFFICIAL_CHANNELS.map((c) => (
          <ListRow key={c.key} title={c.label} numberOfLines={1} onPress={() => openExternal(c.url)} />
        ))}
      </Rows>

      <SectionHeader title="기관 정보" />
      <Gutter>
        <InfoRow label="상호명" value={CENTER.name} />
        <InfoRow label="관장" value={CENTER.director} />
        <InfoRow label="대표번호" value={CENTER.telDisplay} />
        <InfoRow label="팩스" value={CENTER.fax} />
        <InfoRow label="사업자번호" value={CENTER.businessNumber} />
        <InfoRow label="통신판매업" value={CENTER.mailOrderNumber} />
        <Txt variant="small" color="textTertiary" style={{ paddingTop: space.md }}>
          정보 확인일 {VERIFIED_AT}
        </Txt>
      </Gutter>
    </Screen>
  );
}

const styles = StyleSheet.create({
  contact: { flexDirection: 'row', gap: space.sm, marginTop: space.sm },
  table: { borderWidth: StyleSheet.hairlineWidth, borderRadius: radius.md, overflow: 'hidden' },
  tr: { flexDirection: 'row', gap: space.md, paddingHorizontal: 14, paddingVertical: 12 },
  th: { width: 64 },
  floorRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  floor: { width: 40, paddingVertical: 3 },
});
