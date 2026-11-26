import { ContentHistory } from '~/shared/application-content';
import { openScreen } from '~/shared/navigation';
import { useMutation, useQuery } from '@tanstack/react-query';

import { useState } from 'react';
import { api, errorMessage } from '@/api';
import { CLUB_APPLICATION_STATUS, CLUB_POST_KIND_LABEL, CLUB_ROLE_LABEL } from '@/domain/labels';
import { clubIntroSchema, clubPostSchema, parseValues, type FieldErrors } from '@/domain/schemas';
import type { Club, ClubApplication, ClubPost, ClubRosterEntry } from '@/domain/types';
import { formatDate, formatDateTime } from '@/lib/format';
import {
  Badge,
  Button,
  EmptyState,
  FormSection,
  Gutter,
  ListRow,
  QueryBoundary,
  SelectField,
  SwitchRow,
  TextField,
  Txt,
  space,
} from '~/ds';
import { choose, confirm, notify } from '~/shared/dialogs';
import { Rows } from './components';
import { useDecision } from './decision';
import { useInvalidateAdmin } from './queries';

/** 동아리 운영 쿼리 키 — 관리자 공통 무효화(['admin'])에 함께 묶인다 */
export const manageKeys = {
  clubs: ['admin', 'manage', 'clubs'] as const,
  roster: (id: string) => ['admin', 'manage', 'roster', id] as const,
  applications: (id: string) => ['admin', 'manage', 'applications', id] as const,
  posts: (id: string) => ['admin', 'manage', 'posts', id] as const,
};

export function useManagedClubs(enabled = true) {
  return useQuery({ queryKey: manageKeys.clubs, queryFn: () => api.manage.clubs(), enabled });
}

/* ---------- 회원 ---------- */

export function MembersSection({ clubId }: { clubId: string }) {
  const invalidate = useInvalidateAdmin();
  const roster = useQuery({
    queryKey: manageKeys.roster(clubId),
    queryFn: () => api.manage.roster(clubId),
  });
  const setRole = useMutation({
    mutationFn: (m: ClubRosterEntry) =>
      api.manage.setMemberRole(clubId, m.userId, m.role === 'leader' ? 'member' : 'leader'),
    onSuccess: () => invalidate(),
    onError: (e) => notify('바꾸지 못했습니다', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (m: ClubRosterEntry) => api.manage.removeMember(clubId, m.userId),
    onSuccess: () => invalidate(),
    onError: (e) => notify('제외하지 못했습니다', errorMessage(e)),
  });

  const act = async (m: ClubRosterEntry) => {
    const roleLabel = m.role === 'leader' ? '동아리원으로' : '대표로 지정';
    const i = await choose(m.name, [roleLabel, '동아리에서 제외'], {
      message: `${m.email}${m.phone ? ` · ${m.phone}` : ''}`,
      destructiveIndex: 1,
    });
    if (i === 0) setRole.mutate(m);
    if (i === 1) {
      const ok = await confirm({
        title: '동아리에서 제외할까요?',
        message: `${m.name}님이 회원에서 빠집니다. 지난 출석 기록은 남습니다.`,
        confirmLabel: '제외',
        destructive: true,
      });
      if (ok) remove.mutate(m);
    }
  };

  return (
    <QueryBoundary query={roster}>
      {(list) =>
        list.length === 0 ? (
          <EmptyState title="동아리 회원이 없습니다" description="가입 신청을 승인하면 회원이 됩니다." />
        ) : (
          <>
            <Gutter style={{ paddingVertical: space.sm }}>
              <Txt variant="caption" color="textTertiary">
                연락처는 동아리 운영(일정 안내·출석 확인) 목적으로만 사용하세요. 회원 {list.length}명
              </Txt>
            </Gutter>
            <Rows
              items={list}
              rowKey={(m) => m.userId}
              render={(m) => {
                const rate = m.attendanceRate === null ? '기록 없음' : `${m.attendanceRate}%`;
                return (
                  <ListRow
                    meta={`가입 ${formatDate(m.joinedAt)} · 출석률 ${rate}`}
                    title={m.name}
                    subtitle={`${m.email}${m.phone ? ` · ${m.phone}` : ''}`}
                    trailing={
                      m.role === 'leader' ? <Badge text={CLUB_ROLE_LABEL.leader} tone="brand" /> : undefined
                    }
                    onPress={() => void act(m)}
                  />
                );
              }}
            />
          </>
        )
      }
    </QueryBoundary>
  );
}

/* ---------- 가입 신청 ---------- */

export function ApplicationsSection({ clubId }: { clubId: string }) {
  const apps = useQuery({
    queryKey: manageKeys.applications(clubId),
    queryFn: () => api.manage.applications(clubId),
  });
  const decision = useDecision('managed');
  const handle = async (a: ClubApplication) => {
    const picked = await choose(a.applicantName, ['승인', '반려'], {
      message: a.motivation,
      destructiveIndex: 1,
    });
    const id = `${clubId}:${a.id}`;
    if (picked === 0) void decision.approve([id], a.applicantName, false);
    if (picked === 1) void decision.reject([id]);
  };
  return (
    <QueryBoundary query={apps}>
      {(list) =>
        list.length === 0 ? (
          <EmptyState title="가입 신청이 없습니다" />
        ) : (
          <Rows
            items={list}
            rowKey={(a) => a.id}
            render={(a) => (
              <>
                <ListRow
                  meta={`신청 ${formatDateTime(a.createdAt)}${a.reason ? ` · 사유: ${a.reason}` : ''}`}
                  title={a.applicantName}
                  subtitle={a.motivation}
                  trailing={
                    <Badge
                      text={CLUB_APPLICATION_STATUS[a.status].text}
                      tone={CLUB_APPLICATION_STATUS[a.status].tone}
                    />
                  }
                  onPress={a.status === 'pending' ? () => void handle(a) : undefined}
                />
                {a.contentEdits?.length ? <Gutter><ContentHistory edits={a.contentEdits} /></Gutter> : null}
              </>
            )}
          />
        )
      }
    </QueryBoundary>
  );
}

/* ---------- 소식 ---------- */

const KIND_OPTIONS = (Object.keys(CLUB_POST_KIND_LABEL) as ClubPost['kind'][]).map((value) => ({
  value,
  label: CLUB_POST_KIND_LABEL[value],
}));

export function PostsSection({ clubId }: { clubId: string }) {
  const invalidate = useInvalidateAdmin();
  const posts = useQuery({ queryKey: manageKeys.posts(clubId), queryFn: () => api.clubs.posts(clubId) });
  const [kind, setKind] = useState<ClubPost['kind']>('notice');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const create = useMutation({
    mutationFn: () => api.manage.createPost(clubId, { kind, title, body }),
    onSuccess: async () => {
      setTitle('');
      setBody('');
      await invalidate();
      notify('소식을 올렸습니다', '동아리 회원에게 보입니다.');
    },
    onError: (e) => notify('올리지 못했습니다', errorMessage(e)),
  });
  const remove = useMutation({
    mutationFn: (postId: string) => api.manage.removePost(clubId, postId),
    onSuccess: () => invalidate(),
    onError: (e) => notify('삭제하지 못했습니다', errorMessage(e)),
  });
  const submit = () => {
    const parsed = parseValues(clubPostSchema, { kind, title, body });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    create.mutate();
  };
  const askRemove = async (p: ClubPost) => {
    const ok = await confirm({
      title: '소식을 삭제할까요?',
      message: p.title,
      confirmLabel: '삭제',
      destructive: true,
    });
    if (ok) remove.mutate(p.id);
  };
  return (
    <>
      <FormSection title="새 소식">
        <SelectField label="분류" value={kind} options={KIND_OPTIONS} onChange={setKind} />
        <TextField label="제목" value={title} onChangeText={setTitle} maxLength={100} error={errors.title} />
        <TextField
          label="내용"
          value={body}
          onChangeText={setBody}
          multiline
          maxLength={2000}
          error={errors.body}
        />
        <Button label="소식 올리기" loading={create.isPending} onPress={submit} />
      </FormSection>
      <QueryBoundary query={posts}>
        {(list) =>
          list.length === 0 ? (
            <EmptyState title="올린 소식이 없습니다" />
          ) : (
            <Rows
              items={list}
              rowKey={(p) => p.id}
              render={(p) => (
                <ListRow
                  meta={`${CLUB_POST_KIND_LABEL[p.kind]} · ${formatDateTime(p.at)}`}
                  title={p.title}
                  subtitle={p.body}
                  onPress={() => void askRemove(p)}
                />
              )}
            />
          )
        }
      </QueryBoundary>
    </>
  );
}

/* ---------- 소개 ---------- */

export function IntroSection({ club }: { club: Club }) {
  const invalidate = useInvalidateAdmin();
  const [summary, setSummary] = useState(club.summary);
  const [description, setDescription] = useState(club.description);
  const [meetingInfo, setMeetingInfo] = useState(club.meetingInfo);
  const [recruiting, setRecruiting] = useState(club.recruiting);
  const [errors, setErrors] = useState<FieldErrors>({});
  const save = useMutation({
    mutationFn: () => api.manage.updateIntro(club.id, { summary, description, meetingInfo, recruiting }),
    onSuccess: async () => {
      await invalidate();
      notify('저장했습니다');
    },
    onError: (e) => notify('저장하지 못했습니다', errorMessage(e)),
  });
  const submit = () => {
    const parsed = parseValues(clubIntroSchema, { summary, description, meetingInfo, recruiting });
    if (!parsed.ok) {
      setErrors(parsed.errors);
      return;
    }
    setErrors({});
    save.mutate();
  };
  return (
    <FormSection title="동아리 소개">
      <TextField
        label="한 줄 소개"
        value={summary}
        onChangeText={setSummary}
        maxLength={120}
        error={errors.summary}
      />
      <TextField
        label="소개"
        value={description}
        onChangeText={setDescription}
        multiline
        maxLength={5000}
        error={errors.description}
      />
      <TextField
        label="모임 일정"
        value={meetingInfo}
        onChangeText={setMeetingInfo}
        maxLength={100}
        hint="예) 매주 토요일 오후 2시, 3층 미디어실"
        error={errors.meetingInfo}
      />
      <SwitchRow label="신규 회원 모집 중" value={recruiting} onValueChange={setRecruiting} />
      <Txt variant="caption" color="textTertiary">
        사진·활동 기록·정보 출처는 센터 직원이 관리합니다.
      </Txt>
      <Button label="저장" loading={save.isPending} onPress={submit} />
    </FormSection>
  );
}

/* ---------- 출석 ---------- */

export function AttendanceSection({ club }: { club: Club }) {
  return (
    <FormSection title="출석">
      <Txt variant="body" color="textSecondary">
        모임마다 출석부를 만들고 체크하거나, 출석 코드를 열어 회원이 직접 출석하게 할 수 있습니다.
      </Txt>
      <Button
        label={`${club.name} 출석부 열기`}
        onPress={() => openScreen({ pathname: '/more/attendance', params: { target: `club:${club.id}` } })}
      />
    </FormSection>
  );
}
