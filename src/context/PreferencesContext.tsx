import * as React from 'react';
import { useAuth } from './AuthContext';
import {
  getUserPreferences,
  updateUserPreferences,
} from '../services/firestore/users';
import {
  cancelAllNotifications,
  reconcileScheduledNotifications,
} from '../services/notifications';
import { DEFAULT_USER_PREFERENCES, type UserPreferences } from '../models';

type PreferencesContextValue = {
  preferences: UserPreferences;
  loading: boolean;
  saveError: string | null;
  update: (prefs: Partial<UserPreferences>) => Promise<void>;
  retrySave: () => Promise<void>;
};

const PreferencesContext = React.createContext<PreferencesContextValue | undefined>(undefined);

export function PreferencesProvider(props: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [preferences, setPreferences] = React.useState<UserPreferences>(DEFAULT_USER_PREFERENCES);
  const [loading, setLoading] = React.useState(true);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [pendingUpdates, setPendingUpdates] = React.useState<Partial<UserPreferences> | null>(null);

  React.useEffect(() => {
    if (!user) {
      setPreferences(DEFAULT_USER_PREFERENCES);
      setLoading(false);
      setSaveError(null);
      setPendingUpdates(null);
      return;
    }
    let mounted = true;
    setLoading(true);
    setSaveError(null);
    getUserPreferences(user.uid)
      .then((prefs) => {
        if (mounted) {
          setPreferences(prefs);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.warn('Error fetching preferences:', err);
        if (mounted) {
          setPreferences(DEFAULT_USER_PREFERENCES);
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
      const merged = { ...preferences, ...prefs };
      setPreferences(merged);
      setSaveError(null);
      try {
        await updateUserPreferences(user.uid, prefs);
        setPendingUpdates(null);

        // Reconcile notifications based on preference changes
        if (prefs.pushNotifications === false) {
          await cancelAllNotifications();
        } else if (
          prefs.pushNotifications === true ||
          prefs.soundEnabled !== undefined ||
          prefs.vibrateEnabled !== undefined ||
          prefs.snoozeMinutes !== undefined
        ) {
          await reconcileScheduledNotifications(user.uid, merged);
        }
      } catch (err: any) {
        console.warn('Failed to persist user preferences:', err);
        setSaveError('Failed to save settings. Please tap to retry.');
        setPendingUpdates(prefs);
      }
    },
    [user, preferences]
  );

  const retrySave = React.useCallback(async () => {
    if (pendingUpdates) {
      await update(pendingUpdates);
    }
  }, [pendingUpdates, update]);

  const value = React.useMemo(
    () => ({ preferences, loading, saveError, update, retrySave }),
    [preferences, loading, saveError, update, retrySave]
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
