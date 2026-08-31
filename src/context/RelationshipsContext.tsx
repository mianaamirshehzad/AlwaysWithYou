import * as React from 'react';
import { subscribeToRelationships, getRelationshipsForParent } from '../services/firestore/relationships';
import { getUserProfilesBatch, getUserProfile } from '../services/firestore/users';
import { useAuth } from './AuthContext';
import type { Relationship } from '../models';
import type { UserProfile } from '../models';

type RelationshipsContextValue = {
  relationships: Relationship[];
  parents: ParentProfile[];
  loading: boolean;
  refresh: () => void;
};

export type ParentProfile = {
  relationship: Relationship;
  profile: UserProfile | null;
};

const RelationshipsContext = React.createContext<RelationshipsContextValue | undefined>(undefined);

export function RelationshipsProvider(props: { children: React.ReactNode }) {
  const { user, role } = useAuth();
  const [relationships, setRelationships] = React.useState<Relationship[]>([]);
  const [parents, setParents] = React.useState<ParentProfile[]>([]);
  const [loading, setLoading] = React.useState(true);

  const refresh = React.useCallback(async () => {
    if (!user || !role) {
      setRelationships([]);
      setParents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rels =
        role === 'child'
          ? await (await import('../services/firestore/relationships')).getRelationshipsForChild(user.uid)
          : await getRelationshipsForParent(user.uid);
      setRelationships(rels);

      const profiles = await getUserProfilesBatch(rels.map((r) => (role === 'child' ? r.parentId : r.childId)));
      if (role === 'child') {
        setParents(
          rels.map((r) => ({
            relationship: r,
            profile: profiles.get(r.parentId) ?? null,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  }, [user, role]);

  React.useEffect(() => {
    if (!user || !role) {
      setRelationships([]);
      setParents([]);
      setLoading(false);
      return;
    }

    const unsubscribe = subscribeToRelationships(user.uid, role, (rels) => {
      setRelationships(rels);
      const fetchProfiles = async () => {
        const uid = user.uid;
        const profiles = await getUserProfilesBatch(
          rels.map((r) => (role === 'child' ? r.parentId : r.childId))
        );
        if (role === 'child') {
          setParents(
            rels.map((r) => ({
              relationship: r,
              profile: profiles.get(r.parentId) ?? null,
            }))
          );
        }
      };
      fetchProfiles().catch(() => {});
      setLoading(false);
    });
    return unsubscribe;
  }, [user, role]);

  const value = React.useMemo(
    () => ({ relationships, parents, loading, refresh }),
    [relationships, parents, loading, refresh]
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

  React.useEffect(() => {
    if (parents.length > 0 && !parents.some((p) => p.profile?.uid === effectiveId)) {
      setSelectedParentId(parents[0].profile?.uid ?? null);
    }
  }, [parents]);

  return {
    selectedParent: parents.find((p) => p.profile?.uid === effectiveId) ?? null,
    setSelectedParentId: (id) => setSelectedParentId(id),
    parents,
    loading,
  };
}
