import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/api';
import { canManageClub } from '@/domain/permissions';
import type { AttendanceSession, AttendanceTargetSummary, User } from '@/domain/types';
import { Button, EmptyState, FormSection, QueryBoundary, SelectField } from '~/ds';
import { CheckIn, CreateSession } from '~/shared/attendance-controls';

function ClubSessions({ target, userId }: { target: AttendanceTargetSummary; userId: string }) {
  const client = useQueryClient();
  const [selected, setSelected] = useState('');
  const [creating, setCreating] = useState(false);
  const key = ['attendance', 'sessions', userId, 'club', target.id];
  const sessions = useQuery({
    queryKey: key,
    queryFn: () => api.attendance.sessions(target),
    staleTime: 0,
    refetchInterval: 20_000,
  });
  const update = (session: AttendanceSession) => {
    client.setQueryData<AttendanceSession[]>(key, (rows = []) => [
      session,
      ...rows.filter((row) => row.id !== session.id),
    ]);
    client.setQueryData(['attendance', 'session', session.id], session);
    setSelected(session.id);
  };
  return (
    <QueryBoundary query={sessions}>
      {(rows) => {
        const current = rows.find((s) => s.id === selected) ?? rows[0];
        if (creating || !current)
          return (
            <>
              <CreateSession
                target={target}
                count={rows.length}
                onCreated={(session) => {
                  update(session);
                  setCreating(false);
                }}
              />
              {current && (
                <Button label="회차 선택으로 돌아가기" variant="text" onPress={() => setCreating(false)} />
              )}
            </>
          );
        return (
          <>
            <FormSection title="활동 회차">
              <SelectField
                label="출석부"
                value={current.id}
                options={rows.map((s) => ({ value: s.id, label: `${s.date} · ${s.title}` }))}
                onChange={setSelected}
              />
              <Button label="새 출석부 만들기" variant="text" size="md" onPress={() => setCreating(true)} />
            </FormSection>
            <CheckIn key={current.id} session={current} onChange={update} barcode />
          </>
        );
      }}
    </QueryBoundary>
  );
}

export function ClubCheckIn({ user }: { user: User }) {
  const [clubId, setClubId] = useState('');
  const targets = useQuery({
    queryKey: ['attendance', 'targets', user.id],
    queryFn: () => api.attendance.targets(),
    staleTime: 0,
  });
  return (
    <QueryBoundary query={targets}>
      {(all) => {
        const clubs = all.filter(
          (c) => c.type === 'club' && user.managedClubIds.includes(c.id) && canManageClub(user, c.id),
        );
        const club = clubs.find((c) => c.id === clubId) ?? clubs[0];
        if (!club) return <EmptyState title="출석을 관리할 동아리가 없습니다" />;
        return (
          <>
            <FormSection title="담당 동아리">
              <SelectField
                label="동아리"
                value={club.id}
                options={clubs.map((c) => ({ value: c.id, label: c.name }))}
                onChange={setClubId}
              />
            </FormSection>
            <ClubSessions key={club.id} target={club} userId={user.id} />
          </>
        );
      }}
    </QueryBoundary>
  );
}
