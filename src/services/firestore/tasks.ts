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
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type { CareTask, TaskOccurrence, TaskStatus, Frequency } from '../../models';

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
}

export async function toggleTaskActive(taskId: string, active: boolean): Promise<void> {
  const db = getFirebaseDb();
  await updateDoc(doc(db, TASKS_COLLECTION, taskId), { active, updatedAt: serverTimestamp() });
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
  const q = query(
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
  const q = query(
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
  await updateDoc(doc(db, OCCURRENCES_COLLECTION, occurrenceId), {
    status: 'completed' as TaskStatus,
    completedAt: serverTimestamp(),
    completedBy,
    updatedAt: serverTimestamp(),
  });
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
  callback: (occurrences: TaskOccurrence[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, OCCURRENCES_COLLECTION),
    where('parentId', '==', parentId),
    where('scheduledDate', '>=', startDate),
    where('scheduledDate', '<=', endDate)
  );
  return onSnapshot(q, (snapshot) => {
    const occs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as TaskOccurrence));
    callback(occs);
  });
}

export function subscribeToTasksForRelationship(
  relationshipId: string,
  callback: (tasks: CareTask[]) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, TASKS_COLLECTION),
    where('relationshipId', '==', relationshipId),
    where('active', '==', true)
  );
  return onSnapshot(q, (snapshot) => {
    const tasks = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as CareTask));
    callback(tasks);
  });
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

export async function updateMissedOccurrences(): Promise<void> {
  const db = getFirebaseDb();
  const today = todayString();
  const q = query(
    collection(db, OCCURRENCES_COLLECTION),
    where('scheduledDate', '<=', today),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  const now = new Date();
  const batchPromises: Promise<void>[] = [];

  for (const d of snapshot.docs) {
    const occ = d.data() as TaskOccurrence;
    if (occ.scheduledDate < today) {
      batchPromises.push(
        updateDoc(doc(db, OCCURRENCES_COLLECTION, occ.id), {
          status: 'missed' as TaskStatus,
          updatedAt: serverTimestamp(),
        })
      );
    } else if (occ.scheduledDate === today) {
      const [h, m] = occ.scheduledTime.split(':').map(Number);
      const scheduled = new Date();
      scheduled.setHours(h, m, 0, 0);
      scheduled.setMinutes(scheduled.getMinutes() + 30);
      if (now > scheduled) {
        batchPromises.push(
          updateDoc(doc(db, OCCURRENCES_COLLECTION, occ.id), {
            status: 'missed' as TaskStatus,
            updatedAt: serverTimestamp(),
          })
        );
      }
    }
  }
  await Promise.all(batchPromises);
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

  const todayOccs = occurrences.filter((o) => o.scheduledDate === today);
  const pending = todayOccs.filter((o) => o.status === 'pending' && o.scheduledTime <= currentTime);
  const upcoming = todayOccs.filter((o) => o.status === 'pending' && o.scheduledTime > currentTime);
  const completed = todayOccs.filter((o) => o.status === 'completed');
  const missed = todayOccs.filter((o) => o.status === 'missed');

  return { pending, completed, missed, upcoming };
}
