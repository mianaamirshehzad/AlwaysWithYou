import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  updateDoc,
  onSnapshot,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import { AppError } from '../../core/errors';
import type { Relationship } from '../../models';

const RELATIONSHIPS_COLLECTION = 'relationships';

export function buildRelationshipId(childId: string, parentId: string): string {
  return `${childId}_${parentId}`;
}

export async function getRelationshipsForChild(childId: string): Promise<Relationship[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, RELATIONSHIPS_COLLECTION),
    where('childId', '==', childId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship));
}

export async function getRelationshipsForParent(parentId: string): Promise<Relationship[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, RELATIONSHIPS_COLLECTION),
    where('parentId', '==', parentId),
    where('status', '==', 'active')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship));
}

export async function getRelationship(childId: string, parentId: string): Promise<Relationship | null> {
  const db = getFirebaseDb();
  const id = buildRelationshipId(childId, parentId);
  const snap = await getDoc(doc(db, RELATIONSHIPS_COLLECTION, id));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Relationship;
}

export async function getRelationshipById(relationshipId: string): Promise<Relationship | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Relationship;
}

/**
 * Deactivates (or reactivates) a relationship. Both participants may call this;
 * the security rules keep the participant identities immutable, and revoking a
 * relationship immediately withdraws access to the associated care data.
 */
export async function setRelationshipActive(
  relationshipId: string,
  active: boolean
): Promise<void> {
  const db = getFirebaseDb();
  try {
    await updateDoc(doc(db, RELATIONSHIPS_COLLECTION, relationshipId), {
      status: active ? 'active' : 'inactive',
    });
  } catch (error) {
    const code =
      typeof error === 'object' && error !== null && 'code' in error
        ? String((error as { code?: string }).code)
        : null;
    if (code === 'permission-denied') {
      throw new AppError(
        'You do not have permission to change this connection.',
        'FORBIDDEN',
        error
      );
    }
    throw error;
  }
}

export function subscribeToRelationships(
  userId: string,
  role: 'child' | 'parent',
  callback: (relationships: Relationship[]) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const field = role === 'child' ? 'childId' : 'parentId';
  const q = query(
    collection(db, RELATIONSHIPS_COLLECTION),
    where(field, '==', userId),
    where('status', '==', 'active')
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const rels = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship));
      callback(rels);
    },
    (error) => {
      console.error('subscribeToRelationships error:', error);
      if (onError) onError(error);
    }
  );
}
