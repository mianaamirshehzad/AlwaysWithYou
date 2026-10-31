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
  startAfter,
} from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getFirebaseDb } from '../firebase';
import { sendChatPushNotification } from '../notifications';
import type { Message } from '../../models';

const CONVERSATIONS_COLLECTION = 'conversations';
const MESSAGES_COLLECTION = 'messages';

export const CHAT_PAGE_SIZE = 20;
export const CHAT_CACHE_KEY_PREFIX = '@chat_cached_messages_';

/**
 * Loads locally cached messages (10 - 20 messages) for immediate conversation rendering.
 */
export async function getCachedMessages(relationshipId: string): Promise<Message[]> {
  try {
    const raw = await AsyncStorage.getItem(`${CHAT_CACHE_KEY_PREFIX}${relationshipId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (err) {
    console.warn('Failed to read cached chat messages:', err);
    return [];
  }
}

/**
 * Saves the latest 10 - 20 messages locally in the app for offline hydration and instant render.
 */
export async function saveCachedMessages(
  relationshipId: string,
  messages: Message[],
  maxCount: number = CHAT_PAGE_SIZE
): Promise<void> {
  try {
    if (!relationshipId || !Array.isArray(messages)) return;
    const toStore = messages.slice(-maxCount);
    await AsyncStorage.setItem(
      `${CHAT_CACHE_KEY_PREFIX}${relationshipId}`,
      JSON.stringify(toStore)
    );
  } catch (err) {
    console.warn('Failed to save cached chat messages:', err);
  }
}

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
    messageType?: 'text' | 'audio' | 'image';
    imageUrl?: string;
    audioUrl?: string;
    audioDurationMs?: number;
    senderName?: string;
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
  if (extra?.imageUrl) {
    data.imageUrl = extra.imageUrl;
  }
  if (extra?.audioUrl) {
    data.audioUrl = extra.audioUrl;
  }
  if (typeof extra?.audioDurationMs === 'number') {
    data.audioDurationMs = extra.audioDurationMs;
  }

  const ref = await addDoc(collection(db, MESSAGES_COLLECTION), data);
  const previewText =
    extra?.messageType === 'audio'
      ? '🎤 Voice message'
      : extra?.messageType === 'image'
      ? '📷 Photo'
      : text.trim();

  await updateDoc(doc(db, CONVERSATIONS_COLLECTION, conversationId), {
    lastMessage: previewText,
    lastMessageAt: serverTimestamp(),
  });

  // Trigger push notification in background for recipient (when app is in background or killed)
  sendChatPushNotification({
    relationshipId,
    senderId,
    text,
    messageType: extra?.messageType,
    senderName: extra?.senderName,
  }).catch((err) => {
    console.warn('sendChatPushNotification error:', err);
  });

  return ref.id;
}

export async function sendMessageWithRetry(
  relationshipId: string,
  senderId: string,
  text: string,
  extra?: {
    messageType?: 'text' | 'audio' | 'image';
    imageUrl?: string;
    audioUrl?: string;
    audioDurationMs?: number;
    senderName?: string;
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
  callback: (messages: Message[], oldestDocSnapshot?: any) => void,
  maxMessages: number = CHAT_PAGE_SIZE,
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
      const docs = snapshot.docs;
      const messages = docs
        .map((d) => ({ id: d.id, ...d.data() } as Message))
        .reverse();
      const oldestDocSnapshot = docs.length > 0 ? docs[docs.length - 1] : undefined;
      callback(messages, oldestDocSnapshot);
    },
    (error) => {
      console.error('subscribeToMessages error:', error);
      if (onError) onError(error);
    }
  );
}

export type PaginatedMessagesResult = {
  messages: Message[];
  hasMore: boolean;
  oldestDoc?: any;
};

/**
 * Fetches older messages backwards (pagination) when user scrolls upwards.
 */
export async function getOlderMessages(
  relationshipId: string,
  cursor: any,
  pageSize: number = CHAT_PAGE_SIZE
): Promise<PaginatedMessagesResult> {
  const db = getFirebaseDb();
  let q;

  if (cursor) {
    q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', relationshipId),
      orderBy('createdAt', 'desc'),
      startAfter(cursor),
      limit(pageSize)
    );
  } else {
    q = query(
      collection(db, MESSAGES_COLLECTION),
      where('conversationId', '==', relationshipId),
      orderBy('createdAt', 'desc'),
      limit(pageSize)
    );
  }

  const snapshot = await getDocs(q);
  const docs = snapshot.docs;
  const messages = docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse();

  const oldestDoc = docs.length > 0 ? docs[docs.length - 1] : undefined;
  const hasMore = docs.length === pageSize;

  return {
    messages,
    hasMore,
    oldestDoc,
  };
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
