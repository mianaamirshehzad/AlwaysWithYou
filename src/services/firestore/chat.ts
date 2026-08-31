import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot,
  limit,
  updateDoc,
} from 'firebase/firestore';
import { getFirebaseDb } from '../firebase';
import type { Message } from '../../models';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

export async function getOrCreateConversation(relationshipId: string): Promise<string> {
  const db = getFirebaseDb();
  const conversationRef = doc(db, CONVERSATIONS_COLLECTION, relationshipId);
  const snap = await getDoc(conversationRef);
  if (!snap.exists()) {
    await setDoc(conversationRef, {
      id: relationshipId,
      relationshipId,
      createdAt: serverTimestamp(),
    });
  }
  return relationshipId;
}

export async function sendMessage(
  relationshipId: string,
  senderId: string,
  text: string
): Promise<string> {
  const db = getFirebaseDb();
  const conversationId = await getOrCreateConversation(relationshipId);
  const ref = await addDoc(collection(db, MESSAGES_COLLECTION), {
    conversationId,
    senderId,
    text: text.trim(),
    status: 'sent',
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessage: text.trim(),
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
}

export function subscribeToMessages(
  relationshipId: string,
  callback: (messages: Message[]) => void,
  maxMessages: number = 100
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', relationshipId),
    orderBy('createdAt', 'desc'),
    limit(maxMessages)
  );
  return onSnapshot(q, (snapshot) => {
    const messages = snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() } as Message))
      .reverse();
    callback(messages);
  });
}

export async function getLastMessages(
  relationshipId: string,
  count: number = 30
): Promise<Message[]> {
  const db = getFirebaseDb();
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', relationshipId),
    orderBy('createdAt', 'desc'),
    limit(count)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse();
}

export async function getConversation(relationshipId: string): Promise<any | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, relationshipId));
  if (!snap.exists()) return null;
  return { id: snap.id, relationshipId };
}
