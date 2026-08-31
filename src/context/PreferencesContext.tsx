import * as React from 'react';
import { useAuth } from './AuthContext';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../services/firestore/users';
import type { UserPreferences } from '../models';

type PreferencesContextValue = {
  preferences: UserPreferences | null;
  loading: boolean;
  update: (prefs: Partial<UserPreferences>) => Promise<void>;
};

const DEFAULT_PREFS: UserPreferences = {
  pushNotifications: true,
  dailySummaryEmail: false,
  soundEnabled: true,
  vibrateEnabled: false,
  snoozeMinutes: 15,
  textSize: 0.5,
};

const PreferencesContext = React.createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider(props: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = React.useState<UserPreferences | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }
    let mounted = true;
    setLoading(true);
    getUserPreferences(user.uid)
      .then((prefs) => {
        if (mounted) {
          setPreferences(prefs);
          setLoading(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setPreferences(DEFAULT_PREFS);
          setLoading(false);
        }
      });
    return () => {
      mounted = false;
    };
  }, [user]);

  const update = React.useCallback(
    async (prefs: Partial<UserPreferences>) => {
      if (!user) return;
      setPreferences((prev) => ({ ...(prev ?? DEFAULT_PREFS), ...prefs }));
      try {
        await updateUserPreferences(user.uid, prefs);
      } catch {
        // keep local optimistic state, Firestore write will retry later
      }
    },
    [user]
  );

  const value = React.useMemo(
    () => ({ preferences: preferences ?? DEFAULT_PREFS, loading, update }),
    [preferences, loading, update]
  );

  return <PreferencesContext.Provider value={value}>{props.children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesContextValue {
  const context = React.useContext(PreferencesContext);
  if (context === undefined) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
