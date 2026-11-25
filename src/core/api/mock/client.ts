import { settingsWriteSchema } from '@/domain/site-settings';
/**
 * 개발용 mock adapter — 서버가 준비되기 전 UI 흐름을 검증하기 위한 구현이다.
 * 서버가 해야 할 검증(세션, 권한, 중복 신청, 정원, 취소 기한)을 같은 규칙으로 흉내 내지만
 * 브라우저 안에서만 동작하므로 보안 경계가 아니다. 실제 운영에는 http adapter 를 쓴다.
 */
import { memberStats } from '@/domain/attendance';
import { assignableRoles, can, canManageClub, canManageUser, type Permission } from '@/domain/permissions';
import { computeRecruitStatus } from '@/domain/program';
import {
  attendanceSessionSchema,
  clubIntroSchema,
  clubPostSchema,
  managerEmailSchema,
  parseValues,
} from '@/domain/schemas';
import { buildSlots, overlaps, reservationWindowError } from '@/domain/space';
import type {
  AttendanceSession,
  AttendanceTarget,
  AuditEvent,
  Club,
  ClubApplication,
  ClubRosterEntry,
  Notification,
  Page,
  Program,
  ProgramApplication,
  Session,
  SpaceReservation,
  User,
} from '@/domain/types';
import { todayKst } from '@/lib/format';
import type { AdminListQuery, ApiClient, Decision } from '../client';
import { ApiError } from '../errors';
import {
  CHECK_IN_MINUTES,
  checkIn,
  isCheckInOpen,
  issueCode,
  rosterOf,
  targetName,
  toMyAttendance,
} from './attendance';
import type { MockDb } from './seed';
import {
  expireSession,
  exportDb,
  importDb,
  loadDb,
  readScenario,
  readSession,
  resetDb,
  saveDb,
  writeScenario,
  writeSession,
  type Scenario,
} from './store';

type DbUser = MockDb['users'][number];

const DAY = 86_400_000;

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** 지연·오류 시나리오를 적용하고, 내부 객체가 UI 로 새지 않도록 복사본을 돌려준다 */
async function respond<T>(fn: (db: MockDb) => T): Promise<T> {
  const scenario = readScenario();
  await wait(scenario === 'slow' ? 1500 : 150);
  if (scenario === 'error') throw new ApiError('SERVER', '개발용 오류 시나리오가 켜져 있습니다.');
  const db = loadDb();
  const result = fn(db);
  saveDb(db);
  // structuredClone 은 React Native(Hermes)에 없다 — 데이터가 JSON 이므로 JSON 복사로 충분
  return result === undefined ? result : (JSON.parse(JSON.stringify(result)) as T);
}

const isEmptyScenario = () => readScenario() === 'empty';

const managedClubIds = (db: MockDb, userId: string) =>
  db.clubManagers.filter((m) => m.userId === userId).map((m) => m.clubId);

function publicUser(db: MockDb, u: DbUser): User {
  const { password: _password, ...rest } = u;
  return { ...rest, managedClubIds: managedClubIds(db, u.id) };
}

function currentUser(db: MockDb): DbUser | null {
  const s = readSession();
  if (!s || Date.parse(s.expiresAt) <= Date.now()) return null;
  const u = db.users.find((x) => x.id === s.userId);
  return u && u.status === 'active' ? u : null;
}

function requireUser(db: MockDb): DbUser {
  const u = currentUser(db);
  if (!u) throw new ApiError('UNAUTHENTICATED', '로그인이 필요하거나 로그인이 만료되었습니다.');
  return u;
}

function requirePermission(db: MockDb, permission: Permission): DbUser {
  const u = requireUser(db);
  if (!can(u, permission)) throw new ApiError('FORBIDDEN', '이 작업을 수행할 권한이 없습니다.');
  return u;
}

/** 동아리 운영 — 센터 직원 이상 또는 그 동아리 담당자 */
function requireClubManager(db: MockDb, clubId: string): DbUser {
  const u = requireUser(db);
  findOr404(db.clubs, clubId);
  if (!canManageClub(publicUser(db, u), clubId)) {
    throw new ApiError('FORBIDDEN', '이 동아리를 운영할 권한이 없습니다.');
  }
  return u;
}

/** 출석부 관리 — 센터 직원 이상(모든 대상) 또는 동아리 담당자(그 동아리만) */
function requireAttendanceManager(db: MockDb, target: AttendanceTarget): DbUser {
  const u = requireUser(db);
  if (can(u, 'attendance.manage')) return u;
  if (target.type === 'club' && managedClubIds(db, u.id).includes(target.id)) return u;
  throw new ApiError('FORBIDDEN', '이 출석부를 관리할 권한이 없습니다.');
}

function rosterEntry(
  db: MockDb,
  m: MockDb['memberships'][number],
  attendanceRate: number | null,
): ClubRosterEntry {
  const u = findOr404(db.users, m.userId);
  return {
    userId: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    role: m.role,
    joinedAt: m.joinedAt,
    attendanceRate,
  };
}

function decideClubApplication(
  db: MockDb,
  actor: DbUser,
  a: ClubApplication,
  decision: Decision,
  reason: string | null,
): ClubApplication {
  if (a.status !== 'pending') {
    throw new ApiError('CONFLICT', '이미 처리된 신청입니다.', { reason: 'INVALID_STATE' });
  }
  if (decision === 'rejected' && !reason?.trim()) {
    throw new ApiError('VALIDATION', '반려 사유를 입력해 주세요.', {
      fieldErrors: { reason: '반려 사유를 입력해 주세요.' },
    });
  }
  a.status = decision;
  a.reason = reason?.trim() || null;
  if (decision === 'approved') {
    db.memberships.push({
      clubId: a.clubId,
      userId: a.userId,
      role: 'member',
      joinedAt: new Date().toISOString(),
    });
    const c = db.clubs.find((x) => x.id === a.clubId);
    if (c) c.memberCount += 1;
  }
  notify(db, {
    userId: a.userId,
    kind: 'club_application',
    title: `동아리 가입 신청이 ${decision === 'approved' ? '승인' : '반려'}되었습니다`,
    body: a.reason ? `${a.clubName} · 사유: ${a.reason}` : a.clubName,
    link: decision === 'approved' ? `/clubs/${a.clubId}` : '/my',
  });
  audit(db, actor, {
    action: `club_application.${decision}`,
    targetType: 'club_application',
    targetId: a.id,
    summary: `동아리 가입 ${decision === 'approved' ? '승인' : '반려'}: ${a.applicantName} · ${a.clubName}`,
  });
  return a;
}

/** 마감 시간이 지난 출석 코드는 내려주지 않는다 */
function withCheckIn(s: AttendanceSession): AttendanceSession {
  return isCheckInOpen(s) ? s : { ...s, checkInCode: null, checkInClosesAt: null };
}

function nextId(db: MockDb, prefix: string): string {
  db.seq += 1;
  return `${prefix}-${db.seq}`;
}

function paginate<T>(items: T[], page = 1, pageSize = 10): Page<T> {
  const list = isEmptyScenario() ? [] : items;
  const start = (Math.max(1, page) - 1) * pageSize;
  return {
    items: list.slice(start, start + pageSize),
    total: list.length,
    page: Math.max(1, page),
    pageSize,
  };
}

function matches(text: string, q?: string): boolean {
  return !q || text.toLowerCase().includes(q.trim().toLowerCase());
}

function sortBy<T>(
  items: T[],
  sort: AdminListQuery['sort'],
  date: (x: T) => string,
  title: (x: T) => string,
): T[] {
  const copy = [...items];
  if (sort === 'title') return copy.sort((a, b) => title(a).localeCompare(title(b), 'ko'));
  const dir = sort === 'oldest' ? 1 : -1;
  return copy.sort((a, b) => dir * (Date.parse(date(a)) - Date.parse(date(b))));
}

function findOr404<T extends { id: string }>(list: T[], id: string): T {
  const hit = list.find((x) => x.id === id);
  if (!hit) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
  return hit;
}

function withRecruitStatus(p: Program): Program {
  return { ...p, recruitStatus: computeRecruitStatus(p, new Date()) };
}

function withCancellable(db: MockDb, a: ProgramApplication): ProgramApplication {
  const program = db.programs.find((p) => p.id === a.programId);
  const open = a.status === 'submitted' || a.status === 'approved';
  return { ...a, cancellable: open && !!program && Date.now() < Date.parse(program.cancelDeadline) };
}

/** 이용일 시작 전이고 대기·확정 상태일 때만 취소 가능 */
function withReservationCancellable(r: MockDb['reservations'][number]): SpaceReservation {
  const open = r.status === 'pending' || r.status === 'approved';
  return { ...r, cancellable: open && r.date > todayKst() };
}

function audit(db: MockDb, actor: DbUser, e: Omit<AuditEvent, 'id' | 'at' | 'actorName'>): void {
  db.audit.unshift({ id: nextId(db, 'ev'), at: new Date().toISOString(), actorName: actor.name, ...e });
}

/** 처리 결과를 신청자에게 알린다 (실서버에서는 서버가 같은 시점에 만든다) */
function notify(db: MockDb, n: Pick<Notification, 'userId' | 'kind' | 'title' | 'body' | 'link'>): void {
  if (db.mutedNotifications?.[n.userId]?.includes(n.kind)) return;
  db.notifications.unshift({ id: nextId(db, 'nt'), createdAt: new Date().toISOString(), readAt: null, ...n });
}

/** undefined 값은 "보내지 않음" — 기존 값을 유지한다 */
function defined<T extends object>(input: T): Partial<T> {
  return Object.fromEntries(Object.entries(input).filter(([, v]) => v !== undefined)) as Partial<T>;
}

/** 날짜 입력값(YYYY-MM-DD, KST) → ISO */
const kst = (date: string, time: string) => new Date(`${date}T${time}:00+09:00`).toISOString();

function toSession(db: MockDb, u: DbUser): Session {
  const s = readSession();
  return { user: publicUser(db, u), expiresAt: s?.expiresAt ?? new Date(Date.now() + DAY).toISOString() };
}

let lastResetToken: { token: string; userId: string } | null = null;

function signupPhoneState(db:MockDb) {
  const p=db.pendingSignup;
  if(!p?.phone || p.expiresAt<=Date.now()) throw new ApiError('VALIDATION','인증 요청이 만료되었습니다. 회원가입을 다시 진행해 주세요.');
  return {phone:p.phone,verificationMode:'preview' as const,resendAt:new Date(p.sentAt+30000).toISOString(),expiresAt:new Date(p.sentAt+300000).toISOString()};
}
export const mockClient: ApiClient = {
  auth: {
    startNativeApple: async () => { throw new ApiError('NOT_CONFIGURED', 'Apple 로그인을 사용할 수 없습니다.'); },
    finishNativeApple: async () => { throw new ApiError('NOT_CONFIGURED', 'Apple 로그인을 사용할 수 없습니다.'); },
    adminProviders: async () => [],
    startAdminSocial: async () => {
      throw new ApiError('NOT_CONFIGURED', '사용할 수 없는 로그인 방법입니다.');
    },
    completeAdminSocial: async () => {
      throw new ApiError('NOT_CONFIGURED', '사용할 수 없는 로그인 방법입니다.');
    },
    adminSocialLink: async () => {
      throw new ApiError('VALIDATION', '관리자 소셜 로그인을 다시 시작해 주세요.');
    },
    linkAdminSocial: async () => {
      throw new ApiError('NOT_CONFIGURED', '관리자 소셜 로그인을 다시 시작해 주세요.');
    },
    socialDraft: async () => {throw new ApiError('VALIDATION','소셜 로그인을 다시 시작해 주세요.');},
    saveSocialProfile: async () => {throw new ApiError('NOT_CONFIGURED','소셜 로그인을 다시 시작해 주세요.');},
    socialProviders: () => respond(() => []),
    startSocial: () => respond(() => { throw new ApiError('NOT_CONFIGURED', '소셜 로그인을 사용할 수 없습니다.'); }),
    completeSocial: () => respond(() => { throw new ApiError('NOT_CONFIGURED', '소셜 로그인을 사용할 수 없습니다.'); }),
    me: () => respond((db) => (currentUser(db) ? toSession(db, currentUser(db)!) : null)),
    login: (input) =>
      respond((db) => {
        const u = db.users.find((x) => x.email.toLowerCase() === input.email.toLowerCase());
        if (!u || u.password !== input.password || u.status === 'withdrawn') {
          throw new ApiError('VALIDATION', '이메일 또는 비밀번호가 올바르지 않습니다.');
        }
        if (u.status === 'suspended')
          throw new ApiError('FORBIDDEN', '이용이 제한된 계정입니다. 센터에 문의해 주세요.');
        if (!u.emailVerified && !u.signupPhoneVerifiedAt)
          throw new ApiError('FORBIDDEN', '가입 인증을 완료한 뒤 로그인할 수 있습니다.');
        writeSession(u.id);
        return toSession(db, u);
      }),
    logout: () =>
      respond(() => {
        writeSession(null);
      }),
    signup: (input) =>
      respond((db) => {
        const preview = () => {
          db.pendingSignup={email:input.email.toLowerCase(),phone:input.phone,sentAt:Date.now(),attempts:0,expiresAt:Date.now()+900000};
          return signupPhoneState(db);
        };
        const registered = db.users.find((x) => x.email.toLowerCase() === input.email.toLowerCase());
        if (registered) {
          if (
            registered.status === 'active' &&
            !registered.emailVerified && !registered.signupPhoneVerifiedAt &&
            registered.password === input.password
          )
            return preview();
          throw new ApiError('CONFLICT', '이미 가입된 이메일입니다.', {
            reason: 'EMAIL_TAKEN',
            fieldErrors: { email: '이미 가입된 이메일입니다.' },
          });
        }
        const now = new Date().toISOString();
        db.users.push({
          id: nextId(db, 'u'),
          email: input.email,
          name: input.name,
          phone: input.phone || null,
          birthYear: input.birthYear,
          roles: ['member'],
          status: 'active',
          emailVerified: false,
          providers: [],
          consents: [
            { key: 'terms', required: true, agreed: true, agreedAt: now },
            { key: 'privacy', required: true, agreed: true, agreedAt: now },
            {
              key: 'marketing',
              required: false,
              agreed: input.agreeMarketing,
              agreedAt: input.agreeMarketing ? now : null,
            },
          ],
          createdAt: now,
          password: input.password,
        });
        return preview();
      }),
    signupPhone:()=>respond(db=>signupPhoneState(db)),
    resendPhone:(phone)=>respond(db=>{
      const state=signupPhoneState(db),p=db.pendingSignup!;
      if ((!phone || phone===state.phone) && Date.parse(state.resendAt)>Date.now()) throw new ApiError('RATE_LIMITED','30초 후 다시 요청할 수 있습니다.');
      if(phone && !/^01[016789]-?\d{3,4}-?\d{4}$/.test(phone))throw new ApiError('VALIDATION','휴대전화 번호를 확인해 주세요.');
      p.phone=phone??state.phone;p.sentAt=Date.now();p.expiresAt=Date.now()+900000;p.attempts=0;return signupPhoneState(db);
    }),
    confirmPhone:code=>respond(db=>{
      const state=signupPhoneState(db),p=db.pendingSignup!;
      if(Date.parse(state.expiresAt)<=Date.now()||p.attempts>=5)throw new ApiError('VALIDATION','새 코드를 요청해 주세요.');
      if(code!=='284600'){p.attempts++;throw new ApiError('VALIDATION','인증 코드가 일치하지 않습니다.');}
      const user=db.users.find(u=>u.email.toLowerCase()===p.email && u.status==='active'&&!u.emailVerified&&!u.signupPhoneVerifiedAt);
      if(!user)throw new ApiError('VALIDATION','가입 정보를 확인해 주세요.');
      user.signupPhoneVerifiedAt=new Date().toISOString();user.phone=p.phone;delete db.pendingSignup;return {signedIn:false};
    }),
    resendVerification: () => respond(() => undefined),
    requestPasswordReset: (email) =>
      respond((db) => {
        // 계정 존재 여부와 관계없이 같은 응답 — 가입 여부 노출 방지
        const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
        lastResetToken = u
          ? { token: `dev-${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`, userId: u.id }
          : null;
      }),
    resetPassword: (token, password) =>
      respond((db) => {
        if (!lastResetToken || lastResetToken.token !== token) {
          throw new ApiError(
            'VALIDATION',
            '재설정 링크가 만료되었거나 올바르지 않습니다. 다시 요청해 주세요.',
          );
        }
        findOr404(db.users, lastResetToken.userId).password = password;
        lastResetToken = null;
      }),
  },

  me: {
    socialAccounts: () => respond((db) => {
      const u = requireUser(db);
      return { linked: u.providers, available: [], hasPassword: !!u.password };
    }),
    unlinkSocial: (provider) => respond((db) => {
      const u = requireUser(db);
      if (u.providers.includes(provider) && !u.password && u.providers.length === 1) throw new ApiError('CONFLICT', '마지막 로그인 수단입니다.');
      u.providers = u.providers.filter((p) => p !== provider);
      return { linked: u.providers, available: [], hasPassword: !!u.password };
    }),
    loginDevices: () => respond((db) => {
      requireUser(db);
      const expiresAt = readSession()!.expiresAt;
      return [{ id: 'current', label: '현재 기기', current: true, expiresAt, createdAt: new Date(Date.parse(expiresAt) - 3600000).toISOString() }];
    }),
    revokeDevice: () => respond(() => { throw new ApiError('NOT_FOUND', '로그인 기기를 찾을 수 없습니다.'); }),
    notificationPreferences: () => respond((db) => ({ muted: db.mutedNotifications?.[requireUser(db).id] ?? [] })),
    setNotificationPreference: ({ kind, enabled }) => respond((db) => {
      const id = requireUser(db).id;
      const prefs = db.mutedNotifications ??= {};
      const muted = new Set(prefs[id] ?? []);
      if (enabled) muted.delete(kind);
      else muted.add(kind);
      prefs[id] = [...muted];
      return { muted: prefs[id] };
    }),
    profilePhoto: () => respond((db) => ({ image: db.profilePhotos?.[requireUser(db).id] ?? null })),
    setProfilePhoto: (image) => respond((db) => {
      const id = requireUser(db).id;
      const photos = db.profilePhotos ??= {};
      if (image === null) delete photos[id];
      else photos[id] = image;
      return { image };
    }),
    updateProfile: (input) =>
      respond((db) => {
        const u = requireUser(db);
        u.name = input.name;
        u.phone = input.phone || null;
        u.consents = u.consents.map((c) =>
          c.key === 'marketing'
            ? {
                ...c,
                agreed: input.agreeMarketing,
                agreedAt: input.agreeMarketing ? new Date().toISOString() : null,
              }
            : c,
        );
        return publicUser(db, u);
      }),
    withdraw: () =>
      respond((db) => {
        const u = requireUser(db);
        u.status = 'withdrawn';
        writeSession(null);
      }),
    applications: () =>
      respond((db) => {
        const u = requireUser(db);
        const list = db.applications.filter((a) => a.userId === u.id).map((a) => withCancellable(db, a));
        return isEmptyScenario()
          ? []
          : sortBy(
              list,
              'newest',
              (a) => a.createdAt,
              (a) => a.programTitle,
            );
      }),
    application: (id) =>
      respond((db) => {
        const u = requireUser(db);
        const a = findOr404(db.applications, id);
        if (a.userId !== u.id) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return withCancellable(db, a);
      }),
    cancelApplication: (id) =>
      respond((db) => {
        const u = requireUser(db);
        const a = findOr404(db.applications, id);
        if (a.userId !== u.id) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        if (!withCancellable(db, a).cancellable) {
          throw new ApiError('CONFLICT', '취소 가능 기간이 지났거나 이미 처리된 신청입니다.', {
            reason: 'CANCEL_DEADLINE_PASSED',
          });
        }
        a.status = 'cancelled';
        a.history.push({
          at: new Date().toISOString(),
          status: 'cancelled',
          actor: 'applicant',
          reason: null,
        });
        const p = db.programs.find((x) => x.id === a.programId);
        if (p) p.appliedCount = Math.max(0, p.appliedCount - 1);
        return withCancellable(db, a);
      }),
    clubs: () =>
      respond((db) => {
        const u = requireUser(db);
        return db.memberships
          .filter((m) => m.userId === u.id)
          .map((m) => ({ club: findOr404(db.clubs, m.clubId), role: m.role }));
      }),
    clubApplications: () =>
      respond((db) => {
        const u = requireUser(db);
        return db.clubApplications.filter((a) => a.userId === u.id);
      }),
    reservations: () =>
      respond((db) => {
        const u = requireUser(db);
        const list = db.reservations.filter((r) => r.userId === u.id).map(withReservationCancellable);
        return isEmptyScenario()
          ? []
          : list.sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));
      }),
    cancelReservation: (id) =>
      respond((db) => {
        const u = requireUser(db);
        const r = findOr404(db.reservations, id);
        if (r.userId !== u.id) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        if (!withReservationCancellable(r).cancellable) {
          throw new ApiError('CONFLICT', '이미 지난 예약이거나 처리된 예약은 취소할 수 없습니다.', {
            reason: 'INVALID_STATE',
          });
        }
        r.status = 'cancelled';
        return withReservationCancellable(r);
      }),
    inquiries: () =>
      respond((db) => {
        const u = requireUser(db);
        const list = db.inquiries.filter((q) => q.userId === u.id);
        return isEmptyScenario()
          ? []
          : sortBy(
              list,
              'newest',
              (q) => q.createdAt,
              (q) => q.title,
            );
      }),
    inquiry: (id) =>
      respond((db) => {
        const u = requireUser(db);
        const q = findOr404(db.inquiries, id);
        // 다른 사람의 문의는 존재 여부도 알려주지 않는다
        if (q.userId !== u.id) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return q;
      }),
    notifications: () =>
      respond((db) => {
        const u = requireUser(db);
        return isEmptyScenario()
          ? []
          : sortBy(
              db.notifications.filter((n) => n.userId === u.id),
              'newest',
              (n) => n.createdAt,
              (n) => n.title,
            );
      }),
    markNotificationsRead: (ids) =>
      respond((db) => {
        const u = requireUser(db);
        const now = new Date().toISOString();
        for (const n of db.notifications) {
          if (n.userId === u.id && n.readAt === null && (!ids || ids.includes(n.id))) n.readAt = now;
        }
      }),
    attendance: () =>
      respond((db) => {
        const u = requireUser(db);
        if (isEmptyScenario()) return [];
        return db.attendance
          .filter((s) => s.records.some((r) => r.userId === u.id))
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
          .map((s) => toMyAttendance(s, u.id));
      }),
    checkIn: (input) =>
      respond((db) => {
        const u = requireUser(db);
        return checkIn(db, u.id, input.code.trim());
      }),
  },

  manage: {
    clubs: () =>
      respond((db) => {
        const u = requireUser(db);
        const all = can(u, 'club.manage');
        const managed = managedClubIds(db, u.id);
        if (!all && managed.length === 0) throw new ApiError('FORBIDDEN', '운영하는 동아리가 없습니다.');
        return isEmptyScenario() ? [] : db.clubs.filter((c) => all || managed.includes(c.id));
      }),
    roster: (clubId) =>
      respond((db) => {
        requireClubManager(db, clubId);
        const stats = memberStats(
          db.attendance.filter((s) => s.targetType === 'club' && s.targetId === clubId),
        );
        return db.memberships
          .filter((m) => m.clubId === clubId)
          .map((m) => rosterEntry(db, m, stats.find((x) => x.userId === m.userId)?.rate ?? null))
          .sort((a, b) =>
            a.role === b.role ? a.name.localeCompare(b.name, 'ko') : a.role === 'leader' ? -1 : 1,
          );
      }),
    setMemberRole: (clubId, userId, role) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const m = db.memberships.find((x) => x.clubId === clubId && x.userId === userId);
        if (!m) throw new ApiError('NOT_FOUND', '동아리 회원을 찾을 수 없습니다.');
        m.role = role;
        const entry = rosterEntry(db, m, null);
        audit(db, actor, {
          action: 'club.member.role',
          targetType: 'club',
          targetId: clubId,
          summary: `동아리 역할 변경: ${entry.name} → ${role === 'leader' ? '대표' : '동아리원'}`,
        });
        return entry;
      }),
    removeMember: (clubId, userId) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const before = db.memberships.length;
        db.memberships = db.memberships.filter((m) => !(m.clubId === clubId && m.userId === userId));
        if (db.memberships.length === before) {
          throw new ApiError('NOT_FOUND', '동아리 회원을 찾을 수 없습니다.');
        }
        const club = findOr404(db.clubs, clubId);
        club.memberCount = Math.max(0, club.memberCount - 1);
        audit(db, actor, {
          action: 'club.member.remove',
          targetType: 'club',
          targetId: clubId,
          summary: `동아리 회원 제외: ${findOr404(db.users, userId).name} · ${club.name}`,
        });
      }),
    applications: (clubId) =>
      respond((db) => {
        requireClubManager(db, clubId);
        if (isEmptyScenario()) return [];
        return db.clubApplications
          .filter((a) => a.clubId === clubId)
          .sort(
            (a, b) =>
              Number(b.status === 'pending') - Number(a.status === 'pending') ||
              b.createdAt.localeCompare(a.createdAt),
          );
      }),
    decideApplication: (clubId, id, decision, reason) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const a = findOr404(db.clubApplications, id);
        if (a.clubId !== clubId) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return decideClubApplication(db, actor, a, decision, reason);
      }),
    updateIntro: (clubId, input) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const parsed = parseValues(clubIntroSchema, input);
        if (!parsed.ok) {
          throw new ApiError('VALIDATION', '입력값을 확인해 주세요.', { fieldErrors: parsed.errors });
        }
        const club = findOr404(db.clubs, clubId);
        Object.assign(club, parsed.data);
        audit(db, actor, {
          action: 'club.intro.update',
          targetType: 'club',
          targetId: clubId,
          summary: `동아리 소개 수정: ${club.name}`,
        });
        return club;
      }),
    createPost: (clubId, input) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const parsed = parseValues(clubPostSchema, input);
        if (!parsed.ok) {
          throw new ApiError('VALIDATION', '입력값을 확인해 주세요.', { fieldErrors: parsed.errors });
        }
        const post = { id: nextId(db, 'cp'), at: new Date().toISOString(), ...parsed.data };
        db.clubPosts.unshift({ ...post, clubId });
        audit(db, actor, {
          action: 'club.post.create',
          targetType: 'club',
          targetId: clubId,
          summary: `동아리 소식 작성: ${post.title}`,
        });
        return post;
      }),
    removePost: (clubId, postId) =>
      respond((db) => {
        const actor = requireClubManager(db, clubId);
        const post = db.clubPosts.find((p) => p.id === postId && p.clubId === clubId);
        if (!post) throw new ApiError('NOT_FOUND', '소식을 찾을 수 없습니다.');
        db.clubPosts = db.clubPosts.filter((p) => p !== post);
        audit(db, actor, {
          action: 'club.post.delete',
          targetType: 'club',
          targetId: clubId,
          summary: `동아리 소식 삭제: ${post.title}`,
        });
      }),
  },

  attendance: {
    targets: () =>
      respond((db) => {
        const u = requireUser(db);
        const all = can(u, 'attendance.manage');
        const managed = managedClubIds(db, u.id);
        if (!all && managed.length === 0) {
          throw new ApiError('FORBIDDEN', '출석부를 관리할 권한이 없습니다.');
        }
        if (isEmptyScenario()) return [];
        const count = (t: AttendanceTarget) =>
          db.attendance.filter((s) => s.targetType === t.type && s.targetId === t.id).length;
        const clubs = db.clubs
          .filter((c) => c.status === 'active' && (all || managed.includes(c.id)))
          .map((c) => ({ type: 'club' as const, id: c.id, name: c.name }));
        const programs = all
          ? db.programs
              .filter((p) => p.status === 'published')
              .map((p) => ({ type: 'program' as const, id: p.id, name: p.title }))
          : [];
        return [...clubs, ...programs].map((t) => ({
          ...t,
          rosterCount: rosterOf(db, t).length,
          sessionCount: count(t),
        }));
      }),
    sessions: (target) =>
      respond((db) => {
        requireAttendanceManager(db, target);
        if (isEmptyScenario()) return [];
        return db.attendance
          .filter((s) => s.targetType === target.type && s.targetId === target.id)
          .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
          .map(withCheckIn);
      }),
    get: (id) =>
      respond((db) => {
        const s = findOr404(db.attendance, id);
        requireAttendanceManager(db, { type: s.targetType, id: s.targetId });
        return withCheckIn(s);
      }),
    create: (target, input) =>
      respond((db) => {
        const actor = requireAttendanceManager(db, target);
        const parsed = parseValues(attendanceSessionSchema, input);
        if (!parsed.ok)
          throw new ApiError('VALIDATION', '입력값을 확인해 주세요.', { fieldErrors: parsed.errors });
        const s: AttendanceSession = {
          id: nextId(db, 'at'),
          targetType: target.type,
          targetId: target.id,
          targetName: targetName(db, target),
          date: parsed.data.date,
          title: parsed.data.title,
          checkInCode: null,
          checkInClosesAt: null,
          createdAt: new Date().toISOString(),
          createdBy: actor.name,
          records: rosterOf(db, target).map((r) => ({
            ...r,
            status: null,
            checkedAt: null,
            method: null,
            note: null,
          })),
        };
        db.attendance.push(s);
        audit(db, actor, {
          action: 'attendance.create',
          targetType: 'attendance',
          targetId: s.id,
          summary: `출석부 생성: ${s.targetName} ${s.date} ${s.title}`,
        });
        return withCheckIn(s);
      }),
    remove: (id) =>
      respond((db) => {
        const s = findOr404(db.attendance, id);
        const actor = requireAttendanceManager(db, { type: s.targetType, id: s.targetId });
        db.attendance = db.attendance.filter((x) => x.id !== id);
        audit(db, actor, {
          action: 'attendance.delete',
          targetType: 'attendance',
          targetId: id,
          summary: `출석부 삭제: ${s.targetName} ${s.date} ${s.title}`,
        });
      }),
    mark: (id, marks) =>
      respond((db) => {
        const s = findOr404(db.attendance, id);
        requireAttendanceManager(db, { type: s.targetType, id: s.targetId });
        if (marks.some((m) => !s.records.some((r) => r.userId === m.userId))) {
          throw new ApiError('VALIDATION', '출석부 명단에 없는 회원이 포함되어 있습니다.');
        }
        const now = new Date().toISOString();
        for (const m of marks) {
          const r = s.records.find((x) => x.userId === m.userId)!;
          r.status = m.status;
          r.checkedAt = m.status ? now : null;
          r.method = m.status ? 'manager' : null;
          if (m.note !== undefined) r.note = m.note?.trim().slice(0, 100) || null;
        }
        return withCheckIn(s);
      }),
    setCheckIn: (id, open) =>
      respond((db) => {
        const s = findOr404(db.attendance, id);
        const actor = requireAttendanceManager(db, { type: s.targetType, id: s.targetId });
        if (open) {
          s.checkInCode = issueCode(db);
          s.checkInClosesAt = new Date(Date.now() + CHECK_IN_MINUTES * 60_000).toISOString();
        } else {
          s.checkInCode = null;
          s.checkInClosesAt = null;
        }
        audit(db, actor, {
          action: open ? 'attendance.checkin.open' : 'attendance.checkin.close',
          targetType: 'attendance',
          targetId: id,
          summary: `출석 코드 ${open ? '열기' : '닫기'}: ${s.targetName} ${s.date} ${s.title}`,
        });
        return withCheckIn(s);
      }),
    stats: (target) =>
      respond((db) => {
        requireAttendanceManager(db, target);
        if (isEmptyScenario()) return [];
        return memberStats(
          db.attendance.filter((s) => s.targetType === target.type && s.targetId === target.id),
        );
      }),
  },

  media: {
    list: () =>
      respond((db) =>
        isEmptyScenario() ? [] : [...db.media].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')),
      ),
  },

  spaces: {
    list: () => respond((db) => (isEmptyScenario() ? [] : db.spaces)),
    get: (id) => respond((db) => findOr404(db.spaces, id)),
    availability: (id, date) =>
      respond((db) => {
        findOr404(db.spaces, id);
        const taken = db.reservations.filter(
          (r) => r.spaceId === id && r.date === date && (r.status === 'pending' || r.status === 'approved'),
        );
        return buildSlots(date, taken);
      }),
    reserve: (id, input) =>
      respond((db) => {
        const u = requireUser(db);
        const s = findOr404(db.spaces, id);
        if (!s.reservable) {
          throw new ApiError('CONFLICT', '현재 예약을 받지 않는 공간입니다.', { reason: 'RECRUIT_CLOSED' });
        }
        const windowError = reservationWindowError(input.date, input.startTime, input.endTime, todayKst());
        if (windowError)
          throw new ApiError('VALIDATION', windowError, { fieldErrors: { date: windowError } });
        if (input.headcount > s.capacity) {
          throw new ApiError('VALIDATION', `이 공간의 수용 인원은 ${s.capacity}명입니다.`, {
            fieldErrors: { headcount: `수용 인원(${s.capacity}명) 이하로 입력해 주세요.` },
          });
        }
        const clash = db.reservations.some(
          (r) =>
            r.spaceId === id &&
            r.date === input.date &&
            (r.status === 'pending' || r.status === 'approved') &&
            overlaps(input.startTime, input.endTime, r.startTime, r.endTime),
        );
        if (clash)
          throw new ApiError('CONFLICT', '선택한 시간에 이미 예약이 있습니다. 다른 시간을 선택해 주세요.', {
            reason: 'DUPLICATE',
          });
        const r = {
          id: nextId(db, 'r'),
          spaceId: s.id,
          spaceName: s.name,
          userId: u.id,
          applicantName: u.name,
          phone: input.phone.replace(/-/g, ''),
          date: input.date,
          startTime: input.startTime,
          endTime: input.endTime,
          headcount: input.headcount,
          purpose: input.purpose,
          status: 'pending' as const,
          reason: null,
          createdAt: new Date().toISOString(),
        };
        db.reservations.push(r);
        return withReservationCancellable(r);
      }),
  },

  inquiries: {
    create: (input) =>
      respond((db) => {
        const u = requireUser(db);
        const q = {
          id: nextId(db, 'q'),
          userId: u.id,
          authorName: u.name,
          category: input.category,
          title: input.title,
          body: input.body,
          status: 'open' as const,
          createdAt: new Date().toISOString(),
          answer: null,
        };
        db.inquiries.push(q);
        return q;
      }),
  },

  faqs: {
    list: () =>
      respond((db) =>
        isEmptyScenario() ? [] : db.faqs.filter((f) => f.published).sort((a, b) => a.order - b.order),
      ),
  },

  policies: {
    get: (key) =>
      respond((db) =>
        findOr404(
          db.policies.map((p) => ({ ...p, id: p.key })),
          key,
        ),
      ),
  },

  programs: {
    categories: () => respond((db) => db.categories),
    list: (q) =>
      respond((db) => {
        const list = db.programs
          .filter((p) => p.status === 'published')
          .map(withRecruitStatus)
          .filter((p) => !q.categoryId || p.categoryId === q.categoryId)
          .filter((p) => !q.recruitStatus || p.recruitStatus === q.recruitStatus)
          .filter((p) => matches(`${p.title} ${p.summary} ${p.target}`, q.q));
        // 모집 중 → 모집 예정 → 마감 순, 같은 상태는 모집 마감일 순
        const order = { open: 0, upcoming: 1, full: 2, closed: 3 };
        list.sort(
          (a, b) =>
            order[a.recruitStatus] - order[b.recruitStatus] ||
            Date.parse(a.recruitEndsAt) - Date.parse(b.recruitEndsAt),
        );
        return paginate(list, q.page, q.pageSize ?? 9);
      }),
    get: (id) =>
      respond((db) => {
        const p = findOr404(db.programs, id);
        if (p.status !== 'published') throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return withRecruitStatus(p);
      }),
    apply: (id, input) =>
      respond((db) => {
        const u = requireUser(db);
        const p = findOr404(db.programs, id);
        const status = computeRecruitStatus(p, new Date());
        if (p.status !== 'published' || status === 'upcoming' || status === 'closed') {
          throw new ApiError('CONFLICT', '모집 기간이 아닙니다.', { reason: 'RECRUIT_CLOSED' });
        }
        const active = db.applications.find(
          (a) =>
            a.programId === id && a.userId === u.id && (a.status === 'submitted' || a.status === 'approved'),
        );
        if (active) {
          throw new ApiError(
            'CONFLICT',
            '이미 신청한 프로그램입니다. 마이페이지에서 신청 상태를 확인해 주세요.',
            {
              reason: 'DUPLICATE',
            },
          );
        }
        if (status === 'full')
          throw new ApiError('CONFLICT', '정원이 마감되었습니다.', { reason: 'CAPACITY_FULL' });
        const now = new Date().toISOString();
        const a: ProgramApplication = {
          id: nextId(db, 'a'),
          receiptNo: `DEV-${String(db.seq).padStart(5, '0')}`,
          programId: p.id,
          programTitle: p.title,
          userId: u.id,
          applicantName: u.name,
          phone: input.phone,
          note: input.note,
          status: 'submitted',
          createdAt: now,
          history: [{ at: now, status: 'submitted', actor: 'applicant', reason: null }],
          cancellable: true,
        };
        db.applications.push(a);
        p.appliedCount += 1;
        return withCancellable(db, a);
      }),
  },

  notices: {
    list: (q) =>
      respond((db) => {
        const list = db.notices
          .filter((n) => n.status === 'published')
          .filter((n) => !q.category || n.category === q.category)
          .filter((n) => matches(`${n.title} ${n.body}`, q.q))
          .sort(
            (a, b) =>
              Number(b.pinned) - Number(a.pinned) || Date.parse(b.publishedAt!) - Date.parse(a.publishedAt!),
          );
        return paginate(list, q.page, q.pageSize ?? 10);
      }),
    get: (id) =>
      respond((db) => {
        const n = findOr404(db.notices, id);
        if (n.status !== 'published') throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return n;
      }),
  },

  clubs: {
    list: () => respond((db) => (isEmptyScenario() ? [] : db.clubs.filter((c) => c.status === 'active'))),
    get: (id) =>
      respond((db) => {
        const c = findOr404(db.clubs, id);
        if (c.status !== 'active') throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
        return c;
      }),
    members: (id) =>
      respond((db) => {
        const u = requireUser(db);
        if (!db.memberships.some((m) => m.clubId === id && m.userId === u.id)) {
          throw new ApiError('FORBIDDEN', '동아리원만 명단을 볼 수 있습니다.');
        }
        return db.memberships
          .filter((m) => m.clubId === id)
          .sort((a, b) => (a.role === 'leader' ? -1 : b.role === 'leader' ? 1 : 0))
          .map((m) => {
            const name = db.users.find((x) => x.id === m.userId)?.name ?? '알 수 없음';
            const chars = [...name];
            const masked =
              chars.length <= 2
                ? `${chars[0]}*`
                : `${chars[0]}${'*'.repeat(chars.length - 2)}${chars.at(-1)}`;
            return { displayName: masked, role: m.role, joinedAt: m.joinedAt };
          });
      }),
    posts: (id) =>
      respond((db) => {
        const u = requireUser(db);
        if (!db.memberships.some((m) => m.clubId === id && m.userId === u.id)) {
          throw new ApiError('FORBIDDEN', '동아리원만 볼 수 있습니다.');
        }
        return db.clubPosts
          .filter((p) => p.clubId === id)
          .sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
      }),
    apply: (id, input) =>
      respond((db) => {
        const u = requireUser(db);
        const c = findOr404(db.clubs, id);
        if (!c.recruiting || c.status !== 'active') {
          throw new ApiError('CONFLICT', '현재 가입 신청을 받지 않는 동아리입니다.', {
            reason: 'RECRUIT_CLOSED',
          });
        }
        if (db.memberships.some((m) => m.clubId === id && m.userId === u.id)) {
          throw new ApiError('CONFLICT', '이미 가입한 동아리입니다.', { reason: 'DUPLICATE' });
        }
        if (db.clubApplications.some((a) => a.clubId === id && a.userId === u.id && a.status === 'pending')) {
          throw new ApiError('CONFLICT', '검토 중인 가입 신청이 있습니다.', { reason: 'DUPLICATE' });
        }
        const a: ClubApplication = {
          id: nextId(db, 'ca'),
          clubId: c.id,
          clubName: c.name,
          userId: u.id,
          applicantName: u.name,
          motivation: input.motivation,
          status: 'pending',
          reason: null,
          createdAt: new Date().toISOString(),
        };
        db.clubApplications.push(a);
        return a;
      }),
  },

  site: { settings: () => respond((db) => db.siteSettings ?? { version: 0, values: {} }) },
  admin: {
    serverLogs: () =>
      respond((db) => {
        requirePermission(db, 'developer.access');
        return { source: 'mock', startedAt: null, capacity: 0, entries: [] };
      }),
    updateSettings: (input) =>
      respond((db) => {
        const actor = requirePermission(db, 'site.manage');
        const result = settingsWriteSchema.safeParse(input);
        if (!result.success)
          throw new ApiError('VALIDATION', result.error.issues[0]?.message ?? '설정을 확인해 주세요.');
        if (input.version !== (db.siteSettings?.version ?? 0))
          throw new ApiError('CONFLICT', '다른 관리자가 수정했습니다. 최신 설정을 불러와 주세요.');
        db.siteSettings = { version: input.version + 1, values: result.data.values };
        audit(db, actor, {
          action: 'site.settings.update',
          targetType: 'site_settings',
          targetId: 'site',
          summary: '사이트 설정 변경',
        });
        return db.siteSettings;
      }),
    dashboard: (periodDays) =>
      respond((db) => {
        requirePermission(db, 'admin.access');
        const since = Date.now() - periodDays * DAY;
        const programs = db.programs.map(withRecruitStatus);
        return {
          generatedAt: new Date().toISOString(),
          programsOpen: programs.filter((p) => p.status === 'published' && p.recruitStatus === 'open').length,
          applicationsSubmitted: db.applications.filter((a) => a.status === 'submitted').length,
          applicationsInPeriod: db.applications.filter((a) => Date.parse(a.createdAt) >= since).length,
          clubApplicationsPending: db.clubApplications.filter((a) => a.status === 'pending').length,
          reservationsPending: db.reservations.filter((r) => r.status === 'pending').length,
          inquiriesOpen: db.inquiries.filter((x) => x.status === 'open').length,
          noticesPublished: db.notices.filter((n) => n.status === 'published').length,
          recentApplications: isEmptyScenario()
            ? []
            : sortBy(
                db.applications,
                'newest',
                (a) => a.createdAt,
                (a) => a.programTitle,
              ).slice(0, 5),
          recentNotices: isEmptyScenario()
            ? []
            : sortBy(
                db.notices,
                'newest',
                (n) => n.updatedAt,
                (n) => n.title,
              ).slice(0, 5),
        };
      }),

    notices: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'notice.write');
          const list = db.notices
            .filter((n) => !q.status || n.status === q.status)
            .filter((n) => matches(n.title, q.q));
          return paginate(
            sortBy(
              list,
              q.sort,
              (n) => n.updatedAt,
              (n) => n.title,
            ),
            q.page,
            q.pageSize,
          );
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'notice.write');
          return findOr404(db.notices, id);
        }),
      create: (input) =>
        respond((db) => {
          const actor = requirePermission(db, 'notice.write');
          const now = new Date().toISOString();
          const n = {
            id: nextId(db, 'n'),
            ...input,
            publishedAt: input.status === 'published' ? now : null,
            updatedAt: now,
            attachments: [],
          };
          db.notices.push(n);
          audit(db, actor, {
            action: 'notice.create',
            targetType: 'notice',
            targetId: n.id,
            summary: `공지 등록: ${n.title}`,
          });
          return n;
        }),
      update: (id, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'notice.write');
          const n = findOr404(db.notices, id);
          const now = new Date().toISOString();
          const publishedAt = input.status === 'published' ? (n.publishedAt ?? now) : n.publishedAt;
          Object.assign(n, input, { updatedAt: now, publishedAt });
          audit(db, actor, {
            action: 'notice.update',
            targetType: 'notice',
            targetId: id,
            summary: `공지 수정: ${n.title}`,
          });
          return n;
        }),
      remove: (id) =>
        respond((db) => {
          const actor = requirePermission(db, 'notice.write');
          const n = findOr404(db.notices, id);
          db.notices = db.notices.filter((x) => x.id !== id);
          audit(db, actor, {
            action: 'notice.delete',
            targetType: 'notice',
            targetId: id,
            summary: `공지 삭제: ${n.title}`,
          });
        }),
    },

    programs: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'program.write');
          const list = db.programs
            .map(withRecruitStatus)
            .filter((p) => !q.status || p.status === q.status)
            .filter((p) => matches(p.title, q.q));
          return paginate(
            sortBy(
              list,
              q.sort,
              (p) => p.updatedAt,
              (p) => p.title,
            ),
            q.page,
            q.pageSize,
          );
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'program.write');
          return withRecruitStatus(findOr404(db.programs, id));
        }),
      create: (input) =>
        respond((db) => {
          const actor = requirePermission(db, 'program.write');
          findOr404(db.categories, input.categoryId);
          const p: Program = {
            id: nextId(db, 'p'),
            title: input.title,
            categoryId: input.categoryId,
            summary: input.summary,
            description: input.description,
            target: input.target,
            place: input.place,
            startsAt: kst(input.startsAt, '09:00'),
            endsAt: kst(input.endsAt, '18:00'),
            recruitStartsAt: kst(input.recruitStartsAt, '09:00'),
            recruitEndsAt: kst(input.recruitEndsAt, '18:00'),
            cancelDeadline: kst(input.cancelDeadline, '18:00'),
            capacity: input.capacity,
            appliedCount: 0,
            status: input.status,
            recruitStatus: 'upcoming',
            updatedAt: new Date().toISOString(),
          };
          db.programs.push(p);
          audit(db, actor, {
            action: 'program.create',
            targetType: 'program',
            targetId: p.id,
            summary: `프로그램 등록: ${p.title}`,
          });
          return withRecruitStatus(p);
        }),
      update: (id, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'program.write');
          const p = findOr404(db.programs, id);
          if (input.capacity < p.appliedCount) {
            throw new ApiError('VALIDATION', '정원은 현재 신청 인원보다 적을 수 없습니다.', {
              fieldErrors: { capacity: `현재 신청 인원(${p.appliedCount}명)보다 적을 수 없습니다.` },
            });
          }
          Object.assign(p, {
            ...input,
            startsAt: kst(input.startsAt, '09:00'),
            endsAt: kst(input.endsAt, '18:00'),
            recruitStartsAt: kst(input.recruitStartsAt, '09:00'),
            recruitEndsAt: kst(input.recruitEndsAt, '18:00'),
            cancelDeadline: kst(input.cancelDeadline, '18:00'),
            updatedAt: new Date().toISOString(),
          });
          for (const a of db.applications) if (a.programId === id) a.programTitle = p.title;
          audit(db, actor, {
            action: 'program.update',
            targetType: 'program',
            targetId: id,
            summary: `프로그램 수정: ${p.title}`,
          });
          return withRecruitStatus(p);
        }),
      remove: (id) =>
        respond((db) => {
          const actor = requirePermission(db, 'program.write');
          const p = findOr404(db.programs, id);
          if (db.applications.some((a) => a.programId === id)) {
            throw new ApiError(
              'CONFLICT',
              '신청 내역이 있는 프로그램은 삭제할 수 없습니다. 비공개로 전환해 주세요.',
              {
                reason: 'INVALID_STATE',
              },
            );
          }
          db.programs = db.programs.filter((x) => x.id !== id);
          audit(db, actor, {
            action: 'program.delete',
            targetType: 'program',
            targetId: id,
            summary: `프로그램 삭제: ${p.title}`,
          });
        }),
    },

    applications: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'application.decide');
          const list = db.applications
            .filter((a) => !q.programId || a.programId === q.programId)
            .filter((a) => !q.status || a.status === q.status)
            .filter((a) => matches(`${a.applicantName} ${a.programTitle} ${a.receiptNo ?? ''}`, q.q))
            .map((a) => withCancellable(db, a));
          return paginate(
            sortBy(
              list,
              q.sort,
              (a) => a.createdAt,
              (a) => a.programTitle,
            ),
            q.page,
            q.pageSize,
          );
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'application.decide');
          return withCancellable(db, findOr404(db.applications, id));
        }),
      decide: (ids, decision, reason) =>
        respond((db) => {
          const actor = requirePermission(db, 'application.decide');
          if (decision === 'rejected' && !reason?.trim()) {
            throw new ApiError('VALIDATION', '반려 사유를 입력해 주세요.', {
              fieldErrors: { reason: '반려 사유를 입력해 주세요.' },
            });
          }
          const result = { succeeded: [] as string[], failed: [] as { id: string; reason: string }[] };
          for (const id of ids) {
            const a = db.applications.find((x) => x.id === id);
            if (!a) {
              result.failed.push({ id, reason: '신청을 찾을 수 없습니다.' });
              continue;
            }
            if (a.status !== 'submitted') {
              result.failed.push({ id, reason: '이미 처리되었거나 취소된 신청입니다.' });
              continue;
            }
            a.status = decision;
            a.history.push({
              at: new Date().toISOString(),
              status: decision,
              actor: 'staff',
              reason: reason?.trim() || null,
            });
            if (decision === 'rejected') {
              const p = db.programs.find((x) => x.id === a.programId);
              if (p) p.appliedCount = Math.max(0, p.appliedCount - 1);
            }
            result.succeeded.push(id);
            notify(db, {
              userId: a.userId,
              kind: 'application',
              title: `프로그램 신청이 ${decision === 'approved' ? '승인' : '반려'}되었습니다`,
              body: reason?.trim() ? `${a.programTitle} · 사유: ${reason.trim()}` : a.programTitle,
              link: `/my/applications/${a.id}`,
            });
            audit(db, actor, {
              action: `application.${decision}`,
              targetType: 'application',
              targetId: id,
              summary: `신청 ${decision === 'approved' ? '승인' : '반려'}: ${a.applicantName} · ${a.programTitle}`,
            });
          }
          return result;
        }),
    },

    members: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'member.read');
          const list = db.users
            .filter((u) => !q.status || u.status === q.status)
            .filter((u) => matches(`${u.name} ${u.email}`, q.q))
            .map((u) => publicUser(db, u));
          return paginate(
            sortBy(
              list,
              q.sort,
              (u) => u.createdAt,
              (u) => u.name,
            ),
            q.page,
            q.pageSize,
          );
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'member.read');
          return publicUser(db, findOr404(db.users, id));
        }),
      update: (id, patch) =>
        respond((db) => {
          const actor = requirePermission(db, 'member.manage');
          if (actor.id === id) {
            throw new ApiError('CONFLICT', '자기 자신의 권한·상태는 변경할 수 없습니다.', {
              reason: 'INVALID_STATE',
            });
          }
          const u = findOr404(db.users, id);
          if (!canManageUser(actor, u)) {
            throw new ApiError('FORBIDDEN', '개발자 계정은 개발자만 변경할 수 있습니다.');
          }
          if (patch.roles) {
            if (patch.roles.length === 0) throw new ApiError('VALIDATION', '역할을 1개 이상 지정해 주세요.');
            const allowed = assignableRoles(actor);
            if (patch.roles.some((r) => !allowed.includes(r))) {
              throw new ApiError('FORBIDDEN', '부여할 수 없는 역할입니다.');
            }
            u.roles = patch.roles;
          }
          if (patch.status) u.status = patch.status;
          audit(db, actor, {
            action: 'user.update',
            targetType: 'user',
            targetId: id,
            summary: `회원 변경: ${u.name} (${[patch.roles && `역할 ${patch.roles.join(',')}`, patch.status && `상태 ${patch.status}`].filter(Boolean).join(', ')})`,
          });
          return publicUser(db, u);
        }),
    },

    clubs: {
      list: () =>
        respond((db) => {
          requirePermission(db, 'club.manage');
          return isEmptyScenario() ? [] : db.clubs;
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'club.manage');
          return findOr404(db.clubs, id);
        }),
      create: (input) =>
        respond((db) => {
          const actor = requirePermission(db, 'club.manage');
          const c = {
            id: nextId(db, 'cl'),
            memberCount: 0,
            target: null,
            photos: [],
            activities: [],
            sourceUrls: [],
            ...defined(input),
          } as Club;
          db.clubs.push(c);
          audit(db, actor, {
            action: 'club.create',
            targetType: 'club',
            targetId: c.id,
            summary: `동아리 등록: ${c.name}`,
          });
          return c;
        }),
      update: (id, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'club.manage');
          const c = findOr404(db.clubs, id);
          Object.assign(c, defined(input));
          for (const a of db.clubApplications) if (a.clubId === id) a.clubName = c.name;
          audit(db, actor, {
            action: 'club.update',
            targetType: 'club',
            targetId: id,
            summary: `동아리 수정: ${c.name}`,
          });
          return c;
        }),
      applications: (q) =>
        respond((db) => {
          requirePermission(db, 'club.manage');
          const list = db.clubApplications
            .filter((a) => !q.status || a.status === q.status)
            .filter((a) => matches(`${a.applicantName} ${a.clubName}`, q.q));
          return paginate(
            sortBy(
              list,
              q.sort,
              (a) => a.createdAt,
              (a) => a.clubName,
            ),
            q.page,
            q.pageSize,
          );
        }),
      decideApplication: (id, decision, reason) =>
        respond((db) => {
          const actor = requirePermission(db, 'club.manage');
          return decideClubApplication(db, actor, findOr404(db.clubApplications, id), decision, reason);
        }),
      managers: (clubId) =>
        respond((db) => {
          requirePermission(db, 'club.manage');
          findOr404(db.clubs, clubId);
          return db.clubManagers
            .filter((m) => m.clubId === clubId)
            .map((m) => {
              const u = findOr404(db.users, m.userId);
              return { ...m, name: u.name, email: u.email };
            });
        }),
      assignManager: (clubId, email) =>
        respond((db) => {
          const actor = requirePermission(db, 'club.manage');
          const club = findOr404(db.clubs, clubId);
          const parsed = parseValues(managerEmailSchema, { email });
          const u = parsed.ok
            ? db.users.find((x) => x.email.toLowerCase() === parsed.data.email.toLowerCase())
            : undefined;
          if (!u || u.status !== 'active') {
            const message = parsed.ok ? '가입된 활동 회원의 이메일이 아닙니다.' : parsed.errors.email!;
            throw new ApiError('VALIDATION', message, { fieldErrors: { email: message } });
          }
          if (db.clubManagers.some((m) => m.clubId === clubId && m.userId === u.id)) {
            throw new ApiError('CONFLICT', '이미 이 동아리의 담당자입니다.', { reason: 'DUPLICATE' });
          }
          const m = { clubId, userId: u.id, assignedAt: new Date().toISOString() };
          db.clubManagers.push(m);
          notify(db, {
            userId: u.id,
            kind: 'club_manager',
            title: '동아리 담당자로 지정되었습니다',
            body: `${club.name} — 관리자 화면의 동아리 운영에서 회원·가입·출석·소식을 관리할 수 있습니다.`,
            link: `/admin/my-clubs/${clubId}`,
          });
          audit(db, actor, {
            action: 'club.manager.assign',
            targetType: 'club',
            targetId: clubId,
            summary: `동아리 담당자 지정: ${u.name} · ${club.name}`,
          });
          return { ...m, name: u.name, email: u.email };
        }),
      removeManager: (clubId, userId) =>
        respond((db) => {
          const actor = requirePermission(db, 'club.manage');
          const club = findOr404(db.clubs, clubId);
          const before = db.clubManagers.length;
          db.clubManagers = db.clubManagers.filter((m) => !(m.clubId === clubId && m.userId === userId));
          if (db.clubManagers.length === before)
            throw new ApiError('NOT_FOUND', '담당자를 찾을 수 없습니다.');
          audit(db, actor, {
            action: 'club.manager.remove',
            targetType: 'club',
            targetId: clubId,
            summary: `동아리 담당자 해제: ${findOr404(db.users, userId).name} · ${club.name}`,
          });
        }),
    },

    spaces: {
      list: () =>
        respond((db) => {
          requirePermission(db, 'space.manage');
          return db.spaces;
        }),
      update: (id, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'space.manage');
          const s = findOr404(db.spaces, id);
          Object.assign(s, input);
          audit(db, actor, {
            action: 'space.update',
            targetType: 'space',
            targetId: id,
            summary: `공간 설정 변경: ${s.name} (예약 ${s.reservable ? '받음' : '중지'})`,
          });
          return s;
        }),
      reservations: (q) =>
        respond((db) => {
          requirePermission(db, 'space.manage');
          const list = db.reservations
            .filter((r) => !q.status || r.status === q.status)
            .filter((r) => !q.spaceId || r.spaceId === q.spaceId)
            .filter((r) => !q.date || r.date === q.date)
            .filter((r) => matches(`${r.applicantName} ${r.spaceName} ${r.purpose}`, q.q))
            .map(withReservationCancellable);
          return paginate(
            sortBy(
              list,
              q.sort,
              (r) => r.createdAt,
              (r) => r.spaceName,
            ),
            q.page,
            q.pageSize,
          );
        }),
      decideReservation: (id, decision, reason) =>
        respond((db) => {
          const actor = requirePermission(db, 'space.manage');
          const r = findOr404(db.reservations, id);
          if (r.status !== 'pending')
            throw new ApiError('CONFLICT', '이미 처리된 예약입니다.', { reason: 'INVALID_STATE' });
          if (decision === 'rejected' && !reason?.trim()) {
            throw new ApiError('VALIDATION', '반려 사유를 입력해 주세요.', {
              fieldErrors: { reason: '반려 사유를 입력해 주세요.' },
            });
          }
          r.status = decision;
          r.reason = reason?.trim() || null;
          notify(db, {
            userId: r.userId,
            kind: 'reservation',
            title: `공간 예약이 ${decision === 'approved' ? '확정' : '반려'}되었습니다`,
            body: `${r.spaceName} · ${r.date} ${r.startTime}–${r.endTime}${r.reason ? ` · 사유: ${r.reason}` : ''}`,
            link: '/my#reservations',
          });
          audit(db, actor, {
            action: `reservation.${decision}`,
            targetType: 'reservation',
            targetId: id,
            summary: `공간 예약 ${decision === 'approved' ? '확정' : '반려'}: ${r.applicantName} · ${r.spaceName} ${r.date} ${r.startTime}`,
          });
          return withReservationCancellable(r);
        }),
    },

    inquiries: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'inquiry.answer');
          const list = db.inquiries
            .filter((x) => !q.status || x.status === q.status)
            .filter((x) => matches(`${x.title} ${x.authorName}`, q.q));
          return paginate(
            sortBy(
              list,
              q.sort,
              (x) => x.createdAt,
              (x) => x.title,
            ),
            q.page,
            q.pageSize,
          );
        }),
      get: (id) =>
        respond((db) => {
          requirePermission(db, 'inquiry.answer');
          return findOr404(db.inquiries, id);
        }),
      answer: (id, body) =>
        respond((db) => {
          const actor = requirePermission(db, 'inquiry.answer');
          const x = findOr404(db.inquiries, id);
          x.answer = { body, answeredAt: new Date().toISOString(), answeredBy: actor.name };
          x.status = 'answered';
          notify(db, {
            userId: x.userId,
            kind: 'inquiry',
            title: '1:1 문의에 답변이 등록되었습니다',
            body: x.title,
            link: `/qna/${x.id}`,
          });
          audit(db, actor, {
            action: 'inquiry.answer',
            targetType: 'inquiry',
            targetId: id,
            summary: `문의 답변: ${x.title}`,
          });
          return x;
        }),
    },

    faqs: {
      list: () =>
        respond((db) => {
          requirePermission(db, 'inquiry.answer');
          return [...db.faqs].sort((a, b) => a.order - b.order);
        }),
      create: (input) =>
        respond((db) => {
          const actor = requirePermission(db, 'inquiry.answer');
          const f = { id: nextId(db, 'fq'), ...input };
          db.faqs.push(f);
          audit(db, actor, {
            action: 'faq.create',
            targetType: 'faq',
            targetId: f.id,
            summary: `FAQ 등록: ${f.question}`,
          });
          return f;
        }),
      update: (id, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'inquiry.answer');
          const f = findOr404(db.faqs, id);
          Object.assign(f, input);
          audit(db, actor, {
            action: 'faq.update',
            targetType: 'faq',
            targetId: id,
            summary: `FAQ 수정: ${f.question}`,
          });
          return f;
        }),
      remove: (id) =>
        respond((db) => {
          const actor = requirePermission(db, 'inquiry.answer');
          const f = findOr404(db.faqs, id);
          db.faqs = db.faqs.filter((x) => x.id !== id);
          audit(db, actor, {
            action: 'faq.delete',
            targetType: 'faq',
            targetId: id,
            summary: `FAQ 삭제: ${f.question}`,
          });
        }),
    },

    policies: {
      list: () =>
        respond((db) => {
          requirePermission(db, 'policy.manage');
          return db.policies;
        }),
      update: (key, input) =>
        respond((db) => {
          const actor = requirePermission(db, 'policy.manage');
          const p = db.policies.find((x) => x.key === key);
          if (!p) throw new ApiError('NOT_FOUND', '요청한 정보를 찾을 수 없습니다.');
          p.body = input.body;
          p.effectiveAt = new Date(`${input.effectiveAt}T00:00:00+09:00`).toISOString();
          p.confirmed = true;
          p.updatedAt = new Date().toISOString();
          audit(db, actor, {
            action: 'policy.update',
            targetType: 'policy',
            targetId: key,
            summary: `정책 문서 개정: ${p.title}`,
          });
          return p;
        }),
    },

    audit: {
      list: (q) =>
        respond((db) => {
          requirePermission(db, 'audit.read');
          const list = db.audit.filter((e) => matches(`${e.summary} ${e.actorName}`, q.q));
          return paginate(list, q.page, q.pageSize ?? 20);
        }),
    },
  },
};

/** 개발 패널 전용 조작 — mock 모드에서만 노출한다 */
export const mockDev = {
  readScenario,
  setScenario: (s: Scenario) => writeScenario(s),
  expireSession,
  reset: resetDb,
  exportDb,
  importDb,
  /** 비밀번호 재설정 메일 대신 화면에 링크를 보여 주기 위한 값 */
  lastResetToken: () => lastResetToken?.token ?? null,
  verifyEmail: (email: string) => {
    const db = loadDb();
    const u = db.users.find((x) => x.email.toLowerCase() === email.toLowerCase());
    if (u) {
      u.emailVerified = true;
      saveDb(db);
    }
    return !!u;
  },
};
