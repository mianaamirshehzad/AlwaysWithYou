import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type { UserProfile, UserPreferences } from '../../models';

const USERS_COLLECTION = 'users';

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return { uid: snap.id, ...snap.data() } as UserProfile;
}

export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const db = getFirebaseDb();
  const { uid: _uid, ...rest } = updates as any;
  await updateDoc(doc(db, USERS_COLLECTION, uid), { ...rest, updatedAt: serverTimestamp() });
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
  callback: (profile: UserProfile | null) => void
): () => void {
  const db = getFirebaseDb();
  return onSnapshot(doc(db, USERS_COLLECTION, uid), (snap) => {
    if (!snap.exists()) {
      callback(null);
      return;
    }
    callback({ uid: snap.id, ...snap.data() } as UserProfile);
  });
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
