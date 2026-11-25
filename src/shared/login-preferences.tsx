import { useEffect, useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { api } from '@/api';
import { Button, EmptyState, LoadingState, Txt, space, useTheme } from '~/ds';
import { notify } from './dialogs';
import { Icon } from './icon';
import { readPreference, writePreference } from './device-preferences';

export function LoginSessionGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'checking' | 'ready' | 'error'>('checking');
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    void prepareSession().then(
      () => { if (active) setState('ready'); },
      () => { if (active) setState('error'); },
    );
    return () => { active = false; };
  }, [attempt]);
  if (state === 'checking') return <LoadingState />;
  if (state === 'error') return <EmptyState title="로그인 상태를 확인할 수 없어요" action={<Button label="다시 시도" onPress={() => { setState('checking'); setAttempt((n) => n + 1); }} />} />;
  return <>{children}</>;
}

let startup: Promise<void> | undefined;
function prepareSession(): Promise<void> {
  startup ??= Promise.resolve().then(async () => {
    if (readPreference('remember-login-off') !== null) await api.auth.logout();
  }).catch((error: unknown) => {
    startup = undefined;
    throw error;
  });
  return startup;
}

export function useLoginPreferences() {
  const [keep, setKeep] = useState(() => readPreference('remember-login-off') === null);
  const [initialEmail] = useState(() => readPreference('remember-email'));
  const [remember, setRemember] = useState(initialEmail !== null);
  function toggleKeep() {
    try {
      writePreference('remember-login-off', keep ? '1' : null);
      setKeep(!keep);
    } catch { notify('설정을 저장하지 못했어요', '기기 저장 공간을 확인해 주세요.'); }
  }
  function toggleRemember() {
    try {
      writePreference('remember-email', remember ? null : '');
      setRemember(!remember);
    } catch { notify('설정을 저장하지 못했어요', '기기 저장 공간을 확인해 주세요.'); }
  }
  function rememberEmail(email: string) {
    if (readPreference('remember-email') !== null) {
      try { writePreference('remember-email', email); }
      catch { notify('아이디를 저장하지 못했어요', '기기 저장 공간을 확인해 주세요.'); }
    }
  }
  return { keep, remember, initialEmail: initialEmail ?? '', toggleKeep, toggleRemember, rememberEmail };
}

function Check({ label, checked, onPress }: { label: string; checked: boolean; onPress: () => void }) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [styles.check, { opacity: pressed ? 0.7 : 1 }]}>
      <View style={[styles.box, { backgroundColor: checked ? t.action : t.bg, borderColor: checked ? t.action : t.lineStrong }]}>
        {checked && <Icon ios="checkmark" android="check" size={13} color={t.onAction} />}
      </View>
      <Txt variant="caption" color="textSecondary">{label}</Txt>
    </Pressable>
  );
}

export function LoginOptions({ options }: { options: ReturnType<typeof useLoginPreferences> }) {
  return <View style={styles.row}>
    <Check label="로그인 상태 유지" checked={options.keep} onPress={options.toggleKeep} />
    <Check label="아이디 저장" checked={options.remember} onPress={options.toggleRemember} />
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', columnGap: space.xl },
  check: { minHeight: 44, flexDirection: 'row', gap: space.sm, alignItems: 'center' },
  box: { width: 19, height: 19, borderWidth: 1.5, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
});
