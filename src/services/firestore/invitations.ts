import * as Crypto from 'expo-crypto';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  onSnapshot,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { createRelationship } from './relationships';

const INVITATIONS_COLLECTION = 'invitations';
const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GENERATION_ATTEMPTS = 10;

export type InvitationStatus = 'pending' | 'consumed' | 'expired';

export type Invitation = {
  childUid: string;
  code: string;
  parentUid?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  status: InvitationStatus;
  consumedAt?: Timestamp;
};

export async function createInvitation(childUid: string): Promise<string> {
  const db = getFirebaseDb();
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateInvitationCode();
    const ref = doc(db, INVITATIONS_COLLECTION, code);
    const snapshot = await getDoc(ref);
    if (snapshot.exists()) {
      const expiresAt = snapshot.data().expiresAt;
      const isActive =
        expiresAt !== undefined && expiresAt !== null && expiresAt instanceof Timestamp
          ? expiresAt.toMillis() > Date.now()
          : true;
      if (isActive) {
        continue;
      }
    }
    await setDoc(ref, {
      childUid,
      code,
      createdAt: serverTimestamp(),
      expiresAt: Timestamp.fromMillis(Date.now() + INVITATION_TTL_MS),
      status: 'pending',
    });
    return code;
  }
  throw new Error('Unable to generate a unique invitation code. Please try again.');
}

export async function consumeInvitation(
  code: string,
  parentUid: string
): Promise<{ relationshipId: string; childId: string }> {
  const db = getFirebaseDb();
  const codeId = code.toUpperCase();
  const ref = doc(db, INVITATIONS_COLLECTION, codeId);
  const snapshot = await getDoc(ref);

  if (!snapshot.exists()) {
    throw new Error('Invalid invitation code. Please check the code and try again.');
  }

  const invitation = snapshot.data() as Invitation;

  if (invitation.status === 'consumed') {
    throw new Error('This invitation has already been used. Please ask for a new one.');
  }

  const expiresAt = invitation.expiresAt;
  if (expiresAt instanceof Timestamp && expiresAt.toMillis() < Date.now()) {
    throw new Error('This invitation has expired. Please ask for a new one.');
  }

  if (invitation.childUid === parentUid) {
    throw new Error('You cannot connect to yourself.');
  }

  const relationshipId = await createRelationship(invitation.childUid, parentUid);

  await updateDoc(ref, {
    status: 'consumed',
    parentUid,
    consumedAt: serverTimestamp(),
  });

  return { relationshipId, childId: invitation.childUid };
}

export async function getActiveInvitation(childUid: string): Promise<Invitation | null> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, INVITATIONS_COLLECTION),
    where('childUid', '==', childUid),
    where('status', '==', 'pending'),
    limit(1)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const data = snapshot.docs[0].data() as Invitation;
  if (data.expiresAt instanceof Timestamp && data.expiresAt.toMillis() < Date.now()) {
    return null;
  }
  return data;
}

function randomDigitFromBytes(): number {
  const values = Crypto.getRandomValues(new Uint8Array(1));
  const value = values[0];
  if (value >= 250) {
    return randomDigitFromBytes();
  }
  return value % 10;
}

export function generateInvitationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += randomDigitFromBytes();
  }
  return code;
}
