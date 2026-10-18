import { ActionSheetIOS, Alert, Platform } from 'react-native';

/**
 * 팝업은 모두 OS 기본 다이얼로그를 쓴다.
 * - 확인: Alert (iOS UIAlertController / Android AlertDialog)
 * - 선택: iOS 액션 시트, Android 는 AlertDialog 버튼 (선택지 3개 이하일 때)
 * - 텍스트 입력: iOS Alert.prompt. Android 에는 기본 입력 다이얼로그가 없어 호출부에서 입력 화면을 띄운다.
 */

export function notify(title: string, message?: string): void {
  Alert.alert(title, message);
}

export function confirm(opts: {
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel?: string;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert(
      opts.title,
      opts.message,
      [
        { text: opts.cancelLabel ?? '취소', style: 'cancel', onPress: () => resolve(false) },
        {
          text: opts.confirmLabel,
          style: opts.destructive ? 'destructive' : 'default',
          onPress: () => resolve(true),
        },
      ],
      { cancelable: true, onDismiss: () => resolve(false) },
    );
  });
}

/** 선택지 중 하나를 고른다. 취소하면 null */
export function choose(
  title: string,
  options: string[],
  opts: { destructiveIndex?: number; message?: string } = {},
): Promise<number | null> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          title,
          message: opts.message,
          options: [...options, '취소'],
          cancelButtonIndex: options.length,
          destructiveButtonIndex: opts.destructiveIndex,
        },
        (i) => resolve(i === options.length ? null : i),
      );
      return;
    }
    // Android AlertDialog 는 버튼 3개(중립·부정·긍정)까지 — 그 이상은 호출부에서 SegmentedPicker 를 쓴다
    Alert.alert(
      title,
      opts.message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(null) },
        ...options.slice(0, 2).map((text, i) => ({
          text,
          style: i === opts.destructiveIndex ? ('destructive' as const) : ('default' as const),
          onPress: () => resolve(i),
        })),
      ],
      { cancelable: true, onDismiss: () => resolve(null) },
    );
  });
}

/** iOS 전용 텍스트 입력 다이얼로그. Android 에서는 null 을 즉시 돌려준다 — 호출부가 입력 화면으로 대체 */
export function promptText(
  title: string,
  message: string,
  submitLabel: string,
): Promise<string | null> | null {
  if (Platform.OS !== 'ios') return null;
  return new Promise((resolve) => {
    Alert.prompt(
      title,
      message,
      [
        { text: '취소', style: 'cancel', onPress: () => resolve(null) },
        { text: submitLabel, onPress: (value?: string) => resolve(value ?? '') },
      ],
      'plain-text',
    );
  });
}
