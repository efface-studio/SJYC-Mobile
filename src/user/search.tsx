import { api } from '@/api';
import {
  AppSearch,
  listResults,
  pageResults,
  pageSize,
  type SearchItem,
  type SearchSource,
} from '~/shared/app-search';

const menus: SearchItem[] = [
  { title: '프로그램 찾기', href: '/programs' },
  { title: '공간 예약', href: '/spaces' },
  { title: '동아리 모집', href: '/clubs/recruitment' },
  { title: '공지사항', href: '/notices' },
  { title: '출석 체크', href: '/my/check-in' },
  { title: '프로그램 캘린더', href: '/programs/calendar' },
  { title: '내 출석 기록', href: '/my/attendance' },
  { title: '자주 묻는 질문 · 1:1 문의', href: '/qna' },
  { title: '센터 안내 · 오시는 길', href: '/about' },
  { title: '센터 소식 · 갤러리', href: '/gallery' },
  { title: '내 정보', href: '/my/profile' },
  { title: '설정', href: '/my/settings' },
];

const sources: SearchSource[] = [
  {
    label: '프로그램',
    async find(q, page) {
      return pageResults(await api.programs.list({ q, page, pageSize }), (p) => ({
        title: p.title,
        detail: p.target,
        href: '/programs/' + encodeURIComponent(p.id),
      }));
    },
  },
  {
    label: '공간',
    async find(q, page, cache) {
      const spaces = await cache.fetchQuery({
        queryKey: ['spaces'],
        queryFn: () => api.spaces.list(),
        staleTime: 60_000,
      });
      return listResults(
        spaces.map((s) => ({
          title: s.name,
          detail: [s.floor, s.description].filter(Boolean).join(' · '),
          href: '/spaces/' + encodeURIComponent(s.id),
        })),
        q,
        page,
      );
    },
  },
  {
    label: '동아리',
    async find(q, page, cache) {
      const clubs = await cache.fetchQuery({
        queryKey: ['clubs'],
        queryFn: () => api.clubs.list(),
        staleTime: 60_000,
      });
      return listResults(
        clubs.map((c) => ({
          title: c.name,
          detail: [c.field, c.summary].filter(Boolean).join(' · '),
          href: '/clubs/' + encodeURIComponent(c.id),
        })),
        q,
        page,
      );
    },
  },
  {
    label: '공지사항',
    async find(q, page) {
      return pageResults(await api.notices.list({ q, page, pageSize }), (n) => ({
        title: n.title,
        href: '/notices/' + encodeURIComponent(n.id),
      }));
    },
  },
];

export default function UserSearch() {
  return (
    <AppSearch
      menus={menus}
      sources={sources}
      scope={['public']}
      placeholder="프로그램, 공간, 동아리, 공지 검색"
    />
  );
}
