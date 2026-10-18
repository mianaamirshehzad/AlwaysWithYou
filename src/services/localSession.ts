import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Relationship, UserProfile, UserRole } from '../models';

export type ParentProfile = {
  relationship: Relationship;
  profile: UserProfile | null;
};

export const STORAGE_KEYS = {
  HAS_CONNECTED: '@alwayswithyou:has_connected',
  USER_SESSION: '@alwayswithyou:user_session',
  RELATIONSHIPS_CACHE: '@alwayswithyou:relationships_cache',
  PARENTS_CACHE: '@alwayswithyou:parents_cache',
} as const;

export type SavedUserSession = {
  uid: string;
  email: string | null;
  displayName: string | null;
  role: UserRole;
  phone?: string | null;
};

/**
 * Checks if the parent-child connection has ever been established on this device.
 */
export async function getConnectionEstablished(): Promise<boolean> {
  try {
    const val = await AsyncStorage.getItem(STORAGE_KEYS.HAS_CONNECTED);
    return val === 'true';
  } catch {
    return false;
  }
}

/**
 * Marks that a child-parent connection has been successfully established.
 * This flag persists across logouts and prevents RoleSelectionScreen from showing again.
 */
export async function saveConnectionEstablished(connected: boolean = true): Promise<void> {
  try {
    if (connected) {
      await AsyncStorage.setItem(STORAGE_KEYS.HAS_CONNECTED, 'true');
    } else {
      await AsyncStorage.removeItem(STORAGE_KEYS.HAS_CONNECTED);
    }
  } catch (error) {
    console.warn('Failed to save connection established flag:', error);
  }
}

/**
 * Saves authenticated user session locally for instant launch and offline access.
 */
export async function saveLocalSession(session: SavedUserSession): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_SESSION, JSON.stringify(session));
  } catch (error) {
    console.warn('Failed to save local user session:', error);
  }
}

/**
 * Retrieves the locally saved user session.
 */
export async function getLocalSession(): Promise<SavedUserSession | null> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.USER_SESSION);
    if (!json) return null;
    return JSON.parse(json) as SavedUserSession;
  } catch {
    return null;
  }
}

/**
 * Clears the active user session on logout.
 * IMPORTANT: This does NOT clear HAS_CONNECTED flag so the app still remembers
 * that a connection was previously made and routes to LoginScreen instead of RoleSelectionScreen.
 */
export async function clearLocalSession(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.USER_SESSION);
    await AsyncStorage.removeItem(STORAGE_KEYS.RELATIONSHIPS_CACHE);
    await AsyncStorage.removeItem(STORAGE_KEYS.PARENTS_CACHE);
  } catch (error) {
    console.warn('Failed to clear local user session:', error);
  }
}

/**
 * Caches relationships locally for fast startup and offline evaluation.
 */
export async function saveCachedRelationships(relationships: Relationship[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.RELATIONSHIPS_CACHE, JSON.stringify(relationships));
    if (relationships.some((r) => r.status === 'active')) {
      await saveConnectionEstablished(true);
    }
  } catch (error) {
    console.warn('Failed to cache relationships locally:', error);
  }
}

/**
 * Retrieves cached relationships from local storage.
 */
export async function getCachedRelationships(): Promise<Relationship[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.RELATIONSHIPS_CACHE);
    if (!json) return [];
    return JSON.parse(json) as Relationship[];
  } catch {
    return [];
  }
}

/**
 * Caches loaded parent profiles so the Child Dashboard can immediately display
 * the active parent without flickering to "no parent selected" on app boot.
 */
export async function saveCachedParents(parents: ParentProfile[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.PARENTS_CACHE, JSON.stringify(parents));
  } catch (error) {
    console.warn('Failed to cache parents locally:', error);
  }
}

/**
 * Retrieves cached parent profiles from local storage.
 */
export async function getCachedParents(): Promise<ParentProfile[]> {
  try {
    const json = await AsyncStorage.getItem(STORAGE_KEYS.PARENTS_CACHE);
    if (!json) return [];
    return JSON.parse(json) as ParentProfile[];
  } catch {
    return [];
  }
}

/**
 * Drops the cached relationships and parents for the signed-out account.
 */
export async function clearCachedRelationships(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.RELATIONSHIPS_CACHE);
    await AsyncStorage.removeItem(STORAGE_KEYS.PARENTS_CACHE);
  } catch (error) {
    console.warn('Failed to clear cached relationships:', error);
  }
}
