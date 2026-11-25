import { Image, type ImageSource } from 'expo-image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { visibleBanners, type BannerConfig } from '@/domain/mobile-banners';
import type { Club, Program } from '@/domain/types';
import { todayKst } from '@/lib/format';
import { Tap, Txt } from '~/ds';
import { programPhoto } from './program-photo';
import { openInternal } from '~/user-kit';

const photos = {
  program: require('../../assets/center/program-studio.webp'),
  club: require('../../assets/center/clubs-studio.webp'),
  space: require('../../assets/center/spaces/gym.webp'),
  afterschool: require('../../assets/center/banners/afterschool.webp'),
} as const;

type Slide = { id: string; title: string; kind: string; path: string; source: number | ImageSource };

function slidesFor(config: BannerConfig, programs: Program[], clubs: Club[], today: string): Slide[] {
  const items: Slide[] = visibleBanners(config.items, today).map((b) => ({
    ...b,
    id: 'manual-' + b.id,
    source:
      b.image === 'program' || b.image === 'club' || b.image === 'space' ? photos[b.image] : { uri: b.image },
  }));
  if (!config.automatic) return items;
  const paths = new Set(items.map((b) => b.path));
  for (const p of programs) {
    const path = '/programs/' + p.id;
    if (p.recruitStatus === 'open' && !paths.has(path))
      items.push({ id: 'program-' + p.id, title: p.title, kind: '프로그램', path, source: programPhoto(p) ?? photos.program });
  }
  for (const c of clubs) {
    const path = '/clubs/' + c.id;
    if (c.status !== 'active' || !c.recruiting || paths.has(path)) continue;
    const source = /방과후아카데미|꿈을 여는 교실/.test(c.name)
      ? photos.afterschool
      : c.photos[0]?.url
        ? { uri: c.photos[0].url }
        : photos.club;
    items.push({ id: 'club-' + c.id, title: c.name, kind: '동아리 모집', path, source });
  }
  return items;
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
  const today = todayKst();
  const slides = useMemo(
    () => (config ? slidesFor(config, programs, clubs, today) : []),
    [config, programs, clubs, today],
  );
  const list = useRef<FlatList<Slide>>(null);
  const selectedId = useRef<string | undefined>(undefined);
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  useEffect(() => {
    if (!width || !slides.length) return;
    const next = Math.max(
      0,
      slides.findIndex((s) => s.id === selectedId.current),
    );
    list.current?.scrollToOffset({ offset: next * width, animated: false });
    setIndex(next);
    selectedId.current = slides[next]?.id;
  }, [width, slides]);

  if (!slides.length) return null;
  return (
    <View style={styles.banner} onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      {width > 0 && (
        <FlatList
          ref={list}
          data={slides}
          horizontal
          pagingEnabled
          directionalLockEnabled
          scrollEnabled={slides.length > 1}
          showsHorizontalScrollIndicator={false}
          keyExtractor={(s) => s.id}
          initialNumToRender={2}
          windowSize={5}
          getItemLayout={(_, n) => ({ length: width, offset: width * n, index: n })}
          onScroll={(e) => {
            const next = Math.max(
              0,
              Math.min(slides.length - 1, Math.round(e.nativeEvent.contentOffset.x / width)),
            );
            selectedId.current = slides[next]?.id;
            setIndex(next);
          }}
          scrollEventThrottle={32}
          renderItem={({ item }) => (
            <Tap
              accessibilityLabel={item.kind + ', ' + item.title}
              onPress={() => openInternal(item.path)}
              style={[styles.slide, { width }]}
            >
              <Image
                source={item.source}
                recyclingKey={item.path}
                accessible={false}
                contentFit="cover"
                style={StyleSheet.absoluteFill}
              />
              <View style={[StyleSheet.absoluteFill, styles.shade]} />
              <View style={styles.caption}>
                <Txt variant="captionStrong" color="#fff">
                  {item.kind}
                </Txt>
                <Txt variant="title1" color="#fff" numberOfLines={2}>
                  {item.title}
                </Txt>
              </View>
            </Tap>
          )}
        />
      )}
      {slides.length > 1 && (
        <View
          pointerEvents="none"
          accessible
          accessibilityLabel={index + 1 + ' / ' + slides.length}
          style={styles.position}
        >
          <Txt variant="small" color="#fff">
            {index + 1} / {slides.length}
          </Txt>
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
  slide: { height: '100%', justifyContent: 'flex-end' },
  shade: {
    experimental_backgroundImage: 'linear-gradient(180deg, rgba(0,0,0,0.02) 5%, rgba(0,0,0,0.82) 100%)',
  },
  caption: { gap: 3, paddingLeft: 16, paddingRight: 62, paddingBottom: 16, paddingTop: 44 },
  position: { position: 'absolute', right: 16, bottom: 18 },
});
