const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ path: args }),
  getDoc: jest.fn(),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  serverTimestamp: () => 'SERVER_TS',
  onSnapshot: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseDb: () => ({ __db: true }),
  getFirebaseAuth: () => ({ __auth: true }),
  getFirebaseApp: () => ({ __app: true }),
}));

import { updateUserProfile, getUserPreferences } from '../services/firestore/users';
import { AppError } from '../core/errors';

beforeEach(() => {
  mockUpdateDoc.mockReset();
  mockSetDoc.mockReset();
  mockUpdateDoc.mockResolvedValue(undefined);
});

describe('updateUserProfile', () => {
  it('updates ordinary display fields', async () => {
    await updateUserProfile('user-1', { name: 'Renamed', phone: '+10000000000' });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    const [, payload] = mockUpdateDoc.mock.calls[0];
    expect(payload).toEqual({
      name: 'Renamed',
      phone: '+10000000000',
      updatedAt: 'SERVER_TS',
    });
  });

  it('refuses to change the role through an ordinary profile update', async () => {
    await expect(
      updateUserProfile('user-1', { role: 'child' } as any)
    ).rejects.toBeInstanceOf(AppError);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('refuses to change the uid', async () => {
    await expect(updateUserProfile('user-1', { uid: 'someone-else' } as any)).rejects.toThrow(
      /cannot be changed after signup/i
    );
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('refuses to change the email or the creation timestamp', async () => {
    await expect(updateUserProfile('user-1', { email: 'x@y.com' })).rejects.toBeInstanceOf(AppError);
    await expect(
      updateUserProfile('user-1', { createdAt: {} as any })
    ).rejects.toBeInstanceOf(AppError);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  it('names the offending field in the error', async () => {
    await expect(updateUserProfile('user-1', { role: 'parent' } as any)).rejects.toThrow(/role/);
  });
});

describe('getUserPreferences', () => {
  it('returns the documented defaults for a user with no stored preferences', async () => {
    const firestore = require('firebase/firestore');
    firestore.getDoc.mockResolvedValueOnce({ exists: () => false, data: () => undefined });

    await expect(getUserPreferences('user-1')).resolves.toEqual({
      pushNotifications: true,
      dailySummaryEmail: false,
      soundEnabled: true,
      vibrateEnabled: false,
      snoozeMinutes: 15,
      textSize: 0.5,
    });
  });
});