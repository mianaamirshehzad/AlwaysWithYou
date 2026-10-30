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
    it('verifies ChildChatScreen lists previous chatters, offers start chat option, and does not directly render message input', () => {
      const screenPath = path.resolve(__dirname, '../screens/Child/ChildChatScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Does not directly allow chat input or send buttons on this screen
      expect(content).not.toContain('<TextInput');
      expect(content).not.toContain('keyboardVerticalOffset=');

      // Lists previous chatters and provides option to start chat
      expect(content).toContain('Previous Chats');
      expect(content).toContain('previousChatters');
      expect(content).toContain('availableParents');
      expect(content).toContain('pathname: \'/conversation\'');
    });

    it('verifies ParentChatScreen lists previous chatters, offers start chat option, and does not directly render message input', () => {
      const screenPath = path.resolve(__dirname, '../screens/Parent/ParentChatScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Does not directly allow chat input or send buttons on this screen
      expect(content).not.toContain('<TextInput');
      expect(content).not.toContain('keyboardVerticalOffset=');

      // Lists previous chatters and provides option to start chat
      expect(content).toContain('Previous Chats');
      expect(content).toContain('previousChatters');
      expect(content).toContain('availableCaregivers');
      expect(content).toContain('pathname: \'/conversation\'');
    });

    it('verifies dedicated ConversationScreen anchors input to bottom with KeyboardAvoidingView offset 0 and flex container', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      expect(content).toContain('keyboardVerticalOffset={Platform.OS === \'ios\' ? 0 : 0}');
      expect(content).toContain('loadingContainer:');
      expect(content).toContain('listContentEmpty:');
      expect(content).toContain('ListEmptyComponent=');
      expect(content).toContain('Keyboard.dismiss');
      expect(content).toContain('disabled={!text.trim() || sending || !relationshipId}');
      expect(content).toContain('accessibilityLabel="Back to chats"');
    });

    it('verifies app/_layout.tsx registers conversation screen and includes it in auth navigation', () => {
      const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('<Stack.Screen name="conversation" options={{ headerShown: false }} />');
      expect(content).toContain('segments[0] !== \'conversation\'');
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
    });

    it('sends image messages and updates conversation preview to Photo', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'msg_img_123' });

      const msgId = await sendMessageWithRetry('rel_1', 'user_1', '📷 Photo', {
        messageType: 'image',
        imageUrl: 'https://example.com/photo.jpg',
      });

      expect(msgId).toBe('msg_img_123');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          conversationId: 'rel_1',
          senderId: 'user_1',
          text: '📷 Photo',
          messageType: 'image',
          imageUrl: 'https://example.com/photo.jpg',
          status: 'sent',
        })
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessage: '📷 Photo',
        })
      );
    });

    it('sends audio voice notes and updates conversation preview to Voice message', async () => {
      mockAddDoc.mockResolvedValueOnce({ id: 'msg_voice_123' });

      const msgId = await sendMessageWithRetry('rel_1', 'user_1', '🎤 Voice message', {
        messageType: 'audio',
        audioUrl: 'file:///cache/voice.m4a',
        audioDurationMs: 4500,
      });

      expect(msgId).toBe('msg_voice_123');
      expect(mockAddDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          conversationId: 'rel_1',
          senderId: 'user_1',
          text: '🎤 Voice message',
          messageType: 'audio',
          audioUrl: 'file:///cache/voice.m4a',
          audioDurationMs: 4500,
          status: 'sent',
        })
      );
      expect(mockUpdateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          lastMessage: '🎤 Voice message',
        })
      );
    });
  });

  describe('WhatsApp-style Chat Features in ConversationScreen', () => {
    it('verifies image sending feature and full-screen preview modal are implemented', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Camera / photo attach button
      expect(content).toContain('accessibilityLabel="Attach photo"');
      expect(content).toContain('camera-outline');
      expect(content).toContain('pickChatImage');
      expect(content).toContain('takeChatPhoto');

      // Chat bubble image rendering
      expect(content).toContain('chatImage');
      expect(content).toContain('imageOverlayTime');

      // Full screen modal viewer
      expect(content).toContain('accessibilityLabel="Close photo viewer"');
      expect(content).toContain('modalImage');
    });

    it('verifies WhatsApp-style mic and send transformation', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Mic shown when empty, transforms to send when has text
      expect(content).toContain('hasText');
      expect(content).toContain('accessibilityLabel="Record voice message"');
      expect(content).toContain('accessibilityLabel="Send message"');
      expect(content).toContain('name="mic"');
      expect(content).toContain('name="send"');
    });

    it('verifies WhatsApp-style voice recording bar and audio playback bubbles', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Active recording state bar
      expect(content).toContain('isRecording');
      expect(content).toContain('recordingBar:');
      expect(content).toContain('accessibilityLabel="Discard recording"');
      expect(content).toContain('accessibilityLabel="Send voice message"');
      expect(content).toContain('recordingPulseDot');
      expect(content).toContain('recordingTimerText');

      // Voice note message player bubbles
      expect(content).toContain('audioBubbleContainer');
      expect(content).toContain('audioPlayBtn');
      expect(content).toContain('audioProgressTrack');
      expect(content).toContain('audioDurationText');
      expect(content).toContain('handleTogglePlayAudio');
    });

    it('verifies receiver profile photo in top header and in chat bubbles (Item 3)', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Top section beside back arrow
      expect(content).toContain('receiverPhoto');
      expect(content).toContain('styles.avatar');
      expect(content).toContain('styles.avatarImg');
      expect(content).toContain('styles.avatarText');

      // Chat bubble avatar
      expect(content).toContain('styles.bubbleAvatar');
      expect(content).toContain('styles.bubbleAvatarImg');
      expect(content).toContain('styles.bubbleAvatarText');
    });

    it('verifies watch icon in place of sent time until message is sent (Item 4)', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Uses time-outline icon when message is pending/sending
      expect(content).toContain('isPending');
      expect(content).toContain('name="time-outline"');
      expect(content).toContain('accessibilityLabel="Sending..."');
      expect(content).toContain('item.status === (\'sending\' as any)');
    });

    it('verifies microphone permission check before sending voice message (Item 5)', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      expect(content).toContain('requestVoicePermissions');
      expect(content).toContain('getRecordingPermissionsAsync');
      expect(content).toContain('requestRecordingPermissionsAsync');
      expect(content).toContain('Microphone Permission Required');
    });
  });

  describe('App-wide Notification Gate & Offline Screen (Item 6)', () => {
    it('verifies notification permission gate blocks app until granted', () => {
      const gatePath = path.resolve(__dirname, '../components/NotificationPermissionGate.tsx');
      const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
      const gateContent = fs.readFileSync(gatePath, 'utf8');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      // Gate component checks notifications and handles settings
      expect(gateContent).toContain('Notifications.getPermissionsAsync');
      expect(gateContent).toContain('Notifications.requestPermissionsAsync');
      expect(gateContent).toContain('notifications-outline');
      expect(gateContent).toContain('Enable Notifications');
      expect(gateContent).toContain('AppState.addEventListener');

      // Wired into root layout
      expect(layoutContent).toContain('<NotificationPermissionGate');
    });

    it('verifies offline screen shows when internet is disconnected', () => {
      const offlineScreenPath = path.resolve(__dirname, '../components/NoInternetScreen.tsx');
      const netContextPath = path.resolve(__dirname, '../context/NetworkContext.tsx');
      const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');

      const offlineContent = fs.readFileSync(offlineScreenPath, 'utf8');
      const netContextContent = fs.readFileSync(netContextPath, 'utf8');
      const layoutContent = fs.readFileSync(layoutPath, 'utf8');

      // Screen has relevant offline cloud icon and retry
      expect(offlineContent).toContain('cloud-offline-outline');
      expect(offlineContent).toContain('No Internet Connection');
      expect(offlineContent).toContain('checkConnectivity');

      // Context and root layout wiring
      expect(netContextContent).toContain('NetworkContext');
      expect(netContextContent).toContain('useNetwork');
      expect(layoutContent).toContain('<NetworkProvider>');
      expect(layoutContent).toContain('!isConnected');
      expect(layoutContent).toContain('<NoInternetScreen');
    });
  });

  describe('User Profile Context & One-time Hydration (Item 7)', () => {
    it('verifies UserProfileContext caches and provides profile without fetching on every screen', () => {
      const contextPath = path.resolve(__dirname, '../context/UserProfileContext.tsx');
      const content = fs.readFileSync(contextPath, 'utf8');

      expect(content).toContain('UserProfileContext');
      expect(content).toContain('useUserProfile');
      expect(content).toContain('getUserProfile');
      expect(content).toContain('AsyncStorage');
      expect(content).toContain('STORAGE_KEY');
    });

    it('verifies dashboard and profile screens consume useUserProfile', () => {
      const childProfile = fs.readFileSync(path.resolve(__dirname, '../screens/Child/ChildProfileScreen.tsx'), 'utf8');
      const childSettings = fs.readFileSync(path.resolve(__dirname, '../screens/Child/ChildSettingsScreen.tsx'), 'utf8');
      const parentDashboard = fs.readFileSync(path.resolve(__dirname, '../screens/Parent/ParentDashboardScreen.tsx'), 'utf8');
      const parentSettings = fs.readFileSync(path.resolve(__dirname, '../screens/Parent/ParentSetting.tsx'), 'utf8');

      expect(childProfile).toContain('useUserProfile()');
      expect(childSettings).toContain('useUserProfile()');
      expect(parentDashboard).toContain('useUserProfile()');
      expect(parentSettings).toContain('useUserProfile()');
    });
  });

  describe('Child Dashboard Quick Send Confirmation & Parent Dropdown (Items 8 & 9)', () => {
    it('verifies Quick Send confirmation modal stays open with loading indicator until sent (Item 8)', () => {
      const modalPath = path.resolve(__dirname, '../components/QuickSendConfirmModal.tsx');
      const dashboardPath = path.resolve(__dirname, '../screens/Child/ChildDashboardScreen.tsx');
      const modalContent = fs.readFileSync(modalPath, 'utf8');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

      // QuickSendConfirmModal component
      expect(modalContent).toContain('Sending reminder to');
      expect(modalContent).toContain('ActivityIndicator');
      expect(modalContent).toContain('onConfirm');
      expect(modalContent).toContain('onCancel');

      // Integration in ChildDashboardScreen
      expect(dashboardContent).toContain('<QuickSendConfirmModal');
      expect(dashboardContent).toContain('quickSendModal');
      expect(dashboardContent).toContain('handleConfirmQuickSend');
    });

    it('verifies ParentDropdownSelector component lists connected parents and add new parent button (Item 9)', () => {
      const componentPath = path.resolve(__dirname, '../components/ParentDropdownSelector.tsx');
      const dashboardPath = path.resolve(__dirname, '../screens/Child/ChildDashboardScreen.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

      // ParentDropdownSelector component
      expect(componentContent).toContain('ParentDropdownSelector');
      expect(componentContent).toContain('onAddNewParent');
      expect(componentContent).toContain('chevron-down');
      expect(componentContent).toContain('checkmark');
      expect(componentContent).toContain('+ Add New Parent');

      // Used in ChildDashboardScreen
      expect(dashboardContent).toContain('<ParentDropdownSelector');
      expect(dashboardContent).toContain('onAddNewParent={handleOpenInvite}');
    });
  });
});

