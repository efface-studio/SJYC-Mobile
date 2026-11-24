import { defaultBanners } from '../domain/mobile-banners';
import { CENTER, CENTER_SERVICES, DESK_HOURS_NOTE, DIRECTIONS, FLOORS, OFFICIAL_CHANNELS } from './center';
import { HOME_SECTIONS, NAV_LINKS, type SettingKey, type SiteSettings } from '../domain/site-settings';

type Group = { name: string; fields: Partial<Record<SettingKey, string>> };
export const SETTING_GROUPS: Group[] = [
  {
    name: '기관·연락처',
    fields: {
      name: '센터명',
      formalName: '공식 기관명',
      englishName: '영문 기관명',
      slogan: '소개 문구',
      tel: '전화 연결 번호',
      telDisplay: '대표전화 표기',
      fax: '팩스',
      postalCode: '우편번호',
      address: '주소',
      nearestStation: '가까운 역',
      director: '관장',
      businessNumber: '사업자등록번호',
      mailOrderNumber: '통신판매업 신고번호',
    },
  },
  {
    name: '이용 안내',
    fields: {
      weekdayHours: '평일 운영시간',
      saturdayHours: '토요일 운영시간',
      sundayHours: '일요일 운영시간',
      closedSunday: '정기 휴관',
      deskWeekday: '평일 접수시간',
      deskSaturday: '토요일 접수시간',
      deskNote: '접수 안내',
      directions: '교통편',
      floors: '층별 공간',
      services: '사업·서비스',
    },
  },
  {
    name: '채널·메뉴',
    fields: {
      youtube: '유튜브',
      instagram: '인스타그램',
      facebook: '페이스북',
      blog: '네이버 블로그',
      navOrder: '상단 메뉴 표시와 순서',
      homeOrder: '홈 영역 표시와 순서',
    },
  },
  {
    name: '브랜드·홈',
    fields: {
      headerLogo: '헤더 로고',
      heroLogo: '영상 위 로고',
      footerLogo: '푸터 로고',
      accent: '강조 색상',
      film: '홈 배경 영상',
      poster: '영상 포스터',
      programImage: '프로그램 사진',
      spaceImage: '공간 예약 사진',
      clubImage: '동아리 사진',
    },
  },
  { name: '앱 홈 배너', fields: { mobileBanners: '사용자 앱 홈 배너' } },
  { name: '검색 정보', fields: { seoTitle: '사이트 제목', seoDescription: '사이트 설명' } },
];
const lines = (rows: { label: string; value: string }[]) =>
  rows.map((r) => r.label + ' | ' + r.value).join('\n');
export function settingsRows(value: string) {
  return value.split('\n').map((row) => {
    const [label, body] = row.split('|');
    return { label: label!.trim(), value: body!.trim() };
  });
}
export const DEFAULT_SETTINGS: Required<SiteSettings> = {
  ...CENTER,
  mobileBanners: JSON.stringify(defaultBanners),
  weekdayHours: '06:00-22:00',
  saturdayHours: '06:00-21:00',
  sundayHours: '06:00-18:00',
  deskWeekday: '09:00-18:00',
  deskSaturday: '09:00-18:00',
  closedSunday: 'second',
  deskNote: DESK_HOURS_NOTE,
  directions: lines(DIRECTIONS),
  floors: lines(FLOORS.map((f) => ({ label: f.floor, value: f.spaces.join(' · ') }))),
  services: lines(CENTER_SERVICES),
  youtube: OFFICIAL_CHANNELS[0].url,
  instagram: OFFICIAL_CHANNELS[1].url,
  facebook: OFFICIAL_CHANNELS[2].url,
  blog: OFFICIAL_CHANNELS[3].url,
  navOrder: Object.keys(NAV_LINKS).join(','),
  homeOrder: Object.keys(HOME_SECTIONS).join(','),
  programImage: '/media/program-studio.webp',
  spaceImage: '/media/spaces/gym.webp',
  clubImage: '/media/clubs-studio.webp',
  heroLogo: '/brand/film-wordmark.svg',
  headerLogo: '/brand/header-wordmark.svg',
  footerLogo: '/brand/logo-on-dark.png',
  film: '/media/center-film.mp4',
  poster: '/media/center-film-poster.webp',
  accent: '#a33b19',
  seoTitle: CENTER.name,
  seoDescription: '서울시 중구청소년센터 — 프로그램·공지·동아리·센터 이용 안내',
};
export function orderedKeys<T extends string>(order: string, labels: Record<T, string>): T[] {
  return order.split(',').filter((k): k is T => Object.hasOwn(labels, k));
}
export function displayHours(v: string) {
  return v.replace('-', ' – ');
}
