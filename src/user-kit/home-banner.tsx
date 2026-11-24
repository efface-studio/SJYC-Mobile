import { Image } from 'expo-image';
import { useIsFocused } from 'expo-router';
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, StyleSheet, View } from 'react-native';
import { visibleBanners, type BannerConfig } from '@/domain/mobile-banners';
import type { Club, Program } from '@/domain/types';
import { todayKst } from '@/lib/format';
import { Tap, Txt } from '~/ds';
import { Icon, type IconProps } from '~/shared/icon';
import { openInternal } from '~/user-kit';

const photos = {
  program: require('../../assets/center/program-studio.webp'),
  club: require('../../assets/center/clubs-studio.webp'),
  space: require('../../assets/center/spaces/gym.webp'),
};
type Slide = { id: string; title: string; kind: string; path: string; image: string };

function slidesFor(config: BannerConfig, programs: Program[], clubs: Club[]): Slide[] {
  const items: Slide[] = visibleBanners(config.items, todayKst());
  if (!config.automatic) return items;
  const paths = new Set(items.map((b) => b.path));
  const more: Slide[] = [
    ...programs
      .filter((p) => p.recruitStatus === 'open')
      .map((p) => ({
        id: 'program-' + p.id,
        title: p.title,
        kind: '프로그램',
        image: 'program',
        path: '/programs/' + p.id,
      })),
    ...clubs
      .filter((c) => c.status === 'active' && c.recruiting)
      .map((c) => ({
        id: 'club-' + c.id,
        title: c.name,
        kind: '동아리 모집',
        image: 'club',
        path: '/clubs/' + c.id,
      })),
  ];
  return items.concat(more.filter((b) => !paths.has(b.path)));
}

function Control({
  label,
  onPress,
  ios,
  android,
}: Pick<IconProps, 'android' | 'ios'> & { label: string; onPress: () => void }) {
  return (
    <Tap style={styles.control} accessibilityLabel={label} onPress={onPress}>
      <Icon ios={ios} android={android} color="#fff" size={16} />
    </Tap>
  );
}

export function HomeBanner({
  config,
  programs,
  clubs,
}: {
  config?: BannerConfig;
  programs: Program[];
  clubs: Club[];
}) {
  const slides = config ? slidesFor(config, programs, clubs) : [];
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [reduceMotion, setReduceMotion] = useState(true);
  const focus = useIsFocused();
  const count = slides.length;
  const seconds = config?.seconds ?? 0;
  const current = count ? index % count : 0;
  const slide = slides[current];
  useEffect(() => {
    let mounted = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => {
      if (mounted) setReduceMotion(v);
    });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    const app = AppState.addEventListener('change', (s) => setActive(s === 'active'));
    return () => {
      mounted = false;
      motion.remove();
      app.remove();
    };
  }, []);
  useEffect(() => {
    if (!active || !focus || paused || reduceMotion || !seconds || count < 2) return;
    const timer = setInterval(() => setIndex((i) => (i + 1) % count), seconds * 1000);
    return () => clearInterval(timer);
  }, [active, focus, paused, reduceMotion, seconds, count, current]);
  if (!slide) return null;
  const source =
    slide.image === 'program' || slide.image === 'club' || slide.image === 'space'
      ? photos[slide.image]
      : { uri: slide.image };
  return (
    <View style={styles.banner}>
      <Tap
        accessibilityLabel={slide.kind + ', ' + slide.title}
        onPress={() => openInternal(slide.path)}
        style={styles.slide}
      >
        <Image
          source={source}
          placeholder={photos.program}
          placeholderContentFit="cover"
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
        <View style={[StyleSheet.absoluteFill, styles.shade]} />
        <View style={styles.caption}>
          <Txt variant="captionStrong" color="#fff">
            {slide.kind}
          </Txt>
          <Txt variant="title1" color="#fff" numberOfLines={2}>
            {slide.title}
          </Txt>
        </View>
      </Tap>
      {count > 1 && (
        <View style={styles.controls}>
          <Control
            ios="chevron.left"
            android="chevron_left"
            label="이전 배너"
            onPress={() => setIndex((current + count - 1) % count)}
          />
          <Txt variant="small" color="#fff">
            {current + 1} / {count}
          </Txt>
          <Control
            ios="chevron.right"
            android="chevron_right"
            label="다음 배너"
            onPress={() => setIndex((current + 1) % count)}
          />
          {!!seconds && !reduceMotion && (
            <Control
              ios={paused ? 'play.fill' : 'pause.fill'}
              android={paused ? 'play_arrow' : 'pause'}
              label={paused ? '자동 넘김 시작' : '자동 넘김 정지'}
              onPress={() => setPaused((v) => !v)}
            />
          )}
        </View>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#302520',
    aspectRatio: 354 / 202,
    minHeight: 190,
    overflow: 'hidden',
    borderRadius: 12,
    marginBottom: 8,
  },
  slide: { flex: 1, justifyContent: 'flex-end' },
  shade: {
    experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.02) 5%, rgba(0,0,0,0.82) 100%)',
  },
  caption: { gap: 3, paddingHorizontal: 16, paddingBottom: 16, paddingTop: 44 },
  controls: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  control: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
