import type { Program } from '@/domain/types';

const photos = {
  study: require('../../assets/center/banners/study.webp'),
  basketball: require('../../assets/center/banners/basketball.webp'),
  english: require('../../assets/center/banners/english.webp'),
  council: require('../../assets/center/banners/council.webp'),
  environment: require('../../assets/center/banners/environment.webp'),
} as const;

export function programPhoto(p: Program): number | undefined {
  const title = p.title;
  if (/농구/.test(title)) return photos.basketball;
  if (/영어|영회화/.test(title)) return photos.english;
  if (/환경|플로깅/.test(title)) return photos.environment;
  if (/자치|위원회|참여기구/.test(title)) return photos.council;
  if (/학습|검정고시|공부/.test(title)) return photos.study;
  return undefined;
}
