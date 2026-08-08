import type { User } from 'firebase/auth';
import * as React from 'react';

import { getUserRole, subscribeToAuthState, type UserRole } from '../services/auth';

export type AuthStatus = 'loading' | 'unauthenticated' | 'authenticated';

type AuthContextValue = {
  status: AuthStatus;
  user: User | null;
  role: UserRole | null;
  roleError: boolean;
  retryLoadRole: () => void;
};

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider(props: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<AuthStatus>('loading');
  const [user, setUser] = React.useState<User | null>(null);
  const [role, setRole] = React.useState<UserRole | null>(null);
  const [roleError, setRoleError] = React.useState(false);

  const loadRole = React.useCallback(async (uid: string) => {
    setRoleError(false);
    try {
      const loadedRole = await getUserRole(uid);
      if (loadedRole === null) {
        setRoleError(true);
        return;
      }
      setRole(loadedRole);
    } catch {
      setRoleError(true);
    }
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribeToAuthState((firebaseUser) => {
      if (firebaseUser === null) {
        setUser(null);
        setRole(null);
        setRoleError(false);
        setStatus('unauthenticated');
        return;
      }
      setUser(firebaseUser);
      setRole(null);
      setRoleError(false);
      setStatus('authenticated');
      void loadRole(firebaseUser.uid);
    });
    return unsubscribe;
  }, [loadRole]);

  const retryLoadRole = React.useCallback(() => {
    if (user !== null) {
      void loadRole(user.uid);
    }
  }, [user, loadRole]);

  const value = React.useMemo(
    () => ({ status, user, role, roleError, retryLoadRole }),
    [status, user, role, roleError, retryLoadRole]
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
