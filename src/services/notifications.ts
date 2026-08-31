import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getFirebaseDb } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import type { TaskOccurrence } from '../models';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

const SCHEDULED_NOTIFICATIONS_COLLECTION = 'scheduledNotifications';

export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function getNotificationPermissionStatus(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

function occurrenceToDate(occ: TaskOccurrence): Date {
  const [y, m, d] = occ.scheduledDate.split('-').map(Number);
  const [h, min] = occ.scheduledTime.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export async function scheduleNotificationForOccurrence(occ: TaskOccurrence): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const date = occurrenceToDate(occ);
    const now = new Date();
    if (date <= now) return null;

    const identifier = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Care Reminder',
        body: `Time for your care reminder.`,
        data: { occurrenceId: occ.id, taskId: occ.taskId },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
    return identifier;
  } catch {
    return null;
  }
}

export async function cancelNotification(identifier: string): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // ignore
  }
}

export async function cancelAllNotifications(): Promise<void> {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function scheduleForOccurrences(occurrences: TaskOccurrence[]): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelAllNotifications();
  for (const occ of occurrences) {
    if (occ.status === 'pending') {
      await scheduleNotificationForOccurrence(occ);
    }
  }
}

export async function syncNotificationsForParent(parentId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const db = getFirebaseDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 15);

  function fmt(d: Date) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  const q = query(
    collection(db, 'taskOccurrences'),
    where('parentId', '==', parentId),
    where('scheduledDate', '>=', fmt(today)),
    where('scheduledDate', '<=', fmt(maxDate)),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  const occurrences = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
  await scheduleForOccurrences(occurrences);
}

export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
  router: any
): void {
  const data = response.notification.request.content.data as any;
  if (data?.occurrenceId) {
    router.navigate('/(parent-tabs)');
  }
}

export async function registerForPushNotifications(): Promise<boolean> {
  const granted = await requestNotificationPermission();
  if (!granted) return false;
  if (!Platform.OS || Platform.OS === 'web') return false;
  try {
    Notifications.getDevicePushTokenAsync().catch(() => {
      // token registration is best-effort; local scheduling still works
    });
    return true;
  } catch {
    return true;
  }
}
