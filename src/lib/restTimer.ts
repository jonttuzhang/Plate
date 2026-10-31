import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

// Rest timer = an end timestamp, so it survives backgrounding and screen changes.
// A local notification fires at the end when the phone is locked (local notifications work in Expo Go).

type State = { endsAt: number | null; total: number };

let state: State = { endsAt: null, total: 0 };
let notificationId: string | null = null;
let finishTimer: ReturnType<typeof setTimeout> | null = null;
let message = { title: 'Rest over', body: 'Time for the next set' };
const listeners = new Set<() => void>();

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    // In the foreground the in-app timer and haptics are enough.
    handleNotification: async () => ({ shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

function emit(next: State) {
  state = next;
  for (const l of listeners) l();
}

async function schedule(seconds: number) {
  await cancelNotification();
  if (Platform.OS === 'web' || seconds <= 0) return;
  try {
    const perm = await Notifications.getPermissionsAsync();
    if (!perm.granted && perm.canAskAgain) await Notifications.requestPermissionsAsync();
    notificationId = await Notifications.scheduleNotificationAsync({
      content: { title: message.title, body: message.body, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.max(1, Math.round(seconds)) },
    });
  } catch {
    // Notifications are a nice-to-have; the in-app timer still works.
  }
}

async function cancelNotification() {
  if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => undefined);
  notificationId = null;
}

function armFinish(ms: number) {
  if (finishTimer) clearTimeout(finishTimer);
  finishTimer = setTimeout(() => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
    emit({ endsAt: null, total: 0 });
  }, ms);
}

export const restTimer = {
  /** Localized notification text (set once from the UI). */
  setMessage(title: string, body: string) {
    message = { title, body };
  },
  start(seconds: number) {
    emit({ endsAt: Date.now() + seconds * 1000, total: seconds });
    armFinish(seconds * 1000);
    void schedule(seconds);
  },
  adjust(deltaSeconds: number) {
    if (!state.endsAt) return;
    const endsAt = Math.max(Date.now() + 1000, state.endsAt + deltaSeconds * 1000);
    emit({ endsAt, total: Math.max(1, state.total + deltaSeconds) });
    armFinish(endsAt - Date.now());
    void schedule((endsAt - Date.now()) / 1000);
  },
  stop() {
    if (finishTimer) clearTimeout(finishTimer);
    void cancelNotification();
    emit({ endsAt: null, total: 0 });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Seconds remaining (ticking once per second), or null when no timer runs. */
export function useRestRemaining(): { remaining: number | null; total: number } {
  const snapshot = useSyncExternalStore(subscribe, () => state);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!snapshot.endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [snapshot.endsAt]);
  if (!snapshot.endsAt) return { remaining: null, total: 0 };
  return { remaining: Math.max(0, Math.ceil((snapshot.endsAt - now) / 1000)), total: snapshot.total };
}
