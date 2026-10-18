import * as React from 'react';
import { subscribeToRelationships, getRelationshipsForParent, getRelationshipsForChild } from '../services/firestore/relationships';
import { getUserProfilesBatch } from '../services/firestore/users';
import {
  clearCachedRelationships,
  saveConnectionEstablished,
  getCachedParents,
  getCachedRelationships,
  saveCachedParents,
  saveCachedRelationships,
} from '../services/localSession';
import { useAuth } from './AuthContext';
import type { Relationship, UserProfile } from '../models';

type RelationshipsContextValue = {
  relationships: Relationship[];
  parents: ParentProfile[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

export type ParentProfile = {
  relationship: Relationship;
  profile: UserProfile | null;
};

const RelationshipsContext = React.createContext<RelationshipsContextValue | undefined>(undefined);

export function RelationshipsProvider(props: { children: React.ReactNode }) {
  const { user, role, setHasConnected } = useAuth();
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [parents, setParents] = React.useState<ParentProfile[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Identifies the account the in-memory state belongs to. Any change (sign
  // in, sign out, account switch) invalidates every cached relationship and
  // profile so a new user can never observe the previous user's data.
  const ownerKey = user && role ? `${user.uid}:${role}` : null;

  const resetState = React.useCallback(() => {
    setRelationships([]);
    setParents([]);
    setError(null);
    setLoading(false);
    void clearCachedRelationships();
  }, []);

  const refresh = React.useCallback(async () => {
    if (!user || !role) {
      resetState();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const rels =
        role === 'child'
          ? await getRelationshipsForChild(user.uid)
          : await getRelationshipsForParent(user.uid);
      setRelationships(rels);
      if (rels.some((r) => r.status === 'active')) {
        void saveConnectionEstablished(true);
        void setHasConnected(true);
      }

      const profiles = await getUserProfilesBatch(
        rels.map((r) => (role === 'child' ? r.parentId : r.childId))
      );
      if (role === 'child') {
        const nextParents = rels.map((r) => ({
          relationship: r,
          profile: profiles.get(r.parentId) ?? null,
        }));
        setParents(nextParents);
        void saveCachedParents(nextParents);
      }
      void saveCachedRelationships(rels);
    } catch (err: any) {
      const code = err?.code;
      if (code !== 'permission-denied' && code !== 'unavailable') {
        console.warn('Failed to load relationships:', err);
      }
      setError('Unable to load your connections. Please check your connection and retry.');
      setRelationships([]);
      setParents([]);
    } finally {
      setLoading(false);
    }
  }, [user, role, resetState]);

  React.useEffect(() => {
    if (ownerKey === null) {
      resetState();
      return;
    }

    let active = true;
    setLoading(true);
    setError(null);

    // 1. Immediately hydrate from cache so screens render with data on frame 1 without flashing
    void (async () => {
      try {
        const [cachedRels, cachedParents] = await Promise.all([
          getCachedRelationships(),
          getCachedParents(),
        ]);
        if (!active) return;
        if (cachedRels.length > 0) {
          setRelationships(cachedRels);
        }
        if (cachedParents.length > 0) {
          setParents(cachedParents);
        }
      } catch {
        // best effort cache hydration
      }
    })();

    const applyRelationships = async (rels: Relationship[]) => {
      if (!active) return;
      setRelationships(rels);
      if (rels.some((r) => r.status === 'active')) {
        void saveConnectionEstablished(true);
        void setHasConnected(true);
      }
      const profiles = await getUserProfilesBatch(
        rels.map((r) => (role === 'child' ? r.parentId : r.childId))
      );
      if (!active) return;
      if (role === 'child') {
        const nextParents = rels.map((r) => ({
          relationship: r,
          profile: profiles.get(r.parentId) ?? null,
        }));
        setParents(nextParents);
        void saveCachedParents(nextParents);
      }
      void saveCachedRelationships(rels);
    };

    const unsubscribe = subscribeToRelationships(
      user!.uid,
      role!,
      (rels) => {
        if (!active) return;
        void applyRelationships(rels).catch(() => {
          if (active) setError('Unable to load connection details. Please retry.');
        });
        setLoading(false);
      },
      (listenerError: any) => {
        if (!active) return;
        // A permission error is terminal for this account: stop showing the
        // previous session's data and let the user retry explicitly instead of
        // silently retrying forever.
        if (listenerError?.code !== 'permission-denied') {
          console.warn('Relationships listener error:', listenerError);
        }
        setRelationships([]);
        setParents([]);
        setError('Unable to load your connections. Please retry.');
        setLoading(false);
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [ownerKey, user, role, resetState]);

  const value = React.useMemo(
    () => ({ relationships, parents, loading, error, refresh }),
    [relationships, parents, loading, error, refresh]
  );

  return <RelationshipsContext.Provider value={value}>{props.children}</RelationshipsContext.Provider>;
}

export function useRelationships(): RelationshipsContextValue {
  const context = React.useContext(RelationshipsContext);
  if (context === undefined) {
    throw new Error('useRelationships must be used within a RelationshipsProvider');
  }
  return context;
}

export function useSelectedParent(): {
  selectedParent: ParentProfile | null;
  setSelectedParentId: (id: string | null) => void;
  parents: ParentProfile[];
  loading: boolean;
} {
  const { parents, loading } = useRelationships();
  const [selectedParentId, setSelectedParentId] = React.useState<string | null>(null);

  const effectiveId =
    selectedParentId && parents.some((p) => p.profile?.uid === selectedParentId)
      ? selectedParentId
      : parents[0]?.profile?.uid ?? null;

  // Reset the selection whenever the available parents change (sign out,
  // account switch, or a revoked relationship) so a stale id is never used.
  React.useEffect(() => {
    if (selectedParentId !== null && !parents.some((p) => p.profile?.uid === selectedParentId)) {
      setSelectedParentId(null);
    }
  }, [parents, selectedParentId]);

  return {
    selectedParent: parents.find((p) => p.profile?.uid === effectiveId) ?? null,
    setSelectedParentId: (id) => setSelectedParentId(id),
    parents,
    loading,
  };
}