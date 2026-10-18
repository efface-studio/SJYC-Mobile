import { useQuery } from '@tanstack/react-query';
import { StyleSheet, View } from 'react-native';
import { api } from '@/api';
import type { MediaItem } from '@/domain/types';
import {
  Gutter,
  ListRow,
  Photo,
  QueryBoundary,
  Screen,
  SectionHeader,
  Tap,
  Txt,
  radius,
  space,
  useTheme,
} from '~/ds';
import { Icon } from '~/shared/icon';
import { Rows, formatLooseDate, hostOf, isExternal, openExternal } from '~/user-kit';

function PhotoTile({ m }: { m: MediaItem }) {
  return (
    <View style={styles.tile}>
      <Tap
        onPress={isExternal(m.sourceUrl) ? () => openExternal(m.sourceUrl) : undefined}
        rounded={radius.md}
        accessibilityLabel={`${m.title}, 원문 게시물 열기`}
      >
        <Photo uri={m.thumbnailUrl || m.url} alt={m.title} ratio={1} />
      </Tap>
      <Txt variant="caption" numberOfLines={2}>
        {m.title}
      </Txt>
      <Txt variant="small" color="textTertiary" numberOfLines={1}>
        {m.date ? `${formatLooseDate(m.date)} · ` : ''}출처 {hostOf(m.sourceUrl)}
      </Txt>
    </View>
  );
}

export default function GalleryScreen() {
  const t = useTheme();
  const media = useQuery({ queryKey: ['media'], queryFn: () => api.media.list() });
  return (
    <Screen onRefresh={() => media.refetch()}>
      <Gutter style={{ paddingTop: space.lg }}>
        <Txt variant="caption" color="textTertiary">
          센터 공식 채널에 올라온 사진과 영상입니다. 누르면 원문 게시물로 이동합니다.
        </Txt>
      </Gutter>
      <QueryBoundary
        query={media}
        isEmpty={(d) => d.length === 0}
        empty={{ title: '등록된 소식이 없습니다' }}
      >
        {(data) => {
          const photos = data.filter((m) => m.kind === 'photo');
          const videos = data.filter((m) => m.kind === 'video');
          return (
            <>
              {photos.length > 0 && (
                <>
                  <SectionHeader title={`사진 ${photos.length}`} />
                  <View style={styles.grid}>
                    {photos.map((m, i) => (
                      <PhotoTile key={`${m.url}-${i}`} m={m} />
                    ))}
                  </View>
                </>
              )}
              {videos.length > 0 && (
                <>
                  <SectionHeader title={`영상 ${videos.length}`} />
                  <Rows>
                    {videos.map((m, i) => (
                      <ListRow
                        key={`${m.url}-${i}`}
                        title={m.title}
                        meta={m.date ? formatLooseDate(m.date) : undefined}
                        leading={
                          <Icon
                            ios="play.rectangle.fill"
                            android="smart_display"
                            color={t.tone.danger.fg}
                            size={24}
                          />
                        }
                        chevron={false}
                        trailing={
                          <Icon ios="arrow.up.right" android="open_in_new" color={t.textTertiary} size={14} />
                        }
                        onPress={isExternal(m.url) ? () => openExternal(m.url) : undefined}
                      />
                    ))}
                  </Rows>
                </>
              )}
            </>
          );
        }}
      </QueryBoundary>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 20 - 6 },
  tile: { width: '50%', paddingHorizontal: 6, paddingBottom: space.lg, gap: 4 },
});
