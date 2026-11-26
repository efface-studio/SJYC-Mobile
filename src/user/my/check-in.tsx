import { AttendanceCodeEntry } from '~/shared/attendance-code-entry';
import { currentPosition } from '~/shared/attendance-position';
import { openScreen } from '~/shared/navigation';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Linking, StyleSheet, useWindowDimensions, View } from 'react-native';
import { api, errorMessage } from '@/api';
import { useSession } from '@/features/auth/session';
import { Button, Chips, FormSection, Screen, Tap, Txt } from '~/ds';
import { closeModal, ModalGuard } from '~/user-kit';

function ScanGuide({ previewHeight }: { previewHeight: number }) {
  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={StyleSheet.absoluteFill}
    >
      <View style={styles.shade} />
      <View style={styles.guideRow}>
        <View style={styles.shade} />
        <View style={[styles.target, { maxWidth: Math.min(300, previewHeight - 48) }]}>
          <View style={[styles.corner, styles.topLeft]} />
          <View style={[styles.corner, styles.topRight]} />
          <View style={[styles.corner, styles.bottomLeft]} />
          <View style={[styles.corner, styles.bottomRight]} />
        </View>
        <View style={styles.shade} />
      </View>
      <View style={styles.shade} />
    </View>
  );
}

export default function CheckInScreen() {
  const { height } = useWindowDimensions();
  const previewHeight = Math.min(500, Math.round(height * 0.54));
  const session = useSession();
  const client = useQueryClient();
  const focused = useIsFocused();
  const [active, setActive] = useState(AppState.currentState === 'active');
  const [permission, request, refreshPermission] = useCameraPermissions();
  const [mode, setMode] = useState<'scan' | 'manual'>('scan');
  const [error, setError] = useState('');
  const [unavailable, setUnavailable] = useState(false);
  const locked = useRef(false);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (v) => {
      setActive(v === 'active');
      if (v === 'active') void refreshPermission().catch(() => setUnavailable(true));
    });
    return () => sub.remove();
  }, [refreshPermission]);
  const check = useMutation({
    mutationKey: ['me', 'attendance', 'check-in'],
    mutationFn: async (entry: { kind: 'program' | 'club'; value: string }) => {
      if (entry.kind === 'program') return api.me.scanAttendance({ kind: 'program', code: entry.value });
      return api.me.scanAttendance({ kind: 'club', ticket: entry.value, position: await currentPosition() });
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['me', 'attendance'] });
    },
    onError: (e) => {
      setError(errorMessage(e));
    },
  });
  const resume = () => {
    locked.current = false;
    setError('');
  };
  function scan({ type, data }: { type: string; data: string }) {
    if (!focused || !active || locked.current) return;
    locked.current = true;
    const club = (type === 'qr' ? /^SJYC:CLUB:(\d{16})$/ : type === 'code128' ? /^(\d{16})$/ : null)?.exec(
      data,
    );
    const program = (
      type === 'qr' ? /^SJYC:ATTENDANCE:(\d{4})$/ : type === 'code128' ? /^(\d{4})$/ : null
    )?.exec(data);
    if (club) check.mutate({ kind: 'club', value: club[1]! });
    else if (program) check.mutate({ kind: 'program', value: program[1]! });
    else setError('센터 출석용 코드가 아닙니다.');
  }
  const change = (next: 'scan' | 'manual') => {
    if (check.isPending || client.isMutating({ mutationKey: ['me', 'attendance', 'check-in'] })) return;
    resume();
    setMode(next);
  };
  return (
    <>
      <ModalGuard dirty={false} fallback="/home" />
      <Screen>
        {session.isPending ? null : !session.data?.user ? (
          <FormSection title="로그인 후 출석할 수 있습니다">
            <Button label="로그인" onPress={() => openScreen('/login')} />
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
              <AttendanceCodeEntry
                successActions={
                  <>
                    <Button label="내 출석 기록" onPress={() => router.replace('/my/attendance')} />
                    <Button label="닫기" variant="text" onPress={() => closeModal('/home')} />
                  </>
                }
              />
            ) : (
              <FormSection title="QR 코드를 네모 안에 맞춰 주세요">
                {permission?.granted && !unavailable ? (
                  <View style={[styles.preview, { height: previewHeight }]}>
                    {focused && active && (
                      <CameraView
                        style={StyleSheet.absoluteFill}
                        facing="back"
                        onMountError={() => setUnavailable(true)}
                        barcodeScannerSettings={{ barcodeTypes: ['qr', 'code128'] }}
                        onBarcodeScanned={scan}
                      />
                    )}
                    <ScanGuide previewHeight={previewHeight} />
                    {error || check.isPending ? (
                      <View style={styles.feedback}>
                        <View style={styles.message}>
                          {check.isPending && <ActivityIndicator color="#FFFFFF" />}
                          <View
                            accessible
                            accessibilityRole={error ? 'alert' : undefined}
                            accessibilityLiveRegion="polite"
                          >
                            <Txt variant="label" color="#FFFFFF" style={styles.messageText}>
                              {error || '출석 확인 중…'}
                            </Txt>
                          </View>
                          {!!error && (
                            <Tap
                              onPress={resume}
                              accessibilityLabel="다시 스캔"
                              rounded={12}
                              style={styles.retry}
                            >
                              <Txt variant="label" color="#171717">
                                다시 스캔
                              </Txt>
                            </Tap>
                          )}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : (
                  <>
                    <Txt color="textSecondary">
                      {unavailable
                        ? '이 기기에서 카메라를 사용할 수 없습니다.'
                        : 'QR을 읽으려면 카메라 접근이 필요합니다.'}
                    </Txt>
                    {!unavailable && permission?.canAskAgain === false && (
                      <Button
                        label="설정에서 카메라 허용"
                        onPress={() => void Linking.openSettings().catch(() => setUnavailable(true))}
                      />
                    )}
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
          </>
        )}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  preview: {
    width: '100%',
    overflow: 'hidden',
    borderRadius: 12,
    backgroundColor: '#191919',
    maxWidth: 680,
    alignSelf: 'center',
  },
  shade: { flex: 1, backgroundColor: 'rgba(0,0,0,0.46)' },
  guideRow: { flexDirection: 'row' },
  target: { width: '74%', aspectRatio: 1 },
  corner: { position: 'absolute', width: 34, height: 34, borderColor: '#FFFFFF' },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4, borderTopLeftRadius: 12 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4, borderTopRightRadius: 12 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4, borderBottomLeftRadius: 12 },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 4,
    borderRightWidth: 4,
    borderBottomRightRadius: 12,
  },
  feedback: { ...StyleSheet.absoluteFill, justifyContent: 'center', alignItems: 'center', padding: 16 },
  message: {
    maxWidth: 320,
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16,16,16,0.91)',
  },
  messageText: { textAlign: 'center' },
  retry: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 20, backgroundColor: '#FFFFFF' },
});
