import type { Href } from 'expo-router';
import { can, canManageAttendance, managesAnyClub, type Permission } from '@/domain/permissions';
import type { User } from '@/domain/types';
import type { IconProps } from '~/shared/icon';

interface Menu {
  title: string;
  subtitle: string;
  icon: Pick<IconProps, 'ios' | 'android'>;
  href: Href;
  /** 권한 이름 또는 조건 (동아리 담당자처럼 역할만으로 정해지지 않는 메뉴) */
  permission: Permission | ((user: User | undefined) => boolean);
}

/** 웹 관리자 사이드바와 같은 묶음. 대시보드·프로그램 신청·공간 예약·문의는 하단 탭에 있다 */
const GROUPS: { group: string; items: Menu[] }[] = [
  {
    group: '콘텐츠',
    items: [
      {
        title: '공지',
        icon: { ios: 'megaphone', android: 'campaign' },
        subtitle: '작성 · 게시 상태 · 상단 고정',
        href: '/more/notices',
        permission: 'notice.write',
      },
      {
        title: '프로그램',
        icon: { ios: 'calendar', android: 'event' },
        subtitle: '등록 · 모집 일정 · 정원',
        href: '/more/programs',
        permission: 'program.write',
      },
    ],
  },
  {
    group: '신청·예약',
    items: [
      {
        title: '공간 설정',
        icon: { ios: 'door.left.hand.open', android: 'meeting_room' },
        subtitle: '예약 접수 · 수용 인원',
        href: '/more/spaces',
        permission: 'space.manage',
      },
    ],
  },
  {
    group: '커뮤니티',
    items: [
      {
        title: '동아리 운영',
        icon: { ios: 'person.2', android: 'group' },
        subtitle: '담당 동아리 회원 · 가입 신청 · 소식 · 소개',
        href: '/more/my-clubs',
        permission: managesAnyClub,
      },
      {
        title: '동아리',
        icon: { ios: 'person.3', android: 'groups' },
        subtitle: '등록 · 운영 상태 · 모집',
        href: '/more/clubs',
        permission: 'club.manage',
      },
      {
        title: '동아리 가입 신청',
        icon: { ios: 'person.badge.plus', android: 'person_add' },
        subtitle: '가입 승인 · 반려',
        href: '/more/club-applications',
        permission: 'club.manage',
      },
      {
        title: '출석',
        icon: { ios: 'checkmark.circle', android: 'fact_check' },
        subtitle: '출석부 · 출석 코드 · 회원별 출석률',
        href: '/more/attendance',
        permission: canManageAttendance,
      },
      {
        title: 'FAQ',
        icon: { ios: 'questionmark.circle', android: 'help' },
        subtitle: '자주 묻는 질문 관리',
        href: '/more/faqs',
        permission: 'inquiry.answer',
      },
    ],
  },
  {
    group: '회원',
    items: [
      {
        title: '회원',
        icon: { ios: 'person.crop.circle', android: 'account_circle' },
        subtitle: '역할 · 이용 정지',
        href: '/more/members',
        permission: 'member.read',
      },
    ],
  },
  {
    group: '설정',
    items: [
      {
        title:'로그인 정책',icon:{ios:'lock.shield',android:'security'},href:'/more/login-contact',subtitle:'앱별 이메일·휴대전화 인증 기준',permission:'site.manage',
      },
      {
        title:'앱 업데이트',icon:{ios:'arrow.down.circle',android:'system_update'},href:'/more/app-updates',subtitle:'유저·관리자 앱 배포와 적용 현황',permission:'site.manage',
      },
      {
        title: '정책 문서',
        icon: { ios: 'doc.text', android: 'description' },
        subtitle: '약관 · 개인정보 처리방침 개정',
        href: '/more/policies',
        permission: 'policy.manage',
      },
      {
        title: '감사 로그',
        icon: { ios: 'clock.arrow.circlepath', android: 'history' },
        subtitle: '관리 작업 기록',
        href: '/more/audit',
        permission: 'audit.read',
      },
    ],
  },

];

export function operationGroups(user: User | undefined) {
  return GROUPS.map(group => ({
    ...group,
    items: group.items.filter(m => typeof m.permission === 'function' ? m.permission(user) : can(user, m.permission)),
  })).filter(group => group.items.length > 0);
}
