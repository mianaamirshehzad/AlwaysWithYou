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
  onSnapshot,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type { Relationship } from '../../models';

const RELATIONSHIPS_COLLECTION = 'relationships';

export async function createRelationship(childId: string, parentId: string): Promise<string> {
  const db = getFirebaseDb();

  const existingQuery = query(
    collection(db, RELATIONSHIPS_COLLECTION),
    where('childId', '==', childId),
    where('parentId', '==', parentId),
    where('status', '==', 'active')
  );
  const existing = await getDocs(existingQuery);
  if (!existing.empty) {
    return existing.docs[0].id;
  }

  const id = `${childId}_${parentId}`;
  const ref = doc(db, RELATIONSHIPS_COLLECTION, id);
  const now = serverTimestamp();
  const data: Omit<Relationship, 'id'> = {
    childId,
    parentId,
    status: 'active',
    createdAt: now as any,
    updatedAt: now as any,
  };
  await setDoc(ref, data);
  return id;
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
  const id = `${childId}_${parentId}`;
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

export function subscribeToRelationships(
  userId: string,
  role: 'child' | 'parent',
  callback: (relationships: Relationship[]) => void
): () => void {
  const db = getFirebaseDb();
  const field = role === 'child' ? 'childId' : 'parentId';
  const q = query(
    collection(db, RELATIONSHIPS_COLLECTION),
    where(field, '==', userId),
    where('status', '==', 'active')
  );
  return onSnapshot(q, (snapshot) => {
    const rels = snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as Relationship));
    callback(rels);
  });
}
