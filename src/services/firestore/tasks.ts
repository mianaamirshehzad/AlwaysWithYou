import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  Timestamp,
  limit,
  startAfter,
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type { CareTask, TaskOccurrence, TaskStatus, Frequency } from '../../models';
import { SNOOZE_CONFIG, ESCALATION_CONFIG } from '../../models';
import { cancelNotificationForOccurrence, rescheduleNotificationForSnooze } from '../notifications';

const TASKS_COLLECTION = 'careTasks';
const OCCURRENCES_COLLECTION = 'taskOccurrences';

function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

function generateOccurrenceId(taskId: string, date: string): string {
  return `${taskId}_${date}`;
}

export async function createCareTask(task: Omit<CareTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
  const db = getFirebaseDb();
  const ref = doc(collection(db, TASKS_COLLECTION));
  const now = serverTimestamp();
  await setDoc(ref, { ...task, id: ref.id, createdAt: now, updatedAt: now });
  await generateOccurrencesForTask({ ...task, id: ref.id } as CareTask);
  return ref.id;
}

export async function updateCareTask(taskId: string, updates: Partial<CareTask>): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteCareTask(taskId: string): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));

  // Cancel future pending/snoozed occurrences to avoid ghost reminders
  const today = todayString();
  try {
    const q = query(
      collection(db, OCCURRENCES_COLLECTION),
      where('taskId', '==', taskId)
    );
    const snap = await getDocs(q);
    const updates: Promise<void>[] = [];
    for (const d of snap.docs) {
      const occ = d.data() as TaskOccurrence;
      if (occ.scheduledDate >= today && (occ.status === 'pending' || occ.status === 'snoozed')) {
        updates.push(
          updateDoc(doc(db, OCCURRENCES_COLLECTION, d.id), {
            status: 'cancelled' as TaskStatus,
            updatedAt: serverTimestamp(),
          })
        );
        updates.push(cancelNotificationForOccurrence(d.id));
      }
    }
    await Promise.all(updates);
  } catch (err) {
    console.warn('Failed to cancel future occurrences on task delete:', err);
  }
}

export async function toggleTaskActive(taskId: string, active: boolean): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), { active, updatedAt: serverTimestamp() });

  const today = todayString();
  if (!active) {
    try {
      const q = query(
        collection(db, OCCURRENCES_COLLECTION),
        where('taskId', '==', taskId)
      );
      const snap = await getDocs(q);
      const batch: Promise<void>[] = [];
      for (const d of snap.docs) {
        const occ = d.data() as TaskOccurrence;
        if (occ.scheduledDate >= today && (occ.status === 'pending' || occ.status === 'snoozed')) {
          batch.push(
            updateDoc(doc(db, OCCURRENCES_COLLECTION, d.id), {
              status: 'cancelled' as TaskStatus,
              updatedAt: serverTimestamp(),
            })
          );
          batch.push(cancelNotificationForOccurrence(d.id));
        }
      }
      await Promise.all(batch);
    } catch (err) {
      console.warn('Failed to cancel occurrences on task pause:', err);
    }
  } else {
    const snap = await getDoc(doc(db, TASKS_COLLECTION, taskId));
    if (snap.exists()) {
      await generateOccurrencesForTask({ id: snap.id, ...snap.data() } as CareTask);
    }
  }
}

export async function getTasksForRelationship(relationshipId: string): Promise<CareTask[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('relationshipId', '==', relationshipId),
    where('active', '==', true),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CareTask));
}

export async function getAllTasksForRelationship(relationshipId: string): Promise<CareTask[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('relationshipId', '==', relationshipId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CareTask));
}

export async function getOccurrencesForDate(parentId: string, date: string): Promise<TaskOccurrence[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, OCCURRENCES_COLLECTION),
    where('parentId', '==', parentId),
    where('scheduledDate', '==', date)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
}

export async function getOccurrencesForParent(parentId: string, startDate: string, endDate: string): Promise<TaskOccurrence[]> {
  const db = getFirebaseDb();
  const q =
    startDate === endDate
      ? query(
          collection(db, OCCURRENCES_COLLECTION),
          where('parentId', '==', parentId),
          where('scheduledDate', '==', startDate)
        )
      : query(
          collection(db, OCCURRENCES_COLLECTION),
          where('parentId', '==', parentId),
          where('scheduledDate', '>=', startDate),
          where('scheduledDate', '<=', endDate)
        );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
}

export async function getOccurrencesForRelationship(relationshipId: string, startDate: string, endDate: string): Promise<TaskOccurrence[]> {
  const db = getFirebaseDb();
  const q =
    startDate === endDate
      ? query(
          collection(db, OCCURRENCES_COLLECTION),
          where('relationshipId', '==', relationshipId),
          where('scheduledDate', '==', startDate)
        )
      : query(
          collection(db, OCCURRENCES_COLLECTION),
          where('relationshipId', '==', relationshipId),
          where('scheduledDate', '>=', startDate),
          where('scheduledDate', '<=', endDate)
        );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
}

export async function completeOccurrence(occurrenceId: string, completedBy: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, OCCURRENCES_COLLECTION, occurrenceId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('Reminder occurrence not found.');
    }
    const data = snap.data() as TaskOccurrence;
    if (data.status === 'completed') {
      return; // Idempotent
    }
    if (data.status === 'cancelled') {
      throw new Error('Cannot complete a cancelled reminder.');
    }

    // Handles 'pending', 'snoozed', and late acknowledgment of 'missed'
    transaction.update(ref, {
      status: 'completed' as TaskStatus,
      completedAt: serverTimestamp(),
      completedBy,
      updatedAt: serverTimestamp(),
    });
  });

  await cancelNotificationForOccurrence(occurrenceId);
}

export async function markOccurrenceMissed(occurrenceId: string): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, OCCURRENCES_COLLECTION, occurrenceId), {
    status: 'missed' as TaskStatus,
    updatedAt: serverTimestamp(),
  });
}

export function subscribeToOccurrencesForParent(
  parentId: string,
  startDate: string,
  endDate: string,
  callback: (occurrences: TaskOccurrence[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const q =
    startDate === endDate
      ? query(
          collection(db, OCCURRENCES_COLLECTION),
          where('parentId', '==', parentId),
          where('scheduledDate', '==', startDate)
        )
      : query(
          collection(db, OCCURRENCES_COLLECTION),
          where('parentId', '==', parentId),
          where('scheduledDate', '>=', startDate),
          where('scheduledDate', '<=', endDate)
        );
  return onSnapshot(
    q,
    (snapshot) => {
      const occs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
      callback(occs);
    },
    (error) => {
      console.error('subscribeToOccurrencesForParent error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToTasksForRelationship(
  relationshipId: string,
  callback: (tasks: CareTask[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('relationshipId', '==', relationshipId),
    where('active', '==', true)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CareTask));
      callback(tasks);
    },
    (error) => {
      console.error('subscribeToTasksForRelationship error:', error);
      if (onError) onError(error);
    }
  );
}

export async function generateOccurrencesForTask(task: CareTask): Promise<void> {
  const db = getFirebaseDb();
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = addDays(today, 15);
  const startDate = parseDate(task.startDate);
  const endDate = task.endDate ? parseDate(task.endDate) : maxDate;
  const effectiveEnd = endDate < maxDate ? endDate : maxDate;

  const dates = generateDatesForTask(task, startDate, effectiveEnd);

  const batchOps: Promise<void>[] = [];
  for (const date of dates) {
    const dateStr = formatDate(date);
    const occId = generateOccurrenceId(task.id, dateStr);
    const ref = doc(db, OCCURRENCES_COLLECTION, occId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      batchOps.push(
        setDoc(ref, {
          id: occId,
          taskId: task.id,
          relationshipId: task.relationshipId,
          parentId: task.assignedTo,
          childId: task.createdBy,
          title: task.title,
          type: task.type,
          note: task.note ?? '',
          scheduledDate: dateStr,
          scheduledTime: task.scheduledTime,
          status: 'pending' as TaskStatus,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    }
  }
  await Promise.all(batchOps);
}

function generateDatesForTask(task: CareTask, start: Date, end: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(start);

  if (task.frequency === 'once') {
    if (current >= start && current <= end) {
      dates.push(new Date(current));
    }
  } else if (task.frequency === 'daily') {
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
  } else if (task.frequency === 'weekly') {
    while (current <= end) {
      dates.push(new Date(current));
      current.setDate(current.getDate() + 7);
    }
  } else if (task.frequency === 'custom' && task.daysOfWeek && task.daysOfWeek.length > 0) {
    while (current <= end) {
      if (task.daysOfWeek.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
  }

  return dates;
}

export function getOccurrenceScheduledDateTime(occ: Pick<TaskOccurrence, 'scheduledDate' | 'scheduledTime'>): Date {
  const [y, m, d] = occ.scheduledDate.split('-').map(Number);
  const [h, min] = occ.scheduledTime.split(':').map(Number);
  return new Date(y, m - 1, d, h, min, 0, 0);
}

export function getOccurrenceEffectiveDeadline(occ: TaskOccurrence): Date {
  if (occ.status === 'snoozed' && occ.snoozedUntil) {
    const snoozeDate =
      typeof (occ.snoozedUntil as any).toDate === 'function'
        ? occ.snoozedUntil.toDate()
        : new Date(occ.snoozedUntil as any);
    return new Date(snoozeDate.getTime() + ESCALATION_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000);
  }
  const scheduled = getOccurrenceScheduledDateTime(occ);
  return new Date(scheduled.getTime() + ESCALATION_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000);
}

export function isOccurrenceMissed(occ: TaskOccurrence, now: Date = new Date()): boolean {
  if (occ.status === 'completed' || occ.status === 'cancelled') {
    return false;
  }
  if (occ.status === 'missed') {
    return true;
  }

  // A currently active snooze deadline takes absolute precedence over ordinary missed evaluation
  if (occ.status === 'snoozed' && occ.snoozedUntil) {
    const snoozeDate =
      typeof (occ.snoozedUntil as any).toDate === 'function'
        ? occ.snoozedUntil.toDate()
        : new Date(occ.snoozedUntil as any);
    const deadline = new Date(snoozeDate.getTime() + ESCALATION_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000);
    return now > deadline;
  }

  // Ordinary pending occurrence
  if (occ.status === 'pending') {
    const scheduled = getOccurrenceScheduledDateTime(occ);
    const deadline = new Date(scheduled.getTime() + ESCALATION_CONFIG.GRACE_PERIOD_MINUTES * 60 * 1000);
    return now > deadline;
  }

  return false;
}

export async function snoozeOccurrence(
  occurrenceId: string,
  durationMinutes: number,
  parentUid: string
): Promise<{ snoozedUntil: Date; snoozeCount: number }> {
  const db = getFirebaseDb();
  const ref = doc(db, OCCURRENCES_COLLECTION, occurrenceId);

  let snoozeDate: Date;
  let newCount: number;
  let occData: TaskOccurrence;

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new Error('Reminder occurrence not found.');
    }

    const occ = { id: snap.id, ...snap.data() } as TaskOccurrence;
    if (occ.parentId !== parentUid) {
      throw new Error('Only the assigned parent can snooze this reminder.');
    }

    if (occ.status === 'completed') {
      throw new Error('Cannot snooze an already completed reminder.');
    }
    if (occ.status === 'cancelled') {
      throw new Error('Cannot snooze a cancelled reminder.');
    }

    const currentCount = occ.snoozeCount || 0;
    if (currentCount >= SNOOZE_CONFIG.MAX_SNOOZE_COUNT) {
      throw new Error(`Maximum snooze limit (${SNOOZE_CONFIG.MAX_SNOOZE_COUNT} times) reached for this reminder.`);
    }

    const safeDuration = (SNOOZE_CONFIG.ALLOWED_DURATIONS as readonly number[]).includes(durationMinutes)
      ? durationMinutes
      : SNOOZE_CONFIG.DEFAULT_MINUTES;

    snoozeDate = new Date(Date.now() + safeDuration * 60 * 1000);
    const snoozedUntil = Timestamp.fromDate(snoozeDate);
    newCount = currentCount + 1;
    occData = occ;

    transaction.update(ref, {
      status: 'snoozed' as TaskStatus,
      snoozedUntil,
      snoozeCount: newCount,
      updatedAt: serverTimestamp(),
    });
  });

  await rescheduleNotificationForSnooze(occData!, snoozeDate!);
  return { snoozedUntil: snoozeDate!, snoozeCount: newCount! };
}

export async function updateMissedOccurrences(parentId?: string): Promise<TaskOccurrence[]> {
  if (!parentId) return [];
  const db = getFirebaseDb();
  const today = todayString();
  const minDate = formatDate(addDays(new Date(), -7));

  const q = query(
    collection(db, OCCURRENCES_COLLECTION),
    where('parentId', '==', parentId),
    where('scheduledDate', '>=', minDate),
    where('scheduledDate', '<=', today)
  );

  const snapshot = await getDocs(q);
  const now = new Date();
  const missedOccs: TaskOccurrence[] = [];

  for (const d of snapshot.docs) {
    const occ = { id: d.id, ...d.data() } as TaskOccurrence;
    if (occ.status !== 'pending' && occ.status !== 'snoozed') {
      continue;
    }

    if (!isOccurrenceMissed(occ, now)) {
      continue;
    }

    const ref = doc(db, OCCURRENCES_COLLECTION, occ.id);
    let escalatedThisRun = false;

    await runTransaction(db, async (transaction) => {
      const snap = await transaction.get(ref);
      if (!snap.exists()) return;
      const current = snap.data() as TaskOccurrence;

      if (current.status === 'completed' || current.status === 'cancelled') {
        return;
      }

      if (!isOccurrenceMissed(current, now)) {
        return;
      }

      const updates: any = {
        status: 'missed' as TaskStatus,
        updatedAt: serverTimestamp(),
      };

      if (!current.escalatedAt) {
        updates.escalatedAt = serverTimestamp();
        updates.escalatedTo = current.childId;
        updates.escalationStage = 1;
        updates.escalationDeliveryStatus = 'pending';
        escalatedThisRun = true;
      }

      transaction.update(ref, updates);
    });

    missedOccs.push({ ...occ, status: 'missed' });
    await cancelNotificationForOccurrence(occ.id);
  }

  return missedOccs;
}

export async function getHistoryOccurrencesForParent(parentId: string, daysBack = 14): Promise<TaskOccurrence[]> {
  const today = todayString();
  const startDate = formatDate(addDays(new Date(), -daysBack));

  const occs = await getOccurrencesForParent(parentId, startDate, today);
  return occs
    .filter((o) => (o.scheduledDate < today || o.status === 'completed' || o.status === 'missed') && o.status !== 'cancelled')
    .sort((a, b) => {
      const dateCmp = b.scheduledDate.localeCompare(a.scheduledDate);
      if (dateCmp !== 0) return dateCmp;
      return b.scheduledTime.localeCompare(a.scheduledTime);
    });
}

export function getTodayOccurrences(occurrences: TaskOccurrence[]): {
  pending: TaskOccurrence[];
  completed: TaskOccurrence[];
  missed: TaskOccurrence[];
  upcoming: TaskOccurrence[];
} {
  const today = todayString();
  const now = new Date();
  const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const todayOccs = occurrences.filter((o) => {
    if (o.status === 'cancelled') return false;
    if (o.scheduledDate === today) return true;
    if (o.status === 'snoozed' && o.snoozedUntil) {
      const snoozeDate =
        typeof (o.snoozedUntil as any).toDate === 'function'
          ? o.snoozedUntil.toDate()
          : new Date(o.snoozedUntil as any);
      return formatDate(snoozeDate) === today;
    }
    return false;
  });

  const pending: TaskOccurrence[] = [];
  const upcoming: TaskOccurrence[] = [];
  const completed: TaskOccurrence[] = [];
  const missed: TaskOccurrence[] = [];

  for (const occ of todayOccs) {
    if (occ.status === 'completed') {
      completed.push(occ);
    } else if (occ.status === 'missed') {
      missed.push(occ);
    } else if (occ.status === 'snoozed') {
      if (occ.snoozedUntil) {
        const snoozeDate =
          typeof (occ.snoozedUntil as any).toDate === 'function'
            ? occ.snoozedUntil.toDate()
            : new Date(occ.snoozedUntil as any);
        if (now >= snoozeDate) {
          pending.push(occ);
        } else {
          upcoming.push(occ);
        }
      } else {
        pending.push(occ);
      }
    } else if (occ.status === 'pending') {
      if (occ.scheduledTime <= currentTime) {
        pending.push(occ);
      } else {
        upcoming.push(occ);
      }
    }
  }

  return { pending, completed, missed, upcoming };
}
