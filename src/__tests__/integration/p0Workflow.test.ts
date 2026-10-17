/**
 * P0 end-to-end integration suite.
 *
 * Runs the real application services against the Firebase Emulator Suite:
 *
 *   caregiver signup -> caregiver invitation -> parent signup ->
 *   parent redemption -> active relationship -> reminder creation ->
 *   parent sees the occurrence -> parent acknowledges -> caregiver sees the
 *   acknowledgment
 *
 * Every write below is authorised by the real firestore.rules file, so a
 * passing run also proves the security boundary permits the happy path.
 */
import {
  signInWithEmailAndPassword,
  signOut,
  connectAuthEmulator,
} from 'firebase/auth';
import {
  connectFirestoreEmulator,
  doc,
  getDoc,
  getDocs,
  query,
  collection,
  where,
  Timestamp,
} from 'firebase/firestore';

import { getFirebaseAuth, getFirebaseDb } from '../../services/firebase';
import { createAccount, logOut } from '../../services/auth';
import { createInvitation, consumeInvitation, getActiveInvitation } from '../../services/firestore/invitations';
import { getRelationship } from '../../services/firestore/relationships';
import {
  createCareTask,
  generateOccurrencesForTask,
  subscribeToOccurrencesForParent,
  completeOccurrence,
  snoozeOccurrence,
  updateMissedOccurrences,
  getTodayOccurrences,
} from '../../services/firestore/tasks';
import { sendMessage, subscribeToMessages } from '../../services/firestore/chat';
import { getUserProfile } from '../../services/firestore/users';
import type { CareTask, TaskOccurrence } from '../../models';

jest.setTimeout(60000);

function todayStr(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function nextOccurrenceDates(count: number): string[] {
  return Array.from({ length: count }, (_, i) => todayStr(i));
}

beforeAll(async () => {
  const auth = getFirebaseAuth() as any;
  if (!auth.emulatorConfig) {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
  }
  const db = getFirebaseDb() as any;
  try {
    connectFirestoreEmulator(db, '127.0.0.1', 8087);
  } catch {
    // Already connected through FIRESTORE_EMULATOR_HOST.
  }
  // Hard guard: these tests must never be able to reach the real project.
  const host = (db as any)._settings?.host ?? '';
  if (!String(host).includes('127.0.0.1')) {
    throw new Error(`Refusing to run integration tests: Firestore host is "${host}".`);
  }
});

async function registerCaregiver(email: string) {
  await signOut(getFirebaseAuth());
  return createAccount({ name: 'Test Caregiver', email, password: 'password123', role: 'child' });
}

async function registerParent(email: string) {
  await signOut(getFirebaseAuth());
  return createAccount({ name: 'Test Parent', email, password: 'password123', role: 'parent' });
}

async function signInAs(email: string) {
  await signInWithEmailAndPassword(getFirebaseAuth(), email, 'password123');
}

function subscribeOnce<T>(subscribe: (cb: (v: T) => void) => () => void): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Timed out waiting for listener')), 15000);
    let unsubscribe = subscribe((value) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(value);
    });
  });
}

describe('P0 end-to-end: caregiver -> invitation -> parent -> reminder -> acknowledgment', () => {
  const caregiverEmail = 'caregiver@integration.test';
  const parentEmail = 'parent@integration.test';

  it('runs the complete workflow', async () => {
    // 1. Caregiver signup creates a real profile linked to the auth UID.
    const caregiver = await registerCaregiver(caregiverEmail);
    expect(caregiver.uid).toBeTruthy();
    const caregiverProfile = await getUserProfile(caregiver.uid);
    expect(caregiverProfile?.role).toBe('child');
    expect(caregiverProfile?.email).toBe(caregiverEmail);

    // 2. The caregiver generates a valid six digit invitation.
    const code = await createInvitation(caregiver.uid);
    expect(code).toMatch(/^\d{6}$/);
    const activeInvitation = await getActiveInvitation(caregiver.uid);
    expect(activeInvitation?.code).toBe(code);
    expect(activeInvitation?.childUid).toBe(caregiver.uid);

    // 3. A second invitation for the same caregiver does not collide or throw.
    const secondCode = await createInvitation(caregiver.uid);
    expect(secondCode).toMatch(/^\d{6}$/);

    // 4. Parent signup.
    const parent = await registerParent(parentEmail);
    const parentProfile = await getUserProfile(parent.uid);
    expect(parentProfile?.role).toBe('parent');

    // 5. The parent redeems the caregiver's invitation.
    const redemption = await consumeInvitation(code, parent.uid);
    expect(redemption.childId).toBe(caregiver.uid);
    expect(redemption.relationshipId).toBe(`${caregiver.uid}_${parent.uid}`);

    // 6. An active relationship exists with the documented id convention.
    const relationship = await getRelationship(caregiver.uid, parent.uid);
    expect(relationship).not.toBeNull();
    expect(relationship?.id).toBe(`${caregiver.uid}_${parent.uid}`);
    expect(relationship?.childId).toBe(caregiver.uid);
    expect(relationship?.parentId).toBe(parent.uid);
    expect(relationship?.status).toBe('active');

    // 7. The caregiver can list their relationships.
    await signInAs(caregiverEmail);
    const relQuery = await getDocs(
      query(
        collection(getFirebaseDb(), 'relationships'),
        where('childId', '==', caregiver.uid),
        where('status', '==', 'active')
      )
    );
    expect(relQuery.docs).toHaveLength(1);

    // 8. The caregiver creates a recurring reminder for the parent.
    const startDate = todayStr();
    const taskId = await createCareTask({
      relationshipId: relationship!.id,
      createdBy: caregiver.uid,
      assignedTo: parent.uid,
      type: 'medicine',
      title: 'Morning meds',
      note: 'with water',
      scheduledTime: '09:00',
      frequency: 'daily',
      startDate,
      active: true,
    });
    expect(taskId).toBeTruthy();

    const taskSnap = await getDoc(doc(getFirebaseDb(), 'careTasks', taskId));
    expect(taskSnap.exists()).toBe(true);
    expect(taskSnap.data()?.createdBy).toBe(caregiver.uid);
    expect(taskSnap.data()?.assignedTo).toBe(parent.uid);

    // 9. Occurrences were generated for the configured frequency.
    const occurrencesToday = await getDocs(
      query(
        collection(getFirebaseDb(), 'taskOccurrences'),
        where('parentId', '==', parent.uid),
        where('childId', '==', caregiver.uid),
        where('scheduledDate', '==', startDate)
      )
    );
    expect(occurrencesToday.docs).toHaveLength(1);
    const occurrenceId = occurrencesToday.docs[0].id;
    expect(occurrenceId).toBe(`${taskId}_${startDate}`);

    // 10. Re-running occurrence generation is idempotent (stable ids, no dupes).
    const task = { id: taskId, ...(taskSnap.data() as Omit<CareTask, 'id'>) } as CareTask;
    await generateOccurrencesForTask(task);
    await generateOccurrencesForTask(task);
    const afterRegen = await getDocs(
      query(
        collection(getFirebaseDb(), 'taskOccurrences'),
        where('parentId', '==', parent.uid),
        where('childId', '==', caregiver.uid),
        where('scheduledDate', '==', startDate)
      )
    );
    expect(afterRegen.docs).toHaveLength(1);

    // 11. The parent sees the reminder through the real-time listener.
    await signInAs(parentEmail);
    const seen = await subscribeOnce<TaskOccurrence[]>((cb) =>
      subscribeToOccurrencesForParent(parent.uid, startDate, startDate, cb)
    );
    expect(seen.map((o) => o.id)).toContain(occurrenceId);

    const today = getTodayOccurrences(seen);
    expect(today.pending.length + today.upcoming.length).toBe(1);

    // 12. The parent acknowledges the occurrence.
    await completeOccurrence(occurrenceId, parent.uid);

    const acked = await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occurrenceId));
    expect(acked.data()?.status).toBe('completed');
    expect(acked.data()?.completedBy).toBe(parent.uid);
    expect(acked.data()?.completedAt).toBeInstanceOf(Timestamp);

    // 13. Duplicate acknowledgment is safe.
    await expect(completeOccurrence(occurrenceId, parent.uid)).resolves.toBeUndefined();
    const ackedAgain = await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occurrenceId));
    expect(ackedAgain.data()?.status).toBe('completed');

    // 14. The caregiver observes the updated status through their own listener.
    await signInAs(caregiverEmail);
    const caregiverView = await subscribeOnce<TaskOccurrence[]>((cb) =>
      subscribeToOccurrencesForParent(parent.uid, startDate, startDate, cb, undefined, caregiver.uid)
    );
    const acknowledged = caregiverView.find((o) => o.id === occurrenceId);
    expect(acknowledged?.status).toBe('completed');
    expect(acknowledged?.completedBy).toBe(parent.uid);

    // 15. Snooze still works and persists.
    const snoozeTaskId = await createCareTask({
      relationshipId: relationship!.id,
      createdBy: caregiver.uid,
      assignedTo: parent.uid,
      type: 'water',
      title: 'Water',
      scheduledTime: '10:00',
      frequency: 'once',
      startDate: todayStr(1),
      active: true,
    });
    const tomorrowOcc = await getDoc(
      doc(getFirebaseDb(), 'taskOccurrences', `${snoozeTaskId}_${todayStr(1)}`)
    );
    expect(tomorrowOcc.exists()).toBe(true);

    await signInAs(parentEmail);
    const snoozeResult = await snoozeOccurrence(tomorrowOcc.id, 15, parent.uid);
    expect(snoozeResult.snoozeCount).toBe(1);
    const snoozed = await getDoc(doc(getFirebaseDb(), 'taskOccurrences', tomorrowOcc.id));
    expect(snoozed.data()?.status).toBe('snoozed');
    expect(snoozed.data()?.snoozedUntil).toBeInstanceOf(Timestamp);

    // 16. Chat still works for legitimate participants.
    await sendMessage(relationship!.id, parent.uid, 'Thanks for the reminder');
    const messages = await subscribeOnce<any[]>((cb) =>
      subscribeToMessages(relationship!.id, cb)
    );
    expect(messages.some((m) => m.text === 'Thanks for the reminder')).toBe(true);
  });

  it('rejects invalid, expired and already used invitation codes', async () => {
    await signInAs(caregiverEmail);
    const caregiver = getFirebaseAuth().currentUser!;

    await expect(consumeInvitation('12', caregiver.uid)).rejects.toThrow(
      /valid 6-digit invitation code/
    );

    // The caregiver cannot redeem their own invitation.
    const ownCode = await createInvitation(caregiver.uid);
    await signInAs(caregiverEmail);
    await expect(consumeInvitation(ownCode, caregiver.uid)).rejects.toThrow();

    // Unknown code.
    const parent = await registerParent('parent2@integration.test');
    await expect(consumeInvitation('999999', parent.uid)).rejects.toThrow(
      /invalid, has expired, or has already been used/
    );

    // A second parent cannot steal a consumed code.
    await signInAs(caregiverEmail);
    const code = await createInvitation(caregiver.uid);
    await signInAs(parent.email!);
    const first = await consumeInvitation(code, parent.uid);
    expect(first.childId).toBe(caregiver.uid);

    const other = await registerParent('parent3@integration.test');
    await expect(consumeInvitation(code, other.uid)).rejects.toThrow(
      /invalid, has expired, or has already been used/
    );

    // The first parent re-running redemption stays idempotent.
    await signInAs(parent.email!);
    const again = await consumeInvitation(code, parent.uid);
    expect(again.relationshipId).toBe(`${caregiver.uid}_${parent.uid}`);
  });

  it('rejects unauthenticated and cross-account access', async () => {
    const strangerEmail = 'stranger@integration.test';
    const stranger = await registerParent(strangerEmail);

    // Sign out entirely: no protected read is possible.
    await logOut();
    expect(getFirebaseAuth().currentUser).toBeNull();
    await expect(getDoc(doc(getFirebaseDb(), 'users', stranger.uid))).rejects.toThrow();
    await expect(
      getDocs(query(collection(getFirebaseDb(), 'taskOccurrences'), where('parentId', '==', stranger.uid)))
    ).rejects.toThrow();

    // A signed-in stranger still cannot read somebody else's occurrences.
    await signInAs(strangerEmail);
    await expect(
      getDocs(query(collection(getFirebaseDb(), 'taskOccurrences'), where('parentId', '==', 'someone-else')))
    ).rejects.toThrow();
  });

  it('validates reminder input before writing anything', async () => {
    await signInAs(caregiverEmail);
    const caregiver = getFirebaseAuth().currentUser!;

    await expect(
      createCareTask({
        relationshipId: 'nope_nope',
        createdBy: caregiver.uid,
        assignedTo: 'nope',
        type: 'medicine',
        title: '',
        scheduledTime: '99:99',
        frequency: 'daily',
        startDate: 'not-a-date',
        active: true,
      })
    ).rejects.toThrow(/title/i);

    // A well formed task pointing at a relationship that does not exist is
    // rejected by the security rules, not by client-side validation.
    await expect(
      createCareTask({
        relationshipId: 'nope_nope',
        createdBy: caregiver.uid,
        assignedTo: 'nope',
        type: 'medicine',
        title: 'Valid title',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: todayStr(),
        active: true,
      })
    ).rejects.toThrow(/permission/i);

    // Missing participant details are caught before any write is attempted.
    await expect(
      createCareTask({
        relationshipId: '',
        createdBy: caregiver.uid,
        assignedTo: '',
        type: 'medicine',
        title: 'Valid title',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: todayStr(),
        active: true,
      })
    ).rejects.toThrow(/connection details/i);

    // An end date before the start date is rejected.
    await expect(
      createCareTask({
        relationshipId: 'nope_nope',
        createdBy: caregiver.uid,
        assignedTo: 'nope',
        type: 'medicine',
        title: 'Valid title',
        scheduledTime: '09:00',
        frequency: 'daily',
        startDate: todayStr(),
        endDate: todayStr(-3),
        active: true,
      })
    ).rejects.toThrow(/end date cannot be before/i);

    // A custom frequency without days is rejected client-side.
    await expect(
      createCareTask({
        relationshipId: 'nope_nope',
        createdBy: caregiver.uid,
        assignedTo: 'nope',
        type: 'medicine',
        title: 'Valid title',
        scheduledTime: '09:00',
        frequency: 'custom',
        daysOfWeek: [],
        startDate: todayStr(),
        active: true,
      })
    ).rejects.toThrow(/at least one day/i);
  });

  it('marks overdue occurrences as missed and records escalation metadata', async () => {
    await signInAs(caregiverEmail);
    const caregiver = getFirebaseAuth().currentUser!;
    const parent = await registerParent('parent4@integration.test');

    // registerParent switched the session to the new parent; switch back.
    await signInAs(caregiverEmail);
    const code = await createInvitation(caregiver.uid);
    await signInAs(parent.email!);
    const { relationshipId } = await consumeInvitation(code, parent.uid);

    // The caregiver creates the reminder.
    await signInAs(caregiverEmail);

    // Yesterday's reminder, already past its grace period.
    const yesterday = todayStr(-1);
    const taskId = await createCareTask({
      relationshipId,
      createdBy: caregiver.uid,
      assignedTo: parent.uid,
      type: 'call',
      title: 'Evening call',
      scheduledTime: '08:00',
      frequency: 'once',
      startDate: yesterday,
      active: true,
    });
    const occId = `${taskId}_${yesterday}`;
    expect((await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occId))).exists()).toBe(true);

    // Missed detection runs on the parent dashboard, i.e. as the parent.
    await signInAs(parent.email!);
    const missed = await updateMissedOccurrences(parent.uid);
    expect(missed.map((m) => m.id)).toContain(occId);

    const missedSnap = await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occId));
    expect(missedSnap.data()?.status).toBe('missed');
    expect(missedSnap.data()?.escalatedTo).toBe(caregiver.uid);
    expect(missedSnap.data()?.escalationStage).toBe(1);
    expect(missedSnap.data()?.escalatedAt).toBeInstanceOf(Timestamp);

    // Re-running is idempotent.
    await updateMissedOccurrences(parent.uid);
    const stillMissed = await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occId));
    expect(stillMissed.data()?.escalationStage).toBe(1);

    // A late acknowledgment of a missed reminder is still permitted.
    await completeOccurrence(occId, parent.uid);
    expect((await getDoc(doc(getFirebaseDb(), 'taskOccurrences', occId))).data()?.status).toBe(
      'completed'
    );
  });

  it('rolls back the auth account when profile initialization fails', async () => {
    await signOut(getFirebaseAuth());
    const email = 'rollback@integration.test';

    // The security rules only accept role 'child' or 'parent'. Forcing an
    // invalid role makes the profile write fail after the auth account has
    // already been created, which is exactly the failure path under test.
    await expect(
      createAccount({
        name: 'Doomed',
        email,
        password: 'password123',
        role: 'superuser' as any,
      })
    ).rejects.toThrow(/finish creating your account/i);

    // The half-created auth account was removed, so the email is immediately
    // reusable and no orphaned, profile-less account is left behind.
    const retried = await createAccount({
      name: 'Recovered',
      email,
      password: 'password123',
      role: 'child',
    });
    expect(retried.uid).toBeTruthy();
    expect((await getUserProfile(retried.uid))?.role).toBe('child');
  });
});