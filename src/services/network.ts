import { Platform } from 'react-native';

/**
 * Checks whether the device currently has active internet connectivity.
 * Uses a fast HEAD/GET probe with timeout, plus navigator.onLine check on web.
 */
export async function checkInternetConnectivity(): Promise<boolean> {
  // Web fast-path check
  const globalNav = (globalThis as any).navigator;
  if (Platform.OS === 'web' && globalNav && globalNav.onLine === false) {
    return false;
  }

  const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const timeoutId = setTimeout(() => {
    controller?.abort();
  }, 4000);

  try {
    // Probe a reliable lightweight 204 endpoint or DNS endpoint
    const response = await fetch('https://clients3.google.com/generate_204', {
      method: 'HEAD',
      cache: 'no-store',
      signal: controller?.signal,
    });
    clearTimeout(timeoutId);
    return response.ok || response.status === 204;
  } catch {
    clearTimeout(timeoutId);
    // Secondary fallback probe if first one blocked
    try {
      const fallbackController = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const fallbackTimeout = setTimeout(() => fallbackController?.abort(), 3000);
      const res2 = await fetch('https://www.google.com', {
        method: 'HEAD',
        cache: 'no-store',
        signal: fallbackController?.signal,
      });
      clearTimeout(fallbackTimeout);
      return res2.status > 0;
    } catch {
      return false;
    }
  }
}
