import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from './AuthContext';
import { useRelationships } from './RelationshipsContext';
import { subscribeToMessages } from '../services/firestore/chat';
import { getTimestampMs } from '../utils/date';
import type { Message } from '../models';

const STORAGE_KEY_PREFIX = '@chat_last_read_';

type UnreadChatContextType = {
  unreadCounts: Record<string, number>;
  totalUnreadCount: number;
  getUnreadCount: (relationshipId: string) => number;
  markConversationAsRead: (relationshipId: string) => Promise<void>;
  setActiveConversationId: (relationshipId: string | null) => void;
};

const UnreadChatContext = createContext<UnreadChatContextType>({
  unreadCounts: {},
  totalUnreadCount: 0,
  getUnreadCount: () => 0,
  markConversationAsRead: async () => {},
  setActiveConversationId: () => {},
});

export function UnreadChatProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { relationships } = useRelationships();

  const [lastReadMap, setLastReadMap] = useState<Record<string, number>>({});
  const [messagesMap, setMessagesMap] = useState<Record<string, Message[]>>({});
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const activeConversationIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Load stored last read timestamps on startup or when relationships change
  useEffect(() => {
    if (!user || relationships.length === 0) return;

    let mounted = true;
    const loadTimes = async () => {
      const keys = relationships.map((r) => `${STORAGE_KEY_PREFIX}${r.id}`);
      try {
        const entries = await AsyncStorage.multiGet(keys);
        if (!mounted) return;
        const map: Record<string, number> = {};
        for (const [k, v] of entries) {
          const relId = k.replace(STORAGE_KEY_PREFIX, '');
          if (v) {
            map[relId] = Number(v) || 0;
          }
        }
        setLastReadMap((prev) => ({ ...map, ...prev }));
      } catch (e) {
        console.warn('Failed to load last read times:', e);
      }
    };

    loadTimes();
    return () => {
      mounted = false;
    };
  }, [user, relationships]);

  // Subscribe to messages for all active relationships
  useEffect(() => {
    if (!user || relationships.length === 0) {
      setMessagesMap({});
      return;
    }

    const unsubs: (() => void)[] = [];
    const activeRels = relationships.filter((r) => r.status === 'active');

    for (const rel of activeRels) {
      const unsub = subscribeToMessages(
        rel.id,
        (msgs) => {
          setMessagesMap((prev) => ({ ...prev, [rel.id]: msgs }));

          // If this conversation is currently open on screen, automatically mark as read
          if (activeConversationIdRef.current === rel.id) {
            const now = Date.now();
            setLastReadMap((prev) => ({ ...prev, [rel.id]: now }));
            AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${rel.id}`, String(now)).catch(() => {});
          }
        },
        50
      );
      unsubs.push(unsub);
    }

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [user, relationships]);

  const markConversationAsRead = useCallback(async (relationshipId: string) => {
    if (!relationshipId) return;
    const now = Date.now();
    setLastReadMap((prev) => ({ ...prev, [relationshipId]: now }));
    try {
      await AsyncStorage.setItem(`${STORAGE_KEY_PREFIX}${relationshipId}`, String(now));
    } catch (e) {
      console.warn('Failed to save last read time:', e);
    }
  }, []);

  // Compute unread counts per relationship without extra Firestore operations
  const unreadCounts = useMemo(() => {
    if (!user) return {};
    const counts: Record<string, number> = {};

    for (const rel of relationships) {
      if (rel.status !== 'active') continue;
      const msgs = messagesMap[rel.id] || [];
      const lastRead = lastReadMap[rel.id] || 0;

      // Count messages sent by counterpart after lastRead timestamp
      const unread = msgs.filter((m) => {
        if (m.senderId === user.uid) return false;
        const msgTime = getTimestampMs(m.createdAt);
        return msgTime > lastRead;
      }).length;

      counts[rel.id] = unread;
    }
    return counts;
  }, [user, relationships, messagesMap, lastReadMap]);

  const totalUnreadCount = useMemo(() => {
    return Object.values(unreadCounts).reduce((acc, count) => acc + count, 0);
  }, [unreadCounts]);

  const getUnreadCount = useCallback(
    (relationshipId: string) => {
      return unreadCounts[relationshipId] ?? 0;
    },
    [unreadCounts]
  );

  return (
    <UnreadChatContext.Provider
      value={{
        unreadCounts,
        totalUnreadCount,
        getUnreadCount,
        markConversationAsRead,
        setActiveConversationId,
      }}>
      {children}
    </UnreadChatContext.Provider>
  );
}

export function useUnreadChat() {
  const context = useContext(UnreadChatContext);
  if (!context) {
    throw new Error('useUnreadChat must be used within an UnreadChatProvider');
  }
  return context;
}

