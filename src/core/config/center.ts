/**
 * 기관 정보 — 한 곳에서만 관리한다.
 * 출처: 중구청소년센터 공식 홈페이지 (검증일 VERIFIED_AT). 바뀔 수 있는 정보이므로
 * 운영 단계에서는 서버 설정/CMS 값으로 교체한다. 근거는 docs/brand-audit.md.
 */
/** 정보 검증 출처 기록용 — 화면에 링크로 노출하지 않는다 (서비스 내에서 모든 기능을 제공) */
export const OFFICIAL_SITE = 'https://www.j-youth.org/kor/main/index.php';
export const VERIFIED_AT = '2026-10-17';

export const CENTER = {
  name: '중구청소년센터',
  formalName: '중구구립 중구청소년센터',
  englishName: 'Seoul Junggu Youth Center',
  slogan: '청소년의 행복을 위해 함께 성장하는 플랫폼',
  postalCode: '04596',
  address: '서울특별시 중구 동호로5길 19 (신당동)',
  tel: '02-2250-0500',
  telDisplay: '02-2250-0500~1',
  fax: '02-2236-1020',
  copyrightSince: 2018,
  director: '김미숙',
  businessNumber: '306-82-66245',
  mailOrderNumber: '2025-서울중구-347',
  nearestStation: '3·6호선 약수역 5번 출구 도보 50m',
} as const;

/** 공식 SNS 채널 (공식 홈페이지 메인에서 확인한 계정). 기존 홈페이지 자체로 가는 링크는 두지 않는다. */
export const OFFICIAL_CHANNELS = [
  {
    key: 'youtube',
    label: '유튜브',
    url: 'https://www.youtube.com/@%EC%A4%91%EA%B5%AC%EC%B2%AD%EC%86%8C%EB%85%84%EC%84%BC%ED%84%B0-w3n',
  },
  { key: 'instagram', label: '인스타그램', url: 'https://www.instagram.com/jungguyouthcenter' },
  { key: 'facebook', label: '페이스북', url: 'https://www.facebook.com/share/1HSeSEwPvp/' },
  { key: 'blog', label: '네이버 블로그', url: 'https://blog.naver.com/j_youth' },
] as const;

export interface HoursRow {
  label: string;
  value: string;
}

export const OPERATING_HOURS: HoursRow[] = [
  { label: '평일', value: '오전 6시 ~ 오후 10시' },
  { label: '토요일', value: '오전 6시 ~ 오후 9시' },
  { label: '일요일', value: '오전 6시 ~ 오후 6시 (매월 둘째 주 휴관)' },
];

export const DESK_HOURS: HoursRow[] = [
  { label: '평일', value: '오전 9시 ~ 오후 6시' },
  { label: '토요일', value: '오전 9시 ~ 오후 6시' },
];
export const DESK_HOURS_NOTE =
  '식사시간(오전 11시 40분 ~ 오후 1시) 제외. 이외 시간 및 일·공휴일에는 인터넷 접수가 가능합니다.';

export const DIRECTIONS: HoursRow[] = [
  { label: '지하철', value: '3·6호선 약수역 5번 출구(약수시장) 금호터널 방면 도보 50m' },
  { label: '버스', value: '147, 301 약수역 하차' },
  {
    label: '마을버스',
    value: '5번 약수역 종점 하차, 성동 12번 중구청소년센터 하차',
  },
];

export interface FloorRow {
  floor: string;
  spaces: string[];
}

export const FLOORS: FloorRow[] = [
  { floor: '3F', spaces: ['체육관', '복합문화공간', '샤워실', '청소년전용공간 AGIT(라미의 방)'] },
  {
    floor: '2F',
    spaces: [
      '강의실',
      '사무실',
      '학교밖청소년지원센터',
      '상담실',
      '스마트 스터디룸',
      '청소년전용공간 AGIT(라미의 뮤직스튜디오)',
      '미디어실',
    ],
  },
  { floor: '1F', spaces: ['안내데스크', '청소년방과후아카데미 등'] },
  { floor: 'B1', spaces: ['청소년극장', '카페 라라', '청소년활동공간', '피아노교실', '관리실'] },
  { floor: 'B2', spaces: ['주차장', '설비실', '창고'] },
];

/** 공식 홈페이지 메뉴·층별 안내에서 확인한 사업 영역 (설명은 확인된 하위 분류명만 사용) */
export const CENTER_SERVICES: HoursRow[] = [
  { label: '청소년활동', value: '자치·참여실현·문화예술·미래·창업·지역·가치탐색 활동' },
  { label: '체육·교육', value: '생활체육, 교육문화 프로그램' },
  { label: '진로직업체험지원센터', value: '학교진로체험, 개별진로체험, 진로동아리' },
  { label: '꿈드림(학교밖청소년지원센터)', value: '상담·교육, 취업·자립 지원' },
  { label: '청소년전용공간 AGIT', value: '라미의 방, 라미의 뮤직스튜디오' },
  { label: '청소년방과후아카데미 · 상담실 · 카페 라라', value: '센터 내 운영 공간' },
];

export interface TodayHours {
  weekday: string;
  open: boolean;
  hours: string;
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토'];

/**
 * 오늘 운영시간 (서울 기준). 둘째 주 일요일 휴관 규칙만 반영하며,
 * 공휴일·임시 휴관은 반영하지 못하므로 화면에 공지 확인 안내를 함께 표시한다.
 */
export function hoursOn(now: Date): TodayHours {
  return homeHoursOn(now, {
    weekdayHours: '06:00-22:00',
    saturdayHours: '06:00-21:00',
    sundayHours: '06:00-18:00',
    closedSunday: 'second',
  });
}
export function homeHoursOn(
  now: Date,
  settings: {
    weekdayHours: string;
    saturdayHours: string;
    sundayHours: string;
    closedSunday: 'second' | 'none';
  },
): TodayHours {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    weekday: 'short',
    day: 'numeric',
  }).formatToParts(now);
  const day = Number(parts.find((p) => p.type === 'day')?.value);
  const idx = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(
    parts.find((p) => p.type === 'weekday')?.value ?? '',
  );
  const weekday = WEEKDAY[idx] ?? '';
  if (settings.closedSunday === 'second' && idx === 0 && day >= 8 && day <= 14)
    return { weekday, open: false, hours: '휴관 (매월 둘째 주 일요일)' };
  if (idx === 0) return { weekday, open: true, hours: settings.sundayHours.replace('-', ' – ') };
  if (idx === 6) return { weekday, open: true, hours: settings.saturdayHours.replace('-', ' – ') };
  return { weekday, open: true, hours: settings.weekdayHours.replace('-', ' – ') };
}
