import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { AppError } from '../../core/errors';
import type { UserProfile, UserPreferences } from '../../models';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

/**
 * Fields that identify or privilege an account. They are owned by the signup
 * flow and the security rules refuse to let them change, so this helper rejects
 * them explicitly instead of silently ignoring a caller's mistake.
 */
const IMMUTABLE_PROFILE_FIELDS = ['uid', 'role', 'email', 'createdAt'] as const;

/**
 * Updates the display fields of a profile. Only the caller's own profile can
 * be written: the Firestore rules enforce `isOwner(userId)`, so a parent can
 * never edit their caregiver's profile (or anybody else's).
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const db = getFirebaseDb();
  const attempted = IMMUTABLE_PROFILE_FIELDS.filter((field) =>
    Object.prototype.hasOwnProperty.call(updates, field)
  );
  if (attempted.length > 0) {
    throw new AppError(
      `Profile field(s) ${attempted.join(', ')} cannot be changed after signup.`,
      'VALIDATION'
    );
  }
  await updateDoc(doc(db, USERS_COLLECTION, uid), {
    ...(updates as Record<string, unknown>),
    updatedAt: serverTimestamp(),
  });
}

export async function getUserPreferences(uid: string): Promise<UserPreferences> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid, 'settings', 'preferences'));
  if (!snap.exists()) {
    return {
      pushNotifications: true,
      dailySummaryEmail: false,
      soundEnabled: true,
      vibrateEnabled: false,
      snoozeMinutes: 15,
      textSize: 0.5,
    };
  }
  return snap.data() as UserPreferences;
}

export async function updateUserPreferences(uid: string, prefs: Partial<UserPreferences>): Promise<void> {
  const db = getFirebaseDb();
  await setDoc(doc(db, USERS_COLLECTION, uid, 'settings', 'preferences'), prefs, { merge: true });
}

export function subscribeToUserProfile(
  uid: string,
  callback: (profile: UserProfile | null) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  return onSnapshot(
    doc(db, USERS_COLLECTION, uid),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
        return;
      }
      callback({ uid: snap.id, ...snap.data() } as UserProfile);
    },
    (error) => {
      console.error('subscribeToUserProfile error:', error);
      if (onError) onError(error);
    }
  );
}

export async function getUserProfilesBatch(uids: string[]): Promise<Map<string, UserProfile>> {
  const results = new Map<string, UserProfile>();
  const promises = uids.map(async (uid) => {
    const profile = await getUserProfile(uid);
    if (profile) results.set(uid, profile);
  });
  await Promise.all(promises);
  return results;
}
