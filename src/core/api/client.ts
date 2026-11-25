import type { MemberCommand, MemberActivityOptions } from '@/domain/member-actions';
import type { SignupPhoneState } from '@/domain/signup-phone';
import type { SocialDraft, SocialDetails } from '@/domain/social-profile';
import type { LoginDevice, SocialAccounts } from '@/domain/account-settings';
import type { OAuthProvider } from '@/domain/types';
import type { SettingsRecord, ServerLogSnapshot } from '../domain/site-settings';
import type {
  AttendanceSessionInput,
  CheckInInput,
  ClubApplyInput,
  ClubIntroInput,
  ClubPostInput,
  ClubFormInput,
  FaqFormInput,
  InquiryInput,
  LoginInput,
  NoticeFormInput,
  PolicyFormInput,
  ProfileInput,
  ProgramApplyInput,
  ProgramFormInput,
  ReservationInput,
  SignupInput,
  SpaceFormInput,
} from '@/domain/schemas';
import type {
  AttendanceMark,
  AttendanceMemberStat,
  AttendanceSession,
  AttendanceTarget,
  AttendanceTargetSummary,
  AuditEvent,
  BulkResult,
  Club,
  ClubApplication,
  ClubApplicationStatus,
  ClubManager,
  ClubMember,
  ClubPost,
  ClubRole,
  ClubRosterEntry,
  DashboardSummary,
  Faq,
  Inquiry,
  MediaItem,
  MyAttendance,
  MyClub,
  Notification,
  NotificationKind,
  PolicyDoc,
  PolicyKey,
  Space,
  SpaceReservation,
  TimeSlot,
  Notice,
  NoticeCategory,
  Page,
  Program,
  ProgramApplication,
  ProgramCategory,
  RecruitStatus,
  Role,
  Session,
  User,
  UserStatus,
} from '@/domain/types';

/**
 * UI 가 의존하는 유일한 데이터 계약. 구현은 mock(개발용)과 http(실서버) 두 가지이며
 * NEXT_PUBLIC_API_MODE 로 교체한다. 엔드포인트 매핑은 docs/api-contracts.md 참고.
 */

export interface ProgramQuery {
  q?: string;
  categoryId?: string;
  recruitStatus?: RecruitStatus;
  page?: number;
  pageSize?: number;
}

export interface NoticeQuery {
  q?: string;
  category?: NoticeCategory;
  page?: number;
  pageSize?: number;
}

export interface AdminListQuery {
  q?: string;
  status?: string;
  sort?: 'newest' | 'oldest' | 'title';
  page?: number;
  pageSize?: number;
}

export interface AdminApplicationQuery extends AdminListQuery {
  programId?: string;
}

export type Decision = 'approved' | 'rejected';

export interface ApiClient {
  auth: {
    startNativeApple(link: boolean): Promise<{ state: string; nonce: string }>;
    finishNativeApple(input: { state: string; identityToken: string; name?:string }): Promise<{ signedIn: boolean; needsProfile?: boolean }>;
    adminProviders(): Promise<OAuthProvider[]>;
    startAdminSocial(provider: OAuthProvider): Promise<{ url: string; claim: string }>;
    completeAdminSocial(proof: {
      receipt: string;
      claim: string;
    }): Promise<{ signedIn: boolean; needsLink: boolean }>;
    adminSocialLink(): Promise<{ provider: OAuthProvider }>;
    linkAdminSocial(input: LoginInput): Promise<{ signedIn: boolean }>;
    socialDraft(): Promise<SocialDraft>;
    saveSocialProfile(input: SocialDetails): Promise<SignupPhoneState>;
    socialProviders(): Promise<OAuthProvider[]>;
    startSocial(provider: OAuthProvider, link: boolean, adminLink?: boolean): Promise<{ url: string; claim: string }>;
    completeSocial(proof: { receipt: string; claim: string }): Promise<{ signedIn: boolean; needsProfile?: boolean }>;
    /** 세션이 없거나 만료면 null */
    me(): Promise<Session | null>;
    login(input: LoginInput): Promise<Session>;
    logout(): Promise<void>;
    signup(input: SignupInput): Promise<SignupPhoneState>;
    signupPhone(): Promise<SignupPhoneState>;
    resendPhone(phone?: string): Promise<SignupPhoneState>;
    confirmPhone(code: string): Promise<{signedIn:boolean}>;
    resendVerification(email: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<void>;
  };
  me: {
    socialAccounts(): Promise<SocialAccounts>;
    unlinkSocial(provider: OAuthProvider): Promise<SocialAccounts>;
    loginDevices(): Promise<LoginDevice[]>;
    revokeDevice(id: string): Promise<LoginDevice[]>;
    notificationPreferences(): Promise<{ muted: NotificationKind[] }>;
    setNotificationPreference(input: { kind: NotificationKind; enabled: boolean }): Promise<{ muted: NotificationKind[] }>;
    profilePhoto(): Promise<{ image: string | null }>;
    setProfilePhoto(image: string | null): Promise<{ image: string | null }>;
    updateProfile(input: ProfileInput): Promise<User>;
    withdraw(): Promise<void>;
    applications(): Promise<ProgramApplication[]>;
    application(id: string): Promise<ProgramApplication>;
    cancelApplication(id: string): Promise<ProgramApplication>;
    clubs(): Promise<MyClub[]>;
    clubApplications(): Promise<ClubApplication[]>;
    reservations(): Promise<SpaceReservation[]>;
    cancelReservation(id: string): Promise<SpaceReservation>;
    inquiries(): Promise<Inquiry[]>;
    inquiry(id: string): Promise<Inquiry>;
    /** 본인 알림, 최신순 */
    notifications(): Promise<Notification[]>;
    /** ids 를 생략하면 본인 알림 전체를 읽음 처리 */
    markNotificationsRead(ids?: string[]): Promise<void>;
    /** 본인이 명단에 있는 출석부 기록, 최신순 */
    attendance(): Promise<MyAttendance[]>;
    /** 담당자가 연 출석 코드로 본인 출석 — 틀린 입력이 반복되면 RATE_LIMITED */
    checkIn(input: CheckInInput): Promise<MyAttendance>;
  };
  /** 동아리 운영 — 센터 직원 이상(club.manage) 또는 그 동아리 담당자. 서버가 동아리별로 검사한다. */
  manage: {
    /** 내가 운영하는 동아리 (센터 직원 이상은 전체) */
    clubs(): Promise<Club[]>;
    /** 연락처가 포함된 회원 명단 + 출석률 */
    roster(clubId: string): Promise<ClubRosterEntry[]>;
    setMemberRole(clubId: string, userId: string, role: ClubRole): Promise<ClubRosterEntry>;
    /** 동아리에서 제외 */
    removeMember(clubId: string, userId: string): Promise<void>;
    /** 가입 신청, 대기 먼저 */
    applications(clubId: string): Promise<ClubApplication[]>;
    decideApplication(
      clubId: string,
      applicationId: string,
      decision: Decision,
      reason: string | null,
    ): Promise<ClubApplication>;
    /** 소개·모임 일정·모집 여부 (사진·활동 기록·출처는 센터 직원이 관리) */
    updateIntro(clubId: string, input: ClubIntroInput): Promise<Club>;
    createPost(clubId: string, input: ClubPostInput): Promise<ClubPost>;
    removePost(clubId: string, postId: string): Promise<void>;
  };
  /** 출석부 — attendance.manage(센터 직원 이상) 또는 동아리 담당자(그 동아리만). 서버가 대상별 권한을 다시 검사한다. */
  attendance: {
    /** 출석을 관리할 수 있는 동아리·프로그램 */
    targets(): Promise<AttendanceTargetSummary[]>;
    /** 회차 목록, 날짜 최신순 */
    sessions(target: AttendanceTarget): Promise<AttendanceSession[]>;
    get(id: string): Promise<AttendanceSession>;
    /** 명단(동아리원 / 승인된 신청자)을 채운 새 회차 */
    create(target: AttendanceTarget, input: AttendanceSessionInput): Promise<AttendanceSession>;
    remove(id: string): Promise<void>;
    /** 여러 명을 한 번에 체크 — 명단에 없는 회원이 있으면 VALIDATION */
    mark(id: string, marks: AttendanceMark[]): Promise<AttendanceSession>;
    /** 본인 출석 체크 열기(서버가 4자리 코드 발급, 10분 후 자동 마감)·닫기 */
    setCheckIn(id: string, open: boolean): Promise<AttendanceSession>;
    /** 회원별 누적 출석 */
    stats(target: AttendanceTarget): Promise<AttendanceMemberStat[]>;
  };
  media: {
    /** 센터 공식 채널의 사진·영상, 최신순 */
    list(): Promise<MediaItem[]>;
  };
  spaces: {
    list(): Promise<Space[]>;
    get(id: string): Promise<Space>;
    /** 해당 날짜의 1시간 단위 예약 가능 시간대 */
    availability(id: string, date: string): Promise<TimeSlot[]>;
    reserve(id: string, input: ReservationInput): Promise<SpaceReservation>;
  };
  inquiries: {
    create(input: InquiryInput): Promise<Inquiry>;
  };
  faqs: {
    list(): Promise<Faq[]>;
  };
  policies: {
    get(key: PolicyKey): Promise<PolicyDoc>;
  };
  programs: {
    categories(): Promise<ProgramCategory[]>;
    list(query: ProgramQuery): Promise<Page<Program>>;
    get(id: string): Promise<Program>;
    apply(id: string, input: ProgramApplyInput): Promise<ProgramApplication>;
  };
  notices: {
    list(query: NoticeQuery): Promise<Page<Notice>>;
    get(id: string): Promise<Notice>;
  };
  clubs: {
    list(): Promise<Club[]>;
    get(id: string): Promise<Club>;
    /** 해당 동아리원만 조회 가능 (서버 권한 검증) */
    members(id: string): Promise<ClubMember[]>;
    posts(id: string): Promise<ClubPost[]>;
    apply(id: string, input: ClubApplyInput): Promise<ClubApplication>;
  };
  site: { settings(): Promise<SettingsRecord> };
  admin: {
    updateSettings(input: SettingsRecord): Promise<SettingsRecord>;
    serverLogs(): Promise<ServerLogSnapshot>;
    dashboard(periodDays: number): Promise<DashboardSummary>;
    notices: {
      list(query: AdminListQuery): Promise<Page<Notice>>;
      get(id: string): Promise<Notice>;
      create(input: NoticeFormInput): Promise<Notice>;
      update(id: string, input: NoticeFormInput): Promise<Notice>;
      remove(id: string): Promise<void>;
    };
    programs: {
      list(query: AdminListQuery): Promise<Page<Program>>;
      get(id: string): Promise<Program>;
      create(input: ProgramFormInput): Promise<Program>;
      update(id: string, input: ProgramFormInput): Promise<Program>;
      remove(id: string): Promise<void>;
    };
    applications: {
      list(query: AdminApplicationQuery): Promise<Page<ProgramApplication>>;
      get(id: string): Promise<ProgramApplication>;
      decide(ids: string[], decision: Decision, reason: string | null): Promise<BulkResult>;
    };
    members: {
      activityOptions(id: string): Promise<MemberActivityOptions>;
      act(id: string, command: MemberCommand): Promise<{resetUrl?: string}>;
      list(query: AdminListQuery): Promise<Page<User>>;
      get(id: string): Promise<User>;
      update(id: string, patch: { roles?: Role[]; status?: UserStatus }): Promise<User>;
    };
    clubs: {
      list(): Promise<Club[]>;
      get(id: string): Promise<Club>;
      create(input: ClubFormInput): Promise<Club>;
      update(id: string, input: ClubFormInput): Promise<Club>;
      applications(
        query: AdminListQuery & { status?: ClubApplicationStatus | '' },
      ): Promise<Page<ClubApplication>>;
      decideApplication(id: string, decision: Decision, reason: string | null): Promise<ClubApplication>;
      /** 동아리별 담당자 — club.manage */
      managers(clubId: string): Promise<ClubManager[]>;
      /** 가입된 활동 회원의 이메일로 지정 — 없는 회원이면 VALIDATION, 이미 담당자면 CONFLICT(DUPLICATE) */
      assignManager(clubId: string, email: string): Promise<ClubManager>;
      removeManager(clubId: string, userId: string): Promise<void>;
    };
    spaces: {
      list(): Promise<Space[]>;
      update(id: string, input: SpaceFormInput): Promise<Space>;
      reservations(
        query: AdminListQuery & { spaceId?: string; date?: string },
      ): Promise<Page<SpaceReservation>>;
      decideReservation(id: string, decision: Decision, reason: string | null): Promise<SpaceReservation>;
    };
    inquiries: {
      list(query: AdminListQuery): Promise<Page<Inquiry>>;
      get(id: string): Promise<Inquiry>;
      answer(id: string, body: string): Promise<Inquiry>;
    };
    faqs: {
      list(): Promise<Faq[]>;
      create(input: FaqFormInput): Promise<Faq>;
      update(id: string, input: FaqFormInput): Promise<Faq>;
      remove(id: string): Promise<void>;
    };
    policies: {
      list(): Promise<PolicyDoc[]>;
      update(key: PolicyKey, input: PolicyFormInput): Promise<PolicyDoc>;
    };
    audit: {
      list(query: AdminListQuery): Promise<Page<AuditEvent>>;
    };
  };
}
