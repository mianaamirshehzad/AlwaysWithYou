import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as Linking from 'expo-linking';
import { getFirebaseDb } from './firebase';
import {
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import type { TaskOccurrence, UserPreferences } from '../models';
import { formatDateInput, addDays } from '../utils/date';
import { updateUserProfile } from './firestore/users';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function ensureNotificationChannel(): Promise<void> {
  if (Platform.OS === 'android') {
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Care Reminders',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#32D57B',
        sound: 'default',
      });
    } catch (e) {
      console.warn('Failed to configure Android notification channel:', e);
    }
  }
}

export async function requestNotificationPermission(): Promise<{ granted: boolean; canAskAgain: boolean }> {
  if (Platform.OS === 'web') return { granted: false, canAskAgain: false };
  try {
    await ensureNotificationChannel();
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) {
      return { granted: true, canAskAgain: current.canAskAgain };
    }
    const requested = await Notifications.requestPermissionsAsync();
    return { granted: requested.granted, canAskAgain: requested.canAskAgain };
  } catch (error) {
    console.error('Failed to request notification permission:', error);
    return { granted: false, canAskAgain: false };
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

export async function openNotificationSettings(): Promise<void> {
  try {
    await Linking.openSettings();
  } catch {
    // ignore
  }
}

export function occurrenceToDate(occ: Pick<TaskOccurrence, 'scheduledDate' | 'scheduledTime'>): Date {
  const [y, m, d] = occ.scheduledDate.split('-').map(Number);
  const [h, min] = occ.scheduledTime.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export async function scheduleNotificationForOccurrence(
  occ: TaskOccurrence,
  prefs?: UserPreferences | null
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  if (prefs && prefs.pushNotifications === false) return null;

  try {
    const hasPermission = await getNotificationPermissionStatus();
    if (!hasPermission) return null;

    let targetDate: Date;
    if (occ.status === 'snoozed' && occ.snoozedUntil) {
      targetDate =
        typeof (occ.snoozedUntil as any).toDate === 'function'
          ? occ.snoozedUntil.toDate()
          : new Date(occ.snoozedUntil as any);
    } else {
      targetDate = occurrenceToDate(occ);
    }

    const now = new Date();
    if (targetDate <= now) return null;

    // Explicitly cancel any existing notification with this occurrence ID to prevent duplicates
    await cancelNotificationForOccurrence(occ.id);

    await ensureNotificationChannel();

    const soundEnabled = prefs?.soundEnabled ?? true;

    const identifier = await Notifications.scheduleNotificationAsync({
      identifier: occ.id,
      content: {
        title: occ.title || 'Care Reminder',
        body: occ.note ? occ.note : 'Time for your care reminder.',
        data: { occurrenceId: occ.id, taskId: occ.taskId },
        sound: soundEnabled ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: targetDate,
      },
    });
    return identifier;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

export async function cancelNotificationForOccurrence(occurrenceId: string): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(occurrenceId);
  } catch {
    // ignore
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
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch {
    // ignore
  }
}

export async function rescheduleNotificationForSnooze(
  occ: TaskOccurrence,
  snoozeDate: Date,
  prefs?: UserPreferences | null
): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  await cancelNotificationForOccurrence(occ.id);
  if (prefs && prefs.pushNotifications === false) return null;

  try {
    const hasPermission = await getNotificationPermissionStatus();
    if (!hasPermission) return null;

    await ensureNotificationChannel();
    const soundEnabled = prefs?.soundEnabled ?? true;

    return await Notifications.scheduleNotificationAsync({
      identifier: occ.id,
      content: {
        title: `Reminder: ${occ.title || 'Care Reminder'}`,
        body: occ.note ? occ.note : 'Snoozed care reminder is due now.',
        data: { occurrenceId: occ.id, taskId: occ.taskId },
        sound: soundEnabled ? 'default' : undefined,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: snoozeDate,
      },
    });
  } catch (err) {
    console.error('Failed to reschedule snooze notification:', err);
    return null;
  }
}

export async function reconcileScheduledNotifications(
  parentId: string,
  prefs?: UserPreferences | null
): Promise<void> {
  if (Platform.OS === 'web') return;
  if (prefs && prefs.pushNotifications === false) {
    await cancelAllNotifications();
    return;
  }

  const hasPermission = await getNotificationPermissionStatus();
  if (!hasPermission) return;

  const db = getFirebaseDb();
  const yesterdayStr = formatDateInput(addDays(new Date(), -1));
  const maxDate = formatDateInput(addDays(new Date(), 7));

  try {
    const q = query(
      collection(db, 'taskOccurrences'),
      where('parentId', '==', parentId),
      where('scheduledDate', '>=', yesterdayStr),
      where('scheduledDate', '<=', maxDate)
    );
    const snapshot = await getDocs(q);
    const now = new Date();

    let scheduledRequests: Notifications.NotificationRequest[] = [];
    try {
      scheduledRequests = await Notifications.getAllScheduledNotificationsAsync();
    } catch {
      // not supported in all environments
    }

    const eligibleOccurrences = new Map<string, TaskOccurrence>();

    for (const d of snapshot.docs) {
      const occ = { id: d.id, ...d.data() } as TaskOccurrence;
      if (occ.status !== 'pending' && occ.status !== 'snoozed') {
        continue;
      }

      let targetDate: Date;
      if (occ.status === 'snoozed' && occ.snoozedUntil) {
        targetDate =
          typeof (occ.snoozedUntil as any).toDate === 'function'
            ? occ.snoozedUntil.toDate()
            : new Date(occ.snoozedUntil as any);
      } else {
        targetDate = occurrenceToDate(occ);
      }

      if (targetDate > now) {
        eligibleOccurrences.set(occ.id, occ);
      }
    }

    // Cancel any scheduled notifications that are no longer eligible
    for (const req of scheduledRequests) {
      if (!eligibleOccurrences.has(req.identifier)) {
        await cancelNotification(req.identifier);
      }
    }

    // Schedule or refresh each eligible occurrence
    for (const occ of eligibleOccurrences.values()) {
      await scheduleNotificationForOccurrence(occ, prefs);
    }
  } catch (err) {
    console.warn('reconcileScheduledNotifications query error:', err);
  }
}

export async function scheduleForOccurrences(occurrences: TaskOccurrence[], prefs?: UserPreferences | null): Promise<void> {
  if (Platform.OS === 'web') return;
  await cancelAllNotifications();
  for (const occ of occurrences) {
    if (occ.status === 'pending' || occ.status === 'snoozed') {
      await scheduleNotificationForOccurrence(occ, prefs);
    }
  }
}

export async function syncNotificationsForParent(parentId: string): Promise<void> {
  await reconcileScheduledNotifications(parentId);
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
  const res = await requestNotificationPermission();
  if (!res.granted) return false;
  if (!Platform.OS || Platform.OS === 'web') return false;
  try {
    Notifications.getDevicePushTokenAsync().catch(() => {});
    return true;
  } catch {
    return true;
  }
}

export async function registerPushTokenForUser(uid: string): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    const hasPermission = await getNotificationPermissionStatus();
    if (!hasPermission) return null;

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    if (tokenData?.data) {
      await updateUserProfile(uid, { pushToken: tokenData.data });
      return tokenData.data;
    }
  } catch (err) {
    console.warn('registerPushTokenForUser skipped or unsupported:', err);
  }
  return null;
}

export async function deliverCaregiverEscalationAlert(
  occ: TaskOccurrence,
  parentName?: string
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  try {
    await ensureNotificationChannel();
    await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Care Alert: Missed Reminder',
        body: `${parentName || 'Your loved one'} may have missed: ${occ.title}`,
        data: { occurrenceId: occ.id, taskId: occ.taskId, type: 'caregiver_escalation' },
        priority: Notifications.AndroidNotificationPriority.MAX,
      },
      trigger: null,
    });
    return true;
  } catch (err) {
    console.error('Failed to deliver caregiver escalation alert:', err);
    return false;
  }
}
