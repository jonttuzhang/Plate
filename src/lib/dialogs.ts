import { ActionSheetIOS, Alert, Platform } from 'react-native';

// react-native-web has no Alert implementation, so fall back to the browser's dialogs there.

export function confirmAsync(title: string, message: string, confirmLabel: string, cancelLabel: string, destructive = false): Promise<boolean> {
  if (Platform.OS === 'web') return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      { text: confirmLabel, style: destructive ? 'destructive' : 'default', onPress: () => resolve(true) },
    ], { cancelable: true, onDismiss: () => resolve(false) });
  });
}

export function notify(title: string, message?: string): void {
  if (Platform.OS === 'web') window.alert(message ? `${title}\n\n${message}` : title);
  else Alert.alert(title, message);
}

/** Action sheet with a list of choices; resolves to the chosen index or null when cancelled. */
export function chooseAsync(title: string, options: string[], cancelLabel: string, destructiveIndex?: number): Promise<number | null> {
  if (Platform.OS === 'web') {
    const answer = window.prompt(`${title}\n${options.map((o, i) => `${i + 1}. ${o}`).join('\n')}`);
    const n = Number(answer) - 1;
    return Promise.resolve(Number.isInteger(n) && n >= 0 && n < options.length ? n : null);
  }
  if (Platform.OS === 'ios') {
    return new Promise((resolve) =>
      ActionSheetIOS.showActionSheetWithOptions(
        { title, options: [...options, cancelLabel], cancelButtonIndex: options.length, destructiveButtonIndex: destructiveIndex },
        (i) => resolve(i === options.length ? null : i),
      ),
    );
  }
  return new Promise((resolve) =>
    Alert.alert(title, undefined, [
      ...options.map((text, i) => ({ text, onPress: () => resolve(i) })),
      { text: cancelLabel, style: 'cancel' as const, onPress: () => resolve(null) },
    ]),
  );
}
