import { api } from '@/api';
import { APPLICATION_STATUS, INQUIRY_STATUS } from '@/domain/labels';
import { can, type Permission } from '@/domain/permissions';
import { useSession } from '@/features/auth/session';
import { NoPermission } from '~/admin-kit/components';
import { operationGroups } from '~/admin-kit/operation-menu';
import {
  AppSearch,
  listResults,
  pageResults,
  pageSize,
  type SearchItem,
  type SearchSource,
} from '~/shared/app-search';

const sources: (SearchSource & { permission: Permission })[] = [
  {
    label: '프로그램 신청',
    permission: 'application.decide',
    async find(q, page) {
      return pageResults(await api.admin.applications.list({ q, page, pageSize }), (a) => ({
        title: a.programTitle,
        detail: [a.applicantName, a.receiptNo, APPLICATION_STATUS[a.status].text].filter(Boolean).join(' · '),
        href: '/applications/' + encodeURIComponent(a.id),
      }));
    },
  },
  {
    label: '공간 예약',
    permission: 'space.manage',
    async find(q, page) {
      return pageResults(await api.admin.spaces.reservations({ q, page, pageSize }), (r) => ({
        title: r.spaceName,
        detail: [r.applicantName, r.date, r.startTime].join(' · '),
        href: { pathname: '/reservations/[id]', params: { id: r.id, spaceId: r.spaceId, date: r.date } },
      }));
    },
  },
  {
    label: '문의',
    permission: 'inquiry.answer',
    async find(q, page) {
      return pageResults(await api.admin.inquiries.list({ q, page, pageSize }), (i) => ({
        title: i.title,
        detail: INQUIRY_STATUS[i.status].text,
        href: '/inquiries/' + encodeURIComponent(i.id),
      }));
    },
  },
  {
    label: '프로그램',
    permission: 'program.write',
    async find(q, page) {
      return pageResults(await api.admin.programs.list({ q, page, pageSize }), (p) => ({
        title: p.title,
        detail: p.target,
        href: '/search/program/' + encodeURIComponent(p.id),
      }));
    },
  },
  {
    label: '공지사항',
    permission: 'notice.write',
    async find(q, page) {
      return pageResults(await api.admin.notices.list({ q, page, pageSize }), (n) => ({
        title: n.title,
        href: '/search/notice/' + encodeURIComponent(n.id),
      }));
    },
  },
  {
    label: '동아리',
    permission: 'club.manage',
    async find(q, page, cache) {
      const clubs = await cache.fetchQuery({
        queryKey: ['admin', 'clubs'],
        queryFn: () => api.admin.clubs.list(),
        staleTime: 15_000,
      });
      return listResults(
        clubs.map((c) => ({
          title: c.name,
          detail: c.field,
          href: '/search/club/' + encodeURIComponent(c.id),
        })),
        q,
        page,
      );
    },
  },
  {
    label: '회원',
    permission: 'member.read',
    async find(q, page) {
      return pageResults(await api.admin.members.list({ q, page, pageSize }), (u) => ({
        title: u.name,
        detail: u.email,
        href: '/search/member/' + encodeURIComponent(u.id),
      }));
    },
  },
];

const tasks: (SearchItem & { permission: Permission })[] = [
  { title: '프로그램 신청', href: '/applications', permission: 'application.decide' },
  { title: '공간 예약', href: '/reservations', permission: 'space.manage' },
  { title: '문의', href: '/inquiries', permission: 'inquiry.answer' },
];

export default function AdminSearch() {
  const user = useSession().data?.user;
  if (!user || !can(user, 'admin.access')) return <NoPermission />;
  const menus = [
    ...tasks.filter((item) => can(user, item.permission)),
    ...operationGroups(user).flatMap((g) => g.items.map((m) => ({ title: m.title, href: m.href }))),
  ];
  return (
    <AppSearch
      sources={sources.filter((s) => can(user, s.permission))}
      menus={menus}
      scope={['admin', user.id]}
      placeholder="메뉴, 신청, 예약, 회원 검색"
    />
  );
}
