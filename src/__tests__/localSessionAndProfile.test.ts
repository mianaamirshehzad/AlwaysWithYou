import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  STORAGE_KEYS,
  saveConnectionEstablished,
  getConnectionEstablished,
  saveLocalSession,
  getLocalSession,
  clearLocalSession,
  saveCachedRelationships,
  getCachedRelationships,
  saveCachedParents,
  getCachedParents,
  clearCachedRelationships,
  type SavedUserSession,
} from '../services/localSession';
import { pickProfileImageFromGallery } from '../services/imagePicker';
import * as ImagePicker from 'expo-image-picker';

describe('Local Session and Profile Features', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
    jest.clearAllMocks();
  });

  describe('Connection Established Flag', () => {
    it('defaults to false when not set', async () => {
      const connected = await getConnectionEstablished();
      expect(connected).toBe(false);
    });

    it('saves and retrieves connection established flag', async () => {
      await saveConnectionEstablished(true);
      const connected = await getConnectionEstablished();
      expect(connected).toBe(true);
    });

    it('can reset connection established flag', async () => {
      await saveConnectionEstablished(true);
      expect(await getConnectionEstablished()).toBe(true);

      await saveConnectionEstablished(false);
      expect(await getConnectionEstablished()).toBe(false);
    });
  });

  describe('Local User Session Persistence', () => {
    const mockSession: SavedUserSession = {
      uid: 'user-123',
      email: 'caregiver@example.com',
      displayName: 'Caregiver Jane',
      role: 'child',
      phone: '+15551234567',
    };

    it('saves and retrieves local user session', async () => {
      await saveLocalSession(mockSession);
      const retrieved = await getLocalSession();
      expect(retrieved).toEqual(mockSession);
    });

    it('returns null when no session is saved', async () => {
      const retrieved = await getLocalSession();
      expect(retrieved).toBeNull();
    });

    it('clears active session while preserving connection flag', async () => {
      await saveConnectionEstablished(true);
      await saveLocalSession(mockSession);

      // Verify both exist
      expect(await getConnectionEstablished()).toBe(true);
      expect(await getLocalSession()).toEqual(mockSession);

      // Logout clears local session
      await clearLocalSession();

      // Session is cleared
      expect(await getLocalSession()).toBeNull();
      // HAS_CONNECTED remains true so RoleSelectionScreen is not shown
      expect(await getConnectionEstablished()).toBe(true);
    });
  });

  describe('Relationships Cache', () => {
    it('caches and clears relationships', async () => {
      const mockRelationships = [
        {
          id: 'rel-1',
          childId: 'child-1',
          parentId: 'parent-1',
          status: 'active' as const,
          createdAt: { seconds: 123456, nanoseconds: 0 } as any,
          updatedAt: { seconds: 123456, nanoseconds: 0 } as any,
        },
      ];

      await saveCachedRelationships(mockRelationships);
      const cached = await getCachedRelationships();
      expect(cached).toHaveLength(1);
      expect(cached[0].id).toBe('rel-1');

      // Also automatically marks connection as established
      expect(await getConnectionEstablished()).toBe(true);

      await clearCachedRelationships();
      expect(await getCachedRelationships()).toEqual([]);
    });

    it('caches and clears parent profiles to prevent dashboard flicker', async () => {
      const mockParents = [
        {
          relationship: {
            id: 'rel-1',
            childId: 'child-1',
            parentId: 'parent-1',
            status: 'active' as const,
            createdAt: { seconds: 123456, nanoseconds: 0 } as any,
            updatedAt: { seconds: 123456, nanoseconds: 0 } as any,
          },
          profile: {
            uid: 'parent-1',
            name: 'Dad',
            email: 'dad@example.com',
            role: 'parent' as const,
            createdAt: { seconds: 123456, nanoseconds: 0 } as any,
          },
        },
      ];

      await saveCachedParents(mockParents);
      const cached = await getCachedParents();
      expect(cached).toHaveLength(1);
      expect(cached[0].profile?.name).toBe('Dad');

      await clearCachedRelationships();
      expect(await getCachedParents()).toEqual([]);
    });
  });

  describe('Image Picker Gallery Selection', () => {
    it('handles permission denied error', async () => {
      jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValueOnce({
        granted: false,
        status: ImagePicker.PermissionStatus.DENIED,
        canAskAgain: false,
        expires: 'never',
      });

      await expect(pickProfileImageFromGallery()).rejects.toThrow(
        /permission is required/i
      );
    });

    it('returns null if user cancels photo selection', async () => {
      jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValueOnce({
        granted: true,
        status: ImagePicker.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });

      jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
        canceled: true,
        assets: null,
      });

      const result = await pickProfileImageFromGallery();
      expect(result).toBeNull();
    });

    it('returns base64 data URI when image is picked with base64', async () => {
      jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValueOnce({
        granted: true,
        status: ImagePicker.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });

      jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///data/user/0/com.app/cache/photo.jpg',
            base64: 'abc123xyz',
            width: 300,
            height: 300,
          },
        ],
      });

      const result = await pickProfileImageFromGallery();
      expect(result).toBe('data:image/jpeg;base64,abc123xyz');
    });

    it('falls back to asset uri if base64 is missing', async () => {
      jest.spyOn(ImagePicker, 'requestMediaLibraryPermissionsAsync').mockResolvedValueOnce({
        granted: true,
        status: ImagePicker.PermissionStatus.GRANTED,
        canAskAgain: true,
        expires: 'never',
      });

      jest.spyOn(ImagePicker, 'launchImageLibraryAsync').mockResolvedValueOnce({
        canceled: false,
        assets: [
          {
            uri: 'file:///data/user/0/com.app/cache/photo.jpg',
            width: 300,
            height: 300,
          },
        ],
      });

      const result = await pickProfileImageFromGallery();
      expect(result).toBe('file:///data/user/0/com.app/cache/photo.jpg');
    });
  });
});
