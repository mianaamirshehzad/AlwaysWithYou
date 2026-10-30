import AsyncStorage from '@react-native-async-storage/async-storage';
import * as React from 'react';
import { useAuth } from './AuthContext';
import { getUserProfile, updateUserProfile } from '../services/firestore/users';
import type { UserProfile } from '../models';

const STORAGE_KEY_USER_PROFILE = '@alwayswithyou:user_profile_cache';

type UserProfileContextValue = {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  updateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const UserProfileContext = React.createContext<UserProfileContextValue | undefined>(undefined);

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Load once when user logs in or app boots
  React.useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      setError(null);
      return;
    }

    let mounted = true;
    setLoading(true);
    setError(null);

    // 1. Instant hydration from cached profile if present
    AsyncStorage.getItem(`${STORAGE_KEY_USER_PROFILE}_${user.uid}`)
      .then((cachedStr) => {
        if (mounted && cachedStr) {
          try {
            const parsed = JSON.parse(cachedStr);
            setProfile(parsed);
          } catch {
            // Ignore cache parse failure
          }
        }
      })
      .catch(() => {});

    // 2. Fetch fresh profile once from Firestore
    getUserProfile(user.uid)
      .then((p) => {
        if (mounted) {
          setProfile(p);
          setLoading(false);
          if (p) {
            void AsyncStorage.setItem(
              `${STORAGE_KEY_USER_PROFILE}_${user.uid}`,
              JSON.stringify(p)
            );
          }
        }
      })
      .catch((err) => {
        console.warn('Failed to fetch user profile:', err);
        if (mounted) {
          setError(err?.message ?? 'Failed to load user profile');
          setLoading(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [user]);

  const updateProfile = React.useCallback(
    async (updates: Partial<UserProfile>) => {
      if (!user) return;
      // Optimistic update
      const updated = profile ? { ...profile, ...updates } : null;
      if (updated) {
        setProfile(updated);
        void AsyncStorage.setItem(
          `${STORAGE_KEY_USER_PROFILE}_${user.uid}`,
          JSON.stringify(updated)
        );
      }
      try {
        await updateUserProfile(user.uid, updates);
      } catch (err: any) {
        console.error('Failed to update user profile in Firestore:', err);
        throw err;
      }
    },
    [user, profile]
  );

  const refreshProfile = React.useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const p = await getUserProfile(user.uid);
      setProfile(p);
      if (p) {
        void AsyncStorage.setItem(
          `${STORAGE_KEY_USER_PROFILE}_${user.uid}`,
          JSON.stringify(p)
        );
      }
    } catch (err: any) {
      setError(err?.message ?? 'Failed to refresh user profile');
    } finally {
      setLoading(false);
    }
  }, [user]);

  const value = React.useMemo(
    () => ({
      profile,
      loading,
      error,
      updateProfile,
      refreshProfile,
    }),
    [profile, loading, error, updateProfile, refreshProfile]
  );

  return <UserProfileContext.Provider value={value}>{children}</UserProfileContext.Provider>;
}

export function useUserProfile(): UserProfileContextValue {
  const context = React.useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
}

