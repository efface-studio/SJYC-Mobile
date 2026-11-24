import type { Space } from '@/domain/types';

// 사진은 중구청소년센터 시설 안내와 공식 대관 사이트의 각 공간 페이지에서 확인했다.
// 강의실 대표 사진은 203호 열린글터, 스터디룸 대표 사진은 스마트 스터디룸Ⅰ이다.
const SPACE_PHOTOS = [
  { key: 'gym', name: '체육관', floor: '3F', alt: '코트 라인과 골대가 있는 실내 체육관' },
  { key: 'multi', name: '복합문화공간', floor: '3F', alt: '벽면 거울과 넓은 연습 바닥이 있는 복합문화공간' },
  { key: 'lecture', name: '강의실', floor: '2F', alt: '책상과 프로젝터가 배치된 203호 열린글터 강의실' },
  {
    key: 'music',
    name: '라미의 뮤직스튜디오 (AGIT)',
    floor: '2F',
    alt: '마이크와 앰프, 녹음 장비가 있는 라미의 뮤직스튜디오',
  },
  {
    key: 'study',
    name: '스마트 스터디룸',
    floor: '2F',
    alt: '대형 화면과 모둠 책상이 놓인 스마트 스터디룸Ⅰ',
  },
  { key: 'theater', name: '청소년극장', floor: 'B1', alt: '무대에서 바라본 청소년극장의 계단식 객석' },
  { key: 'media', name: '미디어실', floor: '2F', alt: '영상 편집 작업 공간을 표현한 예시 이미지' },
] as const;

export function getSpacePhoto(space: Pick<Space, 'id' | 'name' | 'floor'>) {
  return SPACE_PHOTOS.find(
    (photo) => space.id === `s-${photo.key}` || (space.floor === photo.floor && space.name === photo.name),
  );
}
