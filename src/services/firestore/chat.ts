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
  // Reading a document that does not exist yet is authorised by the rules
  // through the relationship, not through the conversation itself, so this
  // existence probe is safe and returns null when there is nothing there yet.
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
  text: string,
  extra?: {
    messageType?: 'text' | 'audio';
    audioUrl?: string;
    audioDurationMs?: number;
  }
): Promise<string> {
  const db = getFirebaseDb();
  const conversationId = await getOrCreateConversation(relationshipId);
  const data: Record<string, any> = {
    conversationId,
    senderId,
    text: text.trim(),
    messageType: extra?.messageType ?? 'text',
    status: 'sent',
    createdAt: serverTimestamp(),
  };
  if (extra?.audioUrl) {
    data.audioUrl = extra.audioUrl;
  }
  if (typeof extra?.audioDurationMs === 'number') {
    data.audioDurationMs = extra.audioDurationMs;
  }

  const ref = await addDoc(collection(db, MESSAGES_COLLECTION), data);
  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessage: extra?.messageType === 'audio' ? '🎤 Voice message' : text.trim(),
    lastMessageAt: serverTimestamp(),
  });
  return ref.id;
}

export async function sendMessageWithRetry(
  relationshipId: string,
  senderId: string,
  text: string,
  extra?: {
    messageType?: 'text' | 'audio';
    audioUrl?: string;
    audioDurationMs?: number;
  },
  maxRetries: number = 2
): Promise<string> {
  let lastError: any;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await sendMessage(relationshipId, senderId, text, extra);
    } catch (err) {
      lastError = err;
      if (attempt < maxRetries) {
        await new Promise((res) => setTimeout(res, 500 * (attempt + 1)));
      }
    }
  }
  throw lastError;
}

export function subscribeToMessages(
  relationshipId: string,
  callback: (messages: Message[]) => void,
  maxMessages: number = 100,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  const q = query(
    collection(db, MESSAGES_COLLECTION),
    where('conversationId', '==', relationshipId),
    orderBy('createdAt', 'desc'),
    limit(maxMessages)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const messages = snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .reverse();
      callback(messages);
    },
    (error) => {
      console.error('subscribeToMessages error:', error);
      if (onError) onError(error);
    }
  );
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

export type Conversation = {
  id: string;
  relationshipId: string;
  createdAt?: any;
  lastMessage?: string;
  lastMessageAt?: any;
};

export async function getConversation(relationshipId: string): Promise<Conversation | null> {
  const db = getFirebaseDb();
  const snap = await getDoc(doc(db, CONVERSATIONS_COLLECTION, relationshipId));
  if (!snap.exists()) return null;
  return { id: snap.id, relationshipId, ...snap.data() } as Conversation;
}

export function subscribeToConversation(
  relationshipId: string,
  callback: (conversation: Conversation | null) => void,
  onError?: (error: Error) => void
): () => void {
  const db = getFirebaseDb();
  return onSnapshot(
    doc(db, CONVERSATIONS_COLLECTION, relationshipId),
    (snap) => {
      if (!snap.exists()) {
        callback(null);
      } else {
        callback({ id: snap.id, relationshipId, ...snap.data() } as Conversation);
      }
    },
    (error) => {
      console.error('subscribeToConversation error:', error);
      if (onError) onError(error);
    }
  );
}

export function subscribeToConversations(
  relationshipIds: string[],
  callback: (conversationsMap: Map<string, Conversation>) => void,
  onError?: (error: Error) => void
): () => void {
  if (relationshipIds.length === 0) {
    callback(new Map());
    return () => {};
  }
  const db = getFirebaseDb();
  const conversationsMap = new Map<string, Conversation>();
  const unsubs: (() => void)[] = [];

  for (const relId of relationshipIds) {
    const unsub = onSnapshot(
      doc(db, CONVERSATIONS_COLLECTION, relId),
      (snap) => {
        if (snap.exists()) {
          conversationsMap.set(relId, { id: snap.id, relationshipId: relId, ...snap.data() } as Conversation);
        } else {
          conversationsMap.delete(relId);
        }
        callback(new Map(conversationsMap));
      },
      (err) => {
        console.warn(`subscribeToConversations error for ${relId}:`, err);
        if (onError) onError(err);
      }
    );
    unsubs.push(unsub);
  }

  return () => {
    unsubs.forEach((u) => u());
  };
}
