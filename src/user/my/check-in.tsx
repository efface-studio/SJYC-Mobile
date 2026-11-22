import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { useSession } from '@/features/auth/session';
import { Button, Chips, FormSection, Gutter, Screen, TextField, Txt } from '~/ds';
import { closeModal, ModalGuard } from '~/user-kit';

export default function CheckInScreen() {
  const session = useSession();
  const client = useQueryClient();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [permission, request] = useCameraPermissions();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (v) => setActive(v === 'active'));
    return () => sub.remove();
  }, []);
  const check = useMutation({
    mutationFn: (value: string) => api.me.checkIn({ code: value }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (e) => {
      setError(errorMessage(e));
      locked.current = false;
    },
  });
  const submit = (value: string) => {
    if (locked.current || check.isSuccess) return;
    if (!/^\d{4}$/.test(value)) {
      setError('출석 코드 네 자리를 입력해 주세요.');
      return;
    }
    locked.current = true;
    setError('');
    check.mutate(value);
  };
  const change = (next: 'scan' | 'manual') => {
    if (check.isPending) return;
    setError('');
    setMode(next);
  };
  return (
    <>
      <ModalGuard dirty={false} fallback="/home" />
      <Screen>
        {session.isPending ? null : !session.data?.user ? (
          <FormSection title="로그인 후 출석할 수 있습니다">
            <Button label="로그인" onPress={() => router.push('/login')} />
          </FormSection>
        ) : check.isSuccess ? (
          <FormSection title="출석했습니다">
            <Txt>
              {check.data.targetName} · {check.data.title}
            </Txt>
            <Button label="내 출석 기록" onPress={() => router.replace('/my/attendance')} />
            <Button label="닫기" variant="text" onPress={() => closeModal('/home')} />
          </FormSection>
        ) : (
          <>
            <Chips
              options={[
                { value: 'scan', label: 'QR 스캔' },
                { value: 'manual', label: '코드 입력' },
              ]}
              value={mode}
              onChange={change}
            />
            {mode === 'manual' ? (
              <FormSection title="출석 코드 입력">
                <TextField
                  label="숫자 4자리"
                  value={code}
                  maxLength={4}
                  keyboardType="number-pad"
                  onChangeText={(v) => setCode(v.replace(/\D/g, ''))}
                  onSubmitEditing={() => submit(code)}
                />
                <Button label="출석하기" loading={check.isPending} onPress={() => submit(code)} />
              </FormSection>
            ) : (
              <FormSection title="출석 QR을 비춰 주세요">
                {permission?.granted && !unavailable ? (
                  <View style={styles.preview}>
                    {focused && active && !error && !check.isPending && (
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        onMountError={() => setUnavailable(true)}
                        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
                        onBarcodeScanned={({ type, data }) => {
                          if (locked.current || error) return;
                          const value =
                            type === 'qr'
                              ? /^SJYC:ATTENDANCE:(\d{4})$/.exec(data)?.[1]
                              : /^\d{4}$/.exec(data)?.[0];
                          if (value) submit(value);
                          else setError('센터 출석용 코드가 아닙니다.');
                        }}
                      />
                    )}
                  </View>
                ) : (
                  <>
                    <Txt color="textSecondary">
                      {unavailable
                        ? '이 기기에서 카메라를 사용할 수 없습니다.'
                        : 'QR을 읽으려면 카메라 접근이 필요합니다.'}
                    </Txt>
                    {!unavailable && permission?.canAskAgain !== false && (
                      <Button
                        label="카메라 허용"
                        onPress={() => void request().catch(() => setUnavailable(true))}
                      />
                    )}
                  </>
                )}
                <Button label="숫자 코드로 출석" variant="secondary" onPress={() => change('manual')} />
              </FormSection>
            )}
            {!!error && (
              <Gutter>
                <View accessible accessibilityRole="alert" accessibilityLiveRegion="polite">
                  <Txt>{error}</Txt>
                </View>
                {mode === 'scan' && <Button label="다시 스캔" variant="text" onPress={() => setError('')} />}
              </Gutter>
            )}
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    aspectRatio: 1.3,
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#191919',
  },
});
