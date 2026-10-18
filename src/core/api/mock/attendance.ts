import type { AttendanceSession, AttendanceTarget, MyAttendance } from '@/domain/types';
import { ApiError } from '../errors';
import type { MockDb } from './seed';

/** 출석 코드 유효 시간과 틀린 입력 제한 — 서버도 같은 값을 쓴다 */
export const CHECK_IN_MINUTES = 10;
export const MAX_CHECK_IN_FAILURES = 5;
export const CHECK_IN_LOCK_MINUTES = 10;

/** 출석부 명단 — 동아리: 동아리원, 프로그램: 승인된 신청자 (활동 중인 회원만) */
export function rosterOf(db: MockDb, target: AttendanceTarget): { userId: string; name: string }[] {
  const active = (userId: string) => db.users.find((u) => u.id === userId && u.status === 'active');
  const ids =
    target.type === 'club'
      ? db.memberships.filter((m) => m.clubId === target.id).map((m) => m.userId)
      : db.applications
          .filter((a) => a.programId === target.id && a.status === 'approved')
          .map((a) => a.userId);
  return [...new Set(ids)]
    .map((id) => active(id))
    .filter((u) => !!u)
    .map((u) => ({ userId: u.id, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'));
}

export function targetName(db: MockDb, target: AttendanceTarget): string {
  const hit =
    target.type === 'club'
      ? db.clubs.find((c) => c.id === target.id)?.name
      : db.programs.find((p) => p.id === target.id)?.title;
  if (!hit) throw new ApiError('NOT_FOUND', '출석 대상을 찾을 수 없습니다.');
  return hit;
}

export const isCheckInOpen = (s: AttendanceSession, now = Date.now()) =>
  !!s.checkInCode && !!s.checkInClosesAt && Date.parse(s.checkInClosesAt) > now;

/** 열려 있는 다른 회차와 겹치지 않는 4자리 코드 (ponytail: Math.random — 실서버는 crypto 난수를 쓴다) */
export function issueCode(db: MockDb): string {
  const taken = new Set(db.attendance.filter((s) => isCheckInOpen(s)).map((s) => s.checkInCode));
  for (;;) {
    const code = String(Math.floor(Math.random() * 10_000)).padStart(4, '0');
    if (!taken.has(code)) return code;
  }
}

export function toMyAttendance(s: AttendanceSession, userId: string): MyAttendance {
  const r = s.records.find((x) => x.userId === userId);
  return {
    sessionId: s.id,
    targetType: s.targetType,
    targetId: s.targetId,
    targetName: s.targetName,
    date: s.date,
    title: s.title,
    status: r?.status ?? null,
    checkedAt: r?.checkedAt ?? null,
  };
}

/** 본인 출석 코드 입력 — 맞으면 출석, 틀리면 실패 횟수를 올리고 기준을 넘으면 잠근다 */
export function checkIn(db: MockDb, userId: string, code: string, now = Date.now()): MyAttendance {
  const failure = db.checkInFailures.find((f) => f.userId === userId);
  if (failure?.lockedUntil && Date.parse(failure.lockedUntil) > now) {
    throw new ApiError('RATE_LIMITED', '출석 코드를 여러 번 틀렸습니다. 잠시 후 다시 시도해 주세요.');
  }
  const session = /^\d{4}$/.test(code)
    ? db.attendance.find(
        (s) => s.checkInCode === code && isCheckInOpen(s, now) && s.records.some((r) => r.userId === userId),
      )
    : undefined;
  if (!session) {
    const f = failure ?? { userId, count: 0, lockedUntil: null };
    f.count += 1;
    if (f.count >= MAX_CHECK_IN_FAILURES) {
      f.count = 0;
      f.lockedUntil = new Date(now + CHECK_IN_LOCK_MINUTES * 60_000).toISOString();
    }
    if (!failure) db.checkInFailures.push(f);
    throw new ApiError('VALIDATION', '출석 코드가 맞지 않거나 출석 시간이 지났습니다.', {
      fieldErrors: { code: '출석 코드를 다시 확인해 주세요.' },
    });
  }
  db.checkInFailures = db.checkInFailures.filter((f) => f.userId !== userId);
  const record = session.records.find((r) => r.userId === userId)!;
  // 담당자가 이미 체크했다면 그 결과를 존중한다
  if (record.status === null) {
    record.status = 'present';
    record.method = 'self';
    record.checkedAt = new Date(now).toISOString();
  }
  return toMyAttendance(session, userId);
}
