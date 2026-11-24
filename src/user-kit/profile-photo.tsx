import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { launchImageLibraryAsync } from 'expo-image-picker';
import { useState } from 'react';
import { View } from 'react-native';
import { api, errorMessage } from '@/api';
import { Button, useTheme } from '~/ds';
import { notify } from '~/shared/dialogs';
import { Icon } from '~/shared/icon';

export function ProfilePhoto({ userId, editable = false }: { userId: string; editable?: boolean }) {
  const theme = useTheme();
  const cache = useQueryClient();
  const key = ['profile-photo', userId];
  const photo = useQuery({ queryKey: key, queryFn: api.me.profilePhoto });
  const [choosing, setChoosing] = useState(false);
  const save = useMutation({
    mutationFn: api.me.setProfilePhoto,
    onSuccess: (value) => cache.setQueryData(key, value),
    onError: (err) => notify('프로필 사진을 저장하지 못했습니다', errorMessage(err)),
  });
  const choose = async () => {
    setChoosing(true);
    try {
      const result = await launchImageLibraryAsync({ mediaTypes: ['images'], selectionLimit: 1 });
      if (result.canceled || !result.assets[0]) return;
      const { uri } = result.assets[0];
      const oriented = await manipulateAsync(uri, [], { format: SaveFormat.JPEG });
      const edge = Math.min(oriented.width, oriented.height);
      const thumb = await manipulateAsync(oriented.uri, [
        { crop: { originX: Math.floor((oriented.width - edge) / 2), originY: Math.floor((oriented.height - edge) / 2), width: edge, height: edge } },
        { resize: { width: 256, height: 256 } },
      ], { format: SaveFormat.JPEG, compress: 0.76, base64: true });
      if (!thumb.base64) throw new Error('사진을 읽을 수 없습니다.');
      save.mutate('data:image/jpeg;base64,' + thumb.base64);
    } catch {
      notify('사진을 불러올 수 없습니다', '사진 보관함에서 다른 이미지를 선택해 주세요.');
    } finally {
      setChoosing(false);
    }
  };
  const size = editable ? 72 : 44;
  const busy = choosing || save.isPending;
  return (
    <View style={{ alignItems: 'center', gap: 4 }}>
      <View accessibilityLabel="프로필 사진" style={{width: size, height: size, borderRadius: size / 2, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.bgSubtle}}>
        {photo.data?.image ? <Image source={{ uri: photo.data.image }} style={{ width: size, height: size }} /> : <Icon ios="person.fill" android="person" size={size * 0.52} color={theme.textTertiary} />}
      </View>
      {editable && <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Button label="사진 변경" variant="text" size="md" disabled={busy} onPress={() => void choose()} />
        {photo.data?.image && <Button label="기본 사진으로" variant="text" size="md" disabled={busy} onPress={() => save.mutate(null)} />}
      </View>}
    </View>
  );
}
