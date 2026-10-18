import type {
  ClubApplyInput,
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
  AuditEvent,
  BulkResult,
  Club,
  ClubApplication,
  ClubApplicationStatus,
  ClubMember,
  ClubPost,
  DashboardSummary,
  Faq,
  Inquiry,
  MediaItem,
  MyClub,
  Notification,
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
    /** 세션이 없거나 만료면 null */
    me(): Promise<Session | null>;
    login(input: LoginInput): Promise<Session>;
    logout(): Promise<void>;
    signup(input: SignupInput): Promise<{ requiresEmailVerification: boolean }>;
    resendVerification(email: string): Promise<void>;
    requestPasswordReset(email: string): Promise<void>;
    resetPassword(token: string, password: string): Promise<void>;
  };
  me: {
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
  admin: {
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
