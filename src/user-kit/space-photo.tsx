import { Image } from 'expo-image';
import { View } from 'react-native';
import type { Space } from '@/domain/types';
import { Txt } from '~/ds';

const photos = [
  { id: 's-gym', floor: '3F', name: '체육관', image: require('../../assets/center/spaces/gym.webp') },
  {
    id: 's-multi',
    floor: '3F',
    name: '복합문화공간',
    image: require('../../assets/center/spaces/multi.webp'),
  },
  { id: 's-lecture', floor: '2F', name: '강의실', image: require('../../assets/center/spaces/lecture.webp') },
  {
    id: 's-music',
    floor: '2F',
    name: '라미의 뮤직스튜디오 (AGIT)',
    image: require('../../assets/center/spaces/music.webp'),
  },
  {
    id: 's-study',
    floor: '2F',
    name: '스마트 스터디룸',
    image: require('../../assets/center/spaces/study.webp'),
  },
  {
    id: 's-theater',
    floor: 'B1',
    name: '청소년극장',
    image: require('../../assets/center/spaces/theater.webp'),
  },
  { id: 's-media', floor: '2F', name: '미디어실', image: require('../../assets/center/spaces/media.webp') },
];

export function SpacePhoto({ space, compact = false }: { space: Space; compact?: boolean }) {
  const photo = photos.find((p) => p.id === space.id || (p.name === space.name && p.floor === space.floor));
  if (!photo) return null;
  return (
    <View style={compact ? { width: 84 } : { width: '100%', marginBottom: 12 }}>
      <Image
        source={photo.image}
        contentFit="cover"
        style={{ width: '100%', aspectRatio: compact ? 1.15 : 1.9, borderRadius: compact ? 10 : 16 }}
      />
      {photo.id === 's-media' && (
        <Txt variant="small" color="textTertiary">
          공간 예시 이미지
        </Txt>
      )}
    </View>
  );
}
