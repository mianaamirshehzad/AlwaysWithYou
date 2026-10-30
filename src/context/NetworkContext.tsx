import * as React from 'react';
import { AppState, Platform } from 'react-native';
import { checkInternetConnectivity } from '../services/network';

type NetworkContextValue = {
  isConnected: boolean;
  isChecking: boolean;
  checkConnectivity: () => Promise<boolean>;
};

const NetworkContext = React.createContext<NetworkContextValue>({
  isConnected: true,
  isChecking: false,
  checkConnectivity: async () => true,
});

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const [isConnected, setIsConnected] = React.useState(true);
  const [isChecking, setIsChecking] = React.useState(false);

  const checkConnectivity = React.useCallback(async () => {
    setIsChecking(true);
    try {
      const online = await checkInternetConnectivity();
      setIsConnected(online);
      return online;
    } finally {
      setIsChecking(false);
    }
  }, []);

  React.useEffect(() => {
    let mounted = true;
    void checkConnectivity();

    // Check on app state change to active
    const appStateSub = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        void checkConnectivity();
      }
    });

    // Listen to web online/offline events if running on web
    let onlineHandler: (() => void) | undefined;
    let offlineHandler: (() => void) | undefined;
    const globalWin = (globalThis as any).window;
    if (Platform.OS === 'web' && globalWin && typeof globalWin.addEventListener === 'function') {
      onlineHandler = () => {
        if (mounted) setIsConnected(true);
      };
      offlineHandler = () => {
        if (mounted) setIsConnected(false);
      };
      globalWin.addEventListener('online', onlineHandler);
      globalWin.addEventListener('offline', offlineHandler);
    }

    // Periodic check every 15 seconds
    const interval = setInterval(() => {
      if (mounted) void checkConnectivity();
    }, 15000);

    return () => {
      mounted = false;
      appStateSub.remove();
      clearInterval(interval);
      if (onlineHandler && offlineHandler && globalWin && typeof globalWin.removeEventListener === 'function') {
        globalWin.removeEventListener('online', onlineHandler);
        globalWin.removeEventListener('offline', offlineHandler);
      }
    };
  }, [checkConnectivity]);

  const value = React.useMemo(
    () => ({ isConnected, isChecking, checkConnectivity }),
    [isConnected, isChecking, checkConnectivity]
  );

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetwork(): NetworkContextValue {
  return React.useContext(NetworkContext);
}
