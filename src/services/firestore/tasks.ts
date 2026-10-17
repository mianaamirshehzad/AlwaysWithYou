import type { Firestore } from 'firebase/firestore';
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
  runTransaction,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { AppError } from '../../core/errors';
import type { CareTask, TaskOccurrence, TaskStatus } from '../../models';
import { SNOOZE_CONFIG, ESCALATION_CONFIG } from '../../models';
import { cancelNotificationForOccurrence, rescheduleNotificationForSnooze } from '../notifications';

const TASKS_COLLECTION = 'careTasks';
const OCCURRENCES_COLLECTION = 'taskOccurrences';
const HH_MM_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export type CareTaskInput = Omit<CareTask, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Firestore rejects `undefined` field values outright, which previously made
 * reminder creation fail for every frequency that did not carry `daysOfWeek`.
 * Stripping them here keeps the document shape identical to the schema and to
 * the `careTasks` allowlist enforced by the security rules.
 */
function stripUndefined<T extends Record<string, unknown>>(value: T): Partial<T> {
  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value)) {
    if (val !== undefined) {
      result[key] = val;
    }
  }
  return result as Partial<T>;
}

/**
 * Validates the fields the security rules also enforce, so an invalid reminder
 * fails fast with a readable message instead of a `permission-denied` error.
 */
export function validateCareTask(task: CareTaskInput): string | null {
  if (!task.title || task.title.trim().length === 0) {
    return 'Please enter a title for the reminder.';
  }
  if (task.title.trim().length > 200) {
    return 'The reminder title is too long.';
  }
  if (!HH_MM_PATTERN.test(task.scheduledTime)) {
    return 'Please choose a valid time for the reminder.';
  }
  if (!ISO_DATE_PATTERN.test(task.startDate)) {
    return 'Please choose a valid start date.';
  }
  if (task.endDate !== undefined) {
    if (!ISO_DATE_PATTERN.test(task.endDate)) {
      return 'Please choose a valid end date.';
    }
    if (task.endDate < task.startDate) {
      return 'The end date cannot be before the start date.';
    }
  }
  if (!task.relationshipId || !task.createdBy || !task.assignedTo) {
    return 'The reminder is missing its connection details.';
  }
  if (task.createdBy === task.assignedTo) {
    return 'A reminder cannot be assigned to the person who created it.';
  }
  if (task.frequency === 'custom') {
    if (!task.daysOfWeek || task.daysOfWeek.length === 0) {
      return 'Please choose at least one day for this reminder.';
    }
    if (task.daysOfWeek.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
      return 'Please choose valid days for this reminder.';
    }
  }
  return null;
}

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

/**
 * Occurrence query scoped to both participants, which is what the
 * `taskOccurrences` list rule requires.
 */
function occurrencesOfTaskQuery(
  db: Firestore,
  taskId: string,
  parentId: string,
  childId: string
) {
  return query(
    collection(db, OCCURRENCES_COLLECTION),
    where('parentId', '==', parentId),
    where('childId', '==', childId),
    where('taskId', '==', taskId)
  );
}

function generateOccurrenceId(taskId: string, date: string): string {
  return `${taskId}_${date}`;
}

function firebaseErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: string }).code);
  }
  return null;
}

export async function createCareTask(task: CareTaskInput): Promise<string> {
  const validationError = validateCareTask(task);
  if (validationError) {
    throw new AppError(validationError, 'VALIDATION');
  }

  const db = getFirebaseDb();
  const ref = doc(collection(db, TASKS_COLLECTION));
  const now = serverTimestamp();
  await setDoc(ref, {
    ...stripUndefined(task as unknown as Record<string, unknown>),
    id: ref.id,
    createdAt: now,
    updatedAt: now,
  });
  await generateOccurrencesForTask({ ...task, id: ref.id } as CareTask);
  return ref.id;
}

export async function updateCareTask(taskId: string, updates: Partial<CareTask>): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), { ...updates, updatedAt: serverTimestamp() });
}

export async function deleteCareTask(
  taskId: string,
  parentId: string,
  childId: string
): Promise<void> {
  const db = getFirebaseDb();
  await deleteDoc(doc(db, TASKS_COLLECTION, taskId));

  // Cancel future pending/snoozed occurrences to avoid ghost reminders
  const today = todayString();
  try {
    const snap = await getDocs(occurrencesOfTaskQuery(db, taskId, parentId, childId));
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

export async function toggleTaskActive(
  taskId: string,
  active: boolean,
  parentId: string,
  childId: string
): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), { active, updatedAt: serverTimestamp() });

  const today = todayString();
  if (!active) {
    try {
      const snap = await getDocs(occurrencesOfTaskQuery(db, taskId, parentId, childId));
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

/**
 * Builds the occurrence query for one parent.
 *
 * `viewerChildId` must be supplied when the caller is the caregiver. The
 * security rules authorise a caregiver query by requiring the query to
 * constrain `childId` to the caregiver's own uid, which is what lets Firestore
 * prove the query is scoped to a relationship participant. Omitting it means
 * the caregiver query is rejected by the backend.
 */
function occurrencesQueryForParent(
  db: Firestore,
  parentId: string,
  startDate: string,
  endDate: string,
  viewerChildId?: string
) {
  const constraints = [where('parentId', '==', parentId)];
  if (viewerChildId) {
    constraints.push(where('childId', '==', viewerChildId));
  }
  constraints.push(
    startDate === endDate
      ? where('scheduledDate', '==', startDate)
      : where('scheduledDate', '>=', startDate)
  );
  if (startDate !== endDate) {
    constraints.push(where('scheduledDate', '<=', endDate));
  }
  return query(collection(db, OCCURRENCES_COLLECTION), ...constraints);
}

export async function getOccurrencesForParent(
  parentId: string,
  startDate: string,
  endDate: string,
  viewerChildId?: string
): Promise<TaskOccurrence[]> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    occurrencesQueryForParent(db, parentId, startDate, endDate, viewerChildId)
  );
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
}

export async function completeOccurrence(occurrenceId: string, completedBy: string): Promise<void> {
  const db = getFirebaseDb();
  const ref = doc(db, OCCURRENCES_COLLECTION, occurrenceId);

  await runTransaction(db, async (transaction) => {
    const snap = await transaction.get(ref);
    if (!snap.exists()) {
      throw new AppError('Reminder not found.', 'NOT_FOUND');
    }
    const data = snap.data() as TaskOccurrence;

    // Authorisation is re-checked here so a stale screen cannot acknowledge
    // somebody else's occurrence. The security rules enforce the same rule.
    if (data.parentId !== completedBy) {
      throw new AppError('You can only acknowledge your own reminders.', 'FORBIDDEN');
    }
    if (data.status === 'completed') {
      return; // Idempotent: duplicate taps are safe.
    }
    if (data.status === 'cancelled') {
      throw new AppError('Cannot complete a cancelled reminder.', 'VALIDATION');
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
  onError?: (error: Error) => void,
  viewerChildId?: string
): () => void {
  const db = getFirebaseDb();
  const q = occurrencesQueryForParent(db, parentId, startDate, endDate, viewerChildId);
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

/**
 * Lists the occurrence ids that already exist for a task.
 *
 * The query has to constrain `parentId` AND `childId`, because that is what
 * lets Firestore's query prover show the result only contains this
 * relationship's data (see the `allow list` rule in firestore.rules).
 */
async function getExistingOccurrenceIds(
  task: Pick<CareTask, 'id' | 'createdBy' | 'assignedTo'>
): Promise<Set<string>> {
  const db = getFirebaseDb();
  const snapshot = await getDocs(
    occurrencesOfTaskQuery(db, task.id, task.assignedTo, task.createdBy)
  );
  return new Set(snapshot.docs.map((d) => d.id));
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

  // Occurrence ids are deterministic (`<taskId>_<YYYY-MM-DD>`) and only the
  // missing ones are written, so re-running generation never duplicates an
  // occurrence and never resets one that has been acknowledged, snoozed or
  // missed. Missing documents cannot be probed with a document read (Firestore
  // evaluates read rules even for documents that do not exist), which is why
  // the existing set is resolved with a query instead.
  const existing = await getExistingOccurrenceIds(task);

  const batchOps: Promise<void>[] = [];
  for (const date of dates) {
    const dateStr = formatDate(date);
    const occId = generateOccurrenceId(task.id, dateStr);
    if (existing.has(occId)) {
      continue;
    }
    batchOps.push(
      setDoc(doc(db, OCCURRENCES_COLLECTION, occId), {
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
      }).catch((error: unknown) => {
        // Two devices may have generated the same occurrence concurrently; the
        // existing record wins so real state is never overwritten.
        if (firebaseErrorCode(error) !== 'already-exists') {
          throw error;
        }
      })
    );
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

export async function updateMissedOccurrences(
  parentId?: string,
  viewerChildId?: string
): Promise<TaskOccurrence[]> {
  if (!parentId) return [];
  const db = getFirebaseDb();
  const today = todayString();
  const minDate = formatDate(addDays(new Date(), -7));

  const snapshot = await getDocs(
    occurrencesQueryForParent(db, parentId, minDate, today, viewerChildId)
  );
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
      }

      transaction.update(ref, updates);
    });

    missedOccs.push({ ...occ, status: 'missed' });
    await cancelNotificationForOccurrence(occ.id);
  }

  return missedOccs;
}

export async function getHistoryOccurrencesForParent(
  parentId: string,
  daysBack = 14,
  viewerChildId?: string
): Promise<TaskOccurrence[]> {
  const today = todayString();
  const startDate = formatDate(addDays(new Date(), -daysBack));

  const occs = await getOccurrencesForParent(parentId, startDate, today, viewerChildId);
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
