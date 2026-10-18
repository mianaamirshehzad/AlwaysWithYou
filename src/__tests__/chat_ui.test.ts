import * as fs from 'fs';
import * as path from 'path';

const mockAddDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockGetDoc = jest.fn();
const mockUpdateDoc = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...args: unknown[]) => ({ path: args }),
  collection: (...args: unknown[]) => ({ path: args }),
  getDoc: (...args: unknown[]) => mockGetDoc(...args),
  setDoc: (...args: unknown[]) => mockSetDoc(...args),
  addDoc: (...args: unknown[]) => mockAddDoc(...args),
  updateDoc: (...args: unknown[]) => mockUpdateDoc(...args),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: () => 'SERVER_TS',
  onSnapshot: jest.fn(),
}));

jest.mock('../services/firebase', () => ({
  getFirebaseDb: () => ({ __db: true }),
  getFirebaseAuth: () => ({ __auth: true }),
  getFirebaseApp: () => ({ __app: true }),
}));

import { sendMessageWithRetry } from '../services/firestore/chat';

describe('Chat Feature & Bottom Tab Keyboard Hiding', () => {
  describe('Tab Layout Configuration', () => {
    it('configures tabBarHideOnKeyboard in child tab layout', () => {
      const layoutPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('tabBarHideOnKeyboard: true');
      // Verifies Chat tab screen specifically has tabBarHideOnKeyboard
      expect(content).toMatch(/name="three"[\s\S]*?tabBarHideOnKeyboard:\s*true/);
    });

    it('configures tabBarHideOnKeyboard in parent tab layout', () => {
      const layoutPath = path.resolve(__dirname, '../../app/(parent-tabs)/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('tabBarHideOnKeyboard: true');
      // Verifies Chat tab screen specifically has tabBarHideOnKeyboard
      expect(content).toMatch(/name="chat"[\s\S]*?tabBarHideOnKeyboard:\s*true/);
    });
  });

  describe('Chat Screens Structure', () => {
    it('verifies ChildChatScreen anchors input to bottom with KeyboardAvoidingView offset 0 and flex container', () => {
      const screenPath = path.resolve(__dirname, '../screens/Child/ChildChatScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      expect(content).toContain('keyboardVerticalOffset={Platform.OS === \'ios\' ? 0 : 0}');
      expect(content).toContain('loadingContainer:');
      expect(content).toContain('listContentEmpty:');
      expect(content).toContain('ListEmptyComponent=');
      expect(content).toContain('Keyboard.dismiss');
      expect(content).toContain('disabled={!text.trim() || sending || !relationshipId}');
    });

    it('verifies ParentChatScreen anchors input to bottom with KeyboardAvoidingView offset 0 and flex container', () => {
      const screenPath = path.resolve(__dirname, '../screens/Parent/ParentChatScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      expect(content).toContain('keyboardVerticalOffset={Platform.OS === \'ios\' ? 0 : 0}');
      expect(content).toContain('loadingContainer:');
      expect(content).toContain('listContentEmpty:');
      expect(content).toContain('ListEmptyComponent=');
      expect(content).toContain('Keyboard.dismiss');
      expect(content).toContain('disabled={!text.trim() || sending || !relationshipId}');
    });
  });

  describe('Message Sending & Retries', () => {
    beforeEach(() => {
      mockAddDoc.mockReset();
      mockSetDoc.mockReset();
      mockGetDoc.mockReset();
      mockUpdateDoc.mockReset();
      mockGetDoc.mockResolvedValue({ exists: () => true, id: 'rel_1' });
      mockUpdateDoc.mockResolvedValue(undefined);
    });

    it('retries when addDoc fails temporarily and succeeds on retry', async () => {
      mockAddDoc
        .mockRejectedValueOnce(new Error('Network timeout'))
        .mockResolvedValueOnce({ id: 'msg_retry_123' });

      const messageId = await sendMessageWithRetry('rel_1', 'user_1', 'Hello parent!', undefined, 1);
      expect(messageId).toBe('msg_retry_123');
      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });

    it('throws error after exceeding max retries', async () => {
      mockAddDoc.mockRejectedValue(new Error('Persistent network failure'));

      await expect(
        sendMessageWithRetry('rel_1', 'user_1', 'Hello', undefined, 1)
      ).rejects.toThrow('Persistent network failure');

      expect(mockAddDoc).toHaveBeenCalledTimes(2);
    });
  });
});

