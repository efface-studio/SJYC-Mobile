import { Platform } from 'react-native';
import { API_BASE_URL } from '@/config/env';
import type { ApiClient } from './client';
import { ApiError, DEFAULT_MESSAGE, type ApiErrorCode, type ConflictReason } from './errors';

/**
 * 실서버 어댑터 — 계약 초안(docs/api-contracts.md)을 따른다. 서버 확정 시 경로만 맞추면 된다.
 * 인증은 서버가 발급한 HttpOnly 세션 쿠키로만 하며, 토큰을 JS 저장소에 두지 않는다.
 * 상태 변경 요청에는 double-submit CSRF 토큰(XSRF-TOKEN 쿠키 → X-XSRF-TOKEN 헤더)을 싣는다.
 */

interface Envelope<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ApiErrorCode;
    message?: string;
    reason?: ConflictReason;
    fieldErrors?: Record<string, string>;
  };
}

type Query = Record<string, string | number | undefined>;

const STATUS_CODE: Record<number, ApiErrorCode> = {
  400: 'VALIDATION',
  401: 'UNAUTHENTICATED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'VALIDATION',
  429: 'RATE_LIMITED',
};

function readCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const hit = document.cookie.split('; ').find((c) => c.startsWith(`${name}=`));
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : null;
}

function buildUrl(path: string, query?: Query): string {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== '') params.set(k, String(v));
  }
  const qs = params.toString();
  return `${API_BASE_URL}${path}${qs ? `?${qs}` : ''}`;
}

async function request<T>(
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  path: string,
  opts: { query?: Query; body?: unknown } = {},
): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' };
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (method !== 'GET') {
    const csrf = readCookie('XSRF-TOKEN');
    if (csrf) headers['X-XSRF-TOKEN'] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(buildUrl(path, opts.query), {
      method,
      headers,
      credentials: 'include',
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError('NETWORK', DEFAULT_MESSAGE.NETWORK);
  }

  if (res.status === 204) return undefined as T;

  let payload: Envelope<T> | null = null;
  try {
    payload = (await res.json()) as Envelope<T>;
  } catch {
    // 비-JSON 응답(프록시 오류 페이지 등) — 본문 내용은 노출하지 않는다
  }

  if (res.ok && payload?.success) return payload.data as T;

  const code = payload?.error?.code ?? STATUS_CODE[res.status] ?? 'SERVER';
  throw new ApiError(code, payload?.error?.message ?? DEFAULT_MESSAGE[code], {
    reason: payload?.error?.reason,
    fieldErrors: payload?.error?.fieldErrors,
  });
}

const enc = encodeURIComponent;

export const httpClient: ApiClient = {
  auth: {
    startNativeApple: (link) => request('POST', (link ? '/me/social' : '/auth/social') + '/apple/native/start'),
    finishNativeApple: (input) => request('POST', '/auth/social/apple/native/complete', { body: input }),
    adminProviders: () => request('GET', '/auth/social/providers'),
    startAdminSocial: (provider) => request('POST', '/auth/admin-social/' + provider + '/start'),
    completeAdminSocial: (proof) => request('POST', '/auth/admin-social/complete', { body: proof }),
    adminSocialLink: () => request('GET', '/auth/admin-social/link'),
    linkAdminSocial: (input) => request('POST', '/auth/admin-social/link', { body: input }),
    socialDraft: () => request('GET', '/auth/social/onboarding'),
    saveSocialProfile: (input) => request('POST','/auth/social/onboarding',{body:input}),
    socialProviders: () => request('GET', '/auth/social/providers', { query: { platform: Platform.OS } }),
    startSocial: (provider, link, adminLink) => request('POST', (link ? '/me/social/' : '/auth/social/') + provider + (link && adminLink ? '/start?app=admin' : '/start')),
    completeSocial: (proof) => request('POST', '/auth/social/complete', { body: proof }),
    async me() {
      try {
        return await request('GET', '/auth/session');
      } catch (e) {
        if (e instanceof ApiError && e.code === 'UNAUTHENTICATED') return null;
        throw e;
      }
    },
    login: (input) => request('POST', '/auth/login', { body: input }),
    logout: () => request('POST', '/auth/logout'),
    signup: (input) => request('POST', '/auth/signup', { body: input }),
    signupPhone: () => request('GET','/auth/phone-verification'),
    resendPhone: (phone) => request('POST','/auth/phone-verification/resend',{body:{phone}}),
    confirmPhone: (code) => request('POST','/auth/phone-verification/confirm',{body:{code}}),
    resendVerification: (email) => request('POST', '/auth/email-verification/resend', { body: { email } }),
    requestPasswordReset: (email) => request('POST', '/auth/password-reset', { body: { email } }),
    resetPassword: (token, password) =>
      request('POST', '/auth/password-reset/confirm', { body: { token, password } }),
  },
  me: {
    socialAccounts: () => request('GET', '/me/social', { query: { platform: Platform.OS } }),
    unlinkSocial: (provider) => request('DELETE', '/me/social/' + provider),
    loginDevices: () => request('GET', '/me/login-devices'),
    revokeDevice: (id) => request('DELETE', '/me/login-devices/' + enc(id)),
    notificationPreferences: () => request('GET', '/me/notifications/preferences'),
    setNotificationPreference: (input) => request('PATCH', '/me/notifications/preferences', { body: input }),
    profilePhoto: () => request('GET', '/me/profile/photo'),
    setProfilePhoto: (image) => request('PUT', '/me/profile/photo', { body: { image } }),
    updateProfile: (input) => request('PATCH', '/me/profile', { body: input }),
    withdraw: () => request('DELETE', '/me'),
    applications: () => request('GET', '/me/applications'),
    application: (id) => request('GET', `/me/applications/${enc(id)}`),
    editApplication: (id, input) => request('PATCH', `/me/applications/${enc(id)}`, { body: input }),
    editClubApplication: (id, input) => request('PATCH', `/me/club-applications/${enc(id)}`, { body: input }),
    cancelApplication: (id) => request('POST', `/me/applications/${enc(id)}/cancel`),
    clubs: () => request('GET', '/me/clubs'),
    clubApplications: () => request('GET', '/me/club-applications'),
    reservations: () => request('GET', '/me/reservations'),
    cancelReservation: (id) => request('POST', `/me/reservations/${enc(id)}/cancel`),
    inquiries: () => request('GET', '/me/inquiries'),
    inquiry: (id) => request('GET', `/me/inquiries/${enc(id)}`),
    notifications: () => request('GET', '/me/notifications'),
    markNotificationsRead: (ids) => request('POST', '/me/notifications/read', { body: { ids } }),
    attendance: () => request('GET', '/me/attendance'),
    scanAttendance: (input) => request('POST','/me/attendance/scan',{body:input}),
    checkIn: (input) => request('POST', '/me/attendance/check-in', { body: input }),
  },
  manage: {
    clubs: () => request('GET', '/manage/clubs'),
    roster: (clubId) => request('GET', `/manage/clubs/${enc(clubId)}/members`),
    setMemberRole: (clubId, userId, role) =>
      request('PATCH', `/manage/clubs/${enc(clubId)}/members/${enc(userId)}`, { body: { role } }),
    removeMember: (clubId, userId) =>
      request('DELETE', `/manage/clubs/${enc(clubId)}/members/${enc(userId)}`),
    applications: (clubId) => request('GET', `/manage/clubs/${enc(clubId)}/applications`),
    decideApplication: (clubId, id, decision, reason) =>
      request('POST', `/manage/clubs/${enc(clubId)}/applications/${enc(id)}/decision`, {
        body: { decision, reason },
      }),
    updateIntro: (clubId, input) => request('PATCH', `/manage/clubs/${enc(clubId)}/intro`, { body: input }),
    createPost: (clubId, input) => request('POST', `/manage/clubs/${enc(clubId)}/posts`, { body: input }),
    removePost: (clubId, postId) => request('DELETE', `/manage/clubs/${enc(clubId)}/posts/${enc(postId)}`),
  },
  attendance: {
    targets: () => request('GET', '/attendance/targets'),
    sessions: (t) =>
      request('GET', '/attendance/sessions', { query: { targetType: t.type, targetId: t.id } }),
    get: (id) => request('GET', `/attendance/sessions/${enc(id)}`),
    create: (t, input) =>
      request('POST', '/attendance/sessions', { body: { targetType: t.type, targetId: t.id, ...input } }),
    remove: (id) => request('DELETE', `/attendance/sessions/${enc(id)}`),
    mark: (id, marks) => request('PUT', `/attendance/sessions/${enc(id)}/records`, { body: { marks } }),
    setCheckIn: (id, open, position) => request('POST', `/attendance/sessions/${enc(id)}/check-in`, { body: { open,position } }),
    stats: (t) => request('GET', '/attendance/stats', { query: { targetType: t.type, targetId: t.id } }),
  },
  media: {
    list: () => request('GET', '/media'),
  },
  spaces: {
    list: () => request('GET', '/spaces'),
    get: (id) => request('GET', `/spaces/${enc(id)}`),
    availability: (id, date) => request('GET', `/spaces/${enc(id)}/availability`, { query: { date } }),
    reserve: (id, input) => request('POST', `/spaces/${enc(id)}/reservations`, { body: input }),
  },
  inquiries: {
    create: (input) => request('POST', '/inquiries', { body: input }),
  },
  faqs: {
    list: () => request('GET', '/faqs'),
  },
  policies: {
    get: (key) => request('GET', `/policies/${enc(key)}`),
  },
  programs: {
    categories: () => request('GET', '/program-categories'),
    list: (query) => request('GET', '/programs', { query: { ...query } }),
    get: (id) => request('GET', `/programs/${enc(id)}`),
    apply: (id, input) => request('POST', `/programs/${enc(id)}/applications`, { body: input }),
  },
  notices: {
    list: (query) => request('GET', '/notices', { query: { ...query } }),
    get: (id) => request('GET', `/notices/${enc(id)}`),
  },
  clubs: {
    list: () => request('GET', '/clubs'),
    get: (id) => request('GET', `/clubs/${enc(id)}`),
    members: (id) => request('GET', `/clubs/${enc(id)}/members`),
    posts: (id) => request('GET', `/clubs/${enc(id)}/posts`),
    apply: (id, input) => request('POST', `/clubs/${enc(id)}/applications`, { body: input }),
  },
  site: { settings: () => request('GET', '/site/settings') },
  admin: {
    updateSettings: (input) => request('PUT', '/admin/site-settings', { body: input }),
    changeAppUpdate:(id,input)=>request('POST','/admin/app-updates/'+encodeURIComponent(id)+'/control',{body:input}),
    appUpdates: () => request('GET', '/admin/app-updates'),
    developerView: (location) => request('GET', '/admin/developer/view', { query: { ...location } }),
    developerAction: (input) => request('POST', '/admin/developer/actions', { body: input }),
    serverLogs: () => request('GET', '/admin/server-logs'),
    dashboard: (periodDays) => request('GET', '/admin/dashboard', { query: { periodDays } }),
    notices: {
      list: (query) => request('GET', '/admin/notices', { query: { ...query } }),
      get: (id) => request('GET', `/admin/notices/${enc(id)}`),
      create: (input) => request('POST', '/admin/notices', { body: input }),
      update: (id, input) => request('PUT', `/admin/notices/${enc(id)}`, { body: input }),
      remove: (id) => request('DELETE', `/admin/notices/${enc(id)}`),
    },
    programs: {
      list: (query) => request('GET', '/admin/programs', { query: { ...query } }),
      get: (id) => request('GET', `/admin/programs/${enc(id)}`),
      create: (input) => request('POST', '/admin/programs', { body: input }),
      update: (id, input) => request('PUT', `/admin/programs/${enc(id)}`, { body: input }),
      remove: (id) => request('DELETE', `/admin/programs/${enc(id)}`),
    },
    applications: {
      list: (query) => request('GET', '/admin/applications', { query: { ...query } }),
      get: (id) => request('GET', `/admin/applications/${enc(id)}`),
      decide: (ids, decision, reason) =>
        request('POST', '/admin/applications/decisions', { body: { ids, decision, reason } }),
    },
    members: {
      activityOptions: (id) => request('GET', `/admin/members/${enc(id)}/activity-options`),
      act: (id, command) => request('POST', `/admin/members/${enc(id)}/actions`, {body: command}),
      list: (query) => request('GET', '/admin/members', { query: { ...query } }),
      get: (id) => request('GET', `/admin/members/${enc(id)}`),
      update: (id, patch) => request('PATCH', `/admin/members/${enc(id)}`, { body: patch }),
    },
    clubs: {
      list: () => request('GET', '/admin/clubs'),
      get: (id) => request('GET', `/admin/clubs/${enc(id)}`),
      create: (input) => request('POST', '/admin/clubs', { body: input }),
      update: (id, input) => request('PUT', `/admin/clubs/${enc(id)}`, { body: input }),
      applications: (query) => request('GET', '/admin/club-applications', { query: { ...query } }),
      decideApplication: (id, decision, reason) =>
        request('POST', `/admin/club-applications/${enc(id)}/decision`, { body: { decision, reason } }),
      managers: (clubId) => request('GET', `/admin/clubs/${enc(clubId)}/managers`),
      assignManager: (clubId, email) =>
        request('POST', `/admin/clubs/${enc(clubId)}/managers`, { body: { email } }),
      removeManager: (clubId, userId) =>
        request('DELETE', `/admin/clubs/${enc(clubId)}/managers/${enc(userId)}`),
    },
    spaces: {
      list: () => request('GET', '/admin/spaces'),
      update: (id, input) => request('PUT', `/admin/spaces/${enc(id)}`, { body: input }),
      reservations: (query) => request('GET', '/admin/reservations', { query: { ...query } }),
      decideReservation: (id, decision, reason) =>
        request('POST', `/admin/reservations/${enc(id)}/decision`, { body: { decision, reason } }),
    },
    inquiries: {
      list: (query) => request('GET', '/admin/inquiries', { query: { ...query } }),
      get: (id) => request('GET', `/admin/inquiries/${enc(id)}`),
      answer: (id, body) => request('PUT', `/admin/inquiries/${enc(id)}/answer`, { body: { body } }),
    },
    faqs: {
      list: () => request('GET', '/admin/faqs'),
      create: (input) => request('POST', '/admin/faqs', { body: input }),
      update: (id, input) => request('PUT', `/admin/faqs/${enc(id)}`, { body: input }),
      remove: (id) => request('DELETE', `/admin/faqs/${enc(id)}`),
    },
    policies: {
      list: () => request('GET', '/admin/policies'),
      update: (key, input) => request('PUT', `/admin/policies/${enc(key)}`, { body: input }),
    },
    audit: {
      list: (query) => request('GET', '/admin/audit-events', { query: { ...query } }),
    },
  },
};
