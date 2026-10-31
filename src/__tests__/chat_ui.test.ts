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
  getDocs: jest.fn(async () => ({ docs: [] })),
  startAfter: jest.fn((cursor) => ({ __startAfter: cursor })),
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

    it('verifies WhatsApp-style mic and send transformation without loading delay and dynamic input width', () => {
      const screenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(screenPath, 'utf8');

      // Mic shown when empty, transforms to send when has text
      expect(content).toContain('hasText');
      expect(content).toContain('accessibilityLabel="Record voice message"');
      expect(content).toContain('accessibilityLabel="Send message"');
      expect(content).toContain('name="mic"');
      expect(content).toContain('name="send"');

      // Left camera icon hidden when user types to give text input full width
      expect(content).toContain('!hasText && (');
      expect(content).toContain('accessibilityLabel="Attach photo"');

      // Uses uploadChatMedia for reliable image and audio delivery
      expect(content).toContain('uploadChatMedia');

      // Audio playback relies on didFinish before resetting playback state
      expect(content).toContain('status.didFinish');
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

    it('verifies Caring for dropdown UX enhancements (distinct color, no subtitle clutter, screen overlay, subtle add parent)', () => {
      const componentPath = path.resolve(__dirname, '../components/ParentDropdownSelector.tsx');
      const dashboardPath = path.resolve(__dirname, '../screens/Child/ChildDashboardScreen.tsx');
      const componentContent = fs.readFileSync(componentPath, 'utf8');
      const dashboardContent = fs.readFileSync(dashboardPath, 'utf8');

      // 1. Opened view uses distinct color (dark slate/midnight navy #151E2B)
      expect(componentContent).toContain('#151E2B');

      // 2. No "Active Profile" or "Tap to switch" subtitles under the profiles
      expect(componentContent).not.toContain('Active Profile');
      expect(componentContent).not.toContain('Tap to switch');

      // 3. Display an overlay on the other content on this screen
      expect(dashboardContent).toContain('isParentDropdownOpen');
      expect(dashboardContent).toContain('dropdownBackdrop');
      expect(dashboardContent).toContain('Close parent selection overlay');

      // 4. Subtle, less prominent styling for + Add New Parent
      expect(componentContent).toContain('addNewParentBtn');
      expect(componentContent).not.toContain('Invite and link with a 6-digit code');
    });
  });

  describe('Chat Push Notifications & Foreground Unread Counters', () => {
    it('verifies Android chat-messages notification channel with MAX importance is configured', async () => {
      const { Platform } = require('react-native');
      const originalOS = Platform.OS;
      Platform.OS = 'android';

      const { ensureChatNotificationChannel } = require('../services/notifications');
      const Notifications = require('expo-notifications');

      try {
        await ensureChatNotificationChannel();

        // Verified setNotificationChannelAsync was called with 'chat-messages'
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith(
          'chat-messages',
          expect.objectContaining({
            name: 'Chat Messages',
            enableVibrate: true,
            vibrationPattern: [0, 250, 250, 250],
          })
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('verifies sendExpoPushNotification posts to Expo push service', async () => {
      const { sendExpoPushNotification } = require('../services/notifications');
      const originalFetch = global.fetch;
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ data: { status: 'ok' } }),
      });
      global.fetch = mockFetch as any;

      try {
        const sent = await sendExpoPushNotification({
          to: 'ExponentPushToken[recipient-token-123]',
          title: 'John',
          body: 'Hello caregiver',
          channelId: 'chat-messages',
        });

        expect(sent).toBe(true);
        expect(mockFetch).toHaveBeenCalledWith(
          'https://exp.host/--/api/v2/push/send',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('"to":"ExponentPushToken[recipient-token-123]"'),
          })
        );
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('verifies handleNotificationResponse routes to /conversation on chat notification tap', () => {
      const { handleNotificationResponse } = require('../services/notifications');
      const mockRouter = {
        push: jest.fn(),
        navigate: jest.fn(),
      };

      handleNotificationResponse(
        {
          notification: {
            request: {
              content: {
                data: {
                  type: 'chat_message',
                  relationshipId: 'rel-123',
                  senderName: 'Sarah',
                },
              },
            },
          },
        } as any,
        mockRouter
      );

      expect(mockRouter.push).toHaveBeenCalledWith({
        pathname: '/conversation',
        params: {
          relationshipId: 'rel-123',
          name: 'Sarah',
        },
      });
    });

    it('verifies root layout registers push token and notification tap listeners', () => {
      const layoutPath = path.resolve(__dirname, '../../app/_layout.tsx');
      const content = fs.readFileSync(layoutPath, 'utf8');

      expect(content).toContain('UnreadChatProvider');
      expect(content).toContain('registerPushTokenForUser');
      expect(content).toContain('addNotificationResponseReceivedListener');
      expect(content).toContain('getLastNotificationResponseAsync');
      expect(content).toContain('handleNotificationResponse');
    });

    it('verifies both child and parent bottom tab bars display unread badge on chat tab', () => {
      const childTabsPath = path.resolve(__dirname, '../../app/(tabs)/_layout.tsx');
      const parentTabsPath = path.resolve(__dirname, '../../app/(parent-tabs)/_layout.tsx');

      const childTabsContent = fs.readFileSync(childTabsPath, 'utf8');
      const parentTabsContent = fs.readFileSync(parentTabsPath, 'utf8');

      // Child tab layout
      expect(childTabsContent).toContain('useUnreadChat');
      expect(childTabsContent).toContain('totalUnreadCount');
      expect(childTabsContent).toMatch(/name="three"[\s\S]*?tabBarBadge:\s*totalUnreadCount\s*>\s*0\s*\?\s*totalUnreadCount\s*:\s*undefined/);

      // Parent tab layout
      expect(parentTabsContent).toContain('useUnreadChat');
      expect(parentTabsContent).toContain('totalUnreadCount');
      expect(parentTabsContent).toMatch(/name="chat"[\s\S]*?tabBarBadge:\s*totalUnreadCount\s*>\s*0\s*\?\s*totalUnreadCount\s*:\s*undefined/);
    });

    it('verifies child and parent chat screens display unread count badge in previous chat cards', () => {
      const childChatPath = path.resolve(__dirname, '../screens/Child/ChildChatScreen.tsx');
      const parentChatPath = path.resolve(__dirname, '../screens/Parent/ParentChatScreen.tsx');

      const childChatContent = fs.readFileSync(childChatPath, 'utf8');
      const parentChatContent = fs.readFileSync(parentChatPath, 'utf8');

      // Child chat screen
      expect(childChatContent).toContain('useUnreadChat');
      expect(childChatContent).toContain('getUnreadCount');
      expect(childChatContent).toContain('styles.unreadBadge');
      expect(childChatContent).toContain('styles.unreadBadgeText');

      // Parent chat screen
      expect(parentChatContent).toContain('useUnreadChat');
      expect(parentChatContent).toContain('getUnreadCount');
      expect(parentChatContent).toContain('styles.unreadBadge');
      expect(parentChatContent).toContain('styles.unreadBadgeText');
    });

    it('verifies ConversationScreen integrates active conversation reading and marks read', () => {
      const convScreenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(convScreenPath, 'utf8');

      expect(content).toContain('useUnreadChat');
      expect(content).toContain('markConversationAsRead');
      expect(content).toContain('setActiveConversationId');
      expect(content).toContain('senderName:');
    });

    it('verifies getTimestampMs in date utils parses timestamps correctly', () => {
      const { getTimestampMs } = require('../utils/date');

      // Number
      expect(getTimestampMs(1600000000000)).toBe(1600000000000);

      // Firestore Timestamp object with toMillis()
      expect(getTimestampMs({ toMillis: () => 1600000005000 })).toBe(1600000005000);

      // Raw seconds/nanoseconds object
      expect(getTimestampMs({ seconds: 1600000, nanoseconds: 500000000 })).toBe(1600000500);

      // Date string
      const isoStr = '2026-10-31T04:00:00.000Z';
      expect(getTimestampMs(isoStr)).toBe(new Date(isoStr).getTime());

      // Null or invalid
      expect(getTimestampMs(null)).toBe(0);
      expect(getTimestampMs(undefined)).toBe(0);
      expect(getTimestampMs('invalid-date-string')).toBe(0);
    });
  });

  describe('Chat Inbox Pagination & 10-20 Message Local Caching', () => {
    it('verifies local cache stores up to 20 messages in AsyncStorage and retrieves them', async () => {
      const {
        saveCachedMessages,
        getCachedMessages,
        CHAT_CACHE_KEY_PREFIX,
      } = require('../services/firestore/chat');
      const AsyncStorage = require('@react-native-async-storage/async-storage');

      const mockRelId = 'rel-local-cache-test';
      // Create 25 mock messages
      const mockMessages = Array.from({ length: 25 }, (_, i) => ({
        id: `msg-${i + 1}`,
        conversationId: mockRelId,
        senderId: 'user-1',
        text: `Message ${i + 1}`,
        status: 'sent',
        createdAt: 1700000000000 + i * 1000,
      }));

      // Save messages - should cap at 20
      await saveCachedMessages(mockRelId, mockMessages);

      // Check AsyncStorage key
      const storedRaw = await AsyncStorage.getItem(`${CHAT_CACHE_KEY_PREFIX}${mockRelId}`);
      expect(storedRaw).toBeTruthy();
      const parsed = JSON.parse(storedRaw);
      expect(parsed.length).toBe(20);
      // Last message should be message 25
      expect(parsed[parsed.length - 1].id).toBe('msg-25');
      // Oldest stored should be message 6 (25 - 20 + 1)
      expect(parsed[0].id).toBe('msg-6');

      // Test getCachedMessages
      const retrieved = await getCachedMessages(mockRelId);
      expect(retrieved.length).toBe(20);
      expect(retrieved[retrieved.length - 1].text).toBe('Message 25');
    });

    it('verifies getOlderMessages uses startAfter cursor and limits to 20', async () => {
      const { getOlderMessages, CHAT_PAGE_SIZE } = require('../services/firestore/chat');
      const firestore = require('firebase/firestore');

      const mockCursor = { id: 'msg-cursor', data: () => ({}) };
      await getOlderMessages('rel-cursor-test', mockCursor, 20);

      expect(CHAT_PAGE_SIZE).toBe(20);
      expect(firestore.startAfter).toHaveBeenCalledWith(mockCursor);
      expect(firestore.limit).toHaveBeenCalledWith(20);
      expect(firestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(firestore.where).toHaveBeenCalledWith('conversationId', '==', 'rel-cursor-test');
    });

    it('verifies ConversationScreen integrates local cache hydration and pagination upwards', () => {
      const convScreenPath = path.resolve(__dirname, '../screens/Chat/ConversationScreen.tsx');
      const content = fs.readFileSync(convScreenPath, 'utf8');

      // Local cache integration
      expect(content).toContain('getCachedMessages');
      expect(content).toContain('saveCachedMessages');

      // Pagination integration
      expect(content).toContain('getOlderMessages');
      expect(content).toContain('handleLoadOlderMessages');
      expect(content).toContain('hasMoreOlder');
      expect(content).toContain('loadingOlder');

      // FlatList upwards scroll detection and header
      expect(content).toContain('onScroll={handleScroll}');
      expect(content).toContain('ListHeaderComponent={renderListHeader}');
      expect(content).toContain('Loading earlier messages...');
      expect(content).toContain('Load earlier messages');
      expect(content).toContain('Beginning of conversation');
    });
  });
});

