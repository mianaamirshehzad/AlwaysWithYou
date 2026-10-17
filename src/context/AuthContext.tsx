import type { User } from 'firebase/auth';
import * as React from 'react';

import { getUserRole, subscribeToAuthState, type UserRole } from '../services/auth';
import {
  clearLocalSession,
  getConnectionEstablished,
  getLocalSession,
  saveConnectionEstablished,
  saveLocalSession,
  type SavedUserSession,
} from '../services/localSession';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: UserRole | null;
  roleError: boolean;
  hasConnected: boolean;
  setHasConnected: (connected: boolean) => Promise<void>;
  retryLoadRole: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [roleError, setRoleError] = React.useState(false);
  const [hasConnected, setHasConnectedState] = React.useState(false);
  const [hydrated, setHydrated] = React.useState(false);

  // 1. Immediate local storage hydration on app boot
  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [connected, savedSession] = await Promise.all([
          getConnectionEstablished(),
          getLocalSession(),
        ]);
        if (!mounted) return;
        setHasConnectedState(connected);
        if (savedSession) {
          setRole(savedSession.role);
          setUser({
            uid: savedSession.uid,
            email: savedSession.email,
            displayName: savedSession.displayName,
          } as unknown as User);
          setStatus('authenticated');
        }
      } catch (err) {
        console.warn('Failed to hydrate local session:', err);
      } finally {
        if (mounted) setHydrated(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const loadRole = React.useCallback(
    async (uid: string, currentUser?: User | null) => {
      setRoleError(false);
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const loadedRole = await getUserRole(uid);
          if (loadedRole !== null) {
            setRole(loadedRole);
            const targetUser = currentUser ?? user;
            if (targetUser) {
              await saveLocalSession({
                uid: targetUser.uid,
                email: targetUser.email,
                displayName: targetUser.displayName,
                role: loadedRole,
              });
            }
            return;
          }
        } catch {
          // Will retry
        }
        if (attempt < 2) {
          await new Promise((res) => setTimeout(res, 400));
        }
      }
      setRoleError(true);
    },
    [user]
  );

  // 2. Firebase live auth listener synchronization
  React.useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser === null) {
        setUser(null);
        setRole(null);
        setRoleError(false);
        setStatus('unauthenticated');
        void clearLocalSession();
        return;
      }
      setUser(firebaseUser);
      setRoleError(false);
      setStatus('authenticated');
      void loadRole(firebaseUser.uid, firebaseUser);
    });
    return unsubscribe;
  }, [loadRole]);

  const retryLoadRole = React.useCallback(() => {
    if (user !== null) {
      void loadRole(user.uid, user);
    }
  }, [user, loadRole]);

  const setHasConnected = React.useCallback(async (connected: boolean) => {
    setHasConnectedState(connected);
    await saveConnectionEstablished(connected);
  }, []);

  const value = React.useMemo(
    () => ({
      status: hydrated ? status : 'loading',
      user,
      role,
      roleError,
      hasConnected,
      setHasConnected,
      retryLoadRole,
    }),
    [hydrated, status, user, role, roleError, hasConnected, setHasConnected, retryLoadRole]
  );

  return <AuthContext.Provider value={value}>{props.children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
