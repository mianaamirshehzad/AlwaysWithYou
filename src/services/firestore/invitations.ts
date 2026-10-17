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
  serverTimestamp,
  Timestamp,
  limit,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { AppError } from '../../core/errors';

const INVITATIONS_COLLECTION = 'invitations';
export const INVITATION_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_GENERATION_ATTEMPTS = 10;
const CODE_PATTERN = /^\d{6}$/;

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

function firebaseErrorCode(error: unknown): string | null {
  if (typeof error === 'object' && error !== null && 'code' in error) {
    return String((error as { code?: string }).code);
  }
  return null;
}

/**
 * Creates a fresh six digit invitation code for `childUid`.
 *
 * The code is never read back before being written: Firestore evaluates read
 * rules even for documents that do not exist yet, so a "does this code exist?"
 * probe would be rejected and would turn a normal collision into a crash.
 * Instead the write itself is the probe - `setDoc` on a taken code is an
 * update, which the rules refuse, so the caller simply retries with a new
 * code. This is race-free because document creation is atomic.
 */
export async function createInvitation(childUid: string): Promise<string> {
  const db = getFirebaseDb();
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt++) {
    const code = generateInvitationCode();
    try {
      await setDoc(doc(db, INVITATIONS_COLLECTION, code), {
        childUid,
        code,
        createdAt: serverTimestamp(),
        expiresAt: Timestamp.fromMillis(Date.now() + INVITATION_TTL_MS),
        status: 'pending',
      });
      return code;
    } catch (error) {
      const code0 = firebaseErrorCode(error);
      if (code0 === 'permission-denied' || code0 === 'already-exists') {
        // The code was taken between generation and write; try another one.
        lastError = error;
        continue;
      }
      throw new AppError(
        'Unable to generate an invitation code. Please try again.',
        'FIREBASE',
        error,
        true
      );
    }
  }

  console.warn('createInvitation exhausted all code candidates:', firebaseErrorCode(lastError));
  throw new AppError(
    'Unable to generate a unique invitation code. Please try again.',
    'VALIDATION',
    lastError,
    true
  );
}

/**
 * Redeems a six digit invitation code on behalf of `parentUid`.
 *
 * Flow:
 *   1. The code is claimed with a single unconditional write. The Firestore
 *      rules evaluate that write atomically against the stored invitation, so
 *      an expired, revoked, self-referential or already-consumed code is
 *      rejected by the server and two concurrent parents can never both win.
 *   2. Only after the claim succeeds does the client read the invitation, at
 *      which point the redeeming parent is the recorded owner and the read is
 *      permitted. This keeps unconsumed codes non-enumerable.
 *   3. The relationship is written with the deterministic
 *      "<childId>_<parentId>" id, and the security rules independently verify
 *      that this exact parent consumed an invitation issued by that exact
 *      caregiver. Re-running the whole flow is safe and idempotent.
 */
export async function consumeInvitation(
  code: string,
  parentUid: string
): Promise<{ relationshipId: string; childId: string }> {
  const db = getFirebaseDb();
  const cleanCode = code.trim();

  if (!CODE_PATTERN.test(cleanCode)) {
    throw new AppError('Please enter a valid 6-digit invitation code.', 'VALIDATION');
  }

  const parentRef = doc(db, 'users', parentUid);
  const parentSnap = await getDoc(parentRef);
  if (!parentSnap.exists() || parentSnap.data()?.role !== 'parent') {
    throw new AppError(
      'Only parent accounts can link using an invitation code.',
      'VALIDATION'
    );
  }

  const invRef = doc(db, INVITATIONS_COLLECTION, cleanCode);

  // Step 1 - atomic single-use claim.
  try {
    await updateDoc(invRef, {
      status: 'consumed',
      parentUid,
      consumedAt: serverTimestamp(),
    });
  } catch (error) {
    throw describeClaimFailure(error);
  }

  // Step 2 - the caller now owns the document, so it becomes readable.
  const invSnap = await getDoc(invRef);
  if (!invSnap.exists()) {
    throw new AppError(
      'Invalid invitation code. Please check the code and try again.',
      'NOT_FOUND'
    );
  }
  const invitation = invSnap.data() as Invitation;

  if (invitation.childUid === parentUid) {
    throw new AppError('You cannot connect to yourself.', 'VALIDATION');
  }

  // Step 3 - create or reactivate the relationship.
  const relationshipId = `${invitation.childUid}_${parentUid}`;
  const relRef = doc(db, 'relationships', relationshipId);
  const now = serverTimestamp();

  // A relationship that already exists is readable (the redeeming parent is a
  // participant). A relationship that does not exist yet is rejected by the
  // read rules - Firestore evaluates those even for missing documents - so a
  // denied read simply means "nothing to reactivate". The create path is
  // independently authorised by the rules, which require this exact parent to
  // have redeemed an invitation issued by this exact caregiver.
  let alreadyLinked = false;
  try {
    alreadyLinked = (await getDoc(relRef)).exists();
  } catch {
    alreadyLinked = false;
  }

  if (alreadyLinked) {
    await updateDoc(relRef, { status: 'active', updatedAt: now });
  } else {
    await setDoc(relRef, {
      id: relationshipId,
      childId: invitation.childUid,
      parentId: parentUid,
      invitationCode: cleanCode,
      status: 'active',
      createdAt: now,
      updatedAt: now,
    });
  }

  return { relationshipId, childId: invitation.childUid };
}

function describeClaimFailure(error: unknown): AppError {
  const code = firebaseErrorCode(error);
  if (code === 'not-found') {
    return new AppError(
      'Invalid invitation code. Please check the code and try again.',
      'NOT_FOUND',
      error
    );
  }
  if (code === 'unavailable' || code === 'deadline-exceeded' || code === 'network-request-failed') {
    return new AppError(
      'Unable to connect. Please check your internet connection and try again.',
      'NETWORK',
      error,
      true
    );
  }
  // Expired, already consumed, issued to somebody else, or the caller is not
  // the intended caregiver: the rules deliberately collapse these into a
  // single response so an attacker cannot probe for valid codes.
  return new AppError(
    'This invitation code is invalid, has expired, or has already been used. Please ask your child for a new code.',
    'VALIDATION',
    error
  );
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