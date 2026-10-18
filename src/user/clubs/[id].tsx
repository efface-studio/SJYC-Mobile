import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import { api, errorMessage, isApiError } from '@/api';
import { CLUB_APPLICATION_STATUS } from '@/domain/labels';
import { clubApplySchema, parseValues, type FieldErrors } from '@/domain/schemas';
import type { Club, ClubActivity, MediaPhoto } from '@/domain/types';
import { useSession } from '@/features/auth/session';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  Divider,
  FormSection,
  Gutter,
  InfoRow,
  Photo,
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
import { Icon } from '~/shared/icon';
import { notify } from '~/shared/dialogs';
import {
  Article,
  Callout,
  Hero,
  QueryScreen,
  Rows,
  formatLooseDate,
  hostOf,
  isExternal,
  openExternal,
} from '~/user-kit';

const POST_KIND = { notice: '공지', schedule: '일정', activity: '활동 기록' } as const;
const PHOTO_RATIO = 4 / 3;

/** 가로로 넘기는 사진 — 사진마다 설명과 출처를 함께 표시 */
function PhotoCarousel({ photos, name }: { photos: MediaPhoto[]; name: string }) {
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const current = photos[Math.min(index, photos.length - 1)];
  if (!current) return null;
  return (
    <View>
      <View>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / width))}
        >
          {photos.map((p, i) => (
            <View key={`${p.url}-${i}`} style={{ width }}>
              <Photo uri={p.url} alt={p.caption || `${name} 활동 사진 ${i + 1}`} ratio={PHOTO_RATIO} />
            </View>
          ))}
        </ScrollView>
        {photos.length > 1 && (
          <View style={styles.counter} accessibilityLabel={`사진 ${index + 1} / ${photos.length}`}>
            <Txt variant="small" color="#FFFFFF">
              {index + 1} / {photos.length}
            </Txt>
          </View>
        )}
      </View>
      <Gutter style={styles.photoMeta}>
        {current.caption ? (
          <Txt variant="caption" color="textSecondary" numberOfLines={2}>
            {current.caption}
          </Txt>
        ) : null}
        <Tap
          onPress={isExternal(current.sourceUrl) ? () => openExternal(current.sourceUrl) : undefined}
          accessibilityLabel={`사진 출처 ${hostOf(current.sourceUrl)} 열기`}
          style={{ alignSelf: 'flex-start', paddingVertical: 4 }}
        >
          <Txt variant="small" color="textTertiary">
            출처 {hostOf(current.sourceUrl)}
            {current.date ? ` · ${formatLooseDate(current.date)}` : ''}
          </Txt>
        </Tap>
      </Gutter>
    </View>
  );
}

/** 최근 활동 타임라인 */
function Timeline({ items }: { items: ClubActivity[] }) {
  const t = useTheme();
  return (
    <View style={{ paddingTop: space.xs }}>
      {items.map((a, i) => (
        <Tap
          key={`${a.date}-${i}`}
          onPress={isExternal(a.url) ? () => openExternal(a.url) : undefined}
          accessibilityLabel={`${formatLooseDate(a.date)} ${a.title}${isExternal(a.url) ? ', 게시물 열기' : ''}`}
          style={styles.tlRow}
        >
          <View style={styles.tlRail}>
            <View style={[styles.tlDot, { backgroundColor: i === 0 ? t.brand : t.lineStrong }]} />
            {i < items.length - 1 && <View style={[styles.tlLine, { backgroundColor: t.line }]} />}
          </View>
          <View style={{ flex: 1, gap: 2, paddingBottom: space.lg }}>
            <Txt variant="small" color="textTertiary">
              {formatLooseDate(a.date)}
            </Txt>
            <Txt variant="label">{a.title}</Txt>
          </View>
          {isExternal(a.url) && (
            <Icon ios="arrow.up.right" android="open_in_new" color={t.textTertiary} size={14} />
          )}
        </Tap>
      ))}
    </View>
  );
}

/** 동아리원 전용: 소식·일정과 마스킹된 명단 */
function MemberSections({ clubId }: { clubId: string }) {
  const posts = useQuery({ queryKey: ['club-posts', clubId], queryFn: () => api.clubs.posts(clubId) });
  const members = useQuery({ queryKey: ['club-members', clubId], queryFn: () => api.clubs.members(clubId) });
  const t = useTheme();
  return (
    <>
      <Divider thick />
      <SectionHeader title="소식 · 일정" />
      <QueryBoundary
        query={posts}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 소식이 없습니다' }}
      >
        {(data) => (
          <Rows>
            {data.map((p) => (
              <View key={p.id} style={styles.post}>
                <View style={styles.postHead}>
                  <Badge
                    text={POST_KIND[p.kind]}
                    tone={p.kind === 'notice' ? 'brand' : p.kind === 'schedule' ? 'info' : 'neutral'}
                  />
                  <Txt variant="small" color="textTertiary">
                    {formatDateTime(p.at)}
                  </Txt>
                </View>
                <Txt variant="bodyStrong">{p.title}</Txt>
                <Txt variant="caption" color="textSecondary">
                  {p.body}
                </Txt>
              </View>
            ))}
          </Rows>
        )}
      </QueryBoundary>

      <Divider thick />
      <SectionHeader title="동아리원" />
      <Gutter style={{ paddingBottom: space.sm }}>
        <Txt variant="caption" color="textTertiary">
          개인정보 보호를 위해 이름 일부만 표시합니다.
        </Txt>
      </Gutter>
      <QueryBoundary query={members}>
        {(data) => (
          <Rows>
            {data.map((m, i) => (
              <View key={i} style={styles.member}>
                <View style={[styles.avatar, { backgroundColor: t.bgSubtle }]}>
                  <Txt variant="captionStrong" color="textSecondary">
                    {[...m.displayName][0] ?? ''}
                  </Txt>
                </View>
                <View style={{ flex: 1 }}>
                  <Txt variant="label">{m.displayName}</Txt>
                  <Txt variant="small" color="textTertiary">
                    {formatDate(m.joinedAt)} 가입
                  </Txt>
                </View>
                {m.role === 'leader' && <Badge text="대표" tone="brand" />}
              </View>
            ))}
          </Rows>
        )}
      </QueryBoundary>
    </>
  );
}

function ClubDetail({ club: c }: { club: Club }) {
  const qc = useQueryClient();
  const { data: session } = useSession();
  const myClubs = useQuery({ queryKey: ['my-clubs'], queryFn: () => api.me.clubs(), enabled: !!session });
  const myApps = useQuery({
    queryKey: ['my-club-applications'],
    queryFn: () => api.me.clubApplications(),
    enabled: !!session,
  });
  const [motivation, setMotivation] = useState('');
  const [agree, setAgree] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const apply = useMutation({
    mutationFn: (input: Parameters<typeof api.clubs.apply>[1]) => api.clubs.apply(c.id, input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['my-club-applications'] });
      notify('가입 신청을 보냈습니다', '검토 결과는 MY 탭에서 확인할 수 있습니다.');
    },
    onError: (e) => {
      if (isApiError(e) && e.fieldErrors) setErrors(e.fieldErrors);
      notify('신청하지 못했습니다', errorMessage(e));
    },
  });

  const membership = myClubs.data?.find((m) => m.club.id === c.id);
  const pending = myApps.data?.find((a) => a.clubId === c.id && a.status === 'pending');
  const canApply = !!session && !membership && !pending && c.recruiting;

  const submit = () => {
    if (apply.isPending) return;
    const parsed = parseValues(clubApplySchema, { motivation, agreePrivacy: agree ? 'on' : undefined });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    apply.mutate(parsed.data);
  };

  let footer: ReactNode;
  if (membership || pending) {
    footer = undefined;
  } else if (!c.recruiting) {
    footer = <Button label="현재 모집 없음" disabled onPress={() => {}} />;
  } else if (!session) {
    footer = <Button label="로그인하고 가입 신청하기" onPress={() => router.push('/login')} />;
  } else if (canApply) {
    footer = <Button label="가입 신청하기" onPress={submit} loading={apply.isPending} />;
  }

  return (
    <Screen footer={footer ? <StickyFooter>{footer}</StickyFooter> : undefined}>
      <PhotoCarousel photos={c.photos} name={c.name} />
      <Hero eyebrow={c.field} title={c.name}>
        <View style={styles.badges}>
          {c.recruiting ? <Badge text="모집 중" tone="brand" /> : <Badge text="현재 모집 없음" />}
          {membership && (
            <Badge text={membership.role === 'leader' ? '내 동아리 · 대표' : '내 동아리'} tone="success" />
          )}
        </View>
        <Txt variant="body" color="textSecondary">
          {c.summary}
        </Txt>
      </Hero>
      <Gutter style={{ paddingBottom: space.lg }}>
        <InfoRow label="활동 분야" value={c.field} />
        {c.target ? <InfoRow label="대상" value={c.target} /> : null}
        <InfoRow label="모임 안내" value={c.meetingInfo} />
        <InfoRow label="인원" value={`${c.memberCount}명`} />
      </Gutter>

      <Divider thick />
      <SectionHeader title="소개" />
      <Gutter>
        <Article>{c.description}</Article>
      </Gutter>

      {c.activities.length > 0 && (
        <>
          <Divider thick />
          <SectionHeader title="최근 활동" />
          <Gutter>
            <Timeline items={c.activities} />
          </Gutter>
        </>
      )}

      {c.sourceUrls.length > 0 && (
        <Gutter style={styles.sources}>
          <Txt variant="small" color="textTertiary">
            정보 출처
          </Txt>
          {c.sourceUrls.filter(isExternal).map((u) => (
            <Tap
              key={u}
              onPress={() => openExternal(u)}
              accessibilityLabel={`출처 ${hostOf(u)} 열기`}
              style={{ paddingVertical: 6 }}
            >
              <Txt variant="small" color="textSecondary" numberOfLines={1}>
                {u.replace(/^https?:\/\//i, '')} ↗
              </Txt>
            </Tap>
          ))}
        </Gutter>
      )}

      {membership ? (
        <MemberSections clubId={c.id} />
      ) : pending ? (
        <Gutter style={{ paddingTop: space.lg }}>
          <Callout tone="info" title={`가입 신청 ${CLUB_APPLICATION_STATUS.pending.text}`}>
            {formatDate(pending.createdAt)}에 신청했습니다. 결과는 MY 탭에서 확인할 수 있습니다.
          </Callout>
        </Gutter>
      ) : canApply ? (
        <>
          <Divider thick />
          <FormSection title="가입 신청">
            <TextField
              label="가입 동기 (10~500자)"
              value={motivation}
              onChangeText={setMotivation}
              multiline
              maxLength={500}
              placeholder="동아리 대표와 담당 선생님이 확인합니다"
              hint={`${motivation.length}/500`}
              error={errors.motivation}
            />
            <SwitchRow
              label="[필수] 개인정보 제공 동의"
              description="가입 검토를 위해 이름과 가입 동기를 동아리 대표·담당 선생님에게 제공합니다."
              value={agree}
              onValueChange={setAgree}
              error={errors.agreePrivacy}
            />
          </FormSection>
        </>
      ) : null}
    </Screen>
  );
}

export default function ClubDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const club = useQuery({ queryKey: ['club', id], queryFn: () => api.clubs.get(id) });
  return <QueryScreen query={club}>{(c) => <ClubDetail club={c} />}</QueryScreen>;
}

const styles = StyleSheet.create({
  counter: {
    position: 'absolute',
    right: 12,
    bottom: 12,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  photoMeta: { paddingTop: 10, gap: 2 },
  badges: { flexDirection: 'row', gap: 6 },
  tlRow: { flexDirection: 'row', gap: space.md, minHeight: 44 },
  tlRail: { width: 12, alignItems: 'center', paddingTop: 4 },
  tlDot: { width: 10, height: 10, borderRadius: 5 },
  tlLine: { width: 2, flex: 1, marginTop: 4 },
  sources: { paddingTop: space.lg, paddingBottom: space.sm, gap: 2 },
  post: { paddingHorizontal: 20, paddingVertical: space.lg, gap: 4 },
  postHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  member: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});
