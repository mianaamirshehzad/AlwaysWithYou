import * as Crypto from 'expo-crypto';
import { doc, getDoc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';

import { getFirebaseDb } from './firebase';

const INVITATIONS_COLLECTION = 'invitations';
const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GENERATION_ATTEMPTS = 10;

export type InvitationStatus = 'pending';

export type Invitation = {
  childUid: string;
  code: string;
  createdAt: ReturnType<typeof serverTimestamp>;
  expiresAt: Timestamp;
  status: InvitationStatus;
};

function randomDigit(): number {
  const values = Crypto.getRandomValues(new Uint8Array(1));
  const value = values[0];
  if (value >= 250) {
    return randomDigit();
  }
  return value % 10;
}

export function generateInvitationCode(): string {
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += randomDigit();
  }
  return code;
}

export async function createInvitation(childUid: string): Promise<string> {
  const db = getFirebaseDb();
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateInvitationCode();
    const invitationRef = doc(db, INVITATIONS_COLLECTION, code);
    const snapshot = await getDoc(invitationRef);
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
    await setDoc(invitationRef, {
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
